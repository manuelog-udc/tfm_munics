import { SafeTransactionDataPartial, OperationType } from '@gnosis.pm/safe-core-sdk-types'
import Safe, { RemoveOwnerTxParams, AddOwnerTxParams } from '@gnosis.pm/safe-core-sdk'

// Gnosis Safe functions calls

export async function getOwners(safe: Safe, debug = false): Promise<void> {
    await safe.getOwners().then(response => {
        if(debug) {
            console.log("getOwners():\n" + "-".repeat(30)); console.log(response); console.log("-".repeat(30) + "\n")
        }
    }).catch(error => { throw error })
}

export async function getBalance(safe: Safe, debug = false): Promise<void> {
    await safe.getBalance().then(response => {
        if(debug) {
            console.log("getBalance():\n" + "-".repeat(30)); console.log(response); console.log("-".repeat(30) + "\n")
        }
    }).catch(error => { throw error })
}

export async function addOwner(safe: Safe, ownerAddress: string, threshold: number, debug = false): Promise<void> {
    const params: AddOwnerTxParams = { ownerAddress, threshold }
    const safeTransaction = await safe.getAddOwnerTx(params)
    const transactionResponse = await safe.executeTransaction(safeTransaction)
    await transactionResponse.transactionResponse?.wait().then(response => {
        if(debug) {
            console.log("addOwner():\n" + "-".repeat(30)); console.log(response); console.log("-".repeat(30) + "\n")
        }
    }).catch(error => { throw error })
}

export async function removeOwner(safe: Safe, ownerAddress: string, threshold: number, debug = false): Promise<void> {
    const params: RemoveOwnerTxParams = { ownerAddress, threshold };
    const safeTransaction = await safe.getRemoveOwnerTx(params)
    const transactionResponse = await safe.executeTransaction(safeTransaction)
    await transactionResponse.transactionResponse?.wait().then(response => {
        if(debug) {
            console.log("removeOwner():\n" + "-".repeat(30)); console.log(response); console.log("-".repeat(30) + "\n")
        }
    }).catch(error => { throw error })
}

export async function sendSomeEther(safe: Safe, receiverAddress: string, etherToSend: string, dataToSend: string,
    debug = false): Promise<void> {
    const safeTransaction = await safe.createTransaction({ to: receiverAddress, value: etherToSend, data: dataToSend })
    const transactionResponse = await safe.executeTransaction(safeTransaction)
    await transactionResponse.transactionResponse?.wait().then(response => {
        if(debug) {
            console.log("sendSomeEther():\n" + "-".repeat(30)); console.log(response); console.log("-".repeat(30) + "\n")
        }
    }).catch(error => { throw error })
}

export async function execTransaction(safe: Safe, to: string, value: string, data: string, operation: OperationType,
    message: string, debug = false): Promise<void> {
    const transactionData: SafeTransactionDataPartial = { to: to, value: value, data: data, operation: operation }
    const safeTransaction = await safe.createTransaction(transactionData)
    const transactionResponse = await safe.executeTransaction(safeTransaction)
    await transactionResponse.transactionResponse?.wait().then(response => {
        if(debug) {
            console.log("execTransaction():\n" + "-".repeat(30)); console.log(response); console.log("-".repeat(30) + "\n")
        }
    }).catch(error => { throw error })
}