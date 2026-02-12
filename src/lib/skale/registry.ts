import { createWalletClient, http, publicActions, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { skaleChain } from "./chain";

const SPEND_REGISTRY_ABI = parseAbi([
  "function logSpend(string calldata stepId, uint256 amount, string calldata memo) external",
  "event SpendLogged(address indexed payer, string stepId, uint256 amount, string memo)",
]);

export class SkaleRegistry {
  private client;
  private contractAddress: `0x${string}`;

  constructor(privateKey: string, contractAddress: string) {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    this.client = createWalletClient({
      account,
      chain: skaleChain,
      transport: http(),
    }).extend(publicActions);

    this.contractAddress = contractAddress as `0x${string}`;
  }

  async logSpend(stepId: string, amount: bigint, memo: string) {
    console.log(`[SkaleRegistry] Logging spend: ${stepId}, ${amount}, ${memo}`);
    try {
      const hash = await this.client.writeContract({
        address: this.contractAddress,
        abi: SPEND_REGISTRY_ABI,
        functionName: "logSpend",
        args: [stepId, amount, memo],
      });
      console.log(`[SkaleRegistry] Spend logged. Tx: ${hash}`);
      return hash;
    } catch (error) {
      console.error("[SkaleRegistry] Failed to log spend:", error);
      // Don't throw, just log error so we don't block the main flow
      return null;
    }
  }
}
