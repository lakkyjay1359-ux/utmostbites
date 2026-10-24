CREATE TABLE public.website_visits (session_id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.website_visits TO authenticated;
GRANT ALL ON public.website_visits TO service_role;
ALTER TABLE public.website_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads website visits" ON public.website_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX website_visits_created_at ON public.website_visits(created_at);
CREATE FUNCTION public.record_website_visit(_session_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ INSERT INTO public.website_visits(session_id) VALUES (_session_id) ON CONFLICT DO NOTHING; $$;
REVOKE ALL ON FUNCTION public.record_website_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_website_visit(uuid) TO anon, authenticated;
CREATE FUNCTION public.website_visit_totals() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN (SELECT jsonb_build_object('total',count(*),'today',count(*) FILTER (WHERE created_at >= (date_trunc('day',now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi')),'since',min(created_at)) FROM public.website_visits);
END; $$;
REVOKE ALL ON FUNCTION public.website_visit_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.website_visit_totals() TO authenticated;
CREATE TABLE public.admin_push_devices (token text PRIMARY KEY CHECK (length(token) BETWEEN 20 AND 4096), user_id uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_push_devices TO authenticated;
GRANT ALL ON public.admin_push_devices TO service_role;
ALTER TABLE public.admin_push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages own push devices" ON public.admin_push_devices FOR ALL TO authenticated USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));