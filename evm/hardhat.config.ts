import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades"
require('dotenv').config()
var global: any = {}
const fs = require("fs");

function prepareConfig() {
  // expected config path
  const configPath = `${__dirname}/deployment_config.js`;

  // create dummy object if deployment config doesn't exist
  // for compilation purposes
  if (fs.existsSync(configPath)) {
    global.DeploymentConfig = require(configPath);
  } else {
    global.DeploymentConfig = {};
  }
}
prepareConfig();
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  networks: {
    ethereum: {
      chainId: 1,
      url: global.DeploymentConfig.ethereum.rpc,
      accounts: [
        `${global.DeploymentConfig.ethereum.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    optimism: {
        chainId: 10,
      url: global.DeploymentConfig.optimism.rpc,
      accounts: [
        `${global.DeploymentConfig.optimism.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    arbitrum: {
      chainId: 42161,
      url: global.DeploymentConfig.arbitrum.rpc,
      accounts: [
        `${global.DeploymentConfig.arbitrum.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    binance: {
        chainId: 56,
        url: global.DeploymentConfig.binance.rpc,
        accounts: [
            `${global.DeploymentConfig.binance.mnemonic}`,
        ],
        loggingEnabled: true,
        throwOnTransactionFailures: true,
    },
    avalanche: {
      chainId: 43114,
      url: global.DeploymentConfig.avalanche.rpc,
      accounts: [
        `${global.DeploymentConfig.avalanche.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    fantom: {
      chainId: 250,
      url: global.DeploymentConfig.fantom.rpc,
      accounts: [
        `${global.DeploymentConfig.fantom.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    polygon: {
      chainId: 137,
      gasPrice: 150000000000,
      url: global.DeploymentConfig.polygon.rpc,
      accounts: [
        `${global.DeploymentConfig.polygon.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    avalancheFujiTestnet: {
      chainId: 43113,
      url: global.DeploymentConfig.avalancheFujiTestnet.rpc,
      accounts: [
        `${global.DeploymentConfig.avalancheFujiTestnet.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    bscTestnet: {
      chainId: 97,
      url: global.DeploymentConfig.bscTestnet.rpc,
      accounts: [
        `${global.DeploymentConfig.bscTestnet.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    polygonMumbai: {
      chainId: 80001,
      url: global.DeploymentConfig.polygonMumbai.rpc,
      accounts: [
        `${global.DeploymentConfig.polygonMumbai.mnemonic}`,
      ],
      loggingEnabled: true,
      throwOnTransactionFailures: true,
    },
    fantomTestnet: {
        chainId: 4002,
        url: global.DeploymentConfig.fantomTestnet.rpc,
        accounts: [
            `${global.DeploymentConfig.fantomTestnet.mnemonic}`,
        ],
        loggingEnabled: true,
        throwOnTransactionFailures: true,
    },
    goerli: {
        chainId: 5,
        url: global.DeploymentConfig.goerli.rpc,
        accounts: [
            `${global.DeploymentConfig.goerli.mnemonic}`,
        ],
        loggingEnabled: true,
        throwOnTransactionFailures: true,
    },
    arbitrumGoerli: {
      chainId: 421613,
        url: global.DeploymentConfig.arbitrumGoerli.rpc,
        accounts: [
            `${global.DeploymentConfig.arbitrumGoerli.mnemonic}`,
        ],
        loggingEnabled: true,
        throwOnTransactionFailures: true,
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      avalancheFujiTestnet: process.env.SNOW_TRACE_KEY || "",
      polygon: process.env.POLYGON_API_KEY || "",
      polygonMumbai: process.env.POLYGON_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      ftmTestnet: process.env.FTMSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBITRUMSCAN_API_KEY || "",
      arbitrumGoerli: process.env.ARBITRUMSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      avalanche: process.env.SNOW_TRACE_KEY || "",
      opera: process.env.FTMSCAN_API_KEY || "",
      optimisticEthereum: process.env.OptimisticEthereum || "",
    },
  },
  
};

export default config;
