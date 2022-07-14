import { task } from "hardhat/config"
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-truffle5";
//import "@nomiclabs/hardhat-ganache";
import "@gnosis.pm/safe-core-sdk";
import "@gnosis.pm/safe-core-sdk-types"
//import "@gnosis.pm/safe-ethers-lib"
//import "@gnosis.pm/safe-contracts";
import "@ethersproject/units";
//import "@openzeppelin/contracts";
import "@openzeppelin/hardhat-upgrades";
import "@ethereum-waffle/provider"
import "hardhat-deploy";
import "solidity-coverage";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

task("accounts", "Print the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

import type { HardhatUserConfig } from "hardhat/types";

const { SOLIDITY_VERSION, SOLIDITY_SETTINGS } = process.env;
const soliditySettings = !!SOLIDITY_SETTINGS ? JSON.parse(SOLIDITY_SETTINGS) : undefined
const primarySolidityVersion = SOLIDITY_VERSION || "0.7.6"

const userConfig: HardhatUserConfig = {
  paths: {
    deploy: "src/deploy",
  },
  solidity: {
    compilers: [
      { version: primarySolidityVersion, settings: soliditySettings },
      { version: "0.6.12" },
      { version: "0.5.17" },
      { version: "0.8.0" }
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
      gas: 100000000
    },
    ganache: {
      url: "http://127.0.0.1:8545",
      accounts: ["", ""],
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
      gas: 100000000
    },
    rinkeby: {
      url: "",
      accounts: ["", ""],
      gas: "auto",
      gasPrice: "auto"
    }
  },
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 2000000,
  }
}; export default userConfig