-- Database regression test. Always roll back every fixture and counter change.
BEGIN;
DO $$
DECLARE
  first_id uuid; second_id uuid; third_id uuid; reused_id uuid; next_id uuid;
  first_no integer; second_no integer; third_no integer; reused_no integer; next_no integer;
  counter_before integer; counter_after integer; pending_id uuid;
BEGIN
  PERFORM 1 FROM public.order_number_counter WHERE singleton FOR UPDATE;
  INSERT INTO public.orders(code, customer_name, phone, fulfillment, payment, payment_status, status, total)
    VALUES ('TEST-REUSE-' || gen_random_uuid(), 'Number reuse test', '-', 'pickup', 'cash', 'paid', 'Completed', 1)
    RETURNING id, order_no INTO first_id, first_no;
  INSERT INTO public.orders(code, customer_name, phone, fulfillment, payment, payment_status, status, total)
    VALUES ('TEST-REUSE-' || gen_random_uuid(), 'Number reuse test', '-', 'pickup', 'cash', 'paid', 'Completed', 1)
    RETURNING id, order_no INTO second_id, second_no;
  INSERT INTO public.orders(code, customer_name, phone, fulfillment, payment, payment_status, status, total)
    VALUES ('TEST-REUSE-' || gen_random_uuid(), 'Number reuse test', '-', 'pickup', 'cash', 'paid', 'Completed', 1)
    RETURNING id, order_no INTO third_id, third_no;
  UPDATE public.orders SET payment_status='failed' WHERE id=first_id;
  DELETE FROM public.orders WHERE id=first_id AND payment_status='failed';
  INSERT INTO public.orders(code, customer_name, phone, fulfillment, payment, payment_status, status, total)
    VALUES ('TEST-REUSE-' || gen_random_uuid(), 'Number reuse test', '-', 'pickup', 'cash', 'paid', 'Completed', 1)
    RETURNING id, order_no INTO reused_id, reused_no;
  IF reused_no IS DISTINCT FROM first_no THEN RAISE EXCEPTION 'New sale must reuse deleted failed number'; END IF;
  INSERT INTO public.orders(code, customer_name, phone, fulfillment, payment, payment_status, status, total)
    VALUES ('TEST-REUSE-' || gen_random_uuid(), 'Number reuse test', '-', 'pickup', 'cash', 'paid', 'Completed', 1)
    RETURNING id, order_no INTO next_id, next_no;
  IF next_no <= third_no THEN RAISE EXCEPTION 'Continuation must skip occupied numbers'; END IF;
  IF (SELECT order_no FROM public.orders WHERE id=second_id) IS DISTINCT FROM second_no
    OR (SELECT order_no FROM public.orders WHERE id=third_id) IS DISTINCT FROM third_no THEN
    RAISE EXCEPTION 'Existing receipt numbers must not change';
  END IF;
  SELECT last_no INTO counter_before FROM public.order_number_counter WHERE singleton;
  INSERT INTO public.orders(code, customer_name, phone, fulfillment, payment, payment_status, status, total)
    VALUES ('TEST-REUSE-' || gen_random_uuid(), 'Number reuse test', '-', 'pickup', 'cash', 'failed', 'Received', 1)
    RETURNING id INTO pending_id;
  DELETE FROM public.orders WHERE id=pending_id AND payment_status='failed';
  SELECT last_no INTO counter_after FROM public.order_number_counter WHERE singleton;
  IF counter_after IS DISTINCT FROM counter_before THEN RAISE EXCEPTION 'Unnumbered failed attempts must not rewind numbering'; END IF;
  UPDATE public.orders SET status='Cancelled' WHERE id=reused_id;
  SELECT last_no INTO counter_after FROM public.order_number_counter WHERE singleton;
  IF counter_after IS DISTINCT FROM counter_before THEN RAISE EXCEPTION 'Cancelling paid receipts must not rewind numbering'; END IF;
END $$;
ROLLBACK;