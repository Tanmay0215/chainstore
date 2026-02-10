"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  ShoppingBag,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/receipts", label: "Receipts", icon: Receipt },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-slate-950/60 p-6">
          <div className="mb-8">
            <Link href="/" className="block">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                admin panel
              </p>
              <h1 className="mt-1 font-serif text-2xl text-white">x402</h1>
            </Link>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-200 border border-cyan-200/30"
                      : "text-slate-300 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-400">Quick Access</p>
            <Link
              href="/"
              className="mt-2 block text-sm text-cyan-200 hover:underline"
            >
              ← Back to Store
            </Link>
            <Link
              href="/inventory"
              className="mt-1 block text-sm text-cyan-200 hover:underline"
            >
              Public Inventory
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
