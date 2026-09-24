CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  weight_kg NUMERIC NOT NULL,
  gender TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consult_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  symptoms TEXT,
  diagnosis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dosage_mg NUMERIC,
  frequency_per_day INTEGER,
  duration_days INTEGER,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vaccination_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  administered_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_date ON public.consultations(consult_date);
CREATE INDEX idx_vaccination_scheduled ON public.vaccination_records(scheduled_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccination_records TO authenticated;
GRANT ALL ON public.vaccination_records TO service_role;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage consultations" ON public.consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage prescriptions" ON public.prescriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage vaccination records" ON public.vaccination_records FOR ALL TO authenticated USING (true) WITH CHECK (true);