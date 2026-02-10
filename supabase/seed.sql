-- ============================================================================
-- Agentic Commerce - Database Seed Script
-- ============================================================================
-- This script creates the database schema and seeds initial data for the
-- agentic commerce application. It includes tables for receipts, cart items,
-- orders, and inventory management.
--
-- Usage:
--   Run this script in your Supabase SQL Editor or via CLI:
--   psql -h <host> -U <user> -d <database> -f supabase/seed.sql
-- ============================================================================

-- ============================================================================
-- SCHEMA: Create Tables
-- ============================================================================

-- Receipts table: Stores payment receipts for each step in the agentic flow
-- Cart items table: Stores items in user shopping carts
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  qty integer NOT NULL
);

-- Orders table: Stores completed orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL
);

-- Receipts table: Stores payment receipts for each step in the agentic flow
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  step_id text NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL,
  receipt_id text
);

-- Order items table: Stores individual items within orders
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  qty integer NOT NULL,
  price numeric NOT NULL
);

-- Inventory items table: Stores available products and their stock levels
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  product_id text NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  on_hand integer NOT NULL
);

-- Create index on product_id for efficient lookups
CREATE INDEX IF NOT EXISTS inventory_items_product_id_idx
  ON inventory_items (product_id);

-- Ensure product_id is unique for upserts
CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_product_id_unique
  ON inventory_items (product_id);

-- ============================================================================
-- SEED DATA: Inventory Items
-- ============================================================================

-- Populate inventory with initial products
INSERT INTO inventory_items (product_id, name, sku, on_hand) VALUES
  ('desk-mat', 'Wool Desk Mat', 'WM-348', 42),
  ('lamp', 'Focus Lamp', 'FL-221', 18),
  ('headset', 'Studio Headset', 'SH-110', 9),
  ('mug', 'Thermal Mug', 'TM-404', 27),
  ('notebook', 'Analog Notebook', 'AN-212', 64),
  ('stand', 'Laptop Stand', 'LS-880', 12)
ON CONFLICT (product_id) DO UPDATE
SET name = EXCLUDED.name,
    sku = EXCLUDED.sku,
    on_hand = EXCLUDED.on_hand;
