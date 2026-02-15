"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  on_hand: number;
  product_id: string;
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InventoryItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    on_hand: 0,
    product_id: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: string | null;
  }>({ isOpen: false, itemId: null });
  const [toast, setToast] = useState<{
    message: string;
    type: "ok" | "error";
  } | null>(null);

  const loadInventory = async () => {
    const response = await fetch("/api/inventory");
    if (!response.ok) {
      setToast({ message: "Failed to load inventory", type: "error" });
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setItems(payload.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

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
      body: JSON.stringify(draft),
    });
    if (!response.ok) {
      setToast({ message: "Failed to save item", type: "error" });
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === draft.id ? { ...draft } : item)),
    );
    setToast({ message: "Item updated", type: "ok" });
    setEditingId(null);
    setDraft(null);
  };

  const addItem = async () => {
    if (
      !newItem.name ||
      !newItem.sku ||
      !newItem.product_id ||
      newItem.on_hand < 0
    ) {
      setToast({ message: "Please fill all fields", type: "error" });
      return;
    }

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });

    if (!response.ok) {
      setToast({ message: "Failed to add item", type: "error" });
      return;
    }

    setToast({ message: "Item added successfully", type: "ok" });
    setShowAddForm(false);
    setNewItem({ name: "", sku: "", on_hand: 0, product_id: "" });
    loadInventory();
  };

  const deleteItem = async (id: string) => {
    const response = await fetch("/api/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      setToast({ message: "Failed to delete item", type: "error" });
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
    setToast({ message: "Item deleted", type: "ok" });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Inventory Management
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">
            Product Catalog
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Add, edit, or remove inventory items
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-200"
        >
          {showAddForm ? "Cancel" : "+ Add Product"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-white">Add New Product</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Product Name"
              value={newItem.name}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, name: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="SKU"
              value={newItem.sku}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, sku: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="Product ID"
              value={newItem.product_id}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  product_id: e.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white"
            />
            <input
              type="number"
              placeholder="Stock Quantity"
              value={newItem.on_hand}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  on_hand: Number(e.target.value),
                }))
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white"
            />
          </div>
          <button
            onClick={addItem}
            className="mt-4 rounded-full bg-cyan-300 px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-200"
          >
            Add Product
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
          <span>Item</span>
          <span className="text-center">SKU</span>
          <span className="text-center">Product ID</span>
          <span className="text-right">Stock</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
              No inventory items found.
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
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev,
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
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, sku: e.target.value } : prev,
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
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, product_id: e.target.value } : prev,
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
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, on_hand: Number(e.target.value) }
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
                    <>
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-full border border-white/15 px-3 py-1 text-slate-200 hover:border-cyan-200/60"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({ isOpen: true, itemId: item.id })
                        }
                        className="rounded-full border border-rose-300/40 px-3 py-1 text-rose-200 hover:border-rose-300"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null })}
        onConfirm={() => {
          if (deleteConfirm.itemId) deleteItem(deleteConfirm.itemId);
        }}
        title="Delete Item"
        message="Are you sure you want to delete this inventory item? This action cannot be undone."
        confirmText="Delete"
        isDestructive
      />

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
