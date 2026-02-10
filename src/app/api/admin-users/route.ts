import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  // Get unique user IDs from orders
  const { data: orders, error: ordersError } = await supabaseServer
    .from("orders")
    .select("user_id, total, status");

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  // Aggregate user stats
  const userStats = (orders ?? []).reduce(
    (acc, order) => {
      if (!acc[order.user_id]) {
        acc[order.user_id] = {
          userId: order.user_id,
          orderCount: 0,
          totalSpent: 0,
        };
      }
      acc[order.user_id].orderCount += 1;
      acc[order.user_id].totalSpent += Number(order.total);
      return acc;
    },
    {} as Record<
      string,
      { userId: string; orderCount: number; totalSpent: number }
    >,
  );

  return NextResponse.json({ users: Object.values(userStats) });
}
