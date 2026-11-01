CREATE OR REPLACE FUNCTION public.employee_can_view(_section text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.employee_access e JOIN auth.users u ON u.id = e.user_id WHERE e.user_id = auth.uid() AND e.enabled AND _section = ANY(e.sections) AND lower(u.email) = e.email AND u.email_confirmed_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.employee_can_view(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_can_view(text) TO authenticated;
DROP POLICY "employee reads own enabled access" ON public.employee_access;
CREATE POLICY "employee reads own access" ON public.employee_access FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.employee_section_data(_section text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.employee_can_view(_section) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF _section = 'dashboard' THEN
  SELECT jsonb_build_object('newOrders',count(*) FILTER (WHERE status = 'Received'),'preparing',count(*) FILTER (WHERE status = 'Preparing'),'completedToday',count(*) FILTER (WHERE status = 'Completed' AND (created_at AT TIME ZONE 'Africa/Nairobi')::date = (now() AT TIME ZONE 'Africa/Nairobi')::date),'salesToday',coalesce(sum(total) FILTER (WHERE payment_status = 'paid' AND status <> 'Cancelled' AND (created_at AT TIME ZONE 'Africa/Nairobi')::date = (now() AT TIME ZONE 'Africa/Nairobi')::date),0)) INTO result FROM public.orders;
 ELSIF _section = 'orders' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO result FROM (SELECT order_no, customer_name, phone, fulfillment, location, total, status, payment_status, created_at FROM public.orders ORDER BY created_at DESC LIMIT 300) o;
 ELSIF _section = 'stock' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO result FROM (SELECT name,unit,quantity,min_level FROM public.stock_items ORDER BY name) s;
 ELSIF _section = 'menu' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO result FROM (SELECT name,price,variants,available FROM public.products ORDER BY sort,name) p;
 ELSIF _section = 'sales' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO result FROM (SELECT order_no,total,status,payment_status,created_at,source FROM public.orders WHERE payment_status = 'paid' AND status <> 'Cancelled' ORDER BY created_at DESC LIMIT 300) o;
 ELSE RAISE EXCEPTION 'Access denied'; END IF;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.employee_section_data(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_section_data(text) TO authenticated;