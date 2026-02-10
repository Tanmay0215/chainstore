"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi — I can help assemble a remote office kit. Ask for a bundle or a budget breakdown.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { role: "user", content: input.trim() } as Message;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
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
