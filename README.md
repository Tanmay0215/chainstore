# Agentic Commerce

Agentic commerce storefront that pays for each step of a purchase using x402
and logs receipts + orders in Supabase.

## Quickstart

1) Install deps
```bash
pnpm install
```

2) Configure env
```bash
cp .env.example .env.local
```

3) Create Supabase tables (SQL below)

4) Run
```bash
pnpm dev
```

5) Sign in with magic link, add items to cart, and click `Pay with x402`.

## Features
- Agentic checkout flow: quote → reserve → checkout → fulfill.
- Real x402 flow: 402 challenge → pay → retry.
- Cart + order persistence in Supabase.
- Inventory dashboard backed by Supabase.
- Gemini bundle notes for copy or product suggestions.
- Wallet connect via Reown AppKit.

## Idea
This project demonstrates how a commerce agent can coordinate multiple
paid tool calls. Each step is priced, the agent decides to proceed based
on budget and cart value, and every receipt is stored for auditability.

## Environment
- `GEMINI_API_KEY` for `/api/gemini`
- `NEXT_PUBLIC_REOWN_PROJECT_ID` for Reown AppKit
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` for client auth
- `SUPABASE_SERVICE_ROLE_KEY` for server-side inserts (recommended)

## Notes
- `/api/tools/*` simulates commerce tools with x402 402 → pay → retry.
- `/api/pay` is a stub for CDP wallet signing.
- `contracts/SpendRegistry.sol` is a placeholder for onchain logging.
