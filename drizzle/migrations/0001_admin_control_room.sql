alter type public.order_status add value if not exists 'Confirmed';
alter type public.order_status add value if not exists 'Ready for Collection';
alter type public.order_status add value if not exists 'Out for Delivery';

alter table public.orders add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded'));
alter table public.orders add column if not exists payment_ref text;
alter table public.orders add column if not exists stock_deducted boolean not null default false;

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'pcs',
  quantity numeric not null default 0,
  min_level numeric not null default 0,
  supplier text,
  last_restocked_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.stock_items to authenticated;
grant all on public.stock_items to service_role;
alter table public.stock_items enable row level security;
create policy "admin all stock" on public.stock_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  change numeric not null,
  kind text not null check (kind in ('restock','adjust','order_deduct','order_restore')),
  moved_on date not null default current_date,
  supplier text,
  cost numeric,
  notes text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "admin read moves" on public.stock_movements for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin insert moves" on public.stock_movements for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

create table public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  qty numeric not null check (qty > 0),
  unique (product_id, stock_item_id)
);
grant select, insert, update, delete on public.product_ingredients to authenticated;
grant all on public.product_ingredients to service_role;
alter table public.product_ingredients enable row level security;
create policy "admin all ingredients" on public.product_ingredients for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.orders_stock_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.status::text = 'Preparing' and not old.stock_deducted then
    for r in select pi.stock_item_id, sum(pi.qty * oi.qty) as amt
      from public.order_items oi join public.product_ingredients pi on pi.product_id = oi.item_id
      where oi.order_id = new.id and oi.item_type = 'product' group by pi.stock_item_id loop
      update public.stock_items set quantity = quantity - r.amt where id = r.stock_item_id;
      insert into public.stock_movements(stock_item_id, change, kind, order_id, notes) values (r.stock_item_id, -r.amt, 'order_deduct', new.id, 'Order ' || new.code);
    end loop;
    new.stock_deducted := true;
  elsif new.status::text = 'Cancelled' and old.stock_deducted and old.status::text = 'Preparing' then
    for r in select stock_item_id, -sum(change) as amt from public.stock_movements
      where order_id = new.id and kind = 'order_deduct' group by stock_item_id loop
      update public.stock_items set quantity = quantity + r.amt where id = r.stock_item_id;
      insert into public.stock_movements(stock_item_id, change, kind, order_id, notes) values (r.stock_item_id, r.amt, 'order_restore', new.id, 'Cancelled ' || new.code);
    end loop;
    new.stock_deducted := false;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.orders_stock_sync() from public, anon, authenticated;
create trigger orders_stock_sync before update of status on public.orders for each row execute function public.orders_stock_sync();

insert into public.settings(key, value) values
  ('restaurant_name','UTMOST BITES'), ('contact_phone','0794 567 401'),
  ('location','Yala Town, Siaya County, Kenya'), ('currency','KSh'),
  ('accepting_orders','true')
on conflict (key) do nothing;