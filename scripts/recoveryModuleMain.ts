import { Contract } from '@ethersproject/contracts'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { exit } from 'process'
import Safe from '@gnosis.pm/safe-core-sdk'
import * as safeFunctions from './utils/safeFunctions'
import * as recoveryModuleUtils from './utils/recoveryModuleUtils'

var debug = false; const safeAddress = '0x6B7A94f766d18f405C559bbA70f1158d6B238a91'
var safe: Safe = {} as Safe; var safeModule: Contract = {} as Contract

async function main(safeAddress: string, safe: Safe, safeModule: Contract) {
    // Get Gnosis Safe signers

    const accounts = await recoveryModuleUtils.getSigners()

    // Instantiate Gnosis Safe

    safe = await recoveryModuleUtils.setupGnosisSafe(safeAddress, accounts[0])
    
    // Instantiate Recover Module

    //safeModule = await recoveryModuleUtils.setupRecoveryModule(safe)
    safeModule = await recoveryModuleUtils.setupDeployedRecoveryModule()

    // Tests
    //await test_safe_functions(safe)
    await recoveryModuleTests(safe, safeModule, accounts)
}

async function test_safe_functions(safe: Safe) {
    // Create and remove an owner

    await safeFunctions.getOwners(safe, false)
    await safeFunctions.removeOwner(safe, "0x3E1D2dB8CfA3bAcC55A88c44E14cAC6601606cAC", 1, false)
    await safeFunctions.getOwners(safe, false)
    await safeFunctions.addOwner(safe, "0x3E1D2dB8CfA3bAcC55A88c44E14cAC6601606cAC", 1, false)
    await safeFunctions.getOwners(safe, false)
    
    // Get safe balance
    
    await safeFunctions.getBalance(safe, false)
    
    // Send ether
    
    await safeFunctions.sendSomeEther(safe, '0xC478677aAEEa3e06F6f5B0C4d0EFeE080ABCA2f7', '1000000000000000000', '0x54657374696e67206574686572207472616e73616374696f6e2e', true)
}

async function recoveryModuleTests(safe: Safe, safeModule: Contract, accounts: SignerWithAddress[]) {
    console.log("\nStarting Recover Module tests:\n"); let waitForEvent = {value: true}

    await recoveryModuleUtils.listenAndWaitForEvent(safeModule, waitForEvent, "Debug")

    /*
        Adding recoveryModule to Gnosis Safe:
    */

    if(!debug) {
        let enableModuleTransaction = await safe.getEnableModuleTx(safeModule.address)
        let transactionResponse = await safe.executeTransaction(enableModuleTransaction);
        await transactionResponse.transactionResponse?.wait();
    }

    recoveryModuleUtils.executeRecoveryModuleFunctionWithoutData(safeModule, waitForEvent, "testing",
        safeModule.functions.test)

    /*
        Test startRecovery Function:
    */

    
    let functionName: string = "startRecovery"
    let argsWithTypes: string[] = ['address', 'newOwner']
    let argsValues: string[] = ["0xBebb126783eDEc056442a9F49D93a472C2C440f3"]
    
    // encodeFunctionCall(functionName, ['type1', 'name1', 'type2', 'name2', ...] [value1, value2, ...])

    /*const data: string = await recoveryModuleUtils.encodeFunctionCall(functionName, argsValues, ...argsWithTypes)
    await recoveryModuleUtils.executeRecoveryModuleFunctionWithData(safeModule, waitForEvent, functionName, accounts[0],
        safeModule.address,ethers.utils.parseEther("0.01"), data, BigNumber.from(9999999))*/
    

    /*
        Test completeRecovery function:
    */

    /*
    await listenToEvent(safeModule, "CompleteRecovery", waitForEvent)
    await safeModule.functions.completeRecovery("0xBebb126783eDEc056442a9F49D93a472C2C440f3")
    await waitEventResponse(waitForEvent)
    */

    // Comprobamos el número de módulos asociados a nuestro Gnosis-Safe:
    await recoveryModuleUtils.removeModulesFromSafe(safe)
}

main(safeAddress, safe, safeModule)
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});