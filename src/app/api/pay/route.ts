import { NextResponse } from "next/server";
import { SkaleRegistry } from "@/lib/skale/registry";
import { parseEther } from "viem";

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.SPEND_REGISTRY_CONTRACT;

export async function POST(request: Request) {
  const body = await request.json();
  const { step, price } = body ?? {};

  if (!step || typeof price !== "number") {
    return NextResponse.json(
      { error: "Invalid payment request" },
      { status: 400 },
    );
  }

  let txHash = null;

  if (PRIVATE_KEY && CONTRACT_ADDRESS) {
    try {
      const registry = new SkaleRegistry(PRIVATE_KEY, CONTRACT_ADDRESS);

      // Convert price (assumed to be in standard units e.g., tokens) to Wei (18 decimals)
      const amountInWei = parseEther(price.toString());

      txHash = await registry.logSpend(
        step,
        amountInWei,
        `Agent payment for ${step}`,
      );
    } catch (error) {
      console.error("Failed to log spend to Skale:", error);
    }
  }

  return NextResponse.json({
    receiptId: `pay_${step}_${Date.now()}`,
    paidAt: new Date().toISOString(),
    price,
    txHash: txHash || undefined, // Include hash in response if successful
  });
}
