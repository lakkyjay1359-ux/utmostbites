ALTER TABLE public.orders ADD COLUMN source text NOT NULL DEFAULT 'online' CHECK (source IN ('online','pos'));

CREATE OR REPLACE FUNCTION public.create_pos_sale(
  _items jsonb,
  _payment text,
  _customer_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _payment_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item jsonb;
  _prod public.products%ROWTYPE;
  _combo public.combos%ROWTYPE;
  _variant jsonb;
  _name text;
  _variant_label text;
  _unit_price int;
  _qty int;
  _total int := 0;
  _order_id uuid;
  _order_no int;
  _code text;
  _customer_id uuid;
  _phone_clean text;
  _deduct record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF _payment NOT IN ('cash','mpesa') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Sale is empty';
  END IF;

  _code := 'POS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  _phone_clean := nullif(regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g'), '');

  INSERT INTO public.orders (code, customer_name, phone, fulfillment, payment, payment_status, status, payment_ref, total, source)
  VALUES (_code, nullif(trim(coalesce(_customer_name, '')), '') IS NULL, 'pickup', _payment, 'paid', 'Completed', nullif(trim(coalesce(_payment_ref, '')), ''), 0, 'pos')
  RETURNING id INTO _order_id;

  -- fix customer_name expression (cannot use IS NULL as value); set properly
  UPDATE public.orders SET customer_name = coalesce(nullif(trim(coalesce(_customer_name, '')), ''), 'Walk-in') WHERE id = _order_id;

  IF _phone_clean IS NOT NULL AND length(_phone_clean) >= 9 THEN
    SELECT id INTO _customer_id FROM public.customers WHERE phone = _phone_clean LIMIT 1;
    IF _customer_id IS NULL THEN
      INSERT INTO public.customers (name, phone) VALUES (coalesce(nullif(trim(coalesce(_customer_name, '')), ''), 'Walk-in'), _phone_clean) RETURNING id INTO _customer_id;
    END IF;
    UPDATE public.orders SET customer_id = _customer_id, phone = _phone_clean WHERE id = _order_id;
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _qty := greatest(1, least(50, coalesce((_item->>'qty')::int, 1)));
    _variant_label := nullif(trim(coalesce(_item->>'variant', '')), '');
    IF _item->>'item_type' = 'combo' THEN
      SELECT * INTO _combo FROM public.combos WHERE id = (_item->>'item_id')::uuid AND available FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Combo not available'; END IF;
      _name := _combo.name; _unit_price := _combo.price; _variant_label := NULL;
    ELSE
      SELECT * INTO _prod FROM public.products WHERE id = (_item->>'item_id')::uuid AND available FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
      _name := _prod.name;
      IF _prod.variants IS NOT NULL AND jsonb_array_length(_prod.variants) > 0 THEN
        IF _variant_label IS NULL THEN RAISE EXCEPTION 'Choose a size for %', _prod.name; END IF;
        SELECT v INTO _variant FROM jsonb_array_elements(_prod.variants) v WHERE v->>'label' = _variant_label;
        IF _variant IS NULL THEN RAISE EXCEPTION 'Invalid size % for %', _variant_label, _prod.name; END IF;
        _unit_price := (_variant->>'price')::int;
      ELSE
        _unit_price := _prod.price; _variant_label := NULL;
      END IF;
    END IF;
    INSERT INTO public.order_items (order_id, item_type, item_id, name, variant, unit_price, qty, line_total)
    VALUES (_order_id, coalesce(_item->>'item_type', 'product'), (_item->>'item_id')::uuid, _name, _variant_label, _unit_price, _qty, _unit_price * _qty);
    _total := _total + _unit_price * _qty;
  END LOOP;

  -- Deduct stock exactly like orders_stock_sync does for product lines (combos have no ingredient mapping)
  FOR _deduct IN
    SELECT pi.stock_item_id, sum(pi.qty * oi.qty) AS used
    FROM public.order_items oi
    JOIN public.product_ingredients pi ON pi.product_id = oi.item_id
    WHERE oi.order_id = _order_id AND oi.item_type = 'product'
    GROUP BY pi.stock_item_id
  LOOP
    UPDATE public.stock_items SET quantity = quantity - _deduct.used WHERE id = _deduct.stock_item_id;
    INSERT INTO public.stock_movements (stock_item_id, change, kind, order_id, notes)
    VALUES (_deduct.stock_item_id, -_deduct.used, 'order_deduct', _order_id, 'POS ' || _code);
  END LOOP;
  UPDATE public.orders SET total = _total, stock_deducted = true WHERE id = _order_id RETURNING order_no INTO _order_no;

  RETURN jsonb_build_object('order_id', _order_id, 'order_no', _order_no, 'code', _code, 'total', _total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_pos_sale(jsonb, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_sale(jsonb, text, text, text, text) TO authenticated;