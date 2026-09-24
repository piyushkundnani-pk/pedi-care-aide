ALTER TABLE public.patients ADD COLUMN user_id uuid;

CREATE INDEX patients_user_id_idx ON public.patients(user_id);

ALTER TABLE public.consultations DROP CONSTRAINT consultations_patient_id_fkey;
ALTER TABLE public.consultations ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions DROP CONSTRAINT prescriptions_consultation_id_fkey;
ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;

ALTER TABLE public.vaccination_records DROP CONSTRAINT vaccination_records_patient_id_fkey;
ALTER TABLE public.vaccination_records ADD CONSTRAINT vaccination_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Authenticated users manage patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users manage consultations" ON public.consultations;
DROP POLICY IF EXISTS "Authenticated users manage prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Authenticated users manage vaccination records" ON public.vaccination_records;

CREATE POLICY "Users manage own patients" ON public.patients FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own consultations" ON public.consultations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = consultations.patient_id AND patients.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = consultations.patient_id AND patients.user_id = auth.uid()));
CREATE POLICY "Users manage own prescriptions" ON public.prescriptions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.consultations JOIN public.patients ON patients.id = consultations.patient_id WHERE consultations.id = prescriptions.consultation_id AND patients.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.consultations JOIN public.patients ON patients.id = consultations.patient_id WHERE consultations.id = prescriptions.consultation_id AND patients.user_id = auth.uid()));
CREATE POLICY "Users manage own vaccination records" ON public.vaccination_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = vaccination_records.patient_id AND patients.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = vaccination_records.patient_id AND patients.user_id = auth.uid()));