# ChainStore

![ChainStore Logo](/logo.png)

> **ChainStore: A Next.js storefront where AI agents navigate and pay for each step of a purchase using on-chain micro-transactions.**

This project demonstrates a novel approach to e-commerce where autonomous agents can:
1.  **Browse & Quote**: Analyze product options and get pricing.
2.  **Reserve**: Secure inventory for a limited time.
3.  **Checkout**: Finalize the purchase.
4.  **Fulfill**: Trigger shipping and logistics.

Crucially, **every step is a paid API call** gated by **x402** (HTTP 402 Payment Required). The agent pays continuously as it progresses, and every transaction is cryptographically verified and logged in Supabase for complete auditability.

---

## Features

- **Agentic Workflow**: A multi-step checkout process designed for AI agents (Quote → Reserve → Checkout → Fulfill).
- **x402 Payments**: Native support for the HTTP 402 protocol. APIs challenge requests with a 402 status, and the agent responds with a payment proof.
- **AI Integration**:
    - **Gemini**: Generates product descriptions, marketing copy, and bundle suggestions.
    - **Agent Logic**: Decides whether to proceed with a purchase based on budget and cart value.
- **Supabase Backend**:
    - **Real-time Database**: Persists carts, orders, and inventory.
    - **Receipt Logging**: Every micro-payment is recorded for transparency.
- **Modern UI**: Built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**.

## Vision

**ChainStore** is the missing infrastructure for the Agentic Web.

We believe that future AI agents won't just chat—they will **do**. They will buy services, reserve resources, and trade assets. But today's web is built for humans with credit cards, not bots with wallets.

ChainStore bridges this gap by combining:
1.  **AI Agents**: Autonomous decision-makers capable of complex multi-step tasks.
2.  **Crypto/Web3 Rails**: Permissionless, programmable payments (x402) that agents can natively use without KYC or bank accounts.

**Is this Crypto or AI?**
It is **both**.
- It is an **AI Project** because the core user is an autonomous agent navigating a workflow.
- It is a **Crypto Project** because the settlement layer for every action is on-chain.

We are building the **Commerce Layer for AGI**.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **AI Model**: [Google Gemini](https://deepmind.google/technologies/gemini/)
- **Payments**: [x402](https://x402.org/) (Micro-payments)
- **Web3**:
    - [Wagmi](https://wagmi.sh/) & [Viem](https://viem.sh/)
- **Contract Dev**: Hardhat

## Getting Started

Follow these steps to get the project running locally.

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Supabase CLI (optional, but recommended for db management)

### 1. Installation

```bash
pnpm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your credentials:

- `GEMINI_API_KEY`: Get from [Google AI Studio](https://aistudio.google.com/).
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`: Your Supabase Anon Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (for secure backend operations).
- `SPEND_REGISTRY_CONTRACT`: (Optional) Skale contract address for on-chain logging.
- `AGENT_PRIVATE_KEY`: (Optional) Private key for the agent to sign on-chain transactions.

### 3. Database Setup

You can set up the database using the Supabase CLI or by running the SQL in the dashboard.

**Option A: Supabase CLI (Recommended)**
```bash
supabase db reset
```
*This command will apply migrations and seed the database with initial products.*

**Option B: SQL Editor**
Copy the contents of `supabase/seed.sql` and run it in your project's SQL Editor on the Supabase dashboard.

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🏗️ Architecture Flow

1.  **User/Agent Action**: The user initiates a flow (e.g., "Buy a desk setup").
2.  **Tool Call**: The agent calls a tool endpoint (e.g., `/api/tools/quote`).
3.  **402 Challenge**: The API responds with `402 Payment Required` and a pricing quote.
4.  **Payment**: The agent signs a transaction or provides a pre-funded proof to pay the required amount.
5.  **Execution**: The API verifies the payment, executes the business logic (e.g., reserving stock), and returns the result.
6.  **Logging**: A receipt is stored in the `receipts` table in Supabase.

## 📦 Database Schema

The core tables driving the application:

| Table | Description |
| :--- | :--- |
| **`products`** | Inventory items (names, descriptions, stock levels). |
| **`carts`** | Active shopping sessions. |
| **`cart_items`** | Items currently in a user's cart. |
| **`orders`** | Finalized purchases. |
| **`receipts`** | **Crucial:** Immutable log of every x402 payment made by the agent. |

## 🧪 Testing

The project includes scripts to simulate the agent workflow.

```bash
# Run the test script (check package.json for specific script names)
pnpm run test:simulation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
