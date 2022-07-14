import { ethers } from 'hardhat'
import { Wallet } from '@ethersproject/wallet'
import { Result } from "@ethersproject/abi/src.ts/coders/abstract-coder"
import { readFileSync, existsSync } from 'fs';

export type VerifyingKeys = { alfa1: string[][], beta2: string[][][], gamma2: string[][][], delta2: string[][][], IC: string[][][] }

export type VerifyingKey = { alfa1: string[], beta2: string[][], gamma2: string[][], delta2: string[][], IC: string[][] }

export type VerificationProofs = { a: string[][], b: string[][][], c: string[][], input: string[][] }

export type VerificationProof = { a: string[], b: string[][], c: string[], input: string[] }

export function getUsers(users: Wallet[]): void {
    let count = 1; console.log("\n")
    for (const user of users) {
        console.log("Usuario " + count + ": " + user.address + ""); count++
    };
}

export async function getEventData(transactionHash: any, eventName: string, eventInterface: string[]): Promise<Result> {
    const receipt = await ethers.provider.getTransactionReceipt(transactionHash.hash);
    const ethersInterface = new ethers.utils.Interface(eventInterface);
    const data = receipt.logs[0].data;
    const topics = receipt.logs[0].topics;
    return ethersInterface.decodeEventLog(eventName, data, topics);
}

export function getZeroKnowledgeParameters(): [VerifyingKeys, VerifyingKeys, VerifyingKey, VerificationProof,
    VerificationProof] {
    const verifyingKeys1: VerifyingKeys = prepareVerifyingKeyParams("verifyingKeys.txt")
    const verifyingKeys2: VerifyingKeys = prepareVerifyingKeyParams("/saved/verifyingKeys_05_26_2022_23:43:38.txt")

    const verifyingKey: VerifyingKey = prepareVerifyingKey(verifyingKeys2, 0)

    const verificationProofs1: VerificationProofs = prepareGeneratedCalls("proofCalls.txt")
    const verificationProofs2: VerificationProofs = prepareGeneratedCalls("/saved/proofCalls_05_26_2022_23:43:38.txt")
    
    const verificationProof1: VerificationProof = prepareVerificationProof(verificationProofs1, 0)
    const verificationProof2: VerificationProof = prepareVerificationProof(verificationProofs2, 0)
  
    return [verifyingKeys1, verifyingKeys2, verifyingKey, verificationProof1, verificationProof2]
}

function prepareVerifyingKeyParams(relativeFilePath: string): VerifyingKeys {
    const filePath = __dirname + "/../../circom/results/" + relativeFilePath

    let alfa1: string[][] = []
    let beta2: string[][][] = [], gamma2: string[][][] = [], delta2: string[][][] = [], IC: string[][][] = []

    var content: string = ""
    if(existsSync(filePath)) {
        content = readFileSync(filePath, 'utf8')
    } else {
        throw "The file 'verifyingKeys.txt' doesn't exist."
    }
    
    content.split("--iterationSplitter--").forEach(element => {
        const formattedElement = "[" + element.replace(/\d{74,}/g, "\"$&\"") + "]"
        if(formattedElement != "[\n]") {
            const json = JSON.parse(formattedElement)
            alfa1.push(json[0]); beta2.push(json[1]); gamma2.push([['0', '0'], ['0', '0']]); delta2.push(json[2])
            IC.push([json[3], json[4], json[5]]); 
        }
    })
    return { alfa1: alfa1, beta2: beta2, gamma2: gamma2, delta2: delta2, IC: IC }
}

function prepareGeneratedCalls(relativeFilePath: string): VerificationProofs {
    const filePath = __dirname + "/../../circom/results/" + relativeFilePath

    let a: string[][] = [], c: string[][] = [], input: string[][] = []
    let b: string[][][] = []

    var content: string = ""
    if(existsSync(filePath)) {
        content = readFileSync(filePath, 'utf8')
    } else {
        throw "The file 'proofCalls.txt' doesn't exist."
    }
    
    content.split("--iterationSplitter--").forEach(element => {
        const formattedElement = "[" + element + "]"
        if(formattedElement != "[\n]") {
            const json = JSON.parse(formattedElement)
            a.push(json[0]); b.push(json[1]); c.push(json[2]); input.push(json[3])
        }
    })
    return { a: a, b: b, c: c, input: input }
}

function prepareVerificationProof(verificationProofs: VerificationProofs, verificationProofsIndex: number)
    : VerificationProof {
    return {
        a: verificationProofs.a[verificationProofsIndex],
        b: verificationProofs.b[verificationProofsIndex],
        c: verificationProofs.c[verificationProofsIndex],
        input: verificationProofs.input[verificationProofsIndex]
    }
}

function prepareVerifyingKey(verifyingKeys: VerifyingKeys, verifyingKeysIndex: number): VerifyingKey {
    return {
        alfa1: verifyingKeys.alfa1[verifyingKeysIndex],
        beta2: verifyingKeys.beta2[verifyingKeysIndex],
        gamma2: [['0', '0'], ['0', '0']],
        delta2: verifyingKeys.delta2[verifyingKeysIndex],
        IC: verifyingKeys.IC[verifyingKeysIndex]
    }
}