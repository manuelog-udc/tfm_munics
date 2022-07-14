import { web3 } from 'hardhat'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { Wallet } from '@ethersproject/wallet'
import { TransactionRequest } from '@ethersproject/abstract-provider'
import { executeContractCallWithSigners } from "../../src/utils/execution"

export async function addModuleToSafe(safe: Contract, module: Contract, signer: Wallet) {
    executeContractCallWithSigners(safe, safe, "enableModule", [module.address], [signer])
}

export function getStorageSetter(): string {
    return `
        contract StorageSetter {
            function setStorage(bytes3 data) public {
                bytes32 slot = 0x4242424242424242424242424242424242424242424242424242424242424242;
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    sstore(slot, data)
                }
            }
        }`
}

export function getReverter(): string {
    return `
        contract Reverter {
            function revert() public {
                require(false, "Shit happens");
            }
        }`
}

export const buildTransaction = (template: {
    to: string, value?: BigNumber | number | string, data?: string, gasLimit: number | string
}): TransactionRequest => {
    const transationRequest = { to: template.to, value: template.value, data: template.data, gasLimit: template.gasLimit }
    return transationRequest
}

export async function abiEncode(functionName: string, argsStructure: string[][], argsValues: any[]): Promise<string> {
    let inputs = [], counter = 0;
    while(counter < argsStructure.length) {
        inputs.push({type: argsStructure[counter][0], name: argsStructure[counter+1][1]}); counter++
    }
    return web3.eth.abi.encodeFunctionCall({ name: functionName, type: 'function', inputs: inputs }, argsValues);
}

export async function listenEvent(module: Contract, eventName: string, eventArgs: {value: any[]},
    mutex: {active: boolean}): Promise<void> {
    module.once(eventName, (...args) => { // (argument_1, ... , argument_n, event)
        const argsLength = args.length
        eventArgs.value = args[argsLength-1]["args"]
        setTimeout(async () => {mutex.active = false}, 500)
    })
}

export async function waitEvent(mutex: {active: boolean}, time: number): Promise<void> {
    setTimeout(async () => {mutex.active = false}, time);
    while(mutex.active) { await new Promise(r => setTimeout(r, 5000)) }
    mutex.active = true
}