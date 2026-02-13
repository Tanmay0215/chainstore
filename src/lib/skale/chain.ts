import { defineChain } from "viem";

/**
 * SKALE Base Sepolia Testnet Configuration
 *
 * This chain configuration is used for:
 * - Testing x402 payment flows
 * - Deploying smart contracts
 * - Zero gas fee transactions
 */
export const skaleChain = defineChain({
  id: 324705682,
  name: "SKALE Base Sepolia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Credits",
    symbol: "CREDIT",
  },
  rpcUrls: {
    default: {
      http: ["https://base-sepolia-testnet.skalenodes.com/v1/base-testnet"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com/",
    },
  },
  testnet: true,
});

/**
 * SKALE Mainnet Configuration (for future production use)
 * Uncomment and configure when ready for mainnet deployment
 */
// export const skaleMainnet = defineChain({
//   id: 0, // Replace with actual mainnet chain ID
//   name: "SKALE Mainnet",
//   nativeCurrency: {
//     decimals: 18,
//     name: "Credits",
//     symbol: "CREDIT",
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://mainnet.skalenodes.com/v1/your-chain-name"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Blockscout",
//       url: "https://your-chain-explorer.skalenodes.com/",
//     },
//   },
// });
