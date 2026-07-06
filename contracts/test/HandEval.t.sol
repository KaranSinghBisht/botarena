// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {HandEval} from "../src/HandEval.sol";

/// @notice Exhaustive tests for the 7-card Texas Hold'em evaluator.
/// Rank values: 0=2,1=3,2=4,3=5,4=6,5=7,6=8,7=9,8=T,9=J,10=Q,11=K,12=A.
/// Suits (0..3) carry no ranking.
contract HandEvalTest is Test {
    // Rank constants.
    uint8 constant R2 = 0;
    uint8 constant R3 = 1;
    uint8 constant R4 = 2;
    uint8 constant R5 = 3;
    uint8 constant R6 = 4;
    uint8 constant R7 = 5;
    uint8 constant R8 = 6;
    uint8 constant R9 = 7;
    uint8 constant RT = 8;
    uint8 constant RJ = 9;
    uint8 constant RQ = 10;
    uint8 constant RK = 11;
    uint8 constant RA = 12;

    // Category constants.
    uint256 constant STRAIGHT_FLUSH = 8;
    uint256 constant QUADS = 7;
    uint256 constant FULL_HOUSE = 6;
    uint256 constant FLUSH = 5;
    uint256 constant STRAIGHT = 4;
    uint256 constant TRIPS = 3;
    uint256 constant TWO_PAIR = 2;
    uint256 constant ONE_PAIR = 1;
    uint256 constant HIGH_CARD = 0;

    // --- helpers ---------------------------------------------------------

    /// @dev Build a card from a rank and suit.
    function card(uint8 rank, uint8 suit) internal pure returns (uint8) {
        return suit * 13 + rank;
    }

    /// @dev Build a 7-card hand.
    function hand(uint8 a, uint8 b, uint8 c, uint8 d, uint8 e, uint8 f, uint8 g)
        internal
        pure
        returns (uint8[7] memory h)
    {
        h[0] = a;
        h[1] = b;
        h[2] = c;
        h[3] = d;
        h[4] = e;
        h[5] = f;
        h[6] = g;
    }

    /// @dev Expected score builder mirroring the library's encoding.
    function sc(uint256 cat, uint256 k1, uint256 k2, uint256 k3, uint256 k4, uint256 k5)
        internal
        pure
        returns (uint256)
    {
        return (cat << 20) | (k1 << 16) | (k2 << 12) | (k3 << 8) | (k4 << 4) | k5;
    }

    function catOf(uint256 score) internal pure returns (uint256) {
        return score >> 20;
    }

    // ---------------------------------------------------------------------
    // Straight flush (category 8)
    // ---------------------------------------------------------------------

    function test_StraightFlush_Royal() public pure {
        // A-K-Q-J-T of suit 0; two off-suit junk cards.
        uint8[7] memory h = hand(
            card(RA, 0), card(RK, 0), card(RQ, 0), card(RJ, 0), card(RT, 0), card(R2, 1), card(R3, 1)
        );
        assertEq(HandEval.evaluate7(h), sc(STRAIGHT_FLUSH, RA, 0, 0, 0, 0));
    }

    function test_StraightFlush_Wheel() public pure {
        // A-2-3-4-5 suited -> high card is the 5 (rank 3). (edge case #1)
        uint8[7] memory h = hand(
            card(RA, 0), card(R2, 0), card(R3, 0), card(R4, 0), card(R5, 0), card(RK, 1), card(RQ, 1)
        );
        assertEq(HandEval.evaluate7(h), sc(STRAIGHT_FLUSH, R5, 0, 0, 0, 0));
    }

    function test_StraightFlush_SixCardSuit_DiffersFromOverallStraight() public pure {
        // Hearts (suit 0): 3,4,5,6,7,9 -> straight flush 3-4-5-6-7 (high = 7 = rank 5).
        // Adding 8 of suit 1 makes the OVERALL best straight 5-6-7-8-9 (rank 7),
        // which is NOT a flush. Straight flush must still win with its own high card.
        // (edge case #3)
        uint8[7] memory h = hand(
            card(R3, 0), card(R4, 0), card(R5, 0), card(R6, 0), card(R7, 0), card(R9, 0), card(R8, 1)
        );
        uint256 score = HandEval.evaluate7(h);
        assertEq(catOf(score), STRAIGHT_FLUSH);
        assertEq(score, sc(STRAIGHT_FLUSH, R7, 0, 0, 0, 0));
    }

    // ---------------------------------------------------------------------
    // Four of a kind (category 7)
    // ---------------------------------------------------------------------

    function test_Quads_KickerIsBestRemaining() public pure {
        // Four 7s + K,3,2 -> kicker is the K. (edge case #8)
        uint8[7] memory h = hand(
            card(R7, 0), card(R7, 1), card(R7, 2), card(R7, 3), card(RK, 0), card(R3, 0), card(R2, 1)
        );
        assertEq(HandEval.evaluate7(h), sc(QUADS, R7, RK, 0, 0, 0));
    }

    function test_Quads_KickerFromAmongPair() public pure {
        // Four 7s + pair of K + one junk: only one kicker card is used (the K).
        uint8[7] memory h = hand(
            card(R7, 0), card(R7, 1), card(R7, 2), card(R7, 3), card(RK, 0), card(RK, 1), card(R2, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(QUADS, R7, RK, 0, 0, 0));
    }

    // ---------------------------------------------------------------------
    // Full house (category 6)
    // ---------------------------------------------------------------------

    function test_FullHouse_TwoTrips_UsesHigherAsTrips() public pure {
        // Trip aces + trip kings + junk -> AAA over KK. (edge case #4)
        uint8[7] memory h = hand(
            card(RA, 0), card(RA, 1), card(RA, 2), card(RK, 0), card(RK, 1), card(RK, 2), card(R2, 3)
        );
        assertEq(HandEval.evaluate7(h), sc(FULL_HOUSE, RA, RK, 0, 0, 0));
    }

    function test_FullHouse_TripsPlusTwoPairs_UsesHigherPair() public pure {
        // Trip 5s + pair K + pair Q -> 555 over KK (higher pair wins). (edge case #5)
        uint8[7] memory h = hand(
            card(R5, 0), card(R5, 1), card(R5, 2), card(RK, 0), card(RK, 1), card(RQ, 0), card(RQ, 1)
        );
        assertEq(HandEval.evaluate7(h), sc(FULL_HOUSE, R5, RK, 0, 0, 0));
    }

    // ---------------------------------------------------------------------
    // Flush (category 5)
    // ---------------------------------------------------------------------

    function test_Flush_BeatsStraight_WhenBothPresent() public pure {
        // Suit 0 flush 2,5,7,9,J. Off-suit 8 and T complete 7-8-9-T-J straight.
        // No straight flush -> the flush must win (5 > 4). (edge case #2)
        uint8[7] memory h = hand(
            card(R2, 0), card(R5, 0), card(R7, 0), card(R9, 0), card(RJ, 0), card(R8, 1), card(RT, 2)
        );
        uint256 score = HandEval.evaluate7(h);
        assertEq(catOf(score), FLUSH);
        assertEq(score, sc(FLUSH, RJ, R9, R7, R5, R2));
    }

    function test_Flush_KickersAreTopFiveOfSuit() public pure {
        // Six hearts A,K,9,7,4,2 -> flush uses the top five (2 is dropped). (edge case #7)
        uint8[7] memory h = hand(
            card(RA, 0), card(RK, 0), card(R9, 0), card(R7, 0), card(R4, 0), card(R2, 0), card(R3, 1)
        );
        assertEq(HandEval.evaluate7(h), sc(FLUSH, RA, RK, R9, R7, R4));
    }

    // ---------------------------------------------------------------------
    // Straight (category 4)
    // ---------------------------------------------------------------------

    function test_Straight_Wheel_NotFlush() public pure {
        // A-2-3-4-5 across mixed suits -> straight, high card 5 (rank 3). (edge case #1)
        uint8[7] memory h = hand(
            card(RA, 0), card(R2, 1), card(R3, 2), card(R4, 3), card(R5, 0), card(RK, 1), card(RQ, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(STRAIGHT, R5, 0, 0, 0, 0));
    }

    function test_Straight_Broadway_NotFlush() public pure {
        // A-K-Q-J-T mixed suits -> highest straight, high card A (rank 12). (edge case #1)
        uint8[7] memory h = hand(
            card(RA, 0), card(RK, 1), card(RQ, 2), card(RJ, 3), card(RT, 0), card(R2, 1), card(R3, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(STRAIGHT, RA, 0, 0, 0, 0));
    }

    function test_Straight_NoWraparound_KA234() public pure {
        // K-A-2-3-4 must NOT be a straight (no wraparound). (edge case #11)
        uint8[7] memory h = hand(
            card(RK, 0), card(RA, 1), card(R2, 2), card(R3, 3), card(R4, 0), card(R8, 1), card(R9, 2)
        );
        uint256 score = HandEval.evaluate7(h);
        assertEq(catOf(score), HIGH_CARD);
        assertEq(score, sc(HIGH_CARD, RA, RK, R9, R8, R4));
    }

    function test_Straight_SixHighBeatsWheel() public pure {
        // 6-high straight (rank 4) beats the 5-high wheel (rank 3). (edge case #10)
        uint8[7] memory low = hand(
            card(R2, 0), card(R3, 1), card(R4, 2), card(R5, 3), card(R6, 0), card(RK, 1), card(RQ, 2)
        );
        uint8[7] memory wheel = hand(
            card(RA, 0), card(R2, 1), card(R3, 2), card(R4, 3), card(R5, 0), card(RK, 1), card(RQ, 2)
        );
        uint256 sLow = HandEval.evaluate7(low);
        uint256 sWheel = HandEval.evaluate7(wheel);
        assertEq(catOf(sLow), STRAIGHT);
        assertEq(catOf(sWheel), STRAIGHT);
        assertGt(sLow, sWheel);
    }

    function test_Straight_AceHighBeatsKingHigh() public pure {
        // A-high straight (rank 12) beats K-high straight (rank 11). (edge case #10)
        uint8[7] memory aceHigh = hand(
            card(RA, 0), card(RK, 1), card(RQ, 2), card(RJ, 3), card(RT, 0), card(R2, 1), card(R3, 2)
        );
        uint8[7] memory kingHigh = hand(
            card(RK, 0), card(RQ, 1), card(RJ, 2), card(RT, 3), card(R9, 0), card(R2, 1), card(R3, 2)
        );
        assertGt(HandEval.evaluate7(aceHigh), HandEval.evaluate7(kingHigh));
    }

    // ---------------------------------------------------------------------
    // Three of a kind (category 3)
    // ---------------------------------------------------------------------

    function test_Trips_TwoKickers() public pure {
        // Trip 8s + A,K kickers (plus lower junk).
        uint8[7] memory h = hand(
            card(R8, 0), card(R8, 1), card(R8, 2), card(RA, 3), card(RK, 0), card(R4, 1), card(R2, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(TRIPS, R8, RA, RK, 0, 0));
    }

    // ---------------------------------------------------------------------
    // Two pair (category 2)
    // ---------------------------------------------------------------------

    function test_TwoPair_ThreePairs_KickerIsThirdPairRank() public pure {
        // Pairs A,K,Q + a 2. Best two pairs are A & K; kicker is the Q (the
        // third pair's rank, which outranks the lone 2). (edge case #6)
        uint8[7] memory h = hand(
            card(RA, 0), card(RA, 1), card(RK, 0), card(RK, 1), card(RQ, 0), card(RQ, 1), card(R2, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(TWO_PAIR, RA, RK, RQ, 0, 0));
    }

    function test_TwoPair_ThreePairs_KickerIsHighSingleton() public pure {
        // Pairs 5,4,3 + a lone Ace. Kicker is the Ace, not the third pair.
        uint8[7] memory h = hand(
            card(R5, 0), card(R5, 1), card(R4, 0), card(R4, 1), card(R3, 0), card(R3, 1), card(RA, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(TWO_PAIR, R5, R4, RA, 0, 0));
    }

    // ---------------------------------------------------------------------
    // One pair (category 1)
    // ---------------------------------------------------------------------

    function test_OnePair_ThreeKickers() public pure {
        // Pair of K + A,Q,9 kickers (plus lower junk).
        uint8[7] memory h = hand(
            card(RK, 0), card(RK, 1), card(RA, 2), card(RQ, 3), card(R9, 0), card(R5, 1), card(R3, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(ONE_PAIR, RK, RA, RQ, R9, 0));
    }

    // ---------------------------------------------------------------------
    // High card (category 0)
    // ---------------------------------------------------------------------

    function test_HighCard_TopFive() public pure {
        uint8[7] memory h = hand(
            card(RA, 0), card(RK, 1), card(R9, 2), card(R7, 3), card(R5, 0), card(R3, 1), card(R2, 2)
        );
        assertEq(HandEval.evaluate7(h), sc(HIGH_CARD, RA, RK, R9, R7, R5));
    }

    // ---------------------------------------------------------------------
    // Chopped pots: identical best 5 -> identical score (edge case #9)
    // ---------------------------------------------------------------------

    function test_Chop_QuadsOnBoard_EqualScores() public pure {
        // Board plays: quad aces + K on the board dominate both players.
        uint8[7] memory p1 = hand(
            card(RA, 0), card(RA, 1), card(RA, 2), card(RA, 3), card(RK, 0), card(R2, 1), card(R3, 1)
        );
        uint8[7] memory p2 = hand(
            card(RA, 0), card(RA, 1), card(RA, 2), card(RA, 3), card(RK, 0), card(R5, 2), card(R6, 2)
        );
        uint256 s1 = HandEval.evaluate7(p1);
        uint256 s2 = HandEval.evaluate7(p2);
        assertEq(s1, s2);
        assertEq(s1, sc(QUADS, RA, RK, 0, 0, 0));
    }

    function test_Chop_StraightOnBoard_EqualScores() public pure {
        // Board 8-9-T-J-Q straight; neither player's hole cards extend it.
        uint8[7] memory p1 = hand(
            card(R8, 0), card(R9, 1), card(RT, 2), card(RJ, 3), card(RQ, 0), card(R2, 1), card(R3, 1)
        );
        uint8[7] memory p2 = hand(
            card(R8, 0), card(R9, 1), card(RT, 2), card(RJ, 3), card(RQ, 0), card(R3, 2), card(R4, 2)
        );
        uint256 s1 = HandEval.evaluate7(p1);
        uint256 s2 = HandEval.evaluate7(p2);
        assertEq(s1, s2);
        assertEq(catOf(s1), STRAIGHT);
        assertEq(s1, sc(STRAIGHT, RQ, 0, 0, 0, 0));
    }

    function test_Chop_SuitIndependence() public pure {
        // Same five flush ranks in different suits must tie exactly.
        uint8[7] memory spades = hand(
            card(RA, 0), card(RK, 0), card(R9, 0), card(R7, 0), card(R5, 0), card(R2, 1), card(R3, 1)
        );
        uint8[7] memory hearts = hand(
            card(RA, 1), card(RK, 1), card(R9, 1), card(R7, 1), card(R5, 1), card(R2, 2), card(R3, 2)
        );
        assertEq(HandEval.evaluate7(spades), HandEval.evaluate7(hearts));
    }

    // ---------------------------------------------------------------------
    // Full category ranking: strictly increasing across all nine categories.
    // ---------------------------------------------------------------------

    function test_CategoryRanking_StrictlyIncreasing() public pure {
        uint256[9] memory s;
        // 0 high card
        s[0] = HandEval.evaluate7(
            hand(card(RA, 0), card(RK, 1), card(R9, 2), card(R7, 3), card(R5, 0), card(R3, 1), card(R2, 2))
        );
        // 1 one pair
        s[1] = HandEval.evaluate7(
            hand(card(R2, 0), card(R2, 1), card(RK, 2), card(RQ, 3), card(R9, 0), card(R5, 1), card(R3, 2))
        );
        // 2 two pair
        s[2] = HandEval.evaluate7(
            hand(card(R2, 0), card(R2, 1), card(R3, 2), card(R3, 3), card(RK, 0), card(R9, 1), card(R5, 2))
        );
        // 3 three of a kind
        s[3] = HandEval.evaluate7(
            hand(card(R2, 0), card(R2, 1), card(R2, 2), card(RK, 3), card(R9, 0), card(R5, 1), card(R3, 2))
        );
        // 4 straight
        s[4] = HandEval.evaluate7(
            hand(card(R2, 0), card(R3, 1), card(R4, 2), card(R5, 3), card(R6, 0), card(R9, 1), card(RK, 2))
        );
        // 5 flush
        s[5] = HandEval.evaluate7(
            hand(card(RA, 0), card(RK, 0), card(R9, 0), card(R7, 0), card(R5, 0), card(R3, 1), card(R2, 2))
        );
        // 6 full house
        s[6] = HandEval.evaluate7(
            hand(card(R2, 0), card(R2, 1), card(R2, 2), card(R3, 3), card(R3, 0), card(RK, 1), card(R9, 2))
        );
        // 7 four of a kind
        s[7] = HandEval.evaluate7(
            hand(card(R2, 0), card(R2, 1), card(R2, 2), card(R2, 3), card(RK, 0), card(R9, 1), card(R5, 2))
        );
        // 8 straight flush
        s[8] = HandEval.evaluate7(
            hand(card(R2, 0), card(R3, 0), card(R4, 0), card(R5, 0), card(R6, 0), card(RK, 1), card(R9, 2))
        );

        for (uint256 i = 0; i < 9; i++) {
            assertEq(catOf(s[i]), i);
            if (i > 0) assertGt(s[i], s[i - 1]);
        }
    }

    // ---------------------------------------------------------------------
    // Fuzz: category bounds, 24-bit fit, and permutation invariance.
    // ---------------------------------------------------------------------

    function testFuzz_BoundsAndPermutationInvariance(uint256 seed) public pure {
        uint8[7] memory h = _deal(seed);
        uint256 score = HandEval.evaluate7(h);

        // Score never exceeds 24 bits; category never exceeds 8.
        assertEq(score >> 24, 0);
        assertLe(catOf(score), STRAIGHT_FLUSH);

        // Permuting the input must never change the score.
        uint8[7] memory rev = _permute(h, [uint8(6), 5, 4, 3, 2, 1, 0]);
        uint8[7] memory rot = _permute(h, [uint8(1), 2, 3, 4, 5, 6, 0]);
        uint8[7] memory mix = _permute(h, [uint8(3), 0, 5, 1, 6, 2, 4]);
        assertEq(HandEval.evaluate7(rev), score);
        assertEq(HandEval.evaluate7(rot), score);
        assertEq(HandEval.evaluate7(mix), score);
    }

    /// @dev Deal 7 distinct cards in [0,51] from a seed (linear probe on collision).
    function _deal(uint256 seed) internal pure returns (uint8[7] memory out) {
        bool[52] memory used;
        for (uint256 i = 0; i < 7; i++) {
            uint256 idx = uint256(keccak256(abi.encode(seed, i))) % 52;
            while (used[idx]) {
                idx = (idx + 1) % 52;
            }
            used[idx] = true;
            out[i] = uint8(idx);
        }
    }

    function _permute(uint8[7] memory h, uint8[7] memory p) internal pure returns (uint8[7] memory out) {
        for (uint256 i = 0; i < 7; i++) {
            out[i] = h[p[i]];
        }
    }

    // ---------------------------------------------------------------------
    // Gas snapshot.
    // ---------------------------------------------------------------------

    function test_Gas_Evaluate7() public view {
        uint8[7] memory h = hand(
            card(RA, 0), card(RK, 0), card(RQ, 0), card(RJ, 0), card(RT, 0), card(R2, 1), card(R3, 1)
        );
        uint256 g0 = gasleft();
        uint256 score = HandEval.evaluate7(h);
        uint256 g1 = gasleft();
        console2.log("evaluate7 gas (inlined):", g0 - g1);
        console2.log("score:", score);
        assertEq(catOf(score), STRAIGHT_FLUSH);
    }

    // ---------------------------------------------------------------------
    // Input validation.
    // ---------------------------------------------------------------------

    function test_RevertsOnOutOfRangeCard() public {
        uint8[7] memory h = hand(52, card(RK, 0), card(RQ, 0), card(RJ, 0), card(RT, 0), card(R2, 1), card(R3, 1));
        vm.expectRevert(bytes("HandEval: card out of range"));
        this.callEvaluate(h);
    }

    /// @dev External wrapper so `vm.expectRevert` can catch the library revert.
    function callEvaluate(uint8[7] memory h) external pure returns (uint256) {
        return HandEval.evaluate7(h);
    }
}
