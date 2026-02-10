import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("cart_items")
    .select("product_id, qty")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((row) => ({
      productId: row.product_id,
      qty: row.qty,
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, items } = body ?? {};

  if (!userId || !Array.isArray(items)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await supabaseServer.from("cart_items").delete().eq("user_id", userId);

  if (items.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseServer.from("cart_items").insert(
    items.map((item: { productId: string; qty: number }) => ({
      user_id: userId,
      product_id: item.productId,
      qty: item.qty,
    })),
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
