/** Reference pediatric dose ranges (IAP-aligned, mg/kg per dose). For decision support only. */
export type DrugRef = {
  name: string;
  minMgPerKg: number;
  maxMgPerKg: number;
  maxSingleMg: number;
  defaultFreq: number;
  allergyKeys: string[];
};

export const DRUGS: DrugRef[] = [
  { name: "Paracetamol", minMgPerKg: 10, maxMgPerKg: 15, maxSingleMg: 1000, defaultFreq: 4, allergyKeys: ["paracetamol"] },
  { name: "Ibuprofen", minMgPerKg: 5, maxMgPerKg: 10, maxSingleMg: 400, defaultFreq: 3, allergyKeys: ["ibuprofen", "nsaid"] },
  { name: "Amoxicillin", minMgPerKg: 12.5, maxMgPerKg: 30, maxSingleMg: 1000, defaultFreq: 3, allergyKeys: ["penicillin", "amoxicillin"] },
  { name: "Azithromycin", minMgPerKg: 5, maxMgPerKg: 10, maxSingleMg: 500, defaultFreq: 1, allergyKeys: ["azithromycin", "macrolide"] },
  { name: "Cetirizine", minMgPerKg: 0.125, maxMgPerKg: 0.25, maxSingleMg: 10, defaultFreq: 1, allergyKeys: ["cetirizine"] },
  { name: "Ondansetron", minMgPerKg: 0.1, maxMgPerKg: 0.15, maxSingleMg: 4, defaultFreq: 3, allergyKeys: ["ondansetron"] },
  { name: "Salbutamol (oral)", minMgPerKg: 0.1, maxMgPerKg: 0.15, maxSingleMg: 4, defaultFreq: 3, allergyKeys: ["salbutamol"] },
  { name: "ORS + Zinc (Zinc)", minMgPerKg: 1, maxMgPerKg: 2, maxSingleMg: 20, defaultFreq: 1, allergyKeys: ["zinc"] },
];

export type SafetyResult = {
  level: "ok" | "warn" | "danger" | "none";
  message: string;
  range?: { min: number; max: number };
};

export function checkDose(
  drugName: string,
  doseMg: number | null,
  weightKg: number,
): SafetyResult {
  const drug = DRUGS.find((d) => d.name === drugName);
  if (!drug) return { level: "none", message: "Select a drug to check dose." };
  const min = Math.round(drug.minMgPerKg * weightKg * 10) / 10;
  const max = Math.min(Math.round(drug.maxMgPerKg * weightKg * 10) / 10, drug.maxSingleMg);
  const range = { min, max };
  if (doseMg == null || Number.isNaN(doseMg))
    return { level: "none", message: `Safe range: ${min}–${max} mg per dose.`, range };
  if (doseMg > max * 1.2)
    return { level: "danger", message: `Overdose risk: ${doseMg} mg exceeds safe max ${max} mg.`, range };
  if (doseMg > max)
    return { level: "warn", message: `Above range: max ${max} mg per dose.`, range };
  if (doseMg < min)
    return { level: "warn", message: `Below range: min ${min} mg per dose (may be sub-therapeutic).`, range };
  return { level: "ok", message: `Within safe range (${min}–${max} mg).`, range };
}

export function getAllergyWarning(drugName: string, allergies: string[]): string | null {
  const normalizedAllergies = allergies.map((allergy) => allergy.trim().toLocaleLowerCase());

  if (drugName.toLocaleLowerCase() === "amoxicillin" && normalizedAllergies.some((allergy) => allergy.includes("penicillin"))) {
    return "Allergy risk: patient allergic to Penicillin. Do not prescribe Amoxicillin without verification.";
  }

  if (drugName.toLocaleLowerCase() === "ibuprofen" && normalizedAllergies.some((allergy) => allergy.includes("nsaid"))) {
    return "Allergy risk: patient allergic to NSAID class. Do not prescribe Ibuprofen without verification.";
  }

  return null;
}
