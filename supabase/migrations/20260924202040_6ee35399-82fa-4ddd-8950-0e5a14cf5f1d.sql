ALTER TABLE public.consultations ADD COLUMN appointment_date date;
UPDATE public.consultations SET appointment_date = (consult_date AT TIME ZONE 'Asia/Kolkata')::date;
ALTER TABLE public.consultations ALTER COLUMN appointment_date SET NOT NULL;
ALTER TABLE public.consultations ALTER COLUMN appointment_date SET DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date);
CREATE INDEX consultations_user_appt_date_idx ON public.consultations(user_id, appointment_date);

CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  has_completed_onboarding boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own settings select" ON public.user_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own settings insert" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own settings update" ON public.user_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Existing clinicians who already have patients are treated as onboarded
INSERT INTO public.user_settings (user_id, has_completed_onboarding)
SELECT DISTINCT user_id, true FROM public.patients ON CONFLICT DO NOTHING;