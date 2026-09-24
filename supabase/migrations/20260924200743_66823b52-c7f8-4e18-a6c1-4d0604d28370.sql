ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.vaccination_records ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.consultations c SET user_id = p.user_id FROM public.patients p WHERE p.id = c.patient_id AND c.user_id IS NULL;
UPDATE public.vaccination_records v SET user_id = p.user_id FROM public.patients p WHERE p.id = v.patient_id AND v.user_id IS NULL;
UPDATE public.prescriptions r SET user_id = c.user_id FROM public.consultations c WHERE c.id = r.consultation_id AND r.user_id IS NULL;

DELETE FROM public.prescriptions WHERE user_id IS NULL;
DELETE FROM public.vaccination_records WHERE user_id IS NULL;
DELETE FROM public.consultations WHERE user_id IS NULL;
DELETE FROM public.patients WHERE user_id IS NULL;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['patients','consultations','prescriptions','vaccination_records'] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_user_id_fkey');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE', t, t || '_user_id_fkey');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(user_id)', t || '_user_id_idx', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Own rows select" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Own rows insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Own rows update" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Own rows delete" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users manage own patients" ON public.patients;
DROP POLICY IF EXISTS "Users manage own consultations" ON public.consultations;
DROP POLICY IF EXISTS "Users manage own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Users manage own vaccination records" ON public.vaccination_records;