import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchConsultPatient(patientId: string) {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) throw patientError;
  if (!patient) throw new Error("Patient not found.");

  const { data: consultation, error: consultationError } = await supabase
    .from("consultations")
    .select("symptoms")
    .eq("patient_id", patientId)
    .order("consult_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (consultationError) throw consultationError;

  return {
    patient,
    symptoms: consultation?.symptoms ?? "",
  };
}

export const consultPatientQueryOptions = (patientId: string) =>
  queryOptions({
    queryKey: ["consult-patient", patientId],
    queryFn: () => fetchConsultPatient(patientId),
    staleTime: 60_000,
  });