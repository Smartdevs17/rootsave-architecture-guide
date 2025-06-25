require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC;
const RSK_TESTNET_RPC_URL = process.env.RSK_TESTNET_RPC_URL;
const RSK_MAINNET_RPC_URL = process.env.RSK_MAINNET_RPC_URL;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const RSK_TESTNET_API_KEY = process.env.RSK_TESTNET_API_KEY;
const RSK_MAINNET_API_KEY = process.env.RSK_MAINNET_API_KEY;

if (!RSK_TESTNET_RPC_URL) {
  throw new Error("The RPC URL for the testnet is not configured.");
}

if (!WALLET_PRIVATE_KEY) {
  throw new Error("Private key is not configured.");
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Rootstock Testnet
    rootstock: {
      url: RSK_TESTNET_RPC_URL,
      chainId: 31,
      gasPrice: 65000000, // 65 Mwei
      accounts: [WALLET_PRIVATE_KEY],
      timeout: 60000
    },
    // Rootstock Mainnet
    "rootstock-mainnet": {
      url: RSK_MAINNET_RPC_URL || "https://public-node.rsk.co",
      chainId: 30,
      gasPrice: 65000000, // 65 Mwei
      accounts: WALLET_PRIVATE_KEY ? [WALLET_PRIVATE_KEY] : [],
      timeout: 60000
    },
    // Ethereum Sepolia (for testing)
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: WALLET_PRIVATE_KEY ? [WALLET_PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: {
      rskTestnet: RSK_TESTNET_API_KEY,
      rskMainnet: RSK_MAINNET_API_KEY
    },
    customChains: [
      {
        network: "rskTestnet",
        chainId: 31,
        urls: {
          apiURL: "https://rootstock-testnet.blockscout.com/api/",
          browserURL: "https://rootstock-testnet.blockscout.com/",
        },
      },
      {
        network: "rskMainnet", 
        chainId: 30,
        urls: {
          apiURL: "https://rootstock.blockscout.com/api/",
          browserURL: "https://rootstock.blockscout.com/",
        },
      }
    ],
  },

};