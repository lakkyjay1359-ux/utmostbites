GRANT DELETE ON public.orders TO authenticated;
CREATE POLICY "admin delete failed orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND payment_status = 'failed');
CREATE OR REPLACE FUNCTION public.delete_manual_stock_movement(_movement_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE item_id uuid; movement public.stock_movements%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT stock_item_id INTO item_id FROM public.stock_movements WHERE id = _movement_id;
  IF item_id IS NULL THEN RAISE EXCEPTION 'Stock movement not found'; END IF;
  PERFORM 1 FROM public.stock_items WHERE id = item_id FOR UPDATE;
  SELECT * INTO movement FROM public.stock_movements WHERE id = _movement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock movement not found'; END IF;
  IF movement.kind NOT IN ('adjust', 'restock') OR movement.order_id IS NOT NULL THEN RAISE EXCEPTION 'Order stock movements cannot be deleted'; END IF;
  UPDATE public.stock_items SET quantity = quantity - movement.change WHERE id = movement.stock_item_id;
  DELETE FROM public.stock_movements WHERE id = _movement_id;
END $function$;
REVOKE ALL ON FUNCTION public.delete_manual_stock_movement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_manual_stock_movement(uuid) TO authenticated;