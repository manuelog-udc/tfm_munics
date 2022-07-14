// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <=0.8.13;

import "./Verifier.sol";

contract RecoveryModuleUtils is Verifier {

    event ModuleBalance(address indexed safeAddress, uint amount);

    uint public moduleNonce;
    uint internal moduleThreshold;
    uint internal thresholdCounter;
    address[] private ownerCalls;

    struct RecoveryData {  
        address addr;
        uint date; 
    }

    RecoveryData internal recoveryData = RecoveryData(address(0), 0);

    constructor(GnosisSafe safe, VerifyingKeys memory verifyingKeys) Verifier(safe, verifyingKeys) {
        moduleNonce = 0;
        moduleThreshold = safe.getThreshold();
        resetCancelRecovery(moduleThreshold);
    }

    function resetRecoveryData() internal returns (bool) {
        recoveryData.addr = address(0);
        recoveryData.date = 0;
        return false;
    }

    function checkInactivity() internal returns (bool) {
        uint safeNonce = safe.nonce();
        if(moduleNonce == safeNonce)
            return true;
        else
            moduleNonce = safeNonce;
            return false;
    }

    function checkOwnerCalls() internal returns (bool) {
        uint safeThreshold = safe.getThreshold();
        if(thresholdCounter == 0 && moduleThreshold != safeThreshold) {
            moduleThreshold = safeThreshold;
            ownerCalls = new address[](moduleThreshold);
        } else if(thresholdCounter > 0) {
            for (uint i=0; i < thresholdCounter; i++) {
                if (ownerCalls[i] == msg.sender) {
                    return false;
                }
            }
        }
        ownerCalls[thresholdCounter] = msg.sender;
        thresholdCounter++;
        return true;
    }

    function checkEnoughCalls() internal view returns (bool) {
        if(moduleThreshold == thresholdCounter && moduleThreshold == safe.getThreshold())
            return true;
        else
            return false;
    }

    function resetCancelRecovery(uint _moduleThreshold) internal {
        ownerCalls = new address[](_moduleThreshold);
        thresholdCounter = 0;
    }

    function setNonce() internal {
        moduleNonce = safe.nonce();
    }
}