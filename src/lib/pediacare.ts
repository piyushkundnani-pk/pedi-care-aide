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

const SKIP: Record<string, string> = {
  "Aarav Sharma": "Rotavirus-3",
  "Ananya Iyer": "Hepatitis A-1",
  "Vivaan Patel": "Typhoid Conjugate Vaccine",
};

type VaxRow = {
  user_id: string;
  patient_id: string;
  vaccine_name: string;
  scheduled_date: string;
  administered_date: string | null;
  status: string;
};

function buildVaccinations(userId: string, byName: Map<string, string>): VaxRow[] {
  const today = todayISO();
  const rows: VaxRow[] = [];
  for (const p of SAMPLE_PATIENTS) {
    const patientId = byName.get(p.full_name);
    if (!patientId) continue;
    const age = ageInMonths(p.date_of_birth, today);
    for (const m of IAP_SCHEDULE) {
      if (m.days / 30.4375 > age - 1) continue;
      const scheduled = addDays(p.date_of_birth, m.days);
      for (const vaccine of m.vaccines) {
        if (SKIP[p.full_name] === vaccine) continue;
        let given = addDays(scheduled, Math.floor(Math.random() * 15));
        if (given > today) given = today;
        rows.push({ user_id: userId, patient_id: patientId, vaccine_name: vaccine, scheduled_date: scheduled, administered_date: given, status: "administered" });
      }
    }
  }
  const aarav = byName.get("Aarav Sharma");
  if (aarav) {
    rows.push({ user_id: userId, patient_id: aarav, vaccine_name: "OPV-1", scheduled_date: today, administered_date: null, status: "scheduled" });
  }
  return rows;
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error("You must be signed in.");
  return data.user.id;
}

async function insertPatients(userId: string, list: typeof SAMPLE_PATIENTS) {
  if (list.length === 0) return [] as { id: string; full_name: string }[];
  const { data, error } = await supabase
    .from("patients")
    .insert(
      list.map((p) => ({
        user_id: userId,
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
  if (error) throw error;
  const { error: cErr } = await supabase.from("consultations").insert(
    (data ?? []).map((row) => ({
      user_id: userId,
      patient_id: row.id,
      symptoms: list.find((p) => p.full_name === row.full_name)?.symptoms ?? null,
      appointment_status: "scheduled",
    })),
  );
  if (cErr) throw cErr;
  return data ?? [];
}

/** Destructive: deletes the clinician's data, then loads the five-patient demo day. */
export async function resetDemoData(): Promise<{ created: number; email: string }> {
  const { data: u } = await supabase.auth.getUser();
  const userId = await requireUserId();
  for (const t of ["prescriptions", "vaccination_records", "consultations", "patients"] as const) {
    const { error: deleteError } = await supabase.from(t).delete().eq("user_id", userId);
    if (deleteError) throw deleteError;
  }
  const inserted = await insertPatients(userId, SAMPLE_PATIENTS);
  const byName = new Map(inserted.map((p) => [p.full_name, p.id]));
  const { error } = await supabase.from("vaccination_records").insert(buildVaccinations(userId, byName));
  if (error) throw error;
  return { created: inserted.length, email: u.user?.email ?? "" };
}

/** Additive: inserts only missing sample patients and vaccination records. */
export async function mergeSampleData(): Promise<{ added: number }> {
  const userId = await requireUserId();
  const { data: existing, error } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("user_id", userId);
  if (error) throw error;
  const byName = new Map<string, string>();
  for (const p of existing ?? []) if (!byName.has(p.full_name)) byName.set(p.full_name, p.id);

  const missing = SAMPLE_PATIENTS.filter((p) => !byName.has(p.full_name));
  const inserted = await insertPatients(userId, missing);
  for (const p of inserted) byName.set(p.full_name, p.id);

  const sampleIds = SAMPLE_PATIENTS.map((p) => byName.get(p.full_name)).filter(Boolean) as string[];
  const { data: vax, error: vErr } = await supabase
    .from("vaccination_records")
    .select("patient_id, vaccine_name")
    .in("patient_id", sampleIds);
  if (vErr) throw vErr;
  const have = new Set((vax ?? []).map((v) => `${v.patient_id}|${v.vaccine_name}`));
  const toAdd = buildVaccinations(userId, byName).filter((v) => !have.has(`${v.patient_id}|${v.vaccine_name}`));
  if (toAdd.length > 0) {
    const { error: iErr } = await supabase.from("vaccination_records").insert(toAdd);
    if (iErr) throw iErr;
  }
  return { added: inserted.length };
}

export async function hasAnyPatients(): Promise<boolean> {
  const userId = await requireUserId();
  const { count, error } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export type NewPatientInput = {
  full_name: string;
  date_of_birth: string;
  weight_kg: number;
  gender: "M" | "F";
  parent_name: string;
  parent_phone: string;
  allergies: string[];
};

/** Registers a patient, books today's appointment, and adds past-due/due-today vaccines. */
export async function registerPatient(input: NewPatientInput, administered: "all" | string[] = "all") {
  const userId = await requireUserId();
  const { data: patient, error } = await supabase
    .from("patients")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  const { error: cErr } = await supabase
    .from("consultations")
    .insert({ user_id: userId, patient_id: patient.id, appointment_status: "scheduled" });
  if (cErr) throw cErr;
  const today = todayISO();
  const vax = IAP_SCHEDULE.flatMap((m) => {
    const scheduled = addDays(input.date_of_birth, m.days);
    if (scheduled > today) return [];
    return m.vaccines
      .filter((v) => administered === "all" || administered.includes(v))
      .map((v) => {
        let given = addDays(scheduled, Math.floor(Math.random() * 15));
        if (given > today) given = today;
        return {
          user_id: userId,
          patient_id: patient.id,
          vaccine_name: v,
          scheduled_date: scheduled,
          administered_date: given,
          status: "administered",
        };
      });
  });
  if (vax.length > 0) {
    const { error: vErr } = await supabase.from("vaccination_records").insert(vax);
    if (vErr) throw vErr;
  }
  return patient.id;
}
