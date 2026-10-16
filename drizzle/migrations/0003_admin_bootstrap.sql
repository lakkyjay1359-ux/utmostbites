CREATE TABLE public.admin_bootstrap (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  user_id uuid
);
GRANT ALL ON public.admin_bootstrap TO service_role;
ALTER TABLE public.admin_bootstrap ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_bootstrap (singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.finalize_admin_bootstrap(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE already boolean;
BEGIN
  SELECT done INTO already FROM public.admin_bootstrap WHERE singleton FOR UPDATE;
  IF already THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.admin_bootstrap SET done = true, done_at = now(), user_id = _user_id WHERE singleton;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finalize_admin_bootstrap(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_admin_bootstrap(uuid) TO service_role;