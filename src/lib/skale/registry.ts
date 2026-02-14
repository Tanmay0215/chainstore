import { createWalletClient, http, publicActions, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { skaleChain } from "./chain";

class Mutex {
  private mutex = Promise.resolve();

  lock(): PromiseLike<() => void> {
    let begin: (unlock: () => void) => void = (unlock) => {};

    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });

    return new Promise((res) => {
      begin = res;
    });
  }

  async dispatch<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
    const unlock = await this.lock();
    try {
      return await fn();
    } finally {
      unlock();
    }
  }
}

class NonceManager {
  private nonce: number | null = null;
  private client: any;
  private address: `0x${string}`;
  private mutex = new Mutex();

  constructor(client: any, address: `0x${string}`) {
    this.client = client;
    this.address = address;
  }

  async getNonce(): Promise<number> {
    return this.mutex.dispatch(async () => {
      if (this.nonce === null) {
        this.nonce = await this.client.getTransactionCount({
          address: this.address,
        });
      } else {
        this.nonce++;
      }
      return this.nonce!;
    });
  }
}

// Global state for serverless/HMR environment
const globalForSkale = global as unknown as {
  skaleMutex: Mutex;
  skaleNonceManager: NonceManager | null;
};

const globalMutex = globalForSkale.skaleMutex || new Mutex();
if (process.env.NODE_ENV !== "production")
  globalForSkale.skaleMutex = globalMutex;

const SPEND_REGISTRY_ABI = parseAbi([
  "function logSpend(string calldata stepId, uint256 amount, string calldata memo) external",
  "event SpendLogged(address indexed payer, string stepId, uint256 amount, string memo)",
]);

export class SkaleRegistry {
  private client;
  private contractAddress: `0x${string}`;
  private account;

  constructor(privateKey: string, contractAddress: string) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.client = createWalletClient({
      account: this.account,
      chain: skaleChain,
      transport: http(),
    }).extend(publicActions);

    this.contractAddress = contractAddress as `0x${string}`;

    // Initialize global nonce manager if it doesn't exist or if account changed (unlikely in this context but good for safety)
    if (!globalForSkale.skaleNonceManager) {
      globalForSkale.skaleNonceManager = new NonceManager(
        this.client,
        this.account.address,
      );
    }
  }

  async logSpend(stepId: string, amount: bigint, memo: string) {
    return globalMutex.dispatch(async () => {
      console.log(
        `[SkaleRegistry] Logging spend: ${stepId}, ${amount}, ${memo}`,
      );
      try {
        const nonceManager = globalForSkale.skaleNonceManager!;
        const nonce = await nonceManager.getNonce();

        const hash = await this.client.writeContract({
          address: this.contractAddress,
          abi: SPEND_REGISTRY_ABI,
          functionName: "logSpend",
          args: [stepId, amount, memo],
          nonce, // Explicitly set the nonce
        });
        console.log(`[SkaleRegistry] Spend logged. Tx: ${hash}`);
        return hash;
      } catch (error) {
        console.error("[SkaleRegistry] Failed to log spend:", error);
        // Don't throw, just log error so we don't block the main flow
        return null;
      }
    });
  }
}
