import { supabase } from "@/integrations/supabase/client";
import { IAP_SCHEDULE, addDays, ageInMonths } from "@/lib/iap-schedule";

export function formatAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years < 5) {
    if (years === 0) return `${remMonths} month${remMonths === 1 ? "" : "s"}`;
    return `${years} year${years === 1 ? "" : "s"} ${remMonths} month${remMonths === 1 ? "" : "s"}`;
  }
  return `${years} years`;
}

export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function formatToday(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const SAMPLE_PATIENTS = [
  {
    full_name: "Aarav Sharma",
    date_of_birth: "2026-03-15",
    weight_kg: 7.4,
    gender: "M",
    parent_name: "Meera Sharma",
    parent_phone: "+91 98200 11223",
    allergies: [] as string[],
    symptoms: "Mild fever since 2 days, reduced feeding",
  },
  {
    full_name: "Ananya Iyer",
    date_of_birth: "2025-07-10",
    weight_kg: 9.8,
    gender: "F",
    parent_name: "Lakshmi Iyer",
    parent_phone: "+91 98450 33445",
    allergies: ["Penicillin"],
    symptoms: "Loose stools, mild dehydration",
  },
  {
    full_name: "Vivaan Patel",
    date_of_birth: "2023-12-05",
    weight_kg: 13.2,
    gender: "M",
    parent_name: "Nikhil Patel",
    parent_phone: "+91 99870 55667",
    allergies: [],
    symptoms: "Cough and cold for 4 days",
  },
  {
    full_name: "Diya Reddy",
    date_of_birth: "2021-07-22",
    weight_kg: 17.5,
    gender: "F",
    parent_name: "Sujatha Reddy",
    parent_phone: "+91 90000 77889",
    allergies: ["Peanuts", "Dust mites"],
    symptoms: "Recurrent wheezing at night",
  },
  {
    full_name: "Kabir Nair",
    date_of_birth: "2018-09-03",
    weight_kg: 24.1,
    gender: "M",
    parent_name: "Anil Nair",
    parent_phone: "+91 98111 99001",
    allergies: [],
    symptoms: "Sore throat, fever 101F",
  },
];

/** Resets the signed-in clinician's data, then loads a deterministic five-patient demo day. */
export async function loadSampleData(): Promise<{ created: number }> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error("You must be signed in.");

  // Related consultations, prescriptions and vaccinations are removed by cascading deletes.
  const { error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("user_id", authData.user.id);
  if (deleteError) throw deleteError;

  const { data: inserted, error: insertError } = await supabase
    .from("patients")
    .insert(
      SAMPLE_PATIENTS.map((p) => ({
        user_id: authData.user.id,
        full_name: p.full_name,
        date_of_birth: p.date_of_birth,
        weight_kg: p.weight_kg,
        gender: p.gender,
        parent_name: p.parent_name,
        parent_phone: p.parent_phone,
        allergies: p.allergies,
      })),
    )
    .select("id, full_name");
  if (insertError) throw insertError;
  if (!inserted || inserted.length !== SAMPLE_PATIENTS.length) {
    throw new Error("The sample patients could not be loaded completely.");
  }

  const byName = new Map(inserted.map((p) => [p.full_name, p.id]));

  const today = todayISO();
  const newConsults = SAMPLE_PATIENTS.map((p) => {
    const patientId = byName.get(p.full_name);
    if (!patientId) throw new Error(`Missing sample patient: ${p.full_name}`);
    return { patient_id: patientId, symptoms: p.symptoms, appointment_status: "scheduled" };
  });
  const { error: consultError } = await supabase.from("consultations").insert(newConsults);
  if (consultError) throw consultError;

  // Realistic administered history: every milestone at least 1 month old is given,
  // except one deliberate gap each for three patients so the demo shows attention items.
  const SKIP: Record<string, string> = {
    "Aarav Sharma": "Rotavirus-3",
    "Ananya Iyer": "Hepatitis A-1",
    "Vivaan Patel": "Typhoid Conjugate Vaccine",
  };
  const newVax: {
    patient_id: string;
    vaccine_name: string;
    scheduled_date: string;
    administered_date: string | null;
    status: string;
  }[] = [];
  for (const p of SAMPLE_PATIENTS) {
    const patientId = byName.get(p.full_name)!;
    const age = ageInMonths(p.date_of_birth, today);
    for (const m of IAP_SCHEDULE) {
      if (m.days / 30.4375 > age - 1) continue;
      const scheduled = addDays(p.date_of_birth, m.days);
      for (const vaccine of m.vaccines) {
        if (SKIP[p.full_name] === vaccine) continue;
        let given = addDays(scheduled, Math.floor(Math.random() * 15));
        if (given > today) given = today;
        newVax.push({ patient_id: patientId, vaccine_name: vaccine, scheduled_date: scheduled, administered_date: given, status: "administered" });
      }
    }
  }
  // One vaccine due exactly today so the dashboard card has an entry.
  newVax.push({
    patient_id: byName.get("Aarav Sharma")!,
    vaccine_name: "OPV-1",
    scheduled_date: today,
    administered_date: null,
    status: "scheduled",
  });
  const { error: vaccineError } = await supabase.from("vaccination_records").insert(newVax);
  if (vaccineError) throw vaccineError;

  return { created: SAMPLE_PATIENTS.length };
}
