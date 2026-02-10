"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  on_hand: number;
  product_id: string;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InventoryItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "ok" | "error" } | null>(
    null,
  );

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/inventory");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setToast({
          message: payload.error ?? "Failed to load inventory",
          type: "error",
        });
        setLoading(false);
        return;
      }
      const payload = await response.json();
      setItems(payload.items ?? []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setDraft({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!draft) return;
    const response = await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draft.id,
        name: draft.name,
        sku: draft.sku,
        on_hand: draft.on_hand,
        product_id: draft.product_id,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setToast({
        message: payload.error ?? "Failed to save inventory item",
        type: "error",
      });
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === draft.id ? { ...draft } : item)),
    );
    setToast({ message: "Inventory updated.", type: "ok" });
    setEditingId(null);
    setDraft(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              inventory control
            </p>
            <h1 className="text-3xl font-semibold">Supply Tracker</h1>
            <p className="mt-2 text-sm text-slate-300">
              Monitor stock levels and identify low inventory.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:border-cyan-200/60"
          >
            Back to Store
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            <span>Item</span>
            <span className="text-center">SKU</span>
            <span className="text-center">Product ID</span>
            <span className="text-right">On Hand</span>
            <span className="text-right">Edit</span>
          </div>
          <div className="mt-4 space-y-3">
            {loading && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                Loading inventory...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                No inventory rows found.
              </div>
            )}
            {items.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm"
                >
                  {isEditing ? (
                    <input
                      value={draft?.name ?? ""}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, name: event.target.value } : prev,
                        )
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                    />
                  ) : (
                    <span>{item.name}</span>
                  )}
                  {isEditing ? (
                    <input
                      value={draft?.sku ?? ""}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, sku: event.target.value } : prev,
                        )
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-center text-sm text-white"
                    />
                  ) : (
                    <span className="text-center text-slate-400">{item.sku}</span>
                  )}
                  {isEditing ? (
                    <input
                      value={draft?.product_id ?? ""}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, product_id: event.target.value }
                            : prev,
                        )
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-center text-sm text-white"
                    />
                  ) : (
                    <span className="text-center text-slate-400">
                      {item.product_id}
                    </span>
                  )}
                  {isEditing ? (
                    <input
                      type="number"
                      value={draft?.on_hand ?? 0}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, on_hand: Number(event.target.value) }
                            : prev,
                        )
                      }
                      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-right text-sm text-white"
                    />
                  ) : (
                    <span
                      className={`text-right font-semibold ${
                        item.on_hand < 12 ? "text-rose-300" : "text-cyan-200"
                      }`}
                    >
                      {item.on_hand}
                    </span>
                  )}
                  <div className="flex justify-end gap-2 text-xs">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="rounded-full border border-cyan-200/40 px-3 py-1 text-cyan-100 hover:border-cyan-200"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-full border border-white/15 px-3 py-1 text-slate-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-full border border-white/15 px-3 py-1 text-slate-200 hover:border-cyan-200/60"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
