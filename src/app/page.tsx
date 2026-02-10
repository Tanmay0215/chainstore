"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchWith402, shouldPayStep } from "@/lib/x402";
import { supabaseClient } from "@/lib/supabase/client";

type TraceStep = {
  name: string;
  price: number;
  decision: string;
  status: "queued" | "paid" | "skipped" | "error";
  receipt?: string;
};

const baseSteps = [
  { id: "quote", name: "Dynamic Price Quote", price: 4 },
  { id: "reserve", name: "Inventory Hold", price: 7 },
  { id: "checkout", name: "Checkout Fee", price: 6 },
  { id: "fulfill", name: "Fulfillment", price: 5 },
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
    price: 18,
    tag: "Workspace",
  },
  {
    id: "lamp",
    name: "Focus Lamp",
    description: "Adjustable warm light",
    price: 22,
    tag: "Lighting",
  },
  {
    id: "headset",
    name: "Studio Headset",
    description: "Noise isolation + mic",
    price: 28,
    tag: "Audio",
  },
  {
    id: "mug",
    name: "Thermal Mug",
    description: "Stays hot for 6 hours",
    price: 14,
    tag: "Comfort",
  },
  {
    id: "notebook",
    name: "Analog Notebook",
    description: "Grid pages, 120 sheets",
    price: 12,
    tag: "Focus",
  },
  {
    id: "stand",
    name: "Laptop Stand",
    description: "Aluminum, 6 height levels",
    price: 24,
    tag: "Ergonomics",
  },
];

