import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { stepId, price, status, receiptId } = body ?? {};

  if (!stepId || typeof price !== "number" || !status) {
    return NextResponse.json({ error: "Invalid receipt" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("receipts").insert({
    step_id: stepId,
    price,
    status,
    receipt_id: receiptId ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
