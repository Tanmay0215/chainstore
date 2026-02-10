"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabaseClient } from "@/lib/supabase/client";
import { fetchWith402 } from "@/lib/x402";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
};

const products: Product[] = [
  { id: "desk-mat", name: "Wool Desk Mat", price: 18 },
  { id: "lamp", name: "Focus Lamp", price: 22 },
  { id: "headset", name: "Studio Headset", price: 28 },
  { id: "mug", name: "Thermal Mug", price: 14 },
  { id: "notebook", name: "Analog Notebook", price: 12 },
  { id: "stand", name: "Laptop Stand", price: 24 },
];

const baseSteps = [
  { id: "quote", name: "Dynamic Price Quote", price: 4 },
  { id: "reserve", name: "Inventory Hold", price: 7 },
  { id: "checkout", name: "Checkout Fee", price: 6 },
  { id: "fulfill", name: "Fulfillment", price: 5 },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi — I can help assemble a remote office kit. Ask for a bundle or type `add 1 desk mat`.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    const syncUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
    };
    syncUser();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
        setUserEmail(session?.user?.email ?? null);
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadCart = async () => {
      const response = await fetch(`/api/cart?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) return;
      const payload = await response.json();
      const nextCart: Record<string, number> = {};
      (payload.items ?? []).forEach((item: { productId: string; qty: number }) => {
        nextCart[item.productId] = item.qty;
      });
      setCart(nextCart);
    };
    loadCart();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const persistCart = async () => {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          items: Object.entries(cart).map(([productId, qty]) => ({
            productId,
            qty,
          })),
        }),
      });
    };
    persistCart();
  }, [cart, userId]);

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

  const signIn = async () => {
    if (!email) return;
    await supabaseClient.auth.signInWithOtp({ email });
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Magic link sent. Open your email to finish sign-in.",
      },
    ]);
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
    setUserId(null);
    setUserEmail(null);
  };

  const addToCart = (productId: string, qty: number) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] ?? 0) + qty,
    }));
  };

  const removeFromCart = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[productId] ?? 0;
      const updated = current - qty;
      if (updated <= 0) {
        delete next[productId];
      } else {
        next[productId] = updated;
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  const cartSummary = () => {
    if (cartItems.length === 0) return "Cart is empty.";
    const lines = cartItems.map(
      (item) => `- ${item.qty} × ${item.name} ($${item.price})`,
    );
    return `${lines.join("\n")}\n\nSubtotal: $${cartSubtotal}`;
  };

  const runChain = async () => {
    if (!userId || cartItems.length === 0) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Cart is empty or you are not signed in." },
      ]);
      return;
    }

    const trace: string[] = [];
    for (const step of baseSteps) {
      const response = await fetchWith402(`/api/tools/${step.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCount: cartItems.length, cartSubtotal }),
      });
      if (!response.ok) {
        trace.push(`- ${step.name}: error ${response.status}`);
        break;
      }
      const payload = await response.json();
      trace.push(`- ${step.name}: paid ($${step.price})`);
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
    }

    const orderResponse = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        total: cartSubtotal,
        status: "paid",
        items: cartItems.map((item) => ({
          productId: item.id,
          qty: item.qty,
          price: item.price,
        })),
      }),
    });

    const orderPayload = await orderResponse.json().catch(() => ({}));
    if (!orderResponse.ok) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Order failed: ${orderPayload.error ?? "unknown error"}`,
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Order placed.\n\nTrace:\n${trace.join("\n")}\n\nOrder ID: ${orderPayload.orderId}`,
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { role: "user", content: input.trim() } as Message;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const lower = userMessage.content.toLowerCase();
      const addMatch = lower.match(/^add\s+(\d+)?\s*(.+)$/);
      const removeMatch = lower.match(/^remove\s+(\d+)?\s*(.+)$/);
      if (addMatch) {
        const qty = Number(addMatch[1] ?? 1);
        const name = addMatch[2].trim();
        const product =
          products.find((item) => item.id === name.replace(/\s+/g, "-")) ||
          products.find((item) => item.name.toLowerCase() === name);
        if (!product) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "I couldn't find that product." },
          ]);
          setLoading(false);
          return;
        }
        addToCart(product.id, qty);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Added ${qty} × ${product.name}.\n\n${cartSummary()}`,
          },
        ]);
        setLoading(false);
        return;
      }

      if (removeMatch) {
        const qty = Number(removeMatch[1] ?? 1);
        const name = removeMatch[2].trim();
        const product =
          products.find((item) => item.id === name.replace(/\s+/g, "-")) ||
          products.find((item) => item.name.toLowerCase() === name);
        if (!product) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "I couldn't find that product." },
          ]);
          setLoading(false);
          return;
        }
        removeFromCart(product.id, qty);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Removed ${qty} × ${product.name}.\n\n${cartSummary()}`,
          },
        ]);
        setLoading(false);
        return;
      }

      if (lower.includes("clear cart")) {
        clearCart();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Cart cleared." },
        ]);
        setLoading(false);
        return;
      }

      if (lower.includes("show cart")) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cartSummary() },
        ]);
        setLoading(false);
        return;
      }

      if (lower.includes("checkout") || lower.includes("pay")) {
        if (!userId) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Please sign in first." },
          ]);
          setLoading(false);
          return;
        }
        setConfirmPending(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `You're about to pay $${cartSubtotal} + $${baseSteps.reduce(
              (sum, step) => sum + step.price,
              0,
            )} in x402 fees.\n\nType **confirm** to proceed.`,
          },
        ]);
        setLoading(false);
        return;
      }

      if (confirmPending && lower === "confirm") {
        setConfirmPending(false);
        await runChain();
        setLoading(false);
        return;
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content }),
      });
      const payload = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: payload.text ?? "No response." },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to reach the bot." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            assistant
          </p>
          <h1 className="text-3xl font-semibold">Bundle Chat</h1>
          <p className="mt-2 text-sm text-slate-300">
            Ask the agent for a kit. Responses render in Markdown.
          </p>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm">
          {userEmail ? (
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Signed in as {userEmail}</span>
              <button
                onClick={signOut}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-cyan-200/60"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="min-w-[220px] flex-1 rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-xs text-white"
              />
              <button
                onClick={signIn}
                className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-900"
              >
                Get magic link
              </button>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="flex min-h-[420px] flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-2xl border border-white/10 px-4 py-3 text-sm ${
                message.role === "assistant"
                  ? "bg-slate-900/70 text-slate-100"
                  : "bg-cyan-500/10 text-cyan-100"
              }`}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown className="prose prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 prose-strong:text-white">
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              Thinking…
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-100">Cart</h2>
          <p className="mt-1 text-xs text-slate-400">Chat-driven cart</p>
          <div className="mt-4 space-y-2">
            {cartItems.length === 0 && (
              <p className="text-xs text-slate-500">Cart is empty.</p>
            )}
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span>{item.name}</span>
                  <span className="text-cyan-200/80">${item.lineTotal}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {item.qty} × ${item.price}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => removeFromCart(item.id, 1)}
                      className="rounded-full border border-white/10 px-2 py-1"
                    >
                      -
                    </button>
                    <button
                      onClick={() => addToCart(item.id, 1)}
                      className="rounded-full border border-white/10 px-2 py-1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-100">${cartSubtotal}</span>
            </div>
          </div>
          <button
            onClick={clearCart}
            className="mt-3 w-full rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200 hover:border-cyan-200/60"
          >
            Clear cart
          </button>
        </aside>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask for a kit under $50..."
            className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"
          />
          <button
            onClick={sendMessage}
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
