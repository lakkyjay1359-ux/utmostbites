CREATE OR REPLACE FUNCTION public.assign_paid_order_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _last_no integer; _candidate bigint;
BEGIN
  IF TG_OP='UPDATE' AND OLD.order_no IS NOT NULL THEN
    IF NEW.order_no IS DISTINCT FROM OLD.order_no THEN RAISE EXCEPTION 'Order numbers cannot be changed'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.order_no IS NOT NULL THEN RAISE EXCEPTION 'Order numbers are assigned by payment confirmation'; END IF;
  IF NEW.payment_status='paid' AND NEW.status::text <> 'Cancelled' THEN
    SELECT last_no INTO STRICT _last_no FROM public.order_number_counter WHERE singleton=true FOR UPDATE;
    _candidate := _last_no::bigint + 1;
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_no = _candidate) LOOP
      _candidate := _candidate + 1;
    END LOOP;
    IF _candidate > 2147483647 THEN RAISE EXCEPTION 'Order number limit reached'; END IF;
    UPDATE public.order_number_counter SET last_no=_candidate::integer WHERE singleton=true;
    NEW.order_no := _candidate::integer;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.reuse_deleted_failed_order_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.payment_status='failed' AND OLD.order_no IS NOT NULL THEN
    UPDATE public.order_number_counter SET last_no=least(last_no, OLD.order_no-1) WHERE singleton=true;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.reuse_deleted_failed_order_number() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reuse_deleted_failed_order_number AFTER DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reuse_deleted_failed_order_number();
COMMENT ON FUNCTION public.reuse_deleted_failed_order_number() IS 'Rewinds allocation only for deleted numbered failed payments; existing receipt numbers stay immutable.';