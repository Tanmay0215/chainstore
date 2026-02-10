"use client";

import { useEffect, useState } from "react";

type Receipt = {
  id: string;
  created_at: string;
  step_id: string;
  price: number;
  status: string;
  receipt_id: string | null;
};

type Stats = {
  totalReceipts: number;
  totalRevenue: number;
  byStep: Record<string, number>;
};

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadReceipts();
  }, [filter]);

  const loadReceipts = async () => {
    const url =
      filter === "all"
        ? "/api/admin-receipts"
        : `/api/admin-receipts?stepId=${filter}`;
    const response = await fetch(url);
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setReceipts(payload.receipts ?? []);
    setStats(payload.stats ?? null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading receipts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          Payment Tracking
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-white">
          x402 Receipts
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          View all payment receipts across the platform
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-200/20 bg-cyan-500/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Total Receipts
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {stats.totalReceipts}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-500/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Total Revenue
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              ${stats.totalRevenue}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/20 bg-amber-500/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Avg per Receipt
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              $
              {stats.totalReceipts > 0
                ? (stats.totalRevenue / stats.totalReceipts).toFixed(2)
                : "0.00"}
            </p>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "all"
              ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          All Steps
        </button>
        <button
          onClick={() => setFilter("quote")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "quote"
              ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          Quote
        </button>
        <button
          onClick={() => setFilter("reserve")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "reserve"
              ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          Reserve
        </button>
        <button
          onClick={() => setFilter("checkout")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "checkout"
              ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          Checkout
        </button>
        <button
          onClick={() => setFilter("fulfill")}
          className={`rounded-full border px-4 py-2 text-sm ${
            filter === "fulfill"
              ? "border-cyan-200/40 bg-cyan-500/10 text-cyan-200"
              : "border-white/10 text-slate-300 hover:border-cyan-200/20"
          }`}
        >
          Fulfill
        </button>
      </div>

      {/* Receipts Table */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 text-xs uppercase tracking-[0.25em] text-slate-400">
          <span>Receipt ID</span>
          <span>Step</span>
          <span className="text-right">Price</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        <div className="mt-4 space-y-3">
          {receipts.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              No receipts found.
            </div>
          )}
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm"
            >
              <span className="truncate font-mono text-xs text-slate-300">
                {receipt.receipt_id || receipt.id.slice(0, 8) + "..."}
              </span>
              <span className="capitalize text-cyan-200">
                {receipt.step_id}
              </span>
              <span className="text-right font-semibold text-emerald-200">
                ${receipt.price}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  receipt.status === "paid"
                    ? "border-emerald-200/40 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-200/40 bg-rose-500/10 text-rose-200"
                }`}
              >
                {receipt.status}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(receipt.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
