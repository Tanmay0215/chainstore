import hre from "hardhat";
import { config as dotenvConfig } from "dotenv";
import { join } from "path";

// Load environment variables
dotenvConfig({ path: join(process.cwd(), ".env.local") });

const { ethers } = hre;

async function main() {
  console.log("\n🚀 Deploying SpendRegistry to SKALE...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} CREDIT\n`);

  // Deploy SpendRegistry
  console.log("Deploying SpendRegistry contract...");
  const SpendRegistry = await ethers.getContractFactory("SpendRegistry");
  const registry = await SpendRegistry.deploy();

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log(`\n✅ SpendRegistry deployed successfully!`);
  console.log(`Contract address: ${address}`);
  console.log(`\n🔍 View on SKALE Explorer:`);
  console.log(
    `https://base-sepolia-testnet-explorer.skalenodes.com/address/${address}`,
  );

  // Save deployment info
  console.log(`\n📝 Add to .env.local:`);
  console.log(`SPEND_REGISTRY_CONTRACT=${address}`);

  // Test the contract
  console.log(`\n🧪 Testing contract...`);
  const tx = await registry.logSpend("test-step", 100, "Test deployment");
  await tx.wait();
  console.log(`✅ Test transaction successful!`);
  console.log(`Transaction hash: ${tx.hash}`);

  console.log(`\n🎉 Deployment complete!\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
