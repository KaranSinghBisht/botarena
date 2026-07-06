// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PokerTable} from "../src/PokerTable.sol";

/// Usage:
///   DEALER_PRIVATE_KEY=0x... forge script script/Deploy.s.sol \
///     --rpc-url https://rpc.bohr.life --broadcast
/// Blind sizes are overridable via SMALL_BLIND / BIG_BLIND / MIN_BUY_IN (wei).
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEALER_PRIVATE_KEY");
        uint256 smallBlind = vm.envOr("SMALL_BLIND", uint256(0.001 ether));
        uint256 bigBlind = vm.envOr("BIG_BLIND", uint256(0.002 ether));
        uint256 minBuyIn = vm.envOr("MIN_BUY_IN", uint256(0.05 ether));

        vm.startBroadcast(pk);
        PokerTable table = new PokerTable(vm.addr(pk), smallBlind, bigBlind, minBuyIn);
        vm.stopBroadcast();

        console2.log("PokerTable deployed:", address(table));
        console2.log("dealer:", vm.addr(pk));
    }
}
