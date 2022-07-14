import { expect } from "chai"
import hre, { deployments, waffle } from "hardhat"
import "@nomiclabs/hardhat-ethers"
import { getSafeWithOwners } from "./utils/setup"
import { executeContractCallWithSigners, calculateSafeTransactionHash, buildContractCall } from "../src/utils/execution"
import { parseEther } from "@ethersproject/units"
import { VerifyingKeys, VerificationProof, VerifyingKey } from './utils/recoverModuleUtils'
import { chainId } from "./utils/encoding"
import * as recoverModuleUtils from './utils/recoverModuleUtils'
import {MockProvider} from '@ethereum-waffle/provider'

describe.only("RecoverModule\n", async () => {
    
    const [user1, user2, user3, user4] = waffle.provider.getWallets();
    recoverModuleUtils.getUsers([user1, user2, user3, user4])

    const waitingTime = 172800
    
    const [verifyingKeys1, verifyingKeys2, verifyingKey, verificationProof1, verificationProof2]:
        [VerifyingKeys, VerifyingKeys, VerifyingKey, VerificationProof, VerificationProof] = 
        recoverModuleUtils.getZeroKnowledgeParameters()

    const setupTests = deployments.createFixture(async ({ deployments }) => {
        await deployments.fixture();

        // Deploy Gnosis Safe
        const safe = await getSafeWithOwners([user1.address, user2.address])

        // Deploy Recover Module
        const artifact = await hre.artifacts.readArtifact("RecoveryModule")
        const module = await hre.waffle.deployContract(user3, artifact, [safe.address, parseEther("1"),
            waitingTime, verifyingKeys1])

        return { safe, module }
    })
    
    describe("StartRecovery", async () => {

        it('another recovery is in progress', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")
            
            await expect(
                module.connect(user4).startRecovery(overrides)
            ).to.be.revertedWith("[startRecovery]: Another recovery is in progress.")
        })

        it('not enough ether sent', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('0.99'), gasLimit: 1000000};
            
            await expect(
                module.startRecovery(overrides)
            ).to.be.revertedWith("[startRecovery]: Ether sent is lower than established payment.")
        })

        it('the sender is currently a owner', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};
            
            await expect(
                module.connect(user1).startRecovery(overrides)
            ).to.be.revertedWith("[startRecovery]: The sender is currently a owner of the Gnosis Safe.")
        })

        it('successfull recovery started', async () => {
            const { safe, module } = await setupTests()
            
            let tx = {}
            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                tx = await module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")
            
            const eventInterface: string[] = ["event StartRecovery(address indexed safeAddress, " +
                "address possibleOwner, uint date)"]
            const eventArgs = await recoverModuleUtils.getEventData(tx, "StartRecovery", eventInterface)

            await expect([eventArgs.safeAddress, eventArgs.possibleOwner]).to.include.members([safe.address, user3.address])

            const customDate: number = Math.round((new Date()).getTime() / 1000) + waitingTime
            await expect(eventArgs.date.toNumber()).to.be.greaterThan(customDate-60)
            await expect(eventArgs.date.toNumber()).to.be.lessThan(customDate+60)
        })
    })


    describe("CompleteRecovery", async () => {

        it('the recovery wasn\'t started', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: The recovery wasn't started yet.")
        })

        it('invalid verifying key index', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await expect(
                module.completeRecovery(verificationProof1, 2, overrides)
            ).to.be.revertedWith("[completeRecovery]: Invalid verifying key index.")
        })

        it('the safe had activity', async () => {
            const { safe, module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(await module.moduleNonce()).to.be.deep.eq(0)
            await expect(await safe.nonce()).to.be.deep.eq(0)

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")
            
            const txHash = calculateSafeTransactionHash(safe, buildContractCall(safe, "getOwners", [],
                await safe.nonce()), await chainId())
            await expect(
                executeContractCallWithSigners(safe, safe, "getOwners", [], [user1, user2])
            ).to.emit(safe, "ExecutionSuccess").withArgs(txHash, 0)

            await expect(await module.moduleNonce()).to.be.deep.eq(0)
            await expect(await safe.nonce()).to.be.deep.eq(1)

            await expect(
                module.completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: The Gnosis Safe had activity.")
        })

        it('the sender is currently a owner of the safe', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await expect(
                module.connect(user1).completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: The sender is currently a owner of the Gnosis Safe.")
        })

        it('the sender is not the same as the stored recovery address', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await expect(
                module.connect(user4).completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: The sender is not the same as the stored recovery address.")
        })

        it('not enough ether sent', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            overrides.value = parseEther('0.99')

            await expect(
                module.completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: Ether sent is lower than established payment.")
        })

        it('it\'s too early to complete the recovery', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await expect(
                module.completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: It's too early to complete the recovery.")
        })

        it('zero knowledge proof has not been verified', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await hre.network.provider.send("evm_increaseTime", [waitingTime])
            await hre.network.provider.send("evm_mine")

            // Public keys pair in Baby Jubjub format with one bit added in the first one

            await expect(
                module.completeRecovery(verificationProof2, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: Zero Knowledge proof has not been verified.")
        })

        it('recovery completed', async () => {
            const { safe, module } = await setupTests()

            await expect(
                executeContractCallWithSigners(safe, safe, "enableModule", [module.address], [user1, user2])
            ).to.emit(safe, "ExecutionSuccess")

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await hre.network.provider.send("evm_increaseTime", [waitingTime])
            await hre.network.provider.send("evm_mine")

            await expect(
                module.completeRecovery(verificationProof1, 0, overrides)
            ).to.emit(module, "VerifyingKeyInvalidated").to.emit(module, "OwnerAddedToSafe").withArgs(safe.address,user3.address)

            expect(await safe.getOwners()).to.include.members([user3.address])
        })
    })


    describe("CancelRecovery", async () => {

        it('the recovery wasn\'t started', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.connect(user1).cancelRecovery(overrides)
            ).to.be.revertedWith("[cancelRecovery]: The recovery wasn't started yet.")
        })

        it('the same owner is calling more than once', async () => {
            const { safe, module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await expect(
                module.connect(user1).cancelRecovery(overrides)
            ).to.emit(module, "ThresholdCounterIncremented").withArgs(safe.address, 1)

            await expect(
                module.connect(user1).cancelRecovery(overrides)
            ).to.be.revertedWith("[cancelRecovery]: The same owner is calling more than once.")
        })


        it('the sender is not a safe owner', async () => {
            const { module } = await setupTests()

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await expect(
                module.cancelRecovery(overrides)
            ).to.be.revertedWith("[onlySafeOwner]: The sender is not a Gnosis Safe owner.")
        })

        it('cancellation  completed', async () => {
            const { safe, module } = await setupTests()

            await expect(await hre.ethers.provider.getBalance(safe.address)).to.be.deep.eq(0)

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            overrides.value = parseEther('0.0')

            await expect(
                module.connect(user1).cancelRecovery(overrides)
            ).to.emit(module, "ThresholdCounterIncremented").withArgs(safe.address, 1)

            await expect(
                module.connect(user2).cancelRecovery(overrides)
            ).to.emit(module, "CancelRecovery").withArgs(safe.address, user2.address, parseEther("1"))

            await expect(await hre.ethers.provider.getBalance(safe.address)).to.be.deep.eq(parseEther("1"))
        })
    })

    describe("Verifier", async () => {

        it('correct substitution of the verifying keys', async () => {
            const { safe, module } = await setupTests()

            await expect(
                executeContractCallWithSigners(safe, safe, "enableModule", [module.address], [user1, user2])
            ).to.emit(safe, "ExecutionSuccess")

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await hre.network.provider.send("evm_increaseTime", [waitingTime])
            await hre.network.provider.send("evm_mine")

            overrides.value = parseEther('0.0')

            await expect(
                module.connect(user1).substituteVerifyingKeys(verifyingKeys2, overrides)
            ).to.emit(module, "VerifyingKeysSubstituted").withArgs(safe.address, 2)

            overrides.value = parseEther('1.0')

            await expect(
                module.completeRecovery(verificationProof2, 0, overrides)
            ).to.emit(module, "OwnerAddedToSafe").withArgs(safe.address, user3.address)

            expect(await safe.getOwners()).to.include.members([user3.address])
        })

        it('invalidate verifying key', async () => {
            const { safe, module } = await setupTests()

            await expect(
                executeContractCallWithSigners(safe, safe, "enableModule", [module.address], [user1, user2])
            ).to.emit(safe, "ExecutionSuccess")

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await hre.network.provider.send("evm_increaseTime", [waitingTime])
            await hre.network.provider.send("evm_mine")

            overrides.value = parseEther('0.0')

            await expect(
                module.connect(user1).invalidateVerifyingKey(0, overrides)
            ).to.emit(module, "VerifyingKeyInvalidated").withArgs(safe.address, 0)

            overrides.value = parseEther('1.0')

            await expect(
                module.completeRecovery(verificationProof1, 0, overrides)
            ).to.be.revertedWith("[completeRecovery]: Zero Knowledge proof has not been verified.")
        })

        it('add verifying key', async () => {
            const { safe, module } = await setupTests()

            await expect(
                executeContractCallWithSigners(safe, safe, "enableModule", [module.address], [user1, user2])
            ).to.emit(safe, "ExecutionSuccess")

            let overrides = {value: parseEther('1.0'), gasLimit: 1000000};

            await expect(
                module.startRecovery(overrides)
            ).to.emit(module, "StartRecovery")

            await hre.network.provider.send("evm_increaseTime", [waitingTime])
            await hre.network.provider.send("evm_mine")

            overrides.value = parseEther('0.0')

            await expect(
                module.connect(user1).addVerifyingKey(verifyingKey, 2, overrides)
            ).to.emit(module, "VerifyingKeyAdded").withArgs(safe.address, 3)

            overrides.value = parseEther('1.0')

            await expect(
                module.completeRecovery(verificationProof2, 2, overrides)
            ).to.emit(module, "CompleteRecovery").withArgs(safe.address, user3.address)
        })
    })
})