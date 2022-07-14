import hre, { ethers, web3 } from 'hardhat'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { TransactionRequest } from '@ethersproject/abstract-provider'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { SafeTransaction } from '@gnosis.pm/safe-core-sdk-types'
import Safe, { EthersAdapter } from '@gnosis.pm/safe-core-sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exit } from 'process'


export async function getSigners(): Promise<SignerWithAddress[]> {
    const accounts = await hre.ethers.getSigners(); let count = 1
    for (const account of accounts) {
        console.log("Usuario " + count + ": " + account.address + ""); count++
    };
    return accounts
}

export async function setupGnosisSafe(safeAddress: string, account: SignerWithAddress): Promise<Safe> {
    const ethAdapterOwner1 = new EthersAdapter({ ethers, signer: account })
    const safe: Safe = await Safe.create({ ethAdapter: ethAdapterOwner1, safeAddress: safeAddress })
    console.log("\nDirección del Gnosis-Safe: " + safe.getAddress())
    return safe
}

export async function setupRecoveryModule(safe: Safe): Promise<Contract> {
    const recoveryModuleContractFactory = await hre.ethers.getContractFactory("RecoveryModule")
    const recoveryModule = await recoveryModuleContractFactory.deploy(await safe.getOwners(), safe.getAddress(),
        "0xBebb126783eDEc056442a9F49D93a472C2C440f3", ethers.utils.parseEther("0.01"), ethers.utils.parseEther("0.01"), 0,
        { gasLimit: 9999999 });
    await recoveryModule.deployed(); console.log("Dirección del módulo de recuperación:", recoveryModule.address + "\n");
    await recoveryModuleSaveAddress(recoveryModule.address)
    return recoveryModule
}

async function recoveryModuleSaveAddress(data: string) {
    console.log(__dirname)
    writeFileSync(join(__dirname, "recoveryModuleAddress.txt"), data, {
      flag: 'w',
    });
}

export async function setupDeployedRecoveryModule(): Promise<Contract> {
    const recoveryModule = await hre.ethers.getContractAt("RecoveryModule", await recoveryModuleGetAddress());
    console.log("Dirección del módulo de recuperación:", recoveryModule.address + "\n");
    return recoveryModule
}

async function recoveryModuleGetAddress(): Promise<string> {
    if(existsSync(__dirname + "/recoveryModuleAddress.txt")) {
        const contents = readFileSync(join(__dirname, "recoveryModuleAddress.txt"), 'utf-8');
        return contents;
    } else {
        throw "Recovery Module address doesn't exist. Exiting..."
    }
}

export async function deleteModules(safe: Safe, modules: string[]): Promise<void> {
    let disableModuleTransaction: SafeTransaction = {} as SafeTransaction
    for (let module of modules) {
        console.log(" ".repeat(4) + "Deshabilitando módulo " + module + "\n")
        disableModuleTransaction = await safe.getDisableModuleTx(module)
        const transactionResponse = await safe.executeTransaction(disableModuleTransaction);
        await transactionResponse.transactionResponse?.wait()
    }
}

export async function listenToEvent(safeModule: Contract, eventName: string, waitForEvent: {value: boolean}): Promise<void> {
    safeModule.once(eventName, (_, delegate, event) => { // (setter, delegate, event)
        console.log(" ".repeat(4) + "Event name: " + event.event)
        console.log(" ".repeat(4) + "Event args: "); console.log(" ".repeat(8) + event.args)
        console.log(" ".repeat(4) + "Event delegate: " + delegate + "\n"); waitForEvent.value = false
    })
}

export async function waitEventResponse(waitForEvent: {value: boolean}): Promise<void> {
    setTimeout(async () => {waitForEvent.value = false}, 30000);
    while(waitForEvent.value) { await new Promise(r => setTimeout(r, 3000)) }; waitForEvent.value = true
}

// Revisar
export async function executeRecoveryModuleFunctionWithoutData(safeModule: Contract, waitForEvent: {value: boolean},
    functionEvent: string, functionCall: Function, ...args: any[]): Promise<void> {
    console.log(" ".repeat(4) + "Executing " + functionCall.name + "() without data...\n")
    await listenToEvent(safeModule, functionEvent, waitForEvent); await functionCall(...args);
    await waitEventResponse(waitForEvent)
}

// Revisar
export async function executeRecoveryModuleFunctionWithData(safeModule: Contract, waitForEvent: {value: boolean},
    functionName: string, functionEvent: string, account: SignerWithAddress, to: string, value: BigNumber, data: string,
    gasLimit: BigNumber): Promise<void> {
    console.log(" ".repeat(4) + "Executing " + functionEvent + "() ...\n")
    await listenToEvent(safeModule, functionEvent, waitForEvent)
    let transactionRequest: TransactionRequest = { to: to, value: value, data: data, gasLimit: gasLimit }
    await account.populateTransaction(transactionRequest)
    const transactionHash = await account.sendTransaction(transactionRequest)
    await transactionHash.wait(); await waitEventResponse(waitForEvent)
}

export async function listenAndWaitForEvent(safeModule: Contract, waitForEvent: {value: boolean},
    functionEvent: string): Promise<void> {
    await listenToEvent(safeModule, functionEvent, waitForEvent)
    await waitEventResponse(waitForEvent)
}

export async function encodeFunctionCall(functionName: string, argsValues: any[], ...args: any[]): Promise<string> {
    if(args.length % 2 != 0) throw "Number of arguments are not even.";
    console.log(" ".repeat(4) + "Encoding " + functionName + "() ...\n")
    let functionInputs = []; let counter=0
    while(counter < args.length) {
        functionInputs.push({ type: args[counter], name: args[counter+1] }); counter = counter + 2
    }
    return web3.eth.abi.encodeFunctionCall({ name: functionName, type: 'function', inputs: functionInputs }, argsValues);
}

export async function removeModulesFromSafe(safe: Safe) {
    let modules = await safe.getModules(); console.log(" ".repeat(4) + "Number of active modules: " + modules.length)
    if(modules.length > 0) { await deleteModules(safe, modules) } // Delete all modules to avoid overload
}