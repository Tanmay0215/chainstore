"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/StatsCard";
import Link from "next/link";

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowInventoryItems: number;
  totalReceipts: number;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowInventoryItems: 0,
    totalReceipts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Fetch all stats in parallel
        const [ordersRes, receiptsRes, inventoryRes] = await Promise.all([
          fetch("/api/admin-orders"),
          fetch("/api/admin-receipts"),
          fetch("/api/inventory"),
        ]);

        const ordersData = await ordersRes.json();
        const receiptsData = await receiptsRes.json();
        const inventoryData = await inventoryRes.json();

        const orders = ordersData.orders || [];
        const receipts = receiptsData.receipts || [];
        const inventory = inventoryData.items || [];

        setStats({
          totalOrders: orders.length,
          totalRevenue: orders.reduce(
            (sum: number, order: { total: number }) => sum + order.total,
            0,
          ),
          pendingOrders: orders.filter(
            (order: { status: string }) => order.status === "partial",
          ).length,
          lowInventoryItems: inventory.filter(
            (item: { on_hand: number }) => item.on_hand < 12,
          ).length,
          totalReceipts: receipts.length,
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          Admin Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Overview</h1>
        <p className="mt-2 text-sm text-slate-300">
          Monitor platform activity and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label="Total Orders"
          value={stats.totalOrders}
          color="cyan"
        />
        <StatsCard
          label="Total Revenue"
          value={`$${stats.totalRevenue}`}
          color="emerald"
        />
        <StatsCard
          label="Pending Orders"
          value={stats.pendingOrders}
          color={stats.pendingOrders > 0 ? "amber" : "cyan"}
        />
        <StatsCard
          label="Low Stock Items"
          value={stats.lowInventoryItems}
          color={stats.lowInventoryItems > 0 ? "rose" : "emerald"}
        />
        <StatsCard
          label="Total Receipts"
          value={stats.totalReceipts}
          color="cyan"
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/inventory"
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition hover:border-cyan-200/40"
          >
            <h3 className="text-lg font-semibold text-white">
              Manage Inventory
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Add, edit, or remove products
            </p>
          </Link>
          <Link
            href="/admin/orders"
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition hover:border-cyan-200/40"
          >
            <h3 className="text-lg font-semibold text-white">View Orders</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track and update order status
            </p>
          </Link>
          <Link
            href="/admin/receipts"
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition hover:border-cyan-200/40"
          >
            <h3 className="text-lg font-semibold text-white">
              Payment Receipts
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              View x402 payment history
            </p>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition hover:border-cyan-200/40"
          >
            <h3 className="text-lg font-semibold text-white">User Overview</h3>
            <p className="mt-2 text-sm text-slate-400">View registered users</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
