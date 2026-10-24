-- Resetting orders also removes notifications that link to those orders
-- (support-ticket notices used to stay behind and pointed to empty pages),
-- and existing orphaned notifications are cleared once.

create or replace function public.archive_and_reset_orders()
returns table(batch_id uuid, archived_order_count integer, removed_order_count integer)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_batch_id uuid := gen_random_uuid();
  v_actor_id uuid := auth.uid();
  v_actor_email text := coalesce(auth.jwt() ->> 'email', '');
  v_order_ids uuid[];
  v_order_count integer;
  v_archived_count integer;
  v_removed_count integer;
begin
  if v_actor_id is null or not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[])
  into v_order_ids
  from (
    select id
    from public.orders
    order by id
    for update
  ) as locked_orders;
  v_order_count := cardinality(v_order_ids);

  if v_order_count = 0 then
    return query select v_batch_id, 0, 0;
    return;
  end if;

  insert into public.audit_logs (actor_email, action, metadata_json)
  values (v_actor_email, 'reset_orders_to_cold_archive', jsonb_build_object(
    'actorUserId', v_actor_id,
    'affectedOrderCount', v_order_count,
    'archiveBatchId', v_batch_id,
    'timestamp', timezone('utc', now())
  ));

  insert into public.order_archive_snapshots (batch_id, archived_by, order_id, tracking_number, snapshot_json, metadata_json)
  select v_batch_id, v_actor_id, o.id, o.tracking_number,
    jsonb_build_object(
      'order', to_jsonb(o),
      'items', coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at, oi.id) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb),
      'statusEvents', coalesce((select jsonb_agg(to_jsonb(ose) order by ose.created_at, ose.id) from public.order_status_events ose where ose.order_id = o.id), '[]'::jsonb),
      'supportTickets', coalesce((select jsonb_agg(to_jsonb(st) order by st.created_at, st.id) from public.support_tickets st where st.order_id = o.id), '[]'::jsonb),
      'notifications', coalesce((select jsonb_agg(to_jsonb(an) order by an.created_at, an.id) from public.admin_notifications an where (an.entity_type = 'order' and an.entity_id = o.id) or an.link_path = '/admin/orders/' || o.id::text), '[]'::jsonb),
      'emailLogs', coalesce((select jsonb_agg(to_jsonb(el) order by el.created_at, el.id) from public.email_logs el where el.order_id = o.id or el.support_ticket_id in (select id from public.support_tickets where order_id = o.id)), '[]'::jsonb)
    ), jsonb_build_object('snapshotVersion', 2)
  from public.orders o
  where o.id = any(v_order_ids);

  get diagnostics v_archived_count = row_count;
  if v_archived_count <> v_order_count then raise exception 'archive count mismatch'; end if;

  delete from public.email_logs
  where order_id = any(v_order_ids)
    or support_ticket_id in (
      select st.id from public.support_tickets st where st.order_id = any(v_order_ids)
    );
  delete from public.admin_notifications an
  where (an.entity_type = 'order' and an.entity_id = any(v_order_ids))
    or an.link_path in (select '/admin/orders/' || unnest(v_order_ids)::text);
  delete from public.orders where id = any(v_order_ids);
  get diagnostics v_removed_count = row_count;
  if v_removed_count <> v_order_count then raise exception 'reset count mismatch'; end if;

  return query select v_batch_id, v_archived_count, v_removed_count;
end;
$function$;

revoke execute on function public.archive_and_reset_orders() from public, anon;
grant execute on function public.archive_and_reset_orders() to authenticated;

-- One-time cleanup: notifications that point to orders which no longer exist.
delete from public.admin_notifications an
where an.link_path like '/admin/orders/%'
  and not exists (
    select 1 from public.orders o where '/admin/orders/' || o.id::text = an.link_path
  );
