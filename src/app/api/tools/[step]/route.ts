import { NextResponse } from "next/server";

const pricing: Record<
  string,
  { price: number; description: string; payload: Record<string, unknown> }
> = {
  quote: {
    price: 4,
    description: "Dynamic price quote for cart items",
    payload: { items: 3, subtotal: 34, discount: 2 },
  },
  reserve: {
    price: 7,
    description: "Inventory reservation hold",
    payload: { holds: 3, holdMinutes: 20 },
  },
  checkout: {
    price: 6,
    description: "Checkout processing fee",
    payload: { orderId: "ord_1024", total: 38 },
  },
  fulfill: {
    price: 5,
    description: "Fulfillment + shipping label",
    payload: { shipmentId: "shp_3341", etaDays: 3 },
  },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ step: string }> },
) {
  const { step } = await params;
  const tool = pricing[step];

  if (!tool) {
    return NextResponse.json({ error: "Unknown step" }, { status: 404 });
  }

  const paid = request.headers.get("x402-paid");
  if (!paid) {
    return NextResponse.json(
      {
        error: "Payment required",
        step,
        price: tool.price,
        description: tool.description,
      },
      { status: 402 },
    );
  }

  return NextResponse.json({
    step,
    price: tool.price,
    status: "ok",
    payload: tool.payload,
    receipt: {
      id: `rcpt_${step}_${Date.now()}`,
      paidAt: new Date().toISOString(),
    },
  });
}
