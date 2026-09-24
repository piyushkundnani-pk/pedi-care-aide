import { supabase } from "@/integrations/supabase/client";

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

function dobMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

const SAMPLE_PATIENTS = [
  {
    full_name: "Aarav Sharma",
    months: 6,
    weight_kg: 7.4,
    gender: "M",
    parent_name: "Meera Sharma",
    parent_phone: "+91 98200 11223",
    allergies: [] as string[],
    symptoms: "Mild fever since 2 days, reduced feeding",
  },
  {
    full_name: "Ananya Iyer",
    months: 14,
    weight_kg: 9.8,
    gender: "F",
    parent_name: "Lakshmi Iyer",
    parent_phone: "+91 98450 33445",
    allergies: ["Penicillin"],
    symptoms: "Loose stools, mild dehydration",
  },
  {
    full_name: "Vivaan Patel",
    months: 33,
    weight_kg: 13.2,
    gender: "M",
    parent_name: "Nikhil Patel",
    parent_phone: "+91 99870 55667",
    allergies: [],
    symptoms: "Cough and cold for 4 days",
  },
  {
    full_name: "Diya Reddy",
    months: 62,
    weight_kg: 17.5,
    gender: "F",
    parent_name: "Sujatha Reddy",
    parent_phone: "+91 90000 77889",
    allergies: ["Peanuts", "Dust mites"],
    symptoms: "Recurrent wheezing at night",
  },
  {
    full_name: "Kabir Nair",
    months: 96,
    weight_kg: 24.1,
    gender: "M",
    parent_name: "Anil Nair",
    parent_phone: "+91 98111 99001",
    allergies: [],
    symptoms: "Sore throat, fever 101F",
  },
];

/** Seeds demo patients, today's consultations and vaccinations. Safe to run repeatedly. */
export async function loadSampleData(): Promise<{ created: number }> {
  const names = SAMPLE_PATIENTS.map((p) => p.full_name);
  const { data: existing, error: exErr } = await supabase
    .from("patients")
    .select("id, full_name")
    .in("full_name", names);
  if (exErr) throw exErr;

  const byName = new Map((existing ?? []).map((p) => [p.full_name, p.id]));
  const missing = SAMPLE_PATIENTS.filter((p) => !byName.has(p.full_name));

  if (missing.length > 0) {
    const { data: inserted, error } = await supabase
      .from("patients")
      .insert(
        missing.map((p) => ({
          full_name: p.full_name,
          date_of_birth: dobMonthsAgo(p.months),
          weight_kg: p.weight_kg,
          gender: p.gender,
          parent_name: p.parent_name,
          parent_phone: p.parent_phone,
          allergies: p.allergies,
        })),
      )
      .select("id, full_name");
    if (error) throw error;
    for (const p of inserted ?? []) byName.set(p.full_name, p.id);
  }

  const today = todayISO();
  const ids = SAMPLE_PATIENTS.map((p) => byName.get(p.full_name)).filter(
    Boolean,
  ) as string[];

  // Today's appointments (consultations) — one per sample patient, idempotent.
  const { data: todaysConsults, error: cErr } = await supabase
    .from("consultations")
    .select("patient_id")
    .in("patient_id", ids)
    .gte("consult_date", `${today}T00:00:00`)
    .lte("consult_date", `${today}T23:59:59`);
  if (cErr) throw cErr;
  const haveConsult = new Set((todaysConsults ?? []).map((c) => c.patient_id));
  const newConsults = SAMPLE_PATIENTS.filter((p) => {
    const id = byName.get(p.full_name);
    return id && !haveConsult.has(id);
  }).map((p) => ({
    patient_id: byName.get(p.full_name)!,
    symptoms: p.symptoms,
  }));
  if (newConsults.length > 0) {
    const { error } = await supabase.from("consultations").insert(newConsults);
    if (error) throw error;
  }

  // Two vaccinations due today.
  const vaccines = [
    { name: "Aarav Sharma", vaccine_name: "DTP Booster" },
    { name: "Ananya Iyer", vaccine_name: "MMR Dose 1" },
  ];
  const { data: existingVax, error: vErr } = await supabase
    .from("vaccination_records")
    .select("patient_id, vaccine_name")
    .eq("scheduled_date", today);
  if (vErr) throw vErr;
  const haveVax = new Set(
    (existingVax ?? []).map((v) => `${v.patient_id}|${v.vaccine_name}`),
  );
  const newVax = vaccines
    .map((v) => ({
      patient_id: byName.get(v.name)!,
      vaccine_name: v.vaccine_name,
      scheduled_date: today,
      status: "scheduled",
    }))
    .filter((v) => v.patient_id && !haveVax.has(`${v.patient_id}|${v.vaccine_name}`));
  if (newVax.length > 0) {
    const { error } = await supabase.from("vaccination_records").insert(newVax);
    if (error) throw error;
  }

  return { created: missing.length };
}
