"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  created_at: string;
  user_id: string;
  total: number;
  status: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<{
    message: string;
    type: "ok" | "error";
  } | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const loadOrders = async () => {
    const response = await fetch("/api/admin-orders");
    if (!response.ok) {
      setToast({ message: "Failed to load orders", type: "error" });
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setOrders(payload.orders ?? []);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const response = await fetch("/api/admin-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });

    if (!response.ok) {
      setToast({ message: "Failed to update order", type: "error" });
      return;
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
    setToast({ message: "Order status updated", type: "ok" });
  };

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading orders...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          Order Management
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-white">All Orders</h1>
        <p className="mt-2 text-sm text-slate-300">
          View and manage all platform orders
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "all"
              ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setFilter("paid")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "paid"
              ? "border-emerald-200/40 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          Paid ({orders.filter((o) => o.status === "paid").length})
        </button>
        <button
          onClick={() => setFilter("partial")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "partial"
              ? "border-amber-200/40 bg-amber-500/10 text-amber-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          Partial ({orders.filter((o) => o.status === "partial").length})
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 text-xs uppercase tracking-[0.25em] text-slate-400">
          <span>Order ID</span>
          <span>User ID</span>
          <span className="text-right">Total</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="mt-4 space-y-3">
          {filteredOrders.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              No orders found.
            </div>
          )}
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm"
            >
              <span className="truncate font-mono text-xs text-slate-300">
                {order.id.slice(0, 8)}...
              </span>
              <span className="truncate font-mono text-xs text-slate-400">
                {order.user_id.slice(0, 8)}...
              </span>
              <span className="text-right font-semibold text-emerald-200">
                ${order.total}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  order.status === "paid"
                    ? "border-emerald-200/40 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-200/40 bg-amber-500/10 text-amber-200"
                }`}
              >
                {order.status}
              </span>
              <div className="flex justify-end gap-2">
                {order.status === "partial" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "paid")}
                    className="rounded-full border border-emerald-200/40 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-200"
                  >
                    Mark Paid
                  </button>
                )}
                {order.status === "paid" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "fulfilled")}
                    className="rounded-full border border-cyan-200/40 px-3 py-1 text-xs text-cyan-200 hover:border-cyan-200"
                  >
                    Fulfill
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "ok"
              ? "border-cyan-200/40 bg-slate-950/90 text-cyan-100"
              : "border-rose-300/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
