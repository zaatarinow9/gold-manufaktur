alter table public.categories
  add column if not exists deleted_at timestamptz,
  add column if not exists supports_name_customization boolean not null default false;

alter table public.products
  add column if not exists deleted_at timestamptz,
  add column if not exists supports_name_customization boolean;

alter table public.options
  add column if not exists deleted_at timestamptz;

alter table public.option_groups
  add column if not exists deleted_at timestamptz;

alter table public.orders
  add column if not exists product_specifications jsonb not null default '{}'::jsonb;
