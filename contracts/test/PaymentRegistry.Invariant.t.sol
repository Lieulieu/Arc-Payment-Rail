// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PaymentRegistry} from "../PaymentRegistry.sol";

/// @dev Stateful handler — forge calls its public functions in random order.
///      Does NOT inherit Test so forge cannot call setUp() on it as a target.
///      Bookkeeping is kept O(1) per invariant check to avoid timeout.
contract PaymentRegistryHandler {
    PaymentRegistry public immutable registry;

    /// Total successful recordCall() calls made through this handler.
    uint256 public successCount;

    /// Most recently recorded payer (used for spot-check invariant).
    address public lastPayer;
    /// Expected count for lastPayer bucket.
    uint256 public lastPayerExpectedCount;

    /// Per-payer expected count (used in sum invariant).
    mapping(address => uint256) public payerExpectedCount;
    /// Running sum of all per-payer counts (must equal successCount).
    uint256 public payerCountSum;

    /// Set of callIds already recorded — stored as a mapping for O(1) lookup.
    mapping(bytes32 => bool) public usedCallIds;

    constructor(PaymentRegistry _registry) {
        registry = _registry;
    }

    function handler_recordCall(
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId
    ) external {
        // Only submit calls that should succeed
        if (payer   == address(0)) return;
        if (amount  == 0)          return;
        if (callId  == bytes32(0)) return;
        if (usedCallIds[callId])   return;

        registry.recordCall(payer, amount, promptHash, callId);

        // Update bookkeeping after successful call
        usedCallIds[callId] = true;
        successCount += 1;

        payerExpectedCount[payer] += 1;
        payerCountSum += 1;

        lastPayer = payer;
        lastPayerExpectedCount = payerExpectedCount[payer];
    }
}

contract PaymentRegistryInvariantTest is Test {
    PaymentRegistry        internal registry;
    PaymentRegistryHandler internal handler;

    function setUp() public {
        registry = new PaymentRegistry();
        handler  = new PaymentRegistryHandler(registry);

        // Only the handler is a fuzz target — forge never calls registry directly
        targetContract(address(handler));
    }

    // ── Invariant 1 ──────────────────────────────────────────────────────────
    /// @dev getCallCount() must always equal the number of successful
    ///      recordCall()s the handler submitted.  O(1).
    function invariant_CallCountEqualsHandlerSuccessCount() public view {
        assertEq(registry.getCallCount(), handler.successCount());
    }

    // ── Invariant 2 ──────────────────────────────────────────────────────────
    /// @dev The last payer's bucket size must match the handler's expected count
    ///      for that payer.  O(1) — spot-checks the most recently touched payer.
    function invariant_LastPayerBucketConsistency() public view {
        address payer = handler.lastPayer();
        if (payer == address(0)) return; // no calls yet
        uint256 expected = handler.lastPayerExpectedCount();
        uint256 actual   = registry.getCallsByPayer(payer, 0, type(uint256).max).length;
        assertEq(actual, expected);
    }

    // ── Invariant 3 ──────────────────────────────────────────────────────────
    /// @dev The running sum of per-payer counts (tracked by handler) must equal
    ///      getCallCount().  O(1) — handler maintains the sum incrementally.
    function invariant_PayerCountSumEqualsGlobalCount() public view {
        assertEq(registry.getCallCount(), handler.payerCountSum());
    }

    // ── Invariant 4 ──────────────────────────────────────────────────────────
    /// @dev If any call exists, getCall(count-1) must return a record with
    ///      non-zero callId, and getCall(count) must revert.  O(1).
    function invariant_GetCallBoundsAreConsistent() public {
        uint256 count = registry.getCallCount();
        if (count > 0) {
            PaymentRegistry.Record memory r = registry.getCall(count - 1);
            assertTrue(r.callId != bytes32(0), "last record has zero callId");
        }
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.IndexOutOfBounds.selector, count)
        );
        registry.getCall(count);
    }
}
