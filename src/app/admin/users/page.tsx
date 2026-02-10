"use client";

import { useEffect, useState } from "react";

type User = {
  userId: string;
  orderCount: number;
  totalSpent: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const response = await fetch("/api/admin-users");
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setUsers(payload.users ?? []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          User Management
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-white">
          Platform Users
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          View user statistics and activity
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-500/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Total Users
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {users.length}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/20 bg-emerald-500/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Total Orders
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {users.reduce((sum, user) => sum + user.orderCount, 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/20 bg-amber-500/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Total Revenue
          </p>
          <p className="mt-3 text-3xl font-semibold text-white">
            ${users.reduce((sum, user) => sum + user.totalSpent, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 text-xs uppercase tracking-[0.25em] text-slate-400">
          <span>User ID</span>
          <span className="text-center">Orders</span>
          <span className="text-right">Total Spent</span>
        </div>
        <div className="mt-4 space-y-3">
          {users.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              No users found.
            </div>
          )}
          {users.map((user) => (
            <div
              key={user.userId}
              className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm"
            >
              <span className="truncate font-mono text-xs text-slate-300">
                {user.userId}
              </span>
              <span className="text-center font-semibold text-cyan-200">
                {user.orderCount}
              </span>
              <span className="text-right font-semibold text-emerald-200">
                ${user.totalSpent.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
