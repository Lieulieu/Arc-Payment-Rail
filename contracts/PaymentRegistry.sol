// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PaymentRegistry
/// @notice Permissionless onchain registry for recording AI agent payment call receipts.
/// @dev This contract stores immutable call records keyed by callId. It does not hold or transfer funds.
contract PaymentRegistry {
    /// @notice One recorded AI call payment receipt.
    /// @param payer Address associated with payment for the call.
    /// @param recorder Address that submitted the record.
    /// @param timestamp Block timestamp when the record was written.
    /// @param amount Payment amount in USDC 6-decimal base units.
    /// @param promptHash keccak256 hash of the prompt.
    /// @param callId Unique call identifier, expected to be keccak256 of the string call ID from the off-chain system.
    struct Record {
        address payer;
        address recorder;
        uint40 timestamp;
        uint96 amount;
        bytes32 promptHash;
        bytes32 callId;
    }

    /// @notice Reverts when attempting to register a callId that already exists.
    /// @param callId The duplicate call identifier, expected to be keccak256 of the string call ID from the off-chain system.
    error DuplicateCallId(bytes32 callId);

    /// @notice Reverts when payer is the zero address.
    error ZeroPayer();

    /// @notice Reverts when amount is zero.
    error ZeroAmount();

    /// @notice Reverts when callId is bytes32(0).
    error ZeroCallId();

    /// @notice Reverts when a call index is out of bounds.
    /// @param index The requested index.
    error IndexOutOfBounds(uint256 index);

    /// @notice Emitted when a new call payment record is written.
    /// @param payer Address associated with payment for the call.
    /// @param recorder Address that submitted the record.
    /// @param timestamp Block timestamp when the record was written.
    /// @param amount Payment amount in USDC 6-decimal base units.
    /// @param promptHash keccak256 hash of the prompt.
    /// @param callId Unique call identifier, expected to be keccak256 of the string call ID from the off-chain system.
    event CallRecorded(
        address indexed payer,
        address recorder,
        uint40 timestamp,
        uint96 amount,
        bytes32 promptHash,
        bytes32 indexed callId
    );

    mapping(bytes32 => Record) private _records;
    mapping(bytes32 => bool) private _recorded;
    bytes32[] private _callIds;
    mapping(address => bytes32[]) private _payerCallIds;
    uint256 private _callCount;

    /// @notice Records a new payment call receipt.
    /// @dev Callable by any address. Reverts if callId was already recorded.
    /// @param payer Address associated with payment for the call.
    /// @param amount Payment amount in USDC 6-decimal base units.
    /// @param promptHash keccak256 hash of the prompt.
    /// @param callId Unique call identifier, expected to be keccak256 of the string call ID from the off-chain system.
    function recordCall(address payer, uint96 amount, bytes32 promptHash, bytes32 callId) external {
        if (payer == address(0)) revert ZeroPayer();
        if (amount == 0) revert ZeroAmount();
        if (callId == bytes32(0)) revert ZeroCallId();
        if (_recorded[callId]) revert DuplicateCallId(callId);

        Record memory record = Record({
            payer: payer,
            recorder: msg.sender,
            timestamp: uint40(block.timestamp),
            amount: amount,
            promptHash: promptHash,
            callId: callId
        });

        _records[callId] = record;
        _recorded[callId] = true;
        _callIds.push(callId);
        _payerCallIds[payer].push(callId);
        _callCount += 1;

        emit CallRecorded(record.payer, record.recorder, record.timestamp, record.amount, record.promptHash, record.callId);
    }

    /// @notice Returns the record associated with a callId.
    /// @param callId Unique call identifier, expected to be keccak256 of the string call ID from the off-chain system.
    /// @return Full record for the supplied callId.
    function getRecord(bytes32 callId) external view returns (Record memory) {
        return _records[callId];
    }

    /// @notice Returns the record at a specific global index.
    /// @param index Zero-based index into the global call list.
    /// @return Full record for the call at the supplied index.
    function getCall(uint256 index) external view returns (Record memory) {
        if (index >= _callIds.length) revert IndexOutOfBounds(index);
        return _records[_callIds[index]];
    }

    /// @notice Returns a paginated set of call records for a payer.
    /// @param payer Address associated with payment for the calls.
    /// @param offset Zero-based starting index into the payer call list.
    /// @param limit Maximum number of records to return.
    /// @return records Paginated call records for the payer.
    function getCallsByPayer(address payer, uint256 offset, uint256 limit) external view returns (Record[] memory records) {
        bytes32[] storage payerCallIds = _payerCallIds[payer];
        uint256 payerCallCount = payerCallIds.length;

        if (offset >= payerCallCount) {
            return new Record[](0);
        }

        uint256 end = offset + limit;
        if (end > payerCallCount) {
            end = payerCallCount;
        }

        uint256 length = end - offset;
        records = new Record[](length);

        for (uint256 i = 0; i < length; ++i) {
            records[i] = _records[payerCallIds[offset + i]];
        }
    }

    /// @notice Returns the total number of successfully recorded calls.
    /// @return Total call count.
    function getCallCount() external view returns (uint256) {
        return _callCount;
    }
}