export default function Home() {
  const [budget, setBudget] = useState(50);
  const [targetCount, setTargetCount] = useState(3);
  const [minCartValue, setMinCartValue] = useState(0);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [spent, setSpent] = useState(0);
  const [geminiPrompt, setGeminiPrompt] = useState(
    "Suggest a 3-item remote office starter kit under $50.",
  );
  const [geminiText, setGeminiText] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({
    "desk-mat": 1,
    lamp: 1,
  });
  const [authEmail, setAuthEmail] = useState("");
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading" | "error" | "ok">(
    "idle",
  );
  const [authMessage, setAuthMessage] = useState("");
  const [cartLoaded, setCartLoaded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

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
        setCartLoaded(true);
        return;
      }
      const payload = await response.json();
      const nextCart: Record<string, number> = {};
      (payload.items ?? []).forEach((item: { productId: string; qty: number }) => {
        nextCart[item.productId] = item.qty;
      });
      setCart(nextCart);
      setCartLoaded(true);
    };

    loadCart();
  }, [authUser]);

  useEffect(() => {
    if (!authUserId || !cartLoaded) return;
    const persistCart = async () => {
      await fetch("/api/cart", {
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

        const receiptResponse = await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: step.id,
            price: step.price,
            status: "paid",
            receiptId: payload?.receipt?.id,
          }),
        });

        if (!receiptResponse.ok) {
          const message = await receiptResponse.json().catch(() => ({}));
          setErrors((prev) => [
            ...prev,
            `Receipt log failed (${step.id}): ${message.error ?? receiptResponse.status}`,
          ]);
        }
      } catch (error) {
        nextTrace.push({
          name: step.name,
          price: step.price,
          decision: "Error: network failure",
          status: "error",
        });
      }
    }

    const allPaid = nextTrace.every((step) => step.status === "paid");
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
      } else {
        setToast("Order placed. Receipts and order saved.");
      }
    }

    setTrace(nextTrace);
    setIsRunning(false);
  };

  const runGemini = async () => {
    setGeminiLoading(true);
    setGeminiText("");
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: geminiPrompt }),
      });
      const payload = await response.json();
      setGeminiText(payload.text || "No response.");
    } catch (error) {
      setGeminiText("Failed to reach Gemini API.");
    } finally {
      setGeminiLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-[#0b0c10] text-slate-100">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(56,189,248,0.35),_transparent_40%),radial-gradient(circle_at_80%_10%,_rgba(244,114,182,0.25),_transparent_35%)]" />
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-[120px]" />
          <div className="pointer-events-none absolute right-[-120px] top-1/2 h-[520px] w-[520px] rounded-full bg-indigo-500/15 blur-[160px]" />

          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              x402 agentic commerce
              </p>
              <h1 className="font-serif text-3xl text-white">
                Agentic Commerce
              </h1>
            </div>
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:border-cyan-200/60"
            >
              Orders
            </Link>
            <Link
              href="/inventory"
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:border-cyan-200/60"
            >
              Inventory
            </Link>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs">
              Budget-aware
            </span>
            {/* @ts-expect-error custom element */}
            <appkit-button />
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-20 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-[0_0_90px_-60px_rgba(56,189,248,0.8)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-200/40 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                Live agent
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                Auto-checkout + fulfillment
              </span>
            </div>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white">
              Build a cart, let the agent negotiate and pay step-by-step.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              The agent pays for price quotes, inventory holds, checkout, and
              fulfillment with x402. Every receipt is logged to Supabase for
              auditability.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                Shopper Access
              </p>
              {authUser ? (
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Signed in as</p>
                    <p className="text-base text-white">{authUser}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200 hover:border-cyan-200/40"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={signIn}
                    className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-900"
                  >
                    {authStatus === "loading" ? "Sending..." : "Get magic link"}
                  </button>
                </div>
              )}
              {authMessage && (
                <p className="mt-2 text-xs text-slate-400">{authMessage}</p>
              )}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                  Bundle Goal
                </p>
                <p className="mt-2 text-lg">Remote office starter kit</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                  Toolchain
                </p>
                <p className="mt-2 text-lg">Quote → Reserve → Checkout → Fulfill</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Per-Run Fees
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  ${projectedSpend}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Items
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {targetCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Min Cart / Spent
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  ${minCartValue}+ / ${spent}
                </p>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Featured Products</h3>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Agent picks best value
                </p>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/70 via-slate-950/30 to-transparent p-5 transition hover:border-cyan-200/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                        {product.tag}
                      </span>
                      <span className="text-lg font-semibold text-white">
                        ${product.price}
                      </span>
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-white">
                      {product.name}
                    </h4>
                    <p className="mt-2 text-sm text-slate-400">
                      {product.description}
                    </p>
                    <button
                      onClick={() => addToCart(product.id)}
                      className="mt-4 w-full rounded-full border border-cyan-200/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200/10"
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">Cart</h3>
              <p className="mt-2 text-sm text-slate-300">
                Items selected by the agent (dummy data for now).
              </p>
              <div className="mt-4 space-y-3">
                {cartItems.length === 0 && (
                  <p className="text-sm text-slate-500">Cart is empty.</p>
                )}
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="text-cyan-200/80">
                        ${item.lineTotal}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {item.qty} × ${item.price}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="rounded-full border border-white/10 px-2 py-1 text-[11px]"
                        >
                          -
                        </button>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="rounded-full border border-white/10 px-2 py-1 text-[11px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white">${cartSubtotal}</span>
                </div>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!authUser || isRunning || cartItems.length === 0}
                className="mt-4 w-full rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {!authUser
                  ? "Sign in to purchase"
                  : isRunning
                    ? "Processing..."
                    : "Pay with x402"}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                This triggers quote → reserve → checkout → fulfill with x402.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">Agent Controls</h3>
              <p className="mt-2 text-sm text-slate-300">
                Configure the budget and value threshold for automated buying.
              </p>
              <div className="mt-5 grid gap-4 text-sm">
                <label className="flex flex-col gap-2">
                  Budget (USDC)
                  <input
                    type="number"
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    value={budget}
                    onChange={(event) =>
                      setBudget(Number(event.target.value))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2">
                  Items in bundle
                  <input
                    type="number"
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    value={targetCount}
                    onChange={(event) =>
                      setTargetCount(Number(event.target.value))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2">
                  Min cart value
                  <input
                    type="number"
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    value={minCartValue}
                    onChange={(event) =>
                      setMinCartValue(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">Gemini Bundle Notes</h3>
              <p className="mt-2 text-sm text-slate-300">
                Ask Gemini to suggest or summarize the bundle.
              </p>
              <textarea
                value={geminiPrompt}
                onChange={(event) => setGeminiPrompt(event.target.value)}
                className="mt-4 min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <button
                onClick={runGemini}
                className="mt-4 w-full rounded-full border border-cyan-200/60 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200/10"
              >
                {geminiLoading ? "Generating..." : "Generate Draft"}
              </button>
              {geminiText && (
                <p className="mt-3 text-sm text-slate-200">{geminiText}</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">Trace Preview</h3>
              <p className="mt-2 text-sm text-slate-300">
                Each step logs 402 response, payment, and retry.
              </p>
              <div className="mt-4 space-y-3">
                {trace.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Run a simulation to see the paid chain.
                  </p>
                )}
                {trace.map((step) => (
                  <div
                    key={step.name}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span>{step.name}</span>
                      <span
                        className={
                          step.status === "paid"
                            ? "text-emerald-300"
                            : step.status === "error"
                              ? "text-rose-300"
                              : "text-slate-400"
                        }
                      >
                        {step.status === "paid"
                          ? `$${step.price}`
                          : step.status === "error"
                            ? "Error"
                            : "Skipped"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {step.decision}
                    </p>
                    {step.receipt && (
                      <p className="mt-2 text-[11px] text-amber-200/80">
                        Receipt: {step.receipt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {errors.length > 0 && (
                <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>

        {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6">
            <h3 className="text-xl font-semibold text-white">Confirm payment</h3>
            <p className="mt-2 text-sm text-slate-300">
              The agent will run the paid x402 chain and place the order.
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span>{item.name}</span>
                  <span className="text-cyan-200/80">
                    {item.qty} × ${item.price}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">${cartSubtotal}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Paid chain fees</span>
                <span>${projectedSpend}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  runChain();
                }}
                className="flex-1 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-cyan-200/40 bg-slate-950/90 px-4 py-3 text-sm text-cyan-100 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
