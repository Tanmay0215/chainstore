export type PaidToolStep = {
  id: string;
  name: string;
  price: number;
  endpoint: string;
};

export type PaidReceipt = {
  stepId: string;
  status: "paid" | "skipped";
  price: number;
  decision: string;
  timestamp: string;
};

export async function fetchWith402(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(url, init);

  if (response.status !== 402) {
    return response;
  }

  const challenge = await response.json();
  const payment = await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: challenge.step, price: challenge.price }),
  });

  if (!payment.ok) {
    return response;
  }

  const receipt = await payment.json();

  // TODO: integrate CDP wallet signing + x402 payment payload.
  // Placeholder: assume payment succeeds and retry with a header.
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "x402-paid": "true",
      "x402-receipt": receipt.receiptId,
    },
  });
}

export function shouldPayStep(
  budget: number,
  price: number,
  intentScore: number,
) {
  if (budget < price) return { pay: false, reason: "Over budget" };
  if (intentScore < 65) return { pay: false, reason: "Intent score too low" };
  return { pay: true, reason: "Proceed" };
}
