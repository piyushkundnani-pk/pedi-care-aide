export const IAP_SCHEDULE_VERSION = "IAP Immunization Schedule 2025 v1.0";

export const IAP_SCHEDULE: { milestone: string; days: number; vaccines: string[] }[] = [
  { milestone: "Birth", days: 0, vaccines: ["BCG", "OPV-0", "Hepatitis B-1"] },
  { milestone: "6 weeks", days: 42, vaccines: ["DTwP-1", "IPV-1", "Hepatitis B-2", "Hib-1", "Rotavirus-1", "PCV-1"] },
  { milestone: "10 weeks", days: 70, vaccines: ["DTwP-2", "IPV-2", "Hib-2", "Rotavirus-2", "PCV-2"] },
  { milestone: "14 weeks", days: 98, vaccines: ["DTwP-3", "IPV-3", "Hib-3", "Rotavirus-3", "PCV-3"] },
  { milestone: "6 months", days: 182, vaccines: ["OPV-1", "Hepatitis B-3"] },
  { milestone: "9 months", days: 274, vaccines: ["MMR-1"] },
  { milestone: "12 months", days: 365, vaccines: ["Hepatitis A-1"] },
  { milestone: "15 months", days: 456, vaccines: ["MMR-2", "Varicella-1", "PCV Booster"] },
  { milestone: "16–18 months", days: 487, vaccines: ["DTwP-B1", "IPV-B1", "Hib-B1"] },
  { milestone: "18–19 months", days: 548, vaccines: ["Hepatitis A-2", "Varicella-2"] },
  { milestone: "24 months", days: 730, vaccines: ["Typhoid Conjugate Vaccine"] },
  { milestone: "4–6 years", days: 1461, vaccines: ["DTwP-B2", "IPV-B2", "MMR-3"] },
];

export type VaxStatus = "administered" | "overdue" | "due-soon" | "upcoming";

export type VaxRecord = {
  id: string;
  patient_id: string;
  vaccine_name: string;
  administered_date: string | null;
  reminder_sent_at: string | null;
};

export type ScheduleItem = {
  milestone: string;
  vaccine: string;
  scheduledDate: string;
  status: VaxStatus;
  daysDiff: number; // scheduled - today
  record: VaxRecord | undefined;
};

const DAY = 86_400_000;
const toUTC = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso: string, d: number) =>
  new Date(toUTC(iso) + d * DAY).toISOString().slice(0, 10);

export function buildSchedule(dob: string, today: string, records: VaxRecord[]): ScheduleItem[] {
  const t = toUTC(today);
  return IAP_SCHEDULE.flatMap(({ milestone, days, vaccines }) =>
    vaccines.map((vaccine) => {
      const scheduledDate = addDays(dob, days);
      const daysDiff = Math.round((toUTC(scheduledDate) - t) / DAY);
      const record = records.find((r) => r.vaccine_name.toLowerCase() === vaccine.toLowerCase());
      const status: VaxStatus = record?.administered_date
        ? "administered"
        : daysDiff < 0
          ? "overdue"
          : daysDiff <= 30
            ? "due-soon"
            : "upcoming";
      return { milestone, vaccine, scheduledDate, status, daysDiff, record };
    }),
  );
}

export function ageInMonths(dob: string, today: string) {
  const [y1, m1, d1] = dob.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  return (y2! - y1!) * 12 + (m2! - m1!) - (d2! < d1! ? 1 : 0);
}
