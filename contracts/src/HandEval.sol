// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HandEval - 7-card Texas Hold'em hand evaluator
/// @notice Evaluates the best 5-card poker hand out of 7 cards and returns a
///         comparable integer score. Higher score == stronger hand. Two hands
///         that tie in poker terms (chopped pots) always produce the exact same
///         score, regardless of suits or the order the cards are passed in.
///
/// Card encoding (uint8 in [0, 51]):
///   rank = card % 13   (0=2, 1=3, 2=4, 3=5, 4=6, 5=7, 6=8, 7=9, 8=T, 9=J, 10=Q, 11=K, 12=A)
///   suit = card / 13   (0..3, suits carry no ranking)
///
/// Score encoding (fits in 24 bits):
///   score = (category << 20)
///         | (k1 << 16) | (k2 << 12) | (k3 << 8) | (k4 << 4) | k5
///
///   category: 8 straight flush, 7 four of a kind, 6 full house, 5 flush,
///             4 straight, 3 three of a kind, 2 two pair, 1 one pair, 0 high card
///
///   k1..k5:   rank nibbles (0..12) ordered by significance for the category;
///             every unused kicker slot is 0. Per category:
///               8 straight flush : k1 = straight high card                 (wheel A-2-3-4-5 -> k1 = 3)
///               7 four of a kind : k1 = quad rank,  k2 = kicker
///               6 full house     : k1 = trips rank, k2 = pair rank
///               5 flush          : k1..k5 = the five flush ranks, high to low
///               4 straight       : k1 = straight high card                 (wheel A-2-3-4-5 -> k1 = 3)
///               3 three of a kind: k1 = trips rank, k2..k3 = two kickers
///               2 two pair       : k1 = high pair, k2 = low pair, k3 = kicker
///               1 one pair       : k1 = pair rank, k2..k4 = three kickers
///               0 high card      : k1..k5 = the five ranks, high to low
library HandEval {
    /// @dev Rank groupings discovered while scanning the rank histogram. Each
    ///      field holds a rank in [0,12], or -1 when absent. Because the scan
    ///      walks ranks high-to-low, trips1 > trips2 and pair1 > pair2.
    struct Groups {
        int256 quad; // highest four-of-a-kind rank, or -1
        int256 trips1; // highest three-of-a-kind rank, or -1
        int256 trips2; // second three-of-a-kind rank, or -1
        int256 pair1; // highest pair rank, or -1
        int256 pair2; // second pair rank, or -1
    }

    /// @notice Evaluate the best 5-card hand out of 7 cards.
    /// @param cards seven cards, each a distinct value in [0, 51]
    /// @return score comparable hand strength; higher is a stronger hand
    function evaluate7(uint8[7] memory cards) internal pure returns (uint256 score) {
        (uint8[13] memory rankCnt, uint16[4] memory suitMask, uint16 allMask) = _hist(cards);
        Groups memory g = _groups(rankCnt);
        return _classify(suitMask, allMask, g);
    }

    /// @dev Build the rank-count array, per-suit rank bitmasks and the union of
    ///      all rank bits. A suit never holds a duplicate rank, so the popcount
    ///      of suitMask[s] equals the number of cards in suit s.
    function _hist(uint8[7] memory cards)
        private
        pure
        returns (uint8[13] memory rankCnt, uint16[4] memory suitMask, uint16 allMask)
    {
        for (uint256 i = 0; i < 7; i++) {
            uint8 card = cards[i];
            require(card < 52, "HandEval: card out of range");
            uint256 r = card % 13;
            rankCnt[r] += 1;
            suitMask[card / 13] |= uint16(1) << r;
            allMask |= uint16(1) << r;
        }
    }

    /// @dev Reduce the rank histogram to its quad / trips / pair groupings.
    function _groups(uint8[13] memory rankCnt) private pure returns (Groups memory g) {
        g = Groups(-1, -1, -1, -1, -1);
        for (int256 r = 12; r >= 0; r--) {
            uint8 c = rankCnt[uint256(r)];
            if (c == 4) {
                g.quad = r;
            } else if (c == 3) {
                if (g.trips1 < 0) g.trips1 = r;
                else g.trips2 = r;
            } else if (c == 2) {
                if (g.pair1 < 0) g.pair1 = r;
                else if (g.pair2 < 0) g.pair2 = r;
            }
        }
    }

    /// @dev Walk the categories from strongest to weakest and return the first
    ///      that the hand satisfies, so higher categories always win.
    function _classify(uint16[4] memory suitMask, uint16 allMask, Groups memory g)
        private
        pure
        returns (uint256)
    {
        int256 fSuit = _flushSuit(suitMask);

        // 8: straight flush - a straight living entirely within the flush suit.
        if (fSuit >= 0) {
            int256 sf = _straightHigh(suitMask[uint256(fSuit)]);
            if (sf >= 0) return _pack(8, uint256(sf), 0, 0, 0, 0);
        }
        // 7: four of a kind - quad rank, then the best of the other three cards.
        if (g.quad >= 0) {
            uint256 base = (uint256(7) << 20) | (uint256(g.quad) << 16);
            return base | _packTop(allMask & ~_bit(g.quad), 1, 12);
        }
        // 6: full house - trips plus the highest available pair (a second set of
        //    trips counts as that pair).
        if (g.trips1 >= 0) {
            int256 pairPart = g.trips2;
            if (g.pair1 > pairPart) pairPart = g.pair1;
            if (pairPart >= 0) return _pack(6, uint256(g.trips1), uint256(pairPart), 0, 0, 0);
        }
        // 5: flush - the five highest ranks of the flush suit.
        if (fSuit >= 0) {
            return (uint256(5) << 20) | _packTop(suitMask[uint256(fSuit)], 5, 16);
        }
        // 4: straight - highest run of five consecutive ranks (wheel allowed).
        int256 st = _straightHigh(allMask);
        if (st >= 0) return _pack(4, uint256(st), 0, 0, 0, 0);
        // 3: three of a kind - trips rank, then the two best kickers.
        if (g.trips1 >= 0) {
            uint256 base = (uint256(3) << 20) | (uint256(g.trips1) << 16);
            return base | _packTop(allMask & ~_bit(g.trips1), 2, 12);
        }
        // 2: two pair - two highest pairs, then the best remaining card (which
        //    may be a third pair's rank).
        if (g.pair1 >= 0 && g.pair2 >= 0) {
            uint256 base = (uint256(2) << 20) | (uint256(g.pair1) << 16) | (uint256(g.pair2) << 12);
            uint16 kickerMask = allMask & ~_bit(g.pair1) & ~_bit(g.pair2);
            return base | _packTop(kickerMask, 1, 8);
        }
        // 1: one pair - pair rank, then the three best kickers.
        if (g.pair1 >= 0) {
            uint256 base = (uint256(1) << 20) | (uint256(g.pair1) << 16);
            return base | _packTop(allMask & ~_bit(g.pair1), 3, 12);
        }
        // 0: high card - the five highest ranks.
        return _packTop(allMask, 5, 16);
    }

    /// @dev Return the first suit holding 5+ cards, or -1. At most one suit can
    ///      qualify in a 7-card hand (two flushes would need 10 cards).
    function _flushSuit(uint16[4] memory suitMask) private pure returns (int256) {
        for (uint256 s = 0; s < 4; s++) {
            if (_popcount(suitMask[s]) >= 5) return int256(s);
        }
        return -1;
    }

    /// @dev High card (rank) of the best straight in `mask`, or -1 if none.
    ///      Handles the wheel (A-2-3-4-5), whose high card is the 5 (rank 3).
    function _straightHigh(uint16 mask) private pure returns (int256) {
        for (int256 hi = 12; hi >= 4; hi--) {
            uint16 window = uint16(0x1F) << uint256(hi - 4); // five consecutive bits ending at hi
            if ((mask & window) == window) return hi;
        }
        uint16 wheel = uint16(1) | (uint16(1) << 1) | (uint16(1) << 2) | (uint16(1) << 3) | (uint16(1) << 12);
        if ((mask & wheel) == wheel) return int256(3);
        return -1;
    }

    /// @dev Number of set bits in a 16-bit word.
    function _popcount(uint16 x) private pure returns (uint256 count) {
        while (x != 0) {
            x &= x - 1;
            count++;
        }
    }

    /// @dev Single-bit rank mask for a non-negative rank.
    function _bit(int256 rank) private pure returns (uint16) {
        return uint16(1) << uint256(rank);
    }

    /// @dev Pack the `n` highest set-bit ranks of `mask` into nibbles, the
    ///      highest at bit `startShift` and each next one 4 bits lower.
    function _packTop(uint16 mask, uint256 n, uint256 startShift) private pure returns (uint256 bits) {
        uint256 found = 0;
        for (int256 r = 12; r >= 0 && found < n; r--) {
            if ((mask & (uint16(1) << uint256(r))) != 0) {
                bits |= uint256(r) << (startShift - 4 * found);
                found++;
            }
        }
    }

    /// @dev Assemble a full score from a category and its five kicker nibbles.
    function _pack(uint256 cat, uint256 k1, uint256 k2, uint256 k3, uint256 k4, uint256 k5)
        private
        pure
        returns (uint256)
    {
        return (cat << 20) | (k1 << 16) | (k2 << 12) | (k3 << 8) | (k4 << 4) | k5;
    }
}
