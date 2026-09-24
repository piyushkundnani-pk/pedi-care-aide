ALTER TABLE public.consultations
ADD COLUMN IF NOT EXISTS attach_fever_advisory boolean NOT NULL DEFAULT false;