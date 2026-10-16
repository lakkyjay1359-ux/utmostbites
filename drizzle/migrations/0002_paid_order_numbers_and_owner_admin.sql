ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_no integer;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_no_unique ON public.orders(order_no);
-- Existing paid orders receive numbers once, in creation order.
WITH numbered AS (SELECT id, row_number() OVER (ORDER BY created_at,id)::integer AS n FROM public.orders WHERE payment_status='paid') UPDATE public.orders o SET order_no=n.n FROM numbered n WHERE o.id=n.id AND o.order_no IS NULL;
CREATE TABLE public.order_number_counter (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), last_no integer NOT NULL DEFAULT 0);
GRANT ALL ON public.order_number_counter TO service_role;
ALTER TABLE public.order_number_counter ENABLE ROW LEVEL SECURITY;
INSERT INTO public.order_number_counter(singleton,last_no) SELECT true,coalesce(max(order_no),0) FROM public.orders;
CREATE OR REPLACE FUNCTION public.assign_paid_order_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.order_no IS NOT NULL THEN
    IF NEW.order_no IS DISTINCT FROM OLD.order_no THEN RAISE EXCEPTION 'Order numbers cannot be changed'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.order_no IS NOT NULL THEN RAISE EXCEPTION 'Order numbers are assigned by payment confirmation'; END IF;
  IF NEW.payment_status='paid' AND NEW.status::text <> 'Cancelled' THEN
    UPDATE public.order_number_counter SET last_no=last_no+1 WHERE singleton=true RETURNING last_no INTO NEW.order_no;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assign_paid_order_number BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_paid_order_number();
CREATE OR REPLACE FUNCTION public.enforce_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.role='admin' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=NEW.user_id AND lower(email)='lewisirabu@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Admin access is restricted to the verified owner'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enforce_owner_admin BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enforce_owner_admin();
CREATE OR REPLACE FUNCTION public.sync_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF lower(NEW.email)='lewisirabu@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin') ON CONFLICT(user_id,role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id=NEW.id AND role='admin';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_owner_admin AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_owner_admin();
CREATE OR REPLACE FUNCTION public.claim_first_admin() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)='lewisirabu@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),'admin') ON CONFLICT(user_id,role) DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM public,anon,authenticated;
-- Existing RLS policies stay unchanged; this strengthens their shared role check.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=_user_id AND r.role=_role AND (_role<>'admin' OR EXISTS(SELECT 1 FROM auth.users u WHERE u.id=r.user_id AND lower(u.email)='lewisirabu@gmail.com' AND u.email_confirmed_at IS NOT NULL)))
$$;