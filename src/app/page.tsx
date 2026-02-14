"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchWith402, shouldPayStep } from "@/lib/x402";
import { supabaseClient } from "@/lib/supabase/client";
import StatsCard from "@/components/StatsCard";
import ConfirmDialog from "@/components/ConfirmDialog";

type TraceStep = {
  name: string;
  price: number;
  decision: string;
  status: "queued" | "paid" | "skipped" | "error";
  receipt?: string;
};

const baseSteps = [
  { id: "quote", name: "Dynamic Price Quote", price: 0.0004 },
  { id: "reserve", name: "Inventory Hold", price: 0.0007 },
  { id: "checkout", name: "Checkout Fee", price: 0.0006 },
  { id: "fulfill", name: "Fulfillment", price: 0.0005 },
];

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  tag: string;
};

const products: Product[] = [
  {
    id: "desk-mat",
    name: "Wool Desk Mat",
    description: "Soft grip surface, 80x35cm",
    price: 0.018,
    tag: "Workspace",
  },
  {
    id: "lamp",
    name: "Focus Lamp",
    description: "Adjustable warm light",
    price: 0.022,
    tag: "Lighting",
  },
  {
    id: "headset",
    name: "Studio Headset",
    description: "Noise isolation + mic",
    price: 0.028,
    tag: "Audio",
  },
  {
    id: "mug",
    name: "Thermal Mug",
    description: "Stays hot for 6 hours",
    price: 0.014,
    tag: "Comfort",
  },
  {
    id: "notebook",
    name: "Analog Notebook",
    description: "Grid pages, 120 sheets",
    price: 0.012,
    tag: "Focus",
  },
  {
    id: "stand",
    name: "Laptop Stand",
    description: "Aluminum, 6 height levels",
    price: 0.024,
    tag: "Ergonomics",
  },
];

