# Agentic Commerce

Agentic commerce demo that chains paid tools using x402. Built with Next.js, Tailwind, Gemini, wagmi/viem, and Hardhat.

## Setup

1) Install deps with pnpm
```bash
pnpm install
```

2) Configure env
```bash
cp .env.example .env.local
```

3) Run
```bash
pnpm dev
```

## Environment
- `GEMINI_API_KEY` for `/api/gemini`
- `NEXT_PUBLIC_REOWN_PROJECT_ID` for Reown AppKit
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for server-side inserts

## Notes
- `/api/tools/*` simulates commerce tools with x402 402 → pay → retry.
- `/api/pay` is a stub for CDP wallet signing.
- `contracts/SpendRegistry.sol` is a placeholder for onchain logging.

## Supabase Schema
```sql
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  step_id text not null,
  price numeric not null,
  status text not null,
  receipt_id text
);
```
