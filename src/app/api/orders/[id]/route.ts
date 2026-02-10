import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: order, error: orderError } = await supabaseServer
    .from("orders")
    .select("id, created_at, total, status")
    .eq("id", id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabaseServer
    .from("order_items")
    .select("product_id, qty, price")
    .eq("order_id", id);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const { data: receipts, error: receiptsError } = await supabaseServer
    .from("receipts")
    .select("step_id, price, status, receipt_id, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  if (receiptsError) {
    return NextResponse.json({
      order,
      items,
      receipts: [],
      warning: receiptsError.message,
    });
  }

  return NextResponse.json({ order, items, receipts: receipts ?? [] });
}
