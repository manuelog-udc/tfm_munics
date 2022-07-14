// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <=0.8.13;

import "./utils/RecoveryModuleUtils.sol";

contract RecoveryModule is RecoveryModuleUtils {

    string public constant NAME = "Recovery Module";
    string public constant VERSION = "1.0";

    event StartRecovery(address indexed safeAddress, address possibleOwner, uint date);
    event CompleteRecovery(address indexed safeAddress, address newOwner);
    event CancelRecovery(address indexed safeAddress, address owner, uint amountRecover);
    event ThresholdCounterIncremented(address indexed safeAddress, uint thresholdCounter);

    bool private recoveryStarted;
    uint private recoveryPayment;
    uint private waitingTime;

    constructor(GnosisSafe safe, uint _recoveryPayment, uint _waitingTime, VerifyingKeys memory verifyingKeys) 
        RecoveryModuleUtils(safe, verifyingKeys) {

        require(_waitingTime >= 86400);
        require(_recoveryPayment >= 0);
        recoveryStarted = false;
        recoveryPayment = _recoveryPayment;
        waitingTime = _waitingTime;
    }

    function startRecovery() external payable {
        require(!recoveryStarted, "[startRecovery]: Another recovery is in progress.");
        require(msg.value >= recoveryPayment, "[startRecovery]: Ether sent is lower than established payment.");
        require(!isSafeOwner(), "[startRecovery]: The sender is currently a owner of the Gnosis Safe.");
        recoveryStarted = true;
        recoveryData.addr = msg.sender;
        recoveryData.date = block.timestamp + waitingTime;
        setNonce();
        emit StartRecovery(safeAddress, msg.sender, recoveryData.date);
    }
    
    function completeRecovery(VerificationProof memory verificationProof, uint verifyingKeyIndex) external payable {
        require(recoveryStarted, "[completeRecovery]: The recovery wasn't started yet.");
        require(verifyingKeyIndex < verifyingKeysSize, "[completeRecovery]: Invalid verifying key index.");
        require(checkInactivity(), "[completeRecovery]: The Gnosis Safe had activity.");
        require(!isSafeOwner(), "[completeRecovery]: The sender is currently a owner of the Gnosis Safe.");
        require(msg.sender == recoveryData.addr, "[completeRecovery]: The sender is not the same as the stored recovery address.");
        require(msg.value >= recoveryPayment, "[completeRecovery]: Ether sent is lower than established payment.");
        require(recoveryData.date < block.timestamp, "[completeRecovery]: It's too early to complete the recovery.");
        require(verifyProof(verificationProof, verifyingKeyIndex),
            "[completeRecovery]: Zero Knowledge proof has not been verified.");
        recoveryStarted = resetRecoveryData();
        addSafeOwner(msg.sender, 1);
        emit CompleteRecovery(safeAddress, msg.sender);
    }

    function cancelRecovery() external payable onlySafeOwner {
        require(recoveryStarted, "[cancelRecovery]: The recovery wasn't started yet.");
        require(checkOwnerCalls(), "[cancelRecovery]: The same owner is calling more than once.");
        if(checkEnoughCalls()) {
            uint balance = address(this).balance;
            recoveryStarted = resetRecoveryData();
            resetCancelRecovery(moduleThreshold);
            payable(safeAddress).transfer(balance);
            emit CancelRecovery(safeAddress, msg.sender, balance);
        } else {
            emit ThresholdCounterIncremented(safeAddress, thresholdCounter);
        }
    }
}