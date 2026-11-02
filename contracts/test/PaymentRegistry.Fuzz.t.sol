// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PaymentRegistryTestBase} from "./PaymentRegistry.Base.t.sol";
import {PaymentRegistry} from "../PaymentRegistry.sol";

contract PaymentRegistryFuzzTest is PaymentRegistryTestBase {

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: recordCall — valid inputs never revert
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Any non-zero payer, non-zero amount, non-zero callId should succeed
    ///      exactly once, regardless of promptHash.
    function testFuzz_RecordCall_ValidInputs_NeverReverts(
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId
    ) public {
        // Bound to valid domain (guards that mirror the contract's checks)
        vm.assume(payer   != address(0));
        vm.assume(amount  != 0);
        vm.assume(callId  != bytes32(0));

        // Should not revert
        registry.recordCall(payer, amount, promptHash, callId);

        // Post-state: record stored correctly
        PaymentRegistry.Record memory r = registry.getRecord(callId);
        assertEq(r.payer,      payer);
        assertEq(r.recorder,   address(this));
        assertEq(r.amount,     amount);
        assertEq(r.promptHash, promptHash);
        assertEq(r.callId,     callId);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: recordCall — call count increments by exactly 1
    // ══════════════════════════════════════════════════════════════════════════

    function testFuzz_RecordCall_AlwaysIncrementsCallCountByOne(
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId
    ) public {
        vm.assume(payer  != address(0));
        vm.assume(amount != 0);
        vm.assume(callId != bytes32(0));

        uint256 before = registry.getCallCount();
        registry.recordCall(payer, amount, promptHash, callId);
        assertEq(registry.getCallCount(), before + 1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: recordCall — payer bucket grows by exactly 1
    // ══════════════════════════════════════════════════════════════════════════

    function testFuzz_RecordCall_PayerBucketGrowsByOne(
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId
    ) public {
        vm.assume(payer  != address(0));
        vm.assume(amount != 0);
        vm.assume(callId != bytes32(0));

        uint256 before = registry.getCallsByPayer(payer, 0, type(uint256).max).length;
        registry.recordCall(payer, amount, promptHash, callId);
        uint256 after_ = registry.getCallsByPayer(payer, 0, type(uint256).max).length;
        assertEq(after_, before + 1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: duplicate callId always reverts with DuplicateCallId
    // ══════════════════════════════════════════════════════════════════════════

    function testFuzz_RecordCall_DuplicateCallId_AlwaysReverts(
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId,
        address payer2,
        uint96  amount2,
        bytes32 promptHash2
    ) public {
        vm.assume(payer  != address(0));
        vm.assume(amount != 0);
        vm.assume(callId != bytes32(0));
        vm.assume(payer2 != address(0));
        vm.assume(amount2 != 0);

        registry.recordCall(payer, amount, promptHash, callId);

        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.DuplicateCallId.selector, callId)
        );
        registry.recordCall(payer2, amount2, promptHash2, callId);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: recorder is always msg.sender, never payer
    // ══════════════════════════════════════════════════════════════════════════

    function testFuzz_RecordCall_RecorderIsAlwaysMsgSender(
        address caller,
        address payer,
        uint96  amount,
        bytes32 promptHash,
        bytes32 callId
    ) public {
        vm.assume(caller != address(0));
        vm.assume(payer  != address(0));
        vm.assume(amount != 0);
        vm.assume(callId != bytes32(0));

        vm.prank(caller);
        registry.recordCall(payer, amount, promptHash, callId);

        PaymentRegistry.Record memory r = registry.getRecord(callId);
        assertEq(r.recorder, caller);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: getCallsByPayer pagination never over-delivers
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Records `n` calls for a single payer then checks that
    ///      getCallsByPayer never returns more than `limit` records.
    function testFuzz_GetCallsByPayer_NeverExceedsLimit(
        uint8  n,
        uint8  offset,
        uint8  limit
    ) public {
        // Keep n small to avoid gas issues
        n = uint8(bound(n, 1, 10));

        // Record n calls for alice using unique call IDs derived from loop index
        for (uint256 i = 0; i < n; ++i) {
            bytes32 callId = keccak256(abi.encodePacked("fuzz-call", i));
            registry.recordCall(alice, AMOUNT_1, PROMPT_1, callId);
        }

        PaymentRegistry.Record[] memory recs =
            registry.getCallsByPayer(alice, uint256(offset), uint256(limit));

        // Result must never exceed limit
        assertLe(recs.length, uint256(limit));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: getCall at valid index always returns the right callId
    // ══════════════════════════════════════════════════════════════════════════

    function testFuzz_GetCall_ValidIndex_ReturnsCorrectRecord(uint8 n) public {
        n = uint8(bound(n, 1, 20));

        bytes32[] memory callIds = new bytes32[](n);
        for (uint256 i = 0; i < n; ++i) {
            callIds[i] = keccak256(abi.encodePacked("gc-fuzz", i));
            registry.recordCall(alice, AMOUNT_1, PROMPT_1, callIds[i]);
        }

        for (uint256 i = 0; i < n; ++i) {
            PaymentRegistry.Record memory r = registry.getCall(i);
            assertEq(r.callId, callIds[i]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Fuzz: amount stored exactly — no truncation between uint96 and Record
    // ══════════════════════════════════════════════════════════════════════════

    function testFuzz_RecordCall_AmountStoredExactly(uint96 amount) public {
        vm.assume(amount != 0);
        registry.recordCall(alice, amount, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.amount, amount);
    }
}
