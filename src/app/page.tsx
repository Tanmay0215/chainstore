"use client";

import { useMemo, useState } from "react";
import { fetchWith402, shouldPayStep } from "@/lib/x402";

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
  const [intentFloor, setIntentFloor] = useState(70);
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

  const runChain = async () => {
    setIsRunning(true);
    setTrace([]);
    setSpent(0);

    let remaining = budget;
    const nextTrace: TraceStep[] = [];

    for (const step of baseSteps) {
      const { pay, reason } = shouldPayStep(remaining, step.price, intentFloor);
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

        await fetch("/api/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: step.id,
            price: step.price,
            status: "paid",
            receiptId: payload?.receipt?.id,
          }),
        });
      } catch (error) {
        nextTrace.push({
          name: step.name,
          price: step.price,
          decision: "Error: network failure",
          status: "error",
        });
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
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#4f46e5,_transparent_55%)] opacity-40" />
          <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-amber-400/20 blur-[120px]" />

          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
              x402 agentic commerce
              </p>
              <h1 className="font-serif text-3xl text-white">
              Agentic Commerce
              </h1>
            </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
              Budget-aware
            </span>
            {/* @ts-expect-error custom element */}
            <appkit-button />
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_80px_-40px_rgba(79,70,229,0.8)]">
            <h2 className="font-serif text-4xl leading-tight">
              A commerce agent that pays per step and ships the bundle.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              The agent requests quotes, reserves inventory, checks out, and
              triggers fulfillment through x402. CDP Wallet custody signs every
              payment, and the chain halts when budgets are exhausted.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-amber-200/70">
                  Bundle Goal
                </p>
                <p className="mt-2 text-lg">Remote office starter kit</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-amber-200/70">
                  Toolchain
                </p>
                <p className="mt-2 text-lg">Quote → Reserve → Checkout → Fulfill</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Per-Run Spend
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
                  Intent Floor / Spent
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {intentFloor}+ / ${spent}
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
                    className="group rounded-3xl border border-white/10 bg-slate-950/40 p-5 transition hover:border-amber-200/40"
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
                      className="mt-4 w-full rounded-full border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-200/10"
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
                      <span className="text-amber-200/80">
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
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <h3 className="text-lg font-semibold">Run Purchase</h3>
              <p className="mt-2 text-sm text-slate-300">
                Execute the paid commerce chain with x402 retries and receipts.
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
                  Value threshold
                  <input
                    type="number"
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    value={intentFloor}
                    onChange={(event) =>
                      setIntentFloor(Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <button
                onClick={runChain}
                disabled={isRunning}
                className="mt-6 w-full rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRunning ? "Running..." : "Run Paid Chain"}
              </button>
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
                className="mt-4 w-full rounded-full border border-amber-200/60 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-200/10"
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
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
