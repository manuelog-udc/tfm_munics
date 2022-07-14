// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <=0.8.13;

import "../../gnosis-safe/common/Enum.sol";
import { GnosisSafe } from "../../gnosis-safe/GnosisSafe.sol";

contract SafeUtils {

    event OwnerAddedToSafe(address indexed safeAddress, address newOwner);
    event EtherSentFromSafe(address indexed safeAddress, address recipient, uint amount);
    event SafeBalance(address indexed safeAddress, uint balance);

    GnosisSafe internal safe;
    address internal safeAddress;

    constructor(GnosisSafe _safe) {
        safe = _safe;
        safeAddress = address(safe);
    }

    modifier onlySafeOwner() {
        require(isSafeOwner(), "[onlySafeOwner]: The sender is not a Gnosis Safe owner.");
        _;
    }
    
    function addSafeOwner(address newOwner, uint _threshold) internal {
        bytes memory data = abi.encodeWithSignature("addOwnerWithThreshold(address,uint256)", newOwner, _threshold);
        require(safe.execTransactionFromModule(address(safe), 0, data, Enum.Operation.Call),
            "[addSafeOwner]: Error executing transaction from module.");
        emit OwnerAddedToSafe(safeAddress, newOwner);
    }

    function isSafeOwner() public view returns (bool) {
        return safe.isOwner(msg.sender);
    }
}