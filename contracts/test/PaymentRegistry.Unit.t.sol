// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PaymentRegistryTestBase} from "./PaymentRegistry.Base.t.sol";
import {PaymentRegistry} from "../PaymentRegistry.sol";

contract PaymentRegistryUnitTest is PaymentRegistryTestBase {

    // ══════════════════════════════════════════════════════════════════════════
    // Deployment / initialisation
    // ══════════════════════════════════════════════════════════════════════════

    function test_Deploy_StartsWithZeroCallCount() public view {
        assertEq(registry.getCallCount(), 0);
    }

    function test_Deploy_GetCallRevertsOnEmptyRegistry() public {
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.IndexOutOfBounds.selector, 0)
        );
        registry.getCall(0);
    }

    function test_Deploy_GetRecordReturnsZeroStructForUnknownCallId() public view {
        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.payer,      address(0));
        assertEq(r.recorder,   address(0));
        assertEq(r.timestamp,  0);
        assertEq(r.amount,     0);
        assertEq(r.promptHash, bytes32(0));
        assertEq(r.callId,     bytes32(0));
    }

    function test_Deploy_GetCallsByPayerReturnsEmptyForUnknownPayer() public view {
        PaymentRegistry.Record[] memory recs =
            registry.getCallsByPayer(alice, 0, 10);
        assertEq(recs.length, 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // recordCall — happy path
    // ══════════════════════════════════════════════════════════════════════════

    function test_RecordCall_HappyPath_StoresCorrectFields() public {
        uint40 ts = uint40(block.timestamp);
        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);

        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.payer,      alice);
        assertEq(r.recorder,   recorder1);
        assertEq(r.timestamp,  ts);
        assertEq(r.amount,     AMOUNT_1);
        assertEq(r.promptHash, PROMPT_1);
        assertEq(r.callId,     CALL_ID_1);
    }

    function test_RecordCall_HappyPath_RecorderIsCallerNotPayer() public {
        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);

        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.recorder, recorder1);
        assertTrue(r.recorder != r.payer);
    }

    function test_RecordCall_HappyPath_ZeroPromptHashAllowed() public {
        vm.prank(recorder1);
        // promptHash == bytes32(0) is NOT guarded — should succeed
        registry.recordCall(alice, AMOUNT_1, bytes32(0), CALL_ID_1);
        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.promptHash, bytes32(0));
    }

    function test_RecordCall_HappyPath_MaxUint96AmountAllowed() public {
        uint96 maxAmt = type(uint96).max;
        vm.prank(recorder1);
        registry.recordCall(alice, maxAmt, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.amount, maxAmt);
    }

    function test_RecordCall_HappyPath_TimestampMatchesBlockTimestamp() public {
        vm.warp(1_700_000_000);
        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.timestamp, uint40(1_700_000_000));
    }

    function test_RecordCall_TwoDistinctCallIds_BothStoredIndependently() public {
        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        vm.prank(recorder2);
        registry.recordCall(bob,   AMOUNT_2, PROMPT_2, CALL_ID_2);

        PaymentRegistry.Record memory r1 = registry.getRecord(CALL_ID_1);
        PaymentRegistry.Record memory r2 = registry.getRecord(CALL_ID_2);

        assertEq(r1.payer,  alice);
        assertEq(r1.amount, AMOUNT_1);
        assertEq(r2.payer,  bob);
        assertEq(r2.amount, AMOUNT_2);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // recordCall — revert paths
    // ══════════════════════════════════════════════════════════════════════════

    function test_RecordCall_Reverts_ZeroPayer() public {
        vm.expectRevert(PaymentRegistry.ZeroPayer.selector);
        registry.recordCall(address(0), AMOUNT_1, PROMPT_1, CALL_ID_1);
    }

    function test_RecordCall_Reverts_ZeroAmount() public {
        vm.expectRevert(PaymentRegistry.ZeroAmount.selector);
        registry.recordCall(alice, 0, PROMPT_1, CALL_ID_1);
    }

    function test_RecordCall_Reverts_ZeroCallId() public {
        vm.expectRevert(PaymentRegistry.ZeroCallId.selector);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, bytes32(0));
    }

    function test_RecordCall_Reverts_DuplicateCallId() public {
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.DuplicateCallId.selector, CALL_ID_1)
        );
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
    }

    function test_RecordCall_Reverts_DuplicateCallId_DifferentPayer() public {
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.DuplicateCallId.selector, CALL_ID_1)
        );
        // same callId, different payer — still a duplicate
        registry.recordCall(bob, AMOUNT_2, PROMPT_2, CALL_ID_1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // recordCall — event emission
    // ══════════════════════════════════════════════════════════════════════════

    function test_RecordCall_EmitsCallRecordedEvent() public {
        uint40 ts = uint40(block.timestamp);

        // payer (indexed), callId (indexed) — check both indexed + data
        vm.expectEmit(true, true, false, true, address(registry));
        emit PaymentRegistry.CallRecorded(
            alice,
            recorder1,
            ts,
            AMOUNT_1,
            PROMPT_1,
            CALL_ID_1
        );

        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
    }

    function test_RecordCall_EmitsCallRecorded_RecorderFieldIsCallerNotPayer() public {
        uint40 ts = uint40(block.timestamp);

        // recorder1 calls on behalf of alice — recorder in event must be recorder1
        vm.expectEmit(true, true, false, true, address(registry));
        emit PaymentRegistry.CallRecorded(
            alice,
            recorder1,   // <-- the actual msg.sender
            ts,
            AMOUNT_1,
            PROMPT_1,
            CALL_ID_1
        );

        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // getRecord
    // ══════════════════════════════════════════════════════════════════════════

    function test_GetRecord_ReturnsCorrectRecord() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record memory r = registry.getRecord(CALL_ID_1);
        assertEq(r.payer,      alice);
        assertEq(r.recorder,   recorder1);
        assertEq(r.amount,     AMOUNT_1);
        assertEq(r.promptHash, PROMPT_1);
        assertEq(r.callId,     CALL_ID_1);
    }

    function test_GetRecord_UnknownCallIdReturnsZeroStruct() public view {
        PaymentRegistry.Record memory r = registry.getRecord(keccak256("unknown"));
        assertEq(r.payer, address(0));
        assertEq(r.amount, 0);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // getCallCount
    // ══════════════════════════════════════════════════════════════════════════

    function test_GetCallCount_StartsAtZero() public view {
        assertEq(registry.getCallCount(), 0);
    }

    function test_GetCallCount_IncrementsAfterEachRecord() public {
        assertEq(registry.getCallCount(), 0);
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        assertEq(registry.getCallCount(), 1);
        _record(recorder1, alice, AMOUNT_2, PROMPT_2, CALL_ID_2);
        assertEq(registry.getCallCount(), 2);
    }

    function test_GetCallCount_DoesNotIncrementOnRevert() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        // attempt duplicate — should revert without changing count
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.DuplicateCallId.selector, CALL_ID_1)
        );
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        assertEq(registry.getCallCount(), 1);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // getCall
    // ══════════════════════════════════════════════════════════════════════════

    function test_GetCall_ReturnsRecordAtIndex0() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record memory r = registry.getCall(0);
        assertEq(r.callId, CALL_ID_1);
        assertEq(r.payer,  alice);
    }

    function test_GetCall_ReturnsRecordAtIndex1() public {
        _record(recorder1, alice,  AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder2, bob,    AMOUNT_2, PROMPT_2, CALL_ID_2);
        PaymentRegistry.Record memory r = registry.getCall(1);
        assertEq(r.callId, CALL_ID_2);
        assertEq(r.payer,  bob);
    }

    function test_GetCall_PreservesInsertionOrder() public {
        _record(recorder1, alice,   AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder2, bob,     AMOUNT_2, PROMPT_2, CALL_ID_2);
        _record(recorder1, charlie, AMOUNT_1, PROMPT_1, CALL_ID_3);

        assertEq(registry.getCall(0).callId, CALL_ID_1);
        assertEq(registry.getCall(1).callId, CALL_ID_2);
        assertEq(registry.getCall(2).callId, CALL_ID_3);
    }

    function test_GetCall_RevertsOnIndexEqualToLength() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        // length == 1, so index 1 is out of bounds
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.IndexOutOfBounds.selector, 1)
        );
        registry.getCall(1);
    }

    function test_GetCall_RevertsOnIndexFarBeyondLength() public {
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.IndexOutOfBounds.selector, 999)
        );
        registry.getCall(999);
    }

    function test_GetCall_RevertsIndexOutOfBounds_CarriesIndex() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        uint256 badIdx = 42;
        vm.expectRevert(
            abi.encodeWithSelector(PaymentRegistry.IndexOutOfBounds.selector, badIdx)
        );
        registry.getCall(badIdx);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // getCallsByPayer — pagination happy path
    // ══════════════════════════════════════════════════════════════════════════

    function test_GetCallsByPayer_HappyPath_SingleRecord() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 0, 10);
        assertEq(recs.length, 1);
        assertEq(recs[0].callId, CALL_ID_1);
    }

    function test_GetCallsByPayer_HappyPath_FullPage() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder1, alice, AMOUNT_2, PROMPT_2, CALL_ID_2);
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_3);

        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 0, 10);
        assertEq(recs.length, 3);
        assertEq(recs[0].callId, CALL_ID_1);
        assertEq(recs[1].callId, CALL_ID_2);
        assertEq(recs[2].callId, CALL_ID_3);
    }

    function test_GetCallsByPayer_Pagination_LimitClipsResult() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder1, alice, AMOUNT_2, PROMPT_2, CALL_ID_2);
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_3);

        // limit=2 → first two
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 0, 2);
        assertEq(recs.length, 2);
        assertEq(recs[0].callId, CALL_ID_1);
        assertEq(recs[1].callId, CALL_ID_2);
    }

    function test_GetCallsByPayer_Pagination_OffsetSkipsLeadingRecords() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder1, alice, AMOUNT_2, PROMPT_2, CALL_ID_2);
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_3);

        // offset=1 → records[1], records[2]
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 1, 10);
        assertEq(recs.length, 2);
        assertEq(recs[0].callId, CALL_ID_2);
        assertEq(recs[1].callId, CALL_ID_3);
    }

    function test_GetCallsByPayer_EmptyWhenOffsetEqualsLength() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        // offset == length (1) → empty
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 1, 10);
        assertEq(recs.length, 0);
    }

    function test_GetCallsByPayer_EmptyWhenOffsetExceedsLength() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 999, 10);
        assertEq(recs.length, 0);
    }

    function test_GetCallsByPayer_EmptyForPayerWithNoRecords() public view {
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(bob, 0, 10);
        assertEq(recs.length, 0);
    }

    function test_GetCallsByPayer_ZeroLimitReturnsEmptySlice() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 0, 0);
        assertEq(recs.length, 0);
    }

    function test_GetCallsByPayer_MultiplePayersAreIndependent() public {
        // alice has 2 records, bob has 1
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder1, alice, AMOUNT_2, PROMPT_2, CALL_ID_2);
        _record(recorder2, bob,   AMOUNT_1, PROMPT_1, CALL_ID_3);

        PaymentRegistry.Record[] memory aliceRecs = registry.getCallsByPayer(alice, 0, 10);
        PaymentRegistry.Record[] memory bobRecs   = registry.getCallsByPayer(bob,   0, 10);

        assertEq(aliceRecs.length, 2);
        assertEq(bobRecs.length,   1);

        // ensure no cross-contamination
        assertEq(aliceRecs[0].callId, CALL_ID_1);
        assertEq(aliceRecs[1].callId, CALL_ID_2);
        assertEq(bobRecs[0].callId,   CALL_ID_3);
    }

    function test_GetCallsByPayer_RecordsForSamePayerByDifferentRecorders() public {
        vm.prank(recorder1);
        registry.recordCall(alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        vm.prank(recorder2);
        registry.recordCall(alice, AMOUNT_2, PROMPT_2, CALL_ID_2);

        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 0, 10);
        assertEq(recs.length, 2);
        assertEq(recs[0].recorder, recorder1);
        assertEq(recs[1].recorder, recorder2);
    }

    function test_GetCallsByPayer_LastPagePartialResult() public {
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_1);
        _record(recorder1, alice, AMOUNT_2, PROMPT_2, CALL_ID_2);
        _record(recorder1, alice, AMOUNT_1, PROMPT_1, CALL_ID_3);

        // page size 2, offset=2 → only the last record
        PaymentRegistry.Record[] memory recs = registry.getCallsByPayer(alice, 2, 2);
        assertEq(recs.length, 1);
        assertEq(recs[0].callId, CALL_ID_3);
    }
}
