import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get("stepId");
  const status = searchParams.get("status");

  let query = supabaseServer
    .from("receipts")
    .select("id, created_at, step_id, price, status, receipt_id")
    .order("created_at", { ascending: false });

  if (stepId) {
    query = query.eq("step_id", stepId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: receipts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats
  const stats = {
    totalReceipts: receipts?.length ?? 0,
    totalRevenue:
      receipts?.reduce((sum: number, r: any) => sum + Number(r.price), 0) ?? 0,
    byStep: receipts?.reduce(
      (acc: any, r: any) => {
        acc[r.step_id] = (acc[r.step_id] || 0) + Number(r.price);
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  return NextResponse.json({ receipts: receipts ?? [], stats });
}
