// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PaymentRegistry} from "../PaymentRegistry.sol";

/// @dev Shared fixture for all PaymentRegistry test categories.
///      No test/fuzz/invariant functions here — each category file inherits this.
abstract contract PaymentRegistryTestBase is Test {
    PaymentRegistry internal registry;

    // Labelled actor addresses
    address internal alice   = makeAddr("alice");
    address internal bob     = makeAddr("bob");
    address internal charlie = makeAddr("charlie");
    address internal recorder1 = makeAddr("recorder1");
    address internal recorder2 = makeAddr("recorder2");

    // Canonical test values
    uint96  internal constant AMOUNT_1  = 1_000_000;   // 1 USDC (6 dec)
    uint96  internal constant AMOUNT_2  = 500_000;     // 0.50 USDC
    bytes32 internal constant PROMPT_1  = keccak256("prompt one");
    bytes32 internal constant PROMPT_2  = keccak256("prompt two");
    bytes32 internal constant CALL_ID_1 = keccak256("call-id-1");
    bytes32 internal constant CALL_ID_2 = keccak256("call-id-2");
    bytes32 internal constant CALL_ID_3 = keccak256("call-id-3");

    function setUp() public virtual {
        registry = new PaymentRegistry();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /// Record a single call from `recorder` and return the timestamp used.
    function _record(
        address recorder,
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId
    ) internal returns (uint40 ts) {
        ts = uint40(block.timestamp);
        vm.prank(recorder);
        registry.recordCall(payer, amount, promptHash, callId);
    }
}