export default function Home() {
  const [budget, setBudget] = useState(0.5);
  const [targetCount, setTargetCount] = useState(3);
  const [minCartValue, setMinCartValue] = useState(0);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [spent, setSpent] = useState(0);
  const [cart, setCart] = useState<Record<string, number>>({
    "desk-mat": 1,
    lamp: 1,
  });
  const [authEmail, setAuthEmail] = useState("");
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<
    "idle" | "loading" | "error" | "ok"
  >("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [cartLoaded, setCartLoaded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "ok" | "error";
  } | null>(null);

  // Dev mode toggle
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const projectedSpend = useMemo(
    () => baseSteps.reduce((sum, step) => sum + step.price, 0),
    [],
  );

  const cartItems = useMemo(
    () =>
      products
        .filter((product) => cart[product.id])
        .map((product) => ({
          ...product,
          qty: cart[product.id],
          lineTotal: cart[product.id] * product.price,
        })),
    [cart],
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems],
  );

  useEffect(() => {
    const syncUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setAuthUser(data.user?.email ?? null);
      setAuthUserId(data.user?.id ?? null);
    };
    syncUser();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user?.email ?? null);
        setAuthUserId(session?.user?.id ?? null);
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUserId) {
      setCartLoaded(false);
      return;
    }

    const loadCart = async () => {
      const response = await fetch(
        `/api/cart?userId=${encodeURIComponent(authUserId)}`,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setToast({
          message: payload.error ?? "Failed to load cart",
          type: "error",
        });
        setCartLoaded(true);
        return;
      }
      const payload = await response.json();
      const nextCart: Record<string, number> = {};
      (payload.items ?? []).forEach(
        (item: { productId: string; qty: number }) => {
          nextCart[item.productId] = item.qty;
        },
      );
      setCart(nextCart);
      setCartLoaded(true);
    };

    loadCart();
  }, [authUser]);

  useEffect(() => {
    if (!authUserId || !cartLoaded) return;
    const persistCart = async () => {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUserId,
          items: Object.entries(cart).map(([productId, qty]) => ({
            productId,
            qty,
          })),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setToast({
          message: payload.error ?? "Failed to save cart",
          type: "error",
        });
      }
    };
    persistCart();
  }, [authUserId, cart, cartLoaded]);

  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] ?? 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[productId] ?? 0;
      if (current <= 1) {
        delete next[productId];
      } else {
        next[productId] = current - 1;
      }
      return next;
    });
  };

  const signIn = async () => {
    if (!authEmail) return;
    setAuthStatus("loading");
    setAuthMessage("");
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: authEmail,
    });
    if (error) {
      setAuthStatus("error");
      setAuthMessage(error.message);
      return;
    }
    setAuthStatus("ok");
    setAuthMessage("Check your email for a magic link.");
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
    setAuthUser(null);
  };

  const runChain = async () => {
    setIsRunning(true);
    setTrace([]);
    setSpent(0);
    setErrors([]);

    let remaining = budget;
    const nextTrace: TraceStep[] = [];

    const receiptQueue: Array<{
      stepId: string;
      price: number;
      receiptId?: string;
    }> = [];

    for (const step of baseSteps) {
      const { pay, reason } = shouldPayStep(
        remaining,
        step.price,
        cartSubtotal,
        minCartValue,
      );
      if (!pay) {
        nextTrace.push({
          name: step.name,
          price: step.price,
          decision: `Skipped: ${reason}`,
          status: "skipped",
        });
        setTrace([...nextTrace]); // Update UI progressively
        continue;
      }

      try {
        const response = await fetchWith402(`/api/tools/${step.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemCount: targetCount, cartSubtotal }),
        });

        if (!response.ok) {
          nextTrace.push({
            name: step.name,
            price: step.price,
            decision: `Error: ${response.status}`,
            status: "error",
          });
          setTrace([...nextTrace]);
          continue;
        }

        const payload = await response.json();
        remaining -= step.price;
        setSpent((prev) => prev + step.price);

        nextTrace.push({
          name: step.name,
          price: step.price,
          decision: "Paid via x402 + retry",
          status: "paid",
          receipt: payload?.receipt?.id,
        });
        setTrace([...nextTrace]);

        receiptQueue.push({
          stepId: step.id,
          price: step.price,
          receiptId: payload?.receipt?.id,
        });
      } catch (error) {
        nextTrace.push({
          name: step.name,
          price: step.price,
          decision: "Error: network failure",
          status: "error",
        });
        setTrace([...nextTrace]);
      }
    }

    const allPaid = nextTrace.every((step) => step.status === "paid");
    let orderId: string | null = null;
    if (authUserId && cartItems.length > 0) {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUserId,
          total: cartSubtotal,
          status: allPaid ? "paid" : "partial",
          items: cartItems.map((item) => ({
            productId: item.id,
            qty: item.qty,
            price: item.price,
          })),
        }),
      });
      if (!orderResponse.ok) {
        const message = await orderResponse.json().catch(() => ({}));
        setErrors((prev) => [
          ...prev,
          `Order create failed: ${message.error ?? orderResponse.status}`,
        ]);
        setToast({
          message: message.error ?? "Order failed",
          type: "error",
        });
      } else {
        const payload = await orderResponse.json().catch(() => ({}));
        orderId = payload.orderId ?? null;
        for (const receipt of receiptQueue) {
          const receiptResponse = await fetch("/api/receipts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stepId: receipt.stepId,
              price: receipt.price,
              status: "paid",
              receiptId: receipt.receiptId,
              orderId,
            }),
          });
          if (!receiptResponse.ok) {
            const message = await receiptResponse.json().catch(() => ({}));
            setErrors((prev) => [
              ...prev,
              `Receipt log failed (${receipt.stepId}): ${
                message.error ?? receiptResponse.status
              }`,
            ]);
          }
        }
        setToast({
          message: "Order placed. Receipts and order saved.",
          type: "ok",
        });
      }
    }

    setTrace(nextTrace);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 font-sans selection:bg-cyan-500/30">
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(56,189,248,0.15),_transparent_50%),radial-gradient(circle_at_80%_10%,_rgba(244,114,182,0.1),_transparent_50%)]" />
        <div className="pointer-events-none absolute -left-24 top-24 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-120px] top-1/2 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[180px]" />

        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0b0c10]/80 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Chain<span className="text-cyan-400">Store</span>
              </h1>
            </div>

            <nav className="flex items-center gap-6">
              <div className="hidden items-center gap-1 sm:flex">
                <Link
                  href="/orders"
                  className="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  My Orders
                </Link>
                <Link
                  href="/inventory"
                  className="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Inventory
                </Link>
              </div>

              <div className="h-6 w-px bg-white/10 mx-2" />

              <div className="flex items-center gap-3">
                {/* @ts-expect-error custom element */}
                <appkit-button />

                {authUser ? (
                  <div className="flex items-center gap-3 pl-2">
                    <span className="text-xs text-slate-400 hidden md:block">
                      {authUser}
                    </span>
                    <button
                      onClick={signOut}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Email for magic link"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="rounded-full border border-white/10 bg-slate-900/50 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none w-40"
                    />
                    <button
                      onClick={signIn}
                      className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all"
                    >
                      {authStatus === "loading" ? "..." : "Login"}
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-6 py-12">
          {/* Hero Section */}
          <section className="mb-16 text-center">
            <h2 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:leading-tight">
              Experience the Future of <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Autonomous Buying
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              Build your cart and watch an AI agent negotiate, reserve
              inventory, and complete payment step-by-step using
              <span className="text-cyan-200"> x402 </span> protocols.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => setDevMode(!devMode)}
                className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${devMode ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                {devMode ? "Developer Mode: ON" : "Enable Developer Mode"}
              </button>
            </div>
          </section>

          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            {/* Left Column: Products */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">Catalog</h3>
                <div className="flex gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <span>Premium Gear</span>
                  <span className="text-cyan-500">•</span>
                  <span>Crypto Ready</span>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent p-6 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_30px_-10px_rgba(34,211,238,0.2)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div>
                      <div className="flex items-start justify-between">
                        <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 border border-white/5">
                          {product.tag}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-200">
                          {product.price} ETH
                        </span>
                      </div>
                      <h4 className="mt-4 text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                        {product.name}
                      </h4>
                      <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <button
                      onClick={() => addToCart(product.id)}
                      className="mt-6 w-full rounded-2xl bg-white/5 py-3 text-sm font-semibold text-white transition-all hover:bg-cyan-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Right Column: Cart & Agent Status */}
            <aside className="space-y-8">
              {/* Cart Card */}
              <div className="sticky top-24 rounded-[32px] border border-white/10 bg-[#0f111a]/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Your Cart</h3>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    {cartItems.reduce((acc, i) => acc + i.qty, 0)}
                  </span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <p className="text-slate-500 text-sm">
                      Your cart is empty.
                    </p>
                    <p className="mt-1 text-slate-600 text-xs">
                      Add items to start the agent.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200 text-sm">
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {item.qty} × {item.price} ETH
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-cyan-200">
                              {item.lineTotal.toFixed(3)}
                            </span>
                            <div className="flex items-center gap-1 rounded-lg bg-black/20 p-1">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                              >
                                -
                              </button>
                              <button
                                onClick={() => addToCart(item.id)}
                                className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white/10 pt-4 mt-4">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm text-slate-400">Subtotal</span>
                        <span className="text-2xl font-bold text-white tracking-tight">
                          {cartSubtotal.toFixed(3)} ETH
                        </span>
                      </div>
                      <p className="text-right text-xs text-slate-500">
                        Excludes network fees
                      </p>
                    </div>

                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={
                        !authUser || isRunning || cartItems.length === 0
                      }
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                    >
                      <span className="relative z-10">
                        {!authUser
                          ? "Sign in to Checkout"
                          : isRunning
                            ? "Agent Working..."
                            : "Pay with Agent"}
                      </span>
                      <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                    {!authUser && (
                      <p className="text-center text-xs text-rose-300/80 mt-2">
                        Authentication required
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Dev Mode Panel */}
              {devMode && (
                <div className="rounded-[32px] border border-indigo-500/20 bg-indigo-950/20 p-6 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest">
                      Agent Diagnostics
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-400">
                        Agent Budget (ETH)
                      </span>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-400">
                          Min Cart Value
                        </span>
                        <input
                          type="number"
                          value={minCartValue}
                          onChange={(e) =>
                            setMinCartValue(Number(e.target.value))
                          }
                          className="mt-1 block w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </label>
                      <StatsCard
                        label="Est. Fees"
                        value={`${projectedSpend.toFixed(4)}`}
                        color="indigo"
                      />
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-900/50 p-3 border border-white/5">
                      <p className="text-xs font-mono text-slate-500 mb-2">
                        LAST EXECUTION TRACE
                      </p>
                      {trace.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">
                          No traces yet...
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {trace.map((step, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-[10px]"
                            >
                              <span
                                className={
                                  step.status === "paid"
                                    ? "text-emerald-400"
                                    : "text-slate-400"
                                }
                              >
                                {step.name}
                              </span>
                              <span className="text-slate-500">
                                {step.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={runChain}
        title="Authorize Agent Payment"
        message={`This will authorize an autonomous agent to execute ${baseSteps.length} distinct transactions (Quote, Reserve, Checkout, Fulfill) on your behalf. Total estimated value: ${(cartSubtotal + projectedSpend).toFixed(4)} ETH.`}
        confirmText="Start Agent"
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-6 py-4 text-sm font-medium shadow-2xl backdrop-blur-xl transition-all ${
            toast.type === "ok"
              ? "border-emerald-500/20 bg-emerald-950/80 text-emerald-200"
              : "border-rose-500/20 bg-rose-950/80 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
