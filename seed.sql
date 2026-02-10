-- Agentic Commerce schema + seed data (idempotent)

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  step_id text not null,
  price numeric not null,
  status text not null,
  receipt_id text
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null,
  product_id text not null,
  qty integer not null
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null,
  total numeric not null,
  status text not null
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  order_id uuid references orders(id) on delete cascade,
  product_id text not null,
  qty integer not null,
  price numeric not null
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  product_id text not null,
  name text not null,
  sku text not null,
  on_hand integer not null
);

create index if not exists inventory_items_product_id_idx
  on inventory_items (product_id);

-- Migrations for older schemas
alter table orders add column if not exists user_id uuid;
alter table cart_items add column if not exists user_id uuid;
alter table inventory_items add column if not exists product_id text;

-- Seed inventory (upsert by product_id)
insert into inventory_items (product_id, name, sku, on_hand)
values
('desk-mat', 'Wool Desk Mat', 'WM-348', 42),
('lamp', 'Focus Lamp', 'FL-221', 18),
('headset', 'Studio Headset', 'SH-110', 9),
('mug', 'Thermal Mug', 'TM-404', 27),
('notebook', 'Analog Notebook', 'AN-212', 64),
('stand', 'Laptop Stand', 'LS-880', 12)
on conflict (product_id) do update
set name = excluded.name,
    sku = excluded.sku,
    on_hand = excluded.on_hand;
