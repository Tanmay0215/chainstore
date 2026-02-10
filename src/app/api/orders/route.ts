import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const { data: orders, error } = await supabaseServer
    .from("orders")
    .select("id, created_at, total, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, total, status, items } = body ?? {};

  if (!userId || typeof total !== "number" || !status || !Array.isArray(items)) {
    return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabaseServer
    .from("orders")
    .insert({
      user_id: userId,
      total,
      status,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Failed to create order" },
      { status: 500 },
    );
  }

  const { error: itemsError } = await supabaseServer
    .from("order_items")
    .insert(
      items.map((item: { productId: string; qty: number; price: number }) => ({
        order_id: order.id,
        product_id: item.productId,
        qty: item.qty,
        price: item.price,
      })),
    );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
