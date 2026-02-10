import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { step, price } = body ?? {};

  if (!step || typeof price !== "number") {
    return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
  }

  return NextResponse.json({
    receiptId: `pay_${step}_${Date.now()}`,
    paidAt: new Date().toISOString(),
    price,
  });
}
