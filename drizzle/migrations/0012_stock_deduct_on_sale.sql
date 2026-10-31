CREATE OR REPLACE FUNCTION public.orders_stock_sync()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record;
begin
  if not old.stock_deducted and new.status::text <> 'Cancelled'
     and (new.payment_status = 'paid' or new.status::text not in ('Received')) then
    for r in select pi.stock_item_id, sum(pi.qty * oi.qty) as amt
      from public.order_items oi join public.product_ingredients pi on pi.product_id = oi.item_id
      where oi.order_id = new.id and oi.item_type = 'product' group by pi.stock_item_id loop
      update public.stock_items set quantity = quantity - r.amt where id = r.stock_item_id;
      insert into public.stock_movements(stock_item_id, change, kind, order_id, notes) values (r.stock_item_id, -r.amt, 'order_deduct', new.id, 'Order ' || new.code);
    end loop;
    new.stock_deducted := true;
  elsif new.status::text = 'Cancelled' and old.stock_deducted then
    for r in select stock_item_id, -sum(change) as amt from public.stock_movements
      where order_id = new.id and kind in ('order_deduct','order_restore') group by stock_item_id having sum(change) <> 0 loop
      update public.stock_items set quantity = quantity + r.amt where id = r.stock_item_id;
      insert into public.stock_movements(stock_item_id, change, kind, order_id, notes) values (r.stock_item_id, r.amt, 'order_restore', new.id, 'Cancelled ' || new.code);
    end loop;
    new.stock_deducted := false;
  end if;
  new.updated_at := now();
  return new;
end $function$;