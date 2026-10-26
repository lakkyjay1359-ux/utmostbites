CREATE OR REPLACE FUNCTION public.website_visit_daily(_days int DEFAULT 14)
RETURNS TABLE(day date, visits bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN QUERY
 SELECT d::date, count(v.session_id)
 FROM generate_series((now() AT TIME ZONE 'Africa/Nairobi')::date - (least(greatest(_days,1),90)-1), (now() AT TIME ZONE 'Africa/Nairobi')::date, interval '1 day') d
 LEFT JOIN public.website_visits v ON (v.created_at AT TIME ZONE 'Africa/Nairobi')::date = d::date
 GROUP BY d ORDER BY d;
END; $$;
REVOKE ALL ON FUNCTION public.website_visit_daily(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.website_visit_daily(int) TO authenticated;