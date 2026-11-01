CREATE TABLE public.employee_access (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 user_id uuid UNIQUE NOT NULL,
 email text NOT NULL DEFAULT 'renlyshillah44@gmail.com' CHECK (email = 'renlyshillah44@gmail.com'),
 enabled boolean NOT NULL DEFAULT true,
 sections text[] NOT NULL DEFAULT '{}'::text[] CHECK (sections <@ ARRAY['dashboard','orders','menu','stock','sales']::text[]),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.employee_access TO authenticated;
GRANT ALL ON public.employee_access TO service_role;
ALTER TABLE public.employee_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads employee access" ON public.employee_access FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner updates employee access" ON public.employee_access FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "employee reads own enabled access" ON public.employee_access FOR SELECT TO authenticated USING (user_id = auth.uid() AND enabled AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND lower(u.email) = 'renlyshillah44@gmail.com' AND u.email_confirmed_at IS NOT NULL));