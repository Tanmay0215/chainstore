import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
import { join } from "path";

// Load environment variables from .env.local
dotenvConfig({ path: join(process.cwd(), ".env.local") });

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "0x";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    // SKALE Base Sepolia Testnet
    skaleTestnet: {
      url:
        process.env.SKALE_RPC_URL ||
        "https://base-sepolia-testnet.skalenodes.com/v1/base-testnet",
      chainId: Number(process.env.SKALE_CHAIN_ID) || 324705682,
      accounts: AGENT_PRIVATE_KEY !== "0x" ? [AGENT_PRIVATE_KEY] : [],
      // Note: SKALE has zero gas fees, but we let it auto-determine the gasPrice
    },
    // SKALE Mainnet (for future production use)
    // skaleMainnet: {
    //   url: "https://mainnet.skalenodes.com/v1/your-chain-name",
    //   chainId: 0, // Replace with actual mainnet chain ID
    //   accounts: AGENT_PRIVATE_KEY !== "0x" ? [AGENT_PRIVATE_KEY] : [],
    //   gasPrice: 0,
    // },
  },
  etherscan: {
    apiKey: {
      skaleTestnet: "no-api-key-needed", // SKALE doesn't require API keys
    },
    customChains: [
      {
        network: "skaleTestnet",
        chainId: 324705682,
        urls: {
          apiURL: "https://base-sepolia-testnet-explorer.skalenodes.com/api",
          browserURL: "https://base-sepolia-testnet-explorer.skalenodes.com/",
        },
      },
    ],
  },
};

export default config;
