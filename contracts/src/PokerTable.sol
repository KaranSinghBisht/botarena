// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HandEval} from "./HandEval.sol";

/// @title PokerTable — heads-up no-limit Texas Hold'em between AI agents on BOT Chain
///
/// @notice Provably-fair on-chain poker. Before any card is dealt the dealer
///         commits keccak256(deck || salt) on-chain. Every bet, call, raise and
///         fold is a transaction; the pot is escrowed here; at showdown the full
///         deck is revealed and the contract verifies the commitment, checks the
///         deck is a valid permutation, evaluates both hands and pays the winner.
///
///         Deck layout (fixed, so reveals are verifiable):
///           deck[0], deck[1]  -> seat 0 hole cards
///           deck[2], deck[3]  -> seat 1 hole cards
///           deck[4..6]        -> flop
///           deck[7]           -> turn
///           deck[8]           -> river
///
///         Trust model: the dealer knows the deck (it deals hole cards off-chain)
///         but cannot alter it after commit, cannot bet, and cannot touch funds.
///         If the dealer stalls, anyone can cancel the hand and refund both
///         players their exact contributions. Roadmap: zk-shuffle mental poker.
///
///         Simplifications vs. casino rules (documented for judges):
///           - heads-up only (no side pots needed; short all-in calls refund the
///             uncalled excess immediately)
///           - an undersized all-in raise re-opens betting for the opponent
///           - split pots give odd wei to seat 0
contract PokerTable {
    // ---------------------------------------------------------------- types

    enum Phase {
        Idle, // no hand running (also: previous hand settled)
        Betting, // waiting for players[toAct]
        AwaitReveal, // waiting for dealer to reveal next street
        AwaitShowdown // waiting for dealer to reveal deck + salt
    }

    enum Action {
        Fold, // 0
        Check, // 1
        Call, // 2
        Bet, // 3
        Raise // 4
    }

    struct Hand {
        uint64 id;
        uint8 button; // seat with the button (posts SB, acts first preflop)
        uint8 street; // 0 preflop, 1 flop, 2 turn, 3 river
        uint8 toAct; // seat index to act
        uint8 communityCount;
        Phase phase;
        bytes32 deckCommit;
        uint8[5] community;
        uint256 pot; // chips from completed streets
        uint256[2] streetBet; // chips committed this street
        uint256[2] handTotal; // chips committed this hand (for refunds)
        uint256 betToMatch; // highest streetBet this street
        uint256 lastRaise; // last raise increment (min-raise rule)
        bool[2] acted; // acted at the current bet level
        uint64 deadline; // unix seconds; who misses it, loses the hand
    }

    struct SeatStats {
        uint32 handsPlayed;
        uint32 handsWon;
        uint256 chipsWon;
    }

    // ---------------------------------------------------------------- config

    address public immutable dealer;
    uint256 public immutable smallBlind;
    uint256 public immutable bigBlind;
    uint256 public immutable minBuyIn;
    uint64 public constant ACTION_TIMEOUT = 120; // seconds for a player action
    uint64 public constant DEALER_TIMEOUT = 300; // seconds for a dealer step

    // ---------------------------------------------------------------- state

    address[2] public players;
    uint256[2] public stacks;
    Hand public hand;
    mapping(address => SeatStats) public stats;
    mapping(uint64 => bytes32) public deckCommits; // handId => commit, kept for audits

    // ---------------------------------------------------------------- events

    event PlayerJoined(uint8 indexed seat, address indexed player, uint256 buyIn);
    event PlayerLeft(uint8 indexed seat, address indexed player, uint256 cashOut);
    event HandStarted(uint64 indexed handId, uint8 button, bytes32 deckCommit, uint256 smallBlind, uint256 bigBlind);
    event ActionTaken(
        uint64 indexed handId,
        uint8 street,
        uint8 indexed seat,
        Action action,
        uint256 amount,
        uint256 pot,
        string quip,
        string reasoning
    );
    event StreetRevealed(uint64 indexed handId, uint8 street, uint8[] cards);
    event ShowdownResult(
        uint64 indexed handId, uint8[2] holes0, uint8[2] holes1, uint256 score0, uint256 score1
    );
    event HandSettled(uint64 indexed handId, uint8 winnerSeat, uint256 amountWon, SettleReason reason);
    event HandCanceled(uint64 indexed handId, uint256 refund0, uint256 refund1);
    event DeckAudited(uint64 indexed handId, bytes32 salt);

    enum SettleReason {
        Fold,
        Showdown,
        SplitPot,
        Timeout
    }

    // ---------------------------------------------------------------- errors

    error NotDealer();
    error NotYourTurn();
    error WrongPhase();
    error SeatsFull();
    error AlreadySeated();
    error BuyInTooSmall();
    error HandInProgress();
    error NotSeated();
    error StacksTooSmall();
    error BadReveal();
    error BadDeck();
    error IllegalAction();
    error BadAmount();
    error NothingToTimeout();

    modifier onlyDealer() {
        if (msg.sender != dealer) revert NotDealer();
        _;
    }

    constructor(address dealer_, uint256 smallBlind_, uint256 bigBlind_, uint256 minBuyIn_) {
        require(dealer_ != address(0) && smallBlind_ > 0 && bigBlind_ >= smallBlind_, "bad config");
        dealer = dealer_;
        smallBlind = smallBlind_;
        bigBlind = bigBlind_;
        minBuyIn = minBuyIn_;
        hand.button = 1; // first hand gives seat 0 the button
    }

    // ---------------------------------------------------------------- seats

    function join() external payable {
        if (msg.value < minBuyIn) revert BuyInTooSmall();
        if (msg.sender == players[0] || msg.sender == players[1]) revert AlreadySeated();
        uint8 seat;
        if (players[0] == address(0)) seat = 0;
        else if (players[1] == address(0)) seat = 1;
        else revert SeatsFull();
        players[seat] = msg.sender;
        stacks[seat] = msg.value;
        emit PlayerJoined(seat, msg.sender, msg.value);
    }

    function topUp() external payable {
        if (hand.phase != Phase.Idle) revert HandInProgress();
        uint8 seat = _seatOf(msg.sender);
        stacks[seat] += msg.value;
    }

    function leave() external {
        if (hand.phase != Phase.Idle) revert HandInProgress();
        uint8 seat = _seatOf(msg.sender);
        uint256 amount = stacks[seat];
        players[seat] = address(0);
        stacks[seat] = 0;
        emit PlayerLeft(seat, msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }

    // ---------------------------------------------------------------- dealer

    /// @notice Starts a hand: stores the deck commitment, posts blinds.
    function startHand(bytes32 deckCommit) external onlyDealer {
        if (hand.phase != Phase.Idle) revert HandInProgress();
        if (players[0] == address(0) || players[1] == address(0)) revert NotSeated();
        if (stacks[0] < bigBlind || stacks[1] < bigBlind) revert StacksTooSmall();

        uint8 button = 1 - hand.button;
        uint64 nextId = hand.id + 1;
        delete hand;
        hand.id = nextId;
        hand.button = button;
        hand.deckCommit = deckCommit;
        deckCommits[nextId] = deckCommit;
        hand.phase = Phase.Betting;
        hand.toAct = button; // heads-up: button is SB and acts first preflop
        hand.deadline = uint64(block.timestamp) + ACTION_TIMEOUT;

        _commitChips(button, smallBlind);
        _commitChips(1 - button, bigBlind);
        hand.betToMatch = bigBlind;
        hand.lastRaise = bigBlind;

        stats[players[0]].handsPlayed++;
        stats[players[1]].handsPlayed++;
        emit HandStarted(hand.id, button, deckCommit, smallBlind, bigBlind);
    }

    /// @notice Reveals the next street's community cards (flop: 3, turn/river: 1).
    function revealStreet(uint8[] calldata cards) external onlyDealer {
        if (hand.phase != Phase.AwaitReveal) revert WrongPhase();
        uint8 street = hand.street + 1; // street being revealed
        uint256 expected = street == 1 ? 3 : 1;
        if (cards.length != expected) revert BadReveal();

        for (uint256 i = 0; i < cards.length; i++) {
            if (cards[i] > 51) revert BadReveal();
            hand.community[hand.communityCount++] = cards[i];
        }
        hand.street = street;
        emit StreetRevealed(hand.id, street, cards);

        bool locked = _bettingLocked();
        if (street == 3 && locked) {
            hand.phase = Phase.AwaitShowdown;
            hand.deadline = uint64(block.timestamp) + DEALER_TIMEOUT;
        } else if (locked) {
            hand.phase = Phase.AwaitReveal; // keep fast-forwarding, all-in run-out
            hand.deadline = uint64(block.timestamp) + DEALER_TIMEOUT;
        } else {
            hand.phase = Phase.Betting;
            hand.toAct = 1 - hand.button; // out of position acts first postflop
            hand.deadline = uint64(block.timestamp) + ACTION_TIMEOUT;
        }
    }

    /// @notice Reveals the full deck; contract verifies commitment + permutation,
    ///         checks board consistency, evaluates hands and settles the pot.
    function showdown(bytes calldata deck, bytes32 salt) external onlyDealer {
        if (hand.phase != Phase.AwaitShowdown) revert WrongPhase();
        _verifyCommit(hand.deckCommit, deck, salt);
        if (hand.communityCount != 5) revert BadDeck(); // showdown needs a full board
        for (uint256 i = 0; i < 5; i++) {
            if (hand.community[i] != uint8(deck[4 + i])) revert BadDeck();
        }

        uint8[2] memory holes0 = [uint8(deck[0]), uint8(deck[1])];
        uint8[2] memory holes1 = [uint8(deck[2]), uint8(deck[3])];
        uint256 score0 = HandEval.evaluate7(_sevenCards(holes0));
        uint256 score1 = HandEval.evaluate7(_sevenCards(holes1));
        emit ShowdownResult(hand.id, holes0, holes1, score0, score1);

        if (score0 == score1) {
            _settleSplit();
        } else {
            _settleWin(score0 > score1 ? 0 : 1, SettleReason.Showdown);
        }
    }

    /// @notice Optional transparency: after a hand ends (e.g. on a fold, where the
    ///         deck never gets revealed), prove the committed deck was valid all
    ///         along. Works for any past hand; emits the salt so anyone can
    ///         re-derive every card that was dealt.
    function auditReveal(uint64 handId, bytes calldata deck, bytes32 salt) external onlyDealer {
        if (handId == hand.id && hand.phase != Phase.Idle) revert WrongPhase();
        bytes32 commit = deckCommits[handId];
        if (commit == bytes32(0)) revert BadDeck();
        _verifyCommit(commit, deck, salt);
        emit DeckAudited(handId, salt);
    }

    // ---------------------------------------------------------------- player

    /// @notice Player action. `amount` semantics: Bet/Raise = total chips for this
    ///         street after the action ("raise to"); Fold/Check/Call ignore it.
    ///         `quip` is table talk; `reasoning` is the agent's strategy summary —
    ///         both live only in the event log (near-zero fees make this viable).
    function act(Action action, uint256 amount, string calldata quip, string calldata reasoning)
        external
    {
        if (hand.phase != Phase.Betting) revert WrongPhase();
        uint8 seat = _seatOf(msg.sender);
        if (seat != hand.toAct) revert NotYourTurn();

        uint256 shown;
        if (action == Action.Fold) {
            emit ActionTaken(hand.id, hand.street, seat, action, 0, _livePot(), quip, reasoning);
            _settleWin(1 - seat, SettleReason.Fold);
            return;
        }
        if (action == Action.Check) shown = _check(seat);
        else if (action == Action.Call) shown = _call(seat);
        else if (action == Action.Bet) shown = _bet(seat, amount);
        else if (action == Action.Raise) shown = _raise(seat, amount);
        else revert IllegalAction();

        emit ActionTaken(hand.id, hand.street, seat, action, shown, _livePot(), quip, reasoning);
        _afterAction(seat);
    }

    /// @notice Anyone can enforce timeouts. A stalled player check-folds; a
    ///         stalled dealer cancels the hand and refunds both players exactly.
    function enforceTimeout() external {
        if (uint64(block.timestamp) <= hand.deadline) revert NothingToTimeout();
        if (hand.phase == Phase.Betting) {
            uint8 seat = hand.toAct;
            if (hand.streetBet[seat] == hand.betToMatch) {
                _check(seat);
                emit ActionTaken(hand.id, hand.street, seat, Action.Check, 0, _livePot(), "", "timeout: checked");
                _afterAction(seat);
            } else {
                emit ActionTaken(hand.id, hand.street, seat, Action.Fold, 0, _livePot(), "", "timeout: folded");
                _settleWin(1 - seat, SettleReason.Timeout);
            }
            return;
        }
        if (hand.phase == Phase.AwaitReveal || hand.phase == Phase.AwaitShowdown) {
            uint256 refund0 = hand.handTotal[0];
            uint256 refund1 = hand.handTotal[1];
            stacks[0] += refund0;
            stacks[1] += refund1;
            emit HandCanceled(hand.id, refund0, refund1);
            _finishHand();
            return;
        }
        revert NothingToTimeout();
    }

    // ---------------------------------------------------------------- views

    function getHand()
        external
        view
        returns (Hand memory h, address[2] memory seatedPlayers, uint256[2] memory seatStacks)
    {
        return (hand, players, stacks);
    }

    function owed(uint8 seat) public view returns (uint256) {
        return hand.betToMatch - hand.streetBet[seat];
    }

    // ------------------------------------------------------------- internals

    function _check(uint8 seat) internal returns (uint256) {
        if (hand.streetBet[seat] != hand.betToMatch) revert IllegalAction();
        hand.acted[seat] = true;
        return 0;
    }

    function _call(uint8 seat) internal returns (uint256) {
        uint256 owe = owed(seat);
        if (owe == 0) revert IllegalAction(); // that's a check
        uint256 pay = owe > stacks[seat] ? stacks[seat] : owe;
        _commitChips(seat, pay);
        if (pay < owe) _refundExcess(seat);
        hand.acted[seat] = true;
        return pay;
    }

    /// @dev Short all-in call: return the uncalled part of the aggressor's bet.
    function _refundExcess(uint8 seat) internal {
        uint8 opp = 1 - seat;
        uint256 excess = hand.streetBet[opp] - hand.streetBet[seat];
        hand.streetBet[opp] -= excess;
        hand.handTotal[opp] -= excess;
        stacks[opp] += excess;
        hand.betToMatch = hand.streetBet[seat];
    }

    function _bet(uint8 seat, uint256 amount) internal returns (uint256) {
        if (hand.betToMatch != 0) revert IllegalAction(); // must raise instead
        bool isAllIn = amount == stacks[seat];
        if (amount > stacks[seat] || (amount < bigBlind && !isAllIn)) revert BadAmount();
        _commitChips(seat, amount);
        hand.betToMatch = amount;
        hand.lastRaise = amount;
        hand.acted[seat] = true;
        hand.acted[1 - seat] = false;
        return amount;
    }

    function _raise(uint8 seat, uint256 raiseTo) internal returns (uint256) {
        if (hand.betToMatch == 0) revert IllegalAction(); // must bet instead
        uint256 pay = raiseTo - hand.streetBet[seat]; // reverts on underflow if raiseTo too low
        bool isAllIn = pay == stacks[seat];
        if (pay > stacks[seat]) revert BadAmount();
        if (raiseTo < hand.betToMatch + hand.lastRaise && !isAllIn) revert BadAmount();
        if (raiseTo <= hand.betToMatch) revert BadAmount();
        _commitChips(seat, pay);
        if (raiseTo - hand.betToMatch > hand.lastRaise) hand.lastRaise = raiseTo - hand.betToMatch;
        hand.betToMatch = raiseTo;
        hand.acted[seat] = true;
        hand.acted[1 - seat] = false;
        return raiseTo;
    }

    function _commitChips(uint8 seat, uint256 amount) internal {
        stacks[seat] -= amount;
        hand.streetBet[seat] += amount;
        hand.handTotal[seat] += amount;
    }

    function _afterAction(uint8 seat) internal {
        bool matched = hand.streetBet[0] == hand.streetBet[1];
        bool bothActed = hand.acted[0] && hand.acted[1];
        if (matched && bothActed) {
            _endStreet();
        } else {
            hand.toAct = 1 - seat;
            hand.deadline = uint64(block.timestamp) + ACTION_TIMEOUT;
        }
    }

    function _endStreet() internal {
        hand.pot += hand.streetBet[0] + hand.streetBet[1];
        hand.streetBet[0] = 0;
        hand.streetBet[1] = 0;
        hand.betToMatch = 0;
        hand.lastRaise = 0;
        hand.acted[0] = false;
        hand.acted[1] = false;
        hand.phase = hand.street == 3 ? Phase.AwaitShowdown : Phase.AwaitReveal;
        hand.deadline = uint64(block.timestamp) + DEALER_TIMEOUT;
    }

    /// @dev Betting is over for the rest of the hand (someone is all-in and called).
    function _bettingLocked() internal view returns (bool) {
        return stacks[0] == 0 || stacks[1] == 0;
    }

    function _livePot() internal view returns (uint256) {
        return hand.pot + hand.streetBet[0] + hand.streetBet[1];
    }

    function _settleWin(uint8 winner, SettleReason reason) internal {
        uint256 amount = _livePot();
        stacks[winner] += amount;
        stats[players[winner]].handsWon++;
        stats[players[winner]].chipsWon += amount;
        emit HandSettled(hand.id, winner, amount, reason);
        _finishHand();
    }

    function _settleSplit() internal {
        uint256 amount = _livePot();
        uint256 half = amount / 2;
        stacks[0] += amount - half; // odd wei to seat 0, documented
        stacks[1] += half;
        emit HandSettled(hand.id, 0, amount - half, SettleReason.SplitPot);
        emit HandSettled(hand.id, 1, half, SettleReason.SplitPot);
        _finishHand();
    }

    function _finishHand() internal {
        uint8 button = hand.button;
        uint64 id = hand.id;
        delete hand;
        hand.button = button;
        hand.id = id;
        hand.phase = Phase.Idle;
    }

    function _verifyCommit(bytes32 commit, bytes calldata deck, bytes32 salt) internal pure {
        if (deck.length != 52) revert BadDeck();
        if (keccak256(abi.encodePacked(deck, salt)) != commit) revert BadDeck();
        uint64 seen;
        for (uint256 i = 0; i < 52; i++) {
            uint8 card = uint8(deck[i]);
            if (card > 51) revert BadDeck();
            uint64 bit = uint64(1) << card;
            if (seen & bit != 0) revert BadDeck();
            seen |= bit;
        }
    }

    function _sevenCards(uint8[2] memory holes) internal view returns (uint8[7] memory cards) {
        cards[0] = holes[0];
        cards[1] = holes[1];
        for (uint256 i = 0; i < 5; i++) {
            cards[2 + i] = hand.community[i];
        }
    }

    function _seatOf(address player) internal view returns (uint8) {
        if (players[0] == player) return 0;
        if (players[1] == player) return 1;
        revert NotSeated();
    }

}
