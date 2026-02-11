import { Wallet } from "ethers";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Generate a new Ethereum wallet for SKALE chain
 * This script creates a new wallet and saves the credentials securely
 */
async function createWallet() {
  console.log("🔐 Generating new SKALE wallet...\n");

  // Generate random wallet
  const wallet = Wallet.createRandom();

  // Display wallet information
  console.log("✅ Wallet created successfully!\n");
  console.log("=".repeat(80));
  console.log("WALLET INFORMATION");
  console.log("=".repeat(80));
  console.log(`Address:      ${wallet.address}`);
  console.log(`Private Key:  ${wallet.privateKey}`);
  console.log(`Mnemonic:     ${wallet.mnemonic?.phrase}`);
  console.log("=".repeat(80));
  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   - NEVER share your private key or mnemonic with anyone");
  console.log("   - NEVER commit these credentials to version control");
  console.log("   - Store them in a secure password manager");
  console.log(
    "   - The wallet info has been saved to 'wallet-credentials.txt'",
  );
  console.log("   - Delete this file after copying to a secure location\n");

  // Save to file (temporary, should be deleted after copying)
  const credentials = `
SKALE TESTNET WALLET CREDENTIALS
Generated: ${new Date().toISOString()}

Address:     ${wallet.address}
Private Key: ${wallet.privateKey}
Mnemonic:    ${wallet.mnemonic?.phrase}

================================================================
SECURITY WARNING
================================================================
Delete this file immediately after copying credentials to a 
secure location (password manager, encrypted storage, etc.)

DO NOT commit this file to Git!
================================================================

NEXT STEPS:
1. Copy these credentials to your password manager
2. Delete this file: rm wallet-credentials.txt
3. Add to .env.local:
   AGENT_PRIVATE_KEY=${wallet.privateKey}
   RECEIVING_ADDRESS=${wallet.address}

4. Fund your wallet on SKALE testnet:
   - Visit: https://faucet.skale.network/ (if available)
   - Or use the SKALE Discord faucet
   - Request Credits for: ${wallet.address}

5. Get test Axios USD tokens:
   - Token Address: 0x61a26022927096f444994dA1e53F0FD9487EAfcf
   - You may need to bridge or use a faucet
`;

  const outputPath = join(process.cwd(), "wallet-credentials.txt");
  writeFileSync(outputPath, credentials);

  console.log(`📝 Credentials saved to: ${outputPath}`);
  console.log("\n🎯 Next steps:");
  console.log("   1. Copy credentials to a secure password manager");
  console.log("   2. Delete the wallet-credentials.txt file");
  console.log("   3. Update your .env.local file");
  console.log("   4. Fund your wallet on SKALE testnet\n");
}

createWallet().catch((error) => {
  console.error("Error creating wallet:", error);
  process.exit(1);
});
