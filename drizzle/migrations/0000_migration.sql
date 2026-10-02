create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('Received','Preparing','Ready','Completed','Cancelled');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- first signed-in user may claim admin when no admin exists
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(auth.uid(),'admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(),'admin');
  return true;
end $$;
revoke execute on function public.claim_first_admin() from anon, public;
grant execute on function public.claim_first_admin() to authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role='admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "admin write categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price int not null check (price >= 0),
  variants jsonb,
  image_key text,
  available boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (true);
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null default '',
  items text[] not null default '{}',
  price int not null check (price >= 0),
  image_key text,
  accent text not null default 'gold',
  available boolean not null default true,
  sort int not null default 0
);
grant select on public.combos to anon, authenticated;
grant insert, update, delete on public.combos to authenticated;
grant all on public.combos to service_role;
alter table public.combos enable row level security;
create policy "public read combos" on public.combos for select to anon, authenticated using (true);
create policy "admin write combos" on public.combos for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "admin read customers" on public.customers for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  fulfillment text not null check (fulfillment in ('delivery','pickup')),
  location text,
  instructions text,
  payment text not null check (payment in ('cash','mpesa_on_delivery')),
  status order_status not null default 'Received',
  total int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null,
  item_id uuid,
  name text not null,
  variant text,
  unit_price int not null,
  qty int not null check (qty > 0),
  line_total int not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "admin read order items" on public.order_items for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.settings (
  key text primary key,
  value text not null default ''
);
grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "public read settings" on public.settings for select to anon, authenticated using (true);
create policy "admin write settings" on public.settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.settings(key,value) values ('opening_hours','');

insert into public.categories(slug,name,sort) values
 ('daily-favorites','Daily Favorites',1),
 ('bites-brews','Refreshing Bites & Brews',2),
 ('ready-to-cook','Ready to Cook',3);

insert into public.products(category_id,name,description,price,variants,image_key,sort)
select c.id, p.name, p.descr, p.price, p.variants::jsonb, p.img, p.sort from (values
 ('daily-favorites','Chapati','Soft, layered and golden off the pan.',20,null,'chapati',1),
 ('daily-favorites','Mandazi','Fluffy, lightly sweet East African doughnut.',10,null,'mandazi',2),
 ('daily-favorites','Samosa (Ndengu), 2 pieces','Crispy pastry filled with spiced green grams. 2 pieces.',30,null,'samosa',3),
 ('daily-favorites','Samosa (Meat)','Crispy pastry packed with seasoned minced meat.',50,null,'samosa-meat',4),
 ('daily-favorites','Kebab','Juicy spiced kebab, fried to order.',60,null,'kebab',5),
 ('daily-favorites','Smokies','Grilled smokies — the classic street bite.',40,null,'smokies',6),
 ('daily-favorites','Boiled Eggs','Perfectly boiled eggs.',30,null,'eggs',7),
 ('daily-favorites','Smocha','Smokie wrapped in a warm chapati with kachumbari.',70,null,'smocha',8),
 ('bites-brews','Tea','Hot Kenyan chai.',20,null,'tea',1),
 ('bites-brews','Chips','Crispy golden fries.',100,null,'chips',2),
 ('bites-brews','Fried Chicken','Crunchy, juicy fried chicken.',200,'[{"label":"Quarter","price":200},{"label":"Half","price":350},{"label":"Full","price":650}]','fried-chicken',3),
 ('bites-brews','Smoothie','Fresh blended fruit smoothie.',60,null,'smoothie',4),
 ('ready-to-cook','Raw Chicken','Fresh, cleaned chicken ready for your kitchen.',150,'[{"label":"Quarter","price":150},{"label":"Half","price":300},{"label":"Full","price":600}]','raw-chicken',1),
 ('ready-to-cook','Boiled Beans','Tender boiled beans, ready to cook or eat.',30,null,'beans',2)
) as p(cat,name,descr,price,variants,img,sort) join public.categories c on c.slug = p.cat;

insert into public.combos(name,tagline,items,price,image_key,accent,sort) values
 ('Morning Combo','Start your day right',array['3 Mandazi','2 Chapati','2 Boiled Eggs','1 cup Coffee'],150,'combo-morning','gold',1),
 ('Evening Combo','Relax • Refresh • Enjoy',array['2 Smocha','1 Kebab','1 Soft Drink'],260,'combo-evening','green',2);

alter publication supabase_realtime add table public.orders;