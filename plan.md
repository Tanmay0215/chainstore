# Hackathon Idea: "Agentic Commerce" x402 Storefront

## One-liner
An autonomous commerce agent that assembles a cart, pays per-step via x402 (pricing, inventory hold, checkout, fulfillment), and returns a complete order trace with receipts and budget reasoning.

## Why It Wins
- Uses x402 repeatedly across a chain: `price quote → reserve inventory → checkout → fulfillment`.
- Clear economic logic: agent chooses items based on budget/utility and skips expensive options.
- Strong instrumentation: receipts per step + spend summary + trace.
- Simple UX: pricing surfaced, optional confirmations, sane defaults.

## User Story
As a buyer, I want an agent to source and purchase a bundle of items within a budget, handling paid steps automatically while showing me every cost and receipt.

## Core Flow (Paid Tool Chain)
1) **Dynamic price quote (paid)**  
   - 402 challenge → pay via CDP wallet → retry → receive quote.
2) **Inventory hold (paid)**  
   - 402 challenge → pay → retry → receive hold confirmation.
3) **Checkout (paid)**  
   - 402 challenge → pay → retry → order created.
4) **Fulfillment (paid)**  
   - 402 challenge → pay → retry → shipment initiated.

## Required Components Mapping
- **CDP Wallets custody & signing**: agent uses CDP wallet to hold funds and sign x402 payment payloads.
- **x402 real flow**: every paid tool returns 402 first, then pay + retry.
- **Tool chaining**: at least two paid steps in a single workflow (we have four).
- **Cost reasoning**: budget cap, per-step price comparison, prune low value items.

## Economic Logic (Agent Reasoning)
- Inputs: `budget`, `bundle_goal`, `priority_tags`.
- Strategy:
  - Compare 2+ item options; pick best price/value ratio.
  - If hold or checkout fee exceeds marginal value, skip item.
  - Stop when budget is exhausted or bundle goal met.

## UX & Observability
- Console/GUI with:
  - Step-by-step trace (tool → price → decision → payment → result).
  - Live spend meter and remaining budget.
  - Receipts JSON per call (payment payload, tool response, timestamps).
  - Final summary: `spent_by_tool`, `items_purchased`, `order_id`.

## Demo Script (Video)
1) Start with $50 budget and “office starter kit” bundle goal.
2) Show 402 response from pricing tool, pay, retry success.
3) Pay to hold inventory for top 3 items.
4) Checkout and fulfillment paid steps.
5) End with spend summary and receipts log.

## Minimal MVP Scope
- 2 paid tools minimum (quote + checkout).
- Stubbed paid tools ok if they enforce 402 → pay → retry.
- Order summary JSON output.
- Receipt logs persisted to `logs/receipts.jsonl`.

## Stretch Goals
- Dynamic pricing marketplace.
- Loyalty credits + discounts.
- Post-purchase tracking and returns.

## Technical Plan
1) **Define paid tool APIs (mock or real)**  
   - 402 response + price metadata.
2) **Implement x402 payment handler**  
   - CDP wallet signs payment, retries tool call.
3) **Agent orchestration**  
   - DAG: quote → reserve → checkout → fulfill.
4) **Budget + decision engine**  
   - Hard budget ceiling + per-item value heuristics.
5) **Logging + receipts**  
   - Append JSONL receipts and final summary.
6) **Demo & video**  
   - Scripted flow, clean terminal output.

## Deliverables Checklist
- CDP wallet integration proof.
- x402 flow shown twice in demo.
- Spend summary log.
- Demo video with 402 challenge + payment + retry.
