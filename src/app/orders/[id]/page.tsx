"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  created_at: string;
  total: number;
  status: string;
};

type Item = {
  product_id: string;
  qty: number;
  price: number;
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { id } = await params;
      setOrderId(id);
      const response = await fetch(`/api/orders/${id}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const payload = await response.json();
      setOrder(payload.order);
      setItems(payload.items ?? []);
      setLoading(false);
    };
    load();
  }, [params]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              order detail
            </p>
            <h1 className="text-3xl font-semibold">Order</h1>
            <p className="mt-2 text-sm text-slate-300">
              Full receipt summary for this purchase.
            </p>
          </div>
          <Link
            href="/orders"
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:border-cyan-200/60"
          >
            Back to Orders
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          {loading && (
            <p className="text-sm text-slate-400">Loading order…</p>
          )}
          {!loading && !order && (
            <p className="text-sm text-slate-400">Order not found.</p>
          )}
          {order && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Order ID</p>
                  <p className="text-sm text-slate-200">{order.id}</p>
                </div>
                <span className="rounded-full border border-cyan-200/40 px-3 py-1 text-xs text-cyan-100">
                  {order.status}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm">
                  <p className="text-xs text-slate-400">Created</p>
                  <p className="mt-2 text-white">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="mt-2 text-white">${order.total}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Items
                </p>
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.product_id}-${item.qty}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm"
                    >
                      <span>{item.product_id}</span>
                      <span className="text-cyan-200/80">
                        {item.qty} × ${item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        {orderId && (
          <p className="mt-4 text-xs text-slate-500">ID: {orderId}</p>
        )}
      </div>
    </div>
  );
}
