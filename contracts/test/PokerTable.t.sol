// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PokerTable} from "../src/PokerTable.sol";

/// Card helper: card = suit * 13 + rank, rank 0=deuce .. 12=ace.
/// Decks below are crafted so the intended winner holds strictly higher-ranked
/// hole cards AND the stronger poker hand — correct under both the placeholder
/// evaluator (rank sum) and the real one.
contract PokerTableTest is Test {
    PokerTable table;

    address dealer = makeAddr("dealer");
    address alice = makeAddr("alice"); // joins first -> seat 0
    address bob = makeAddr("bob"); // seat 1

    uint256 constant SB = 1 ether;
    uint256 constant BB = 2 ether;
    uint256 constant BUYIN = 200 ether;
    bytes32 constant SALT = keccak256("salt");

    function setUp() public {
        table = new PokerTable(dealer, SB, BB, 10 ether);
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
        vm.prank(alice);
        table.join{value: BUYIN}();
        vm.prank(bob);
        table.join{value: BUYIN}();
    }

    // ------------------------------------------------------------- helpers

    /// Builds a full 52-card deck with `firstNine` in dealing positions and the
    /// remaining cards appended in ascending order.
    function _deck(uint8[9] memory firstNine) internal pure returns (bytes memory deck) {
        bool[52] memory used;
        deck = new bytes(52);
        for (uint256 i = 0; i < 9; i++) {
            deck[i] = bytes1(firstNine[i]);
            used[firstNine[i]] = true;
        }
        uint256 idx = 9;
        for (uint8 c = 0; c < 52; c++) {
            if (!used[c]) {
                deck[idx++] = bytes1(c);
            }
        }
    }

    /// seat0 gets AA (full house on this board), seat1 gets 2♥4♣ junk.
    /// Board: A♦ K♥ K♣ 7♠ 3♦  -> seat0: AAAKK, seat1: KK with weak kickers.
    function _seat0WinsDeck() internal pure returns (bytes memory) {
        return _deck(
            [
                uint8(12), // A♠ seat0
                uint8(25), // A♥ seat0
                uint8(0), // 2♠ seat1
                uint8(15), // 4♥ seat1
                uint8(38), // A♦ flop
                uint8(24), // K♥ flop
                uint8(37), // K♦ flop
                uint8(5), // 7♠ turn
                uint8(27) // 3♦ river
            ]
        );
    }

    /// Both seats play the board (broadway A K Q J T on board, junk holes with
    /// equal rank sums): split pot under both evaluators.
    function _splitDeck() internal pure returns (bytes memory) {
        return _deck(
            [
                uint8(0), // 2♠ seat0
                uint8(14), // 3♥ seat0
                uint8(13), // 2♥ seat1
                uint8(1), // 3♠ seat1
                uint8(12), // A♠ flop
                uint8(24), // K♥ flop
                uint8(36), // Q♦ flop
                uint8(48), // J♣ turn
                uint8(8) // T♠ river
            ]
        );
    }

    function _commit(bytes memory deck) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(deck, SALT));
    }

    function _start(bytes memory deck) internal {
        vm.prank(dealer);
        table.startHand(_commit(deck));
    }

    function _act(address who, PokerTable.Action a, uint256 amount) internal {
        vm.prank(who);
        table.act(a, amount, "", "");
    }

    function _reveal(bytes memory deck, uint256 from, uint256 count) internal {
        uint8[] memory cards = new uint8[](count);
        for (uint256 i = 0; i < count; i++) {
            cards[i] = uint8(deck[from + i]);
        }
        vm.prank(dealer);
        table.revealStreet(cards);
    }

    /// Plays a passive hand to the river: call/check preflop, check-check all streets.
    function _toRiver(bytes memory deck) internal {
        _act(alice, PokerTable.Action.Call, 0); // seat0 has button on hand 1
        _act(bob, PokerTable.Action.Check, 0);
        _reveal(deck, 4, 3);
        _act(bob, PokerTable.Action.Check, 0);
        _act(alice, PokerTable.Action.Check, 0);
        _reveal(deck, 7, 1);
        _act(bob, PokerTable.Action.Check, 0);
        _act(alice, PokerTable.Action.Check, 0);
        _reveal(deck, 8, 1);
        _act(bob, PokerTable.Action.Check, 0);
        _act(alice, PokerTable.Action.Check, 0);
    }

    function _phase() internal view returns (PokerTable.Phase p) {
        (PokerTable.Hand memory h,,) = table.getHand();
        return h.phase;
    }

    // ------------------------------------------------------------- lifecycle

    function test_startHand_postsBlinds() public {
        _start(_seat0WinsDeck());
        (PokerTable.Hand memory h,, uint256[2] memory st) = table.getHand();
        assertEq(uint8(h.phase), uint8(PokerTable.Phase.Betting));
        assertEq(h.button, 0);
        assertEq(h.toAct, 0);
        assertEq(h.betToMatch, BB);
        assertEq(st[0], BUYIN - SB);
        assertEq(st[1], BUYIN - BB);
        assertEq(h.id, 1);
    }

    function test_fullHand_showdown_seat0Wins() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _toRiver(deck);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.AwaitShowdown));

        vm.prank(dealer);
        table.showdown(deck, SALT);

        (,, uint256[2] memory st) = table.getHand();
        assertEq(st[0], BUYIN + BB); // won bob's big blind
        assertEq(st[1], BUYIN - BB);
        (, uint32 won,) = table.stats(alice);
        assertEq(won, 1);
    }

    function test_splitPot() public {
        bytes memory deck = _splitDeck();
        _start(deck);
        _toRiver(deck);
        vm.prank(dealer);
        table.showdown(deck, SALT);
        (,, uint256[2] memory st) = table.getHand();
        assertEq(st[0], BUYIN);
        assertEq(st[1], BUYIN);
    }

    function test_fold_awardsPot() public {
        _start(_seat0WinsDeck());
        _act(alice, PokerTable.Action.Fold, 0);
        (,, uint256[2] memory st) = table.getHand();
        assertEq(st[0], BUYIN - SB);
        assertEq(st[1], BUYIN + SB);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.Idle));
    }

    function test_betting_raiseAndCall() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Raise, 6 ether); // raise to 6
        _act(bob, PokerTable.Action.Raise, 18 ether); // 3-bet to 18
        _act(alice, PokerTable.Action.Call, 0);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.AwaitReveal));
        _reveal(deck, 4, 3);
        (PokerTable.Hand memory h,,) = table.getHand();
        assertEq(h.pot, 36 ether);
        assertEq(h.toAct, 1); // out of position first postflop
    }

    function test_buttonAlternates_and_handIdIncrements() public {
        _start(_seat0WinsDeck());
        _act(alice, PokerTable.Action.Fold, 0);
        _start(_seat0WinsDeck());
        (PokerTable.Hand memory h,,) = table.getHand();
        assertEq(h.button, 1);
        assertEq(h.id, 2);
        assertEq(h.toAct, 1); // new button acts first preflop
    }

    // ------------------------------------------------------------- all-in

    function test_allIn_fastForwardsToShowdown() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Raise, BUYIN); // shove
        _act(bob, PokerTable.Action.Call, 0);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.AwaitReveal));
        _reveal(deck, 4, 3);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.AwaitReveal)); // still locked
        _reveal(deck, 7, 1);
        _reveal(deck, 8, 1);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.AwaitShowdown));
        vm.prank(dealer);
        table.showdown(deck, SALT);
        (,, uint256[2] memory st) = table.getHand();
        assertEq(st[0], 2 * BUYIN);
        assertEq(st[1], 0);
    }

    function test_shortAllInCall_refundsExcess() public {
        // bob tops up so stacks are unequal: alice 200, bob 500
        vm.deal(bob, 300 ether);
        vm.prank(bob);
        table.topUp{value: 300 ether}();
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Call, 0);
        _act(bob, PokerTable.Action.Raise, 500 ether); // covers alice
        _act(alice, PokerTable.Action.Call, 0); // all-in short call, 200 total
        (PokerTable.Hand memory h,, uint256[2] memory st) = table.getHand();
        assertEq(st[1], 300 ether); // uncalled 300 returned to bob
        assertEq(st[0], 0); // alice all-in
        assertEq(h.pot, 400 ether); // both matched at 200
        assertEq(uint8(h.phase), uint8(PokerTable.Phase.AwaitReveal));
    }

    // ------------------------------------------------------------- reverts

    function test_revert_outOfTurn() public {
        _start(_seat0WinsDeck());
        vm.prank(bob);
        vm.expectRevert(PokerTable.NotYourTurn.selector);
        table.act(PokerTable.Action.Call, 0, "", "");
    }

    function test_revert_checkFacingBet() public {
        _start(_seat0WinsDeck());
        vm.prank(alice);
        vm.expectRevert(PokerTable.IllegalAction.selector);
        table.act(PokerTable.Action.Check, 0, "", "");
    }

    function test_revert_raiseBelowMin() public {
        _start(_seat0WinsDeck());
        vm.prank(alice);
        vm.expectRevert(PokerTable.BadAmount.selector);
        table.act(PokerTable.Action.Raise, 3 ether, "", ""); // min raise-to is 4
    }

    function test_revert_nonDealer() public {
        vm.expectRevert(PokerTable.NotDealer.selector);
        table.startHand(bytes32(0));
    }

    function test_revert_showdownWrongSalt() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _toRiver(deck);
        vm.prank(dealer);
        vm.expectRevert(PokerTable.BadDeck.selector);
        table.showdown(deck, keccak256("wrong salt"));
    }

    function test_revert_showdownDuplicateCardDeck() public {
        // commit honestly to a CORRUPT deck (card 10 appears twice); the
        // permutation check must reject it even though the commit matches
        bytes memory dup = _seat0WinsDeck();
        dup[9] = dup[10];
        _start(dup);
        _toRiver(dup);
        vm.prank(dealer);
        vm.expectRevert(PokerTable.BadDeck.selector);
        table.showdown(dup, SALT);
    }

    function test_revert_showdownCommunityMismatch() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Call, 0);
        _act(bob, PokerTable.Action.Check, 0);
        // dealer reveals a flop inconsistent with the committed deck
        uint8[] memory wrongFlop = new uint8[](3);
        wrongFlop[0] = uint8(deck[20]);
        wrongFlop[1] = uint8(deck[21]);
        wrongFlop[2] = uint8(deck[22]);
        vm.prank(dealer);
        table.revealStreet(wrongFlop);
        _act(bob, PokerTable.Action.Check, 0);
        _act(alice, PokerTable.Action.Check, 0);
        _reveal(deck, 7, 1);
        _act(bob, PokerTable.Action.Check, 0);
        _act(alice, PokerTable.Action.Check, 0);
        _reveal(deck, 8, 1);
        _act(bob, PokerTable.Action.Check, 0);
        _act(alice, PokerTable.Action.Check, 0);
        vm.prank(dealer);
        vm.expectRevert(PokerTable.BadDeck.selector);
        table.showdown(deck, SALT);
    }

    // ------------------------------------------------------------- timeouts

    function test_timeout_facingBet_folds() public {
        _start(_seat0WinsDeck());
        vm.warp(block.timestamp + 121);
        table.enforceTimeout(); // alice (SB, facing BB) folds
        (,, uint256[2] memory st) = table.getHand();
        assertEq(st[1], BUYIN + SB);
    }

    function test_timeout_noBet_checks() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Call, 0);
        _act(bob, PokerTable.Action.Check, 0);
        _reveal(deck, 4, 3);
        vm.warp(block.timestamp + 121);
        table.enforceTimeout(); // bob checks
        (PokerTable.Hand memory h,,) = table.getHand();
        assertEq(h.toAct, 0);
        assertEq(uint8(h.phase), uint8(PokerTable.Phase.Betting));
    }

    function test_timeout_dealerStall_refundsExactly() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Raise, 10 ether);
        _act(bob, PokerTable.Action.Call, 0);
        // dealer never reveals the flop
        vm.warp(block.timestamp + 301);
        table.enforceTimeout();
        (,, uint256[2] memory st) = table.getHand();
        assertEq(st[0], BUYIN);
        assertEq(st[1], BUYIN);
        assertEq(uint8(_phase()), uint8(PokerTable.Phase.Idle));
    }

    // ------------------------------------------------------------- audit

    function test_auditReveal_afterFold() public {
        bytes memory deck = _seat0WinsDeck();
        _start(deck);
        _act(alice, PokerTable.Action.Fold, 0);
        vm.prank(dealer);
        table.auditReveal(1, deck, SALT);

        vm.prank(dealer);
        vm.expectRevert(PokerTable.BadDeck.selector);
        table.auditReveal(1, deck, keccak256("bad"));
    }

    // ------------------------------------------------------------- seats

    function test_leave_paysOut() public {
        uint256 before = alice.balance;
        vm.prank(alice);
        table.leave();
        assertEq(alice.balance, before + BUYIN);
    }

    function test_leave_duringHand_reverts() public {
        _start(_seat0WinsDeck());
        vm.prank(alice);
        vm.expectRevert(PokerTable.HandInProgress.selector);
        table.leave();
    }
}
