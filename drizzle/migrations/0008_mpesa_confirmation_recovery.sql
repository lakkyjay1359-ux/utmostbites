ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_note text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mpesa_last_query_at timestamptz;
COMMENT ON COLUMN public.orders.mpesa_last_query_at IS 'Atomic cross-worker STK query throttle; at most one query per ten seconds per order.';