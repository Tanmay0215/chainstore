import { createPublicClient, http, formatEther, formatUnits } from "viem";
import { defineChain } from "viem";
import "dotenv/config";

// SKALE Base Sepolia Testnet
const skaleChain = defineChain({
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
});

// Token addresses
const AXIOS_USD_ADDRESS = "0x61a26022927096f444994dA1e53F0FD9487EAfcf";
const USDC_ADDRESS = "0x2e08028E3C4c2356572E096d8EF835cD5C6030bD";

// ERC-20 ABI (balanceOf function)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

async function checkBalance() {
  const walletAddress = "0xeb980E4F35c5A8C5b38AF7714b6BA3D7AAC68c44"

  if (!walletAddress) {
    console.log("\n❌ No wallet address found!");
    console.log("Please set RECEIVING_ADDRESS in .env.local\n");
    console.log("Example:");
    console.log(
      "RECEIVING_ADDRESS=0xeb980E4F35c5A8C5b38AF7714b6BA3D7AAC68c44\n",
    );
    process.exit(1);
  }

  console.log(`\n💰 Checking balances for: ${walletAddress}\n`);
  console.log("=".repeat(80));

  const client = createPublicClient({
    chain: skaleChain,
    transport: http(),
  });

  try {
    // Check Credits (native token) balance
    console.log("📊 SKALE Credits (Native Token)");
    const creditsBalance = await client.getBalance({
      address: walletAddress as `0x${string}`,
    });
    console.log(`   Balance: ${formatEther(creditsBalance)} CREDIT`);
    console.log(
      `   Status:  ${Number(creditsBalance) > 0 ? "✅ Funded" : "❌ Empty"}`,
    );

    // Check Axios USD balance
    console.log("\n📊 Axios USD (Payment Token)");
    const axiosBalance = await client.readContract({
      address: AXIOS_USD_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });
    console.log(`   Balance: ${formatUnits(axiosBalance, 6)} Axios USD`);
    console.log(`   Status:  ${axiosBalance > 0n ? "✅ Funded" : "❌ Empty"}`);

    // Check USDC balance (alternative payment token)
    console.log("\n📊 Bridged USDC");
    const usdcBalance = await client.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });
    console.log(`   Balance: ${formatUnits(usdcBalance, 6)} USDC`);
    console.log(`   Status:  ${usdcBalance > 0n ? "✅ Funded" : "❌ Empty"}`);

    console.log("\n" + "=".repeat(80));

    // Summary and recommendations
    const hasCredits = Number(creditsBalance) > 0;
    const hasAxios = axiosBalance > 0n;
    const hasUsdc = usdcBalance > 0n;

    console.log("\n📋 Summary:");
    if (hasCredits && (hasAxios || hasUsdc)) {
      console.log("   ✅ Wallet is funded and ready for testing!");
    } else if (hasCredits) {
      console.log(
        "   ⚠️  Wallet has Credits but needs payment tokens (Axios USD or USDC)",
      );
    } else if (hasAxios || hasUsdc) {
      console.log(
        "   ⚠️  Wallet has payment tokens but needs Credits for contract deployment",
      );
    } else {
      console.log("   ❌ Wallet needs funding");
      console.log("\n🔗 Get testnet funds:");
      console.log("   1. Visit SKALE Discord: https://discord.gg/skale");
      console.log("   2. Use #faucet channel to request testnet tokens");
      console.log(`   3. Provide your address: ${walletAddress}`);
    }

    console.log(`\n🔍 View on Explorer:`);
    console.log(
      `   https://base-sepolia-testnet-explorer.skalenodes.com/address/${walletAddress}\n`,
    );
  } catch (error) {
    console.error("\n❌ Error checking balances:", error);
    console.log("\nTroubleshooting:");
    console.log("   - Verify SKALE RPC is accessible");
    console.log("   - Check your internet connection");
    console.log("   - Ensure wallet address is valid\n");
  }
}

checkBalance();
