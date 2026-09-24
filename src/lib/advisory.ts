/** Age-adapted fever advisory content shared by the consult preview and the WhatsApp preview. */

export type AdvisoryPatient = { full_name: string; date_of_birth: string; weight_kg: number } | null;
export type AdvisoryItem = { lead?: string | undefined; text: string };
export type AdvisoryBand = "infant" | "toddler" | "standard";

export function ageParts(dob: string): { years: number; months: number; total: number } {
  const d = new Date(dob);
  const now = new Date();
  let total = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) total -= 1;
  total = Math.max(0, total);
  return { years: Math.floor(total / 12), months: total % 12, total };
}

export function buildAdvisory(patient: AdvisoryPatient, followUp: string) {
  const age = patient ? ageParts(patient.date_of_birth) : null;
  const band: AdvisoryBand = !age ? "standard" : age.total < 3 ? "infant" : age.total < 24 ? "toddler" : "standard";
  const now = new Date();
  const enDate = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const hiDate = now.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" });
  const enHeader = patient && age ? `For ${patient.full_name}, age ${age.years} years ${age.months} months, weight ${patient.weight_kg} kg — ${enDate}` : null;
  const hiHeader = patient && age ? `${patient.full_name} के लिए, आयु ${age.years} वर्ष ${age.months} महीने, वज़न ${patient.weight_kg} किग्रा — ${hiDate}` : null;
  const banner =
    band === "infant"
      ? {
          tone: "danger" as const,
          en: "⚠ CRITICAL: Infants under 3 months with fever require immediate medical evaluation. Do NOT self-medicate. Return to clinic immediately if fever is above 38°C.",
          hi: "⚠ महत्वपूर्ण: 3 महीने से कम उम्र के शिशुओं में बुखार होने पर तुरंत चिकित्सा जांच आवश्यक है। स्वयं दवा न दें। बुखार 38°C से अधिक होने पर तुरंत क्लिनिक लाएं।",
        }
      : band === "toddler"
        ? {
            tone: "warn" as const,
            en: "⚠ Note: Only give paracetamol if specifically prescribed by the doctor. Do not exceed the prescribed dose.",
            hi: "⚠ ध्यान दें: पैरासिटामोल केवल तभी दें जब डॉक्टर ने निर्धारित किया हो। निर्धारित खुराक से अधिक न दें।",
          }
        : null;
  const enPara: AdvisoryItem = {
    lead: band === "toddler" ? "Only as prescribed by your doctor:" : undefined,
    text: band === "toddler"
      ? "give paracetamol only if fever is above 38.5°C (101°F). Do NOT give aspirin."
      : "Give paracetamol only if fever is above 38.5°C (101°F). Do NOT give aspirin.",
  };
  const hiPara: AdvisoryItem = {
    lead: band === "toddler" ? "केवल डॉक्टर के निर्देशानुसार:" : undefined,
    text: "पैरासिटामोल तभी दें जब बुखार 38.5°C (101°F) से ऊपर हो। एस्पिरिन नहीं दें।",
  };
  const en: AdvisoryItem[] = [
    ...(band === "infant" ? [] : [enPara]),
    { text: "Keep child hydrated with water, ORS, or breast milk." },
    { text: "Watch for warning signs: fever above 40°C, seizures, difficulty breathing, unable to drink, unusually drowsy, rash. Bring child back immediately if any occur." },
    { text: "Most fevers are viral and resolve in 2-3 days without antibiotics." },
    { text: `Next follow-up: ${followUp} or sooner if symptoms worsen.` },
  ];
  const hi: AdvisoryItem[] = [
    ...(band === "infant" ? [] : [hiPara]),
    { text: "बच्चे को पानी, ORS, या माँ का दूध पिलाते रहें।" },
    { text: "चेतावनी के संकेत: 40°C से ज़्यादा बुखार, दौरे, सांस लेने में तकलीफ़, पानी न पीना, ज़्यादा सुस्ती, चकत्ते। तुरंत क्लिनिक लाएं।" },
    { text: "अधिकांश बुखार वायरल होते हैं और 2-3 दिन में एंटीबायोटिक के बिना ठीक हो जाते हैं।" },
    { text: `अगला फ़ॉलो-अप: ${followUp} या लक्षण बिगड़ने पर।` },
  ];
  return { band, enHeader, hiHeader, banner, en, hi };
}
