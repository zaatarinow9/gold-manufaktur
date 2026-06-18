alter table public.orders
  add column if not exists public_tracking_stage text,
  add column if not exists total_amount numeric,
  add column if not exists currency text not null default 'EUR';

update public.orders
set public_tracking_stage = case
  when tracking_status in (
    'sent_to_workshop',
    'accepted_by_workshop',
    'in_production',
    'quality_check'
  ) then 'order_in_workshop'
  when tracking_status in (
    'on_the_way',
    'delivered_to_store'
  ) then 'shipping'
  when tracking_status in (
    'ready_for_pickup',
    'picked_up',
    'completed'
  ) then 'ready_for_pickup'
  else public_tracking_stage
end
where public_tracking_stage is null;

create index if not exists orders_public_tracking_stage_idx
on public.orders (public_tracking_stage);

create unique index if not exists email_logs_customer_template_stage_sent_key
on public.email_logs (
  order_id,
  coalesce(metadata_json ->> 'templateType', ''),
  coalesce(metadata_json ->> 'publicStage', '')
)
where order_id is not null
  and direction = 'outbound'
  and status = 'sent'
  and coalesce(metadata_json ->> 'templateType', '') <> '';
