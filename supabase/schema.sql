-- Los gastos de Doña Mónica - Supabase schema
-- Ejecutar en Supabase SQL Editor.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "fullName" text not null,
  email text not null,
  phone text default '',
  avatar text default '',
  currency text not null default 'PEN',
  timezone text not null default 'America/Lima',
  language text not null default 'es',
  "dateFormat" text not null default 'dd/MM/yyyy',
  "weekStartsOn" text not null default 'monday',
  theme text not null default 'light',
  "textScale" numeric not null default 1,
  "pinEnabled" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  "initialBalance" numeric not null default 0 check ("initialBalance" >= 0),
  "currentBalance" numeric not null default 0,
  icon text default 'wallet',
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense','both','esika')),
  icon text default 'tag',
  color text default '#8B3A4A',
  "parentCategoryId" text default '',
  "isDefault" boolean not null default false,
  "isActive" boolean not null default true,
  "sortOrder" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount numeric not null check (amount > 0),
  "categoryId" text default '',
  "accountId" text not null,
  description text not null,
  "transactionDate" timestamptz not null,
  "paymentMethod" text not null,
  "necessityLevel" text default '',
  "receiptFileId" text default '',
  "isRecurring" boolean not null default false,
  "recurringPaymentId" text default '',
  notes text default '',
  tags text[] default '{}',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount > 0),
  "categoryId" text not null,
  "accountId" text default '',
  frequency text not null,
  "dueDay" integer not null check ("dueDay" between 1 and 31),
  "nextDueDate" timestamptz not null,
  priority text not null,
  "reminderDays" integer not null default 3,
  status text not null default 'pending',
  "receiptFileId" text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "categoryId" text not null,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2020),
  amount numeric not null check (amount > 0),
  "alertPercentage" integer not null default 80 check ("alertPercentage" between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "targetAmount" numeric not null check ("targetAmount" > 0),
  "currentAmount" numeric not null default 0 check ("currentAmount" >= 0),
  "targetDate" timestamptz not null,
  icon text default 'piggy-bank',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "goalId" text not null,
  amount numeric not null check (amount > 0),
  date timestamptz not null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esika_products (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text default '',
  category text not null,
  campaign text default '',
  "purchasePrice" numeric not null default 0 check ("purchasePrice" >= 0),
  "salePrice" numeric not null check ("salePrice" > 0),
  stock integer not null default 0 check (stock >= 0),
  "minimumStock" integer not null default 1 check ("minimumStock" >= 0),
  "imageFileId" text default '',
  "isActive" boolean not null default true,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esika_customers (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  address text default '',
  notes text default '',
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esika_sales (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "customerId" text not null,
  "saleDate" timestamptz not null,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  "amountPaid" numeric not null default 0,
  "pendingAmount" numeric not null default 0,
  "paymentStatus" text not null,
  "paymentMethod" text not null,
  "accountId" text default '',
  "promisedPaymentDate" timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esika_sale_items (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "saleId" text not null,
  "productId" text not null,
  quantity integer not null check (quantity > 0),
  "unitCost" numeric not null default 0,
  "unitPrice" numeric not null default 0,
  subtotal numeric not null default 0,
  profit numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  "sourceAccountId" text not null,
  "destinationAccountId" text not null,
  amount numeric not null check (amount > 0),
  "transferDate" timestamptz not null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  "isRead" boolean not null default false,
  "actionUrl" text default '',
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  type text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts("userId");
create index if not exists categories_user_idx on public.categories("userId", type);
create index if not exists transactions_user_date_idx on public.transactions("userId", "transactionDate" desc);
create index if not exists transactions_user_category_idx on public.transactions("userId", "categoryId");
create index if not exists transactions_user_account_idx on public.transactions("userId", "accountId");
create index if not exists recurring_user_due_idx on public.recurring_payments("userId", "nextDueDate");
create index if not exists budgets_user_month_idx on public.budgets("userId", year, month);
create index if not exists goals_user_idx on public.savings_goals("userId", status);
create index if not exists products_user_idx on public.esika_products("userId", campaign);
create index if not exists customers_user_idx on public.esika_customers("userId", phone);
create index if not exists sales_user_idx on public.esika_sales("userId", "saleDate" desc, "paymentStatus");
create index if not exists sale_items_user_idx on public.esika_sale_items("userId", "saleId");
create index if not exists notifications_user_idx on public.notifications("userId", "isRead", type);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.esika_products enable row level security;
alter table public.esika_customers enable row level security;
alter table public.esika_sales enable row level security;
alter table public.esika_sale_items enable row level security;
alter table public.transfers enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create or replace function public.create_owner_policies(table_name text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists "%s_select_own" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s_insert_own" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s_update_own" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s_delete_own" on public.%I', table_name, table_name);
  execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = "userId")', table_name, table_name);
  execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = "userId")', table_name, table_name);
  execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = "userId") with check (auth.uid() = "userId")', table_name, table_name);
  execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = "userId")', table_name, table_name);
end;
$$;

select public.create_owner_policies('profiles');
select public.create_owner_policies('accounts');
select public.create_owner_policies('categories');
select public.create_owner_policies('transactions');
select public.create_owner_policies('recurring_payments');
select public.create_owner_policies('budgets');
select public.create_owner_policies('savings_goals');
select public.create_owner_policies('savings_contributions');
select public.create_owner_policies('esika_products');
select public.create_owner_policies('esika_customers');
select public.create_owner_policies('esika_sales');
select public.create_owner_policies('esika_sale_items');
select public.create_owner_policies('transfers');
select public.create_owner_policies('notifications');
select public.create_owner_policies('notification_preferences');

drop function if exists public.create_owner_policies(text);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Storage policies: each user writes into a folder named with auth.uid().
drop policy if exists "receipts_insert_own_folder" on storage.objects;
drop policy if exists "receipts_update_own_folder" on storage.objects;
drop policy if exists "receipts_delete_own_folder" on storage.objects;
drop policy if exists "receipts_select_authenticated" on storage.objects;

create policy "receipts_select_authenticated" on storage.objects
for select to authenticated using (bucket_id = 'receipts');

create policy "receipts_insert_own_folder" on storage.objects
for insert to authenticated with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_update_own_folder" on storage.objects
for update to authenticated using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_delete_own_folder" on storage.objects
for delete to authenticated using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
