"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  created_at: string;
  total: number;
  status: string;
};

export default function OrdersPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      const { data } = await supabaseClient.auth.getUser();
      const id = data.user?.id ?? null;
      const userEmail = data.user?.email ?? null;
      setUserId(id);
      setEmail(userEmail);
      if (!id) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/orders?userId=${encodeURIComponent(id)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Failed to load orders");
        setLoading(false);
        return;
      }
      const payload = await response.json();
      setOrders(payload.orders ?? []);
      setLoading(false);
    };

    loadOrders();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-sm text-slate-300">
          Your agentic commerce purchases and x402 receipts.
        </p>

        {!email && !loading && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
            Sign in on the homepage to view your orders.
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
            Loading orders...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6 text-sm text-rose-200">
            {error}
          </div>
        )}

        {email && !loading && orders.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
            No orders yet. Run a purchase to create your first order.
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Order</span>
                  <span className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">
                    ${order.total}
                  </span>
                  <span className="rounded-full border border-amber-200/40 px-3 py-1 text-xs text-amber-100">
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{order.id}</p>
                <a
                  href={`/orders/${order.id}`}
                  className="mt-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:border-cyan-200/60"
                >
                  View details
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
