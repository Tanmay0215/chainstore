import { x402Client, x402HTTPClient } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { skaleChain } from "../skale/chain";
import { SkaleRegistry } from "../skale/registry";

type AccessResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export class X402Agent {
  private httpClient: x402HTTPClient;
  private walletAddress: string;
  private publicClient: ReturnType<typeof createPublicClient>;
  private registry?: SkaleRegistry;

  private constructor(
    httpClient: x402HTTPClient,
    walletAddress: string,
    publicClient: ReturnType<typeof createPublicClient>,
    registry?: SkaleRegistry,
  ) {
    this.httpClient = httpClient;
    this.walletAddress = walletAddress;
    this.publicClient = publicClient;
    this.registry = registry;
  }

  static async create(privateKey: string): Promise<X402Agent> {
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create EVM scheme for signing payments
    const evmScheme = new ExactEvmScheme(account);

    // Register scheme for all EVM networks (eip155:*)
    const coreClient = new x402Client().register("eip155:*", evmScheme);
    const httpClient = new x402HTTPClient(coreClient);

    // Create public client for balance checks
    const publicClient = createPublicClient({
      chain: skaleChain,
      transport: http(),
    });

    // Initialize SpendRegistry if contract address is available
    let registry;
    if (process.env.SPEND_REGISTRY_CONTRACT) {
      registry = new SkaleRegistry(
        privateKey,
        process.env.SPEND_REGISTRY_CONTRACT,
      );
    }

    console.log(`[X402Agent] Initialized with wallet: ${account.address}`);
    return new X402Agent(httpClient, account.address, publicClient, registry);
  }

  async accessResource(url: string): Promise<AccessResult> {
    console.log(`[X402Agent] Accessing resource: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 402) {
        return this.handlePaymentRequired(response, url);
      }

      if (!response.ok) {
        return {
          success: false,
          error: `Request failed: ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async handlePaymentRequired(
    response: Response,
    url: string,
  ): Promise<AccessResult> {
    console.log("[X402Agent] Payment required (402), processing payment...");

    try {
      const responseBody = await response.json();

      // Get payment requirements from response headers and body
      const paymentRequired = this.httpClient.getPaymentRequiredResponse(
        (name: string) => response.headers.get(name),
        responseBody,
      );

      console.log(
        `[X402Agent] Payment options: ${paymentRequired.accepts.length}`,
      );

      // Create signed payment payload
      const paymentPayload =
        await this.httpClient.createPaymentPayload(paymentRequired);

      // Encode payment headers for retry request
      const paymentHeaders =
        this.httpClient.encodePaymentSignatureHeader(paymentPayload);

      // Retry request with payment
      const paidResponse = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...paymentHeaders,
        },
      });

      if (!paidResponse.ok) {
        return {
          success: false,
          error: `Payment failed: ${paidResponse.status}`,
        };
      }

      // Check settlement response
      const settlement = this.httpClient.getPaymentSettleResponse(
        (name: string) => paidResponse.headers.get(name),
      );

      if (settlement?.transaction) {
        console.log(
          `[X402Agent] Payment settled, tx: ${settlement.transaction}`,
        );
      }

      const data = await paidResponse.json();
      console.log("[X402Agent] Resource accessed successfully after payment!");

      // Log spend on SKALE
      if (this.registry) {
        // Extract amount from payment payload or use default if not easily accessible
        // For now logging 1 token as placeholder, or exact amount if we can parse it
        // The payment payload structure depends on the x402 implementation
        const amount = paymentRequired.accepts[0].amount || BigInt(0);
        await this.registry.logSpend(
          url.split("/").pop() || "unknown-step",
          BigInt(amount),
          `Paid for resource: ${url}`,
        );
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Payment processing failed",
      };
    }
  }

  getAddress(): string {
    return this.walletAddress;
  }

  /**
   * Check wallet balance on SKALE chain
   */
  async getBalance(): Promise<bigint> {
    return await this.publicClient.getBalance({
      address: this.walletAddress as `0x${string}`,
    });
  }
}
