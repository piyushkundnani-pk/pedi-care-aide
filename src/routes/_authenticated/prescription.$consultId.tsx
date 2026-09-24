import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Info, Send } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { formatAge } from "@/lib/pediacare";
import { buildAdvisory } from "@/lib/advisory";
import { cn } from "@/lib/utils";
import { doctorDisplayName } from "@/lib/doctor-name";

export const Route = createFileRoute("/_authenticated/prescription/$consultId")({
  head: () => ({
    meta: [
      { title: "Prescription — PediaCare" },
      { name: "description", content: "Review the digital prescription and send it to the parent via WhatsApp." },
      { property: "og:title", content: "Prescription — PediaCare" },
      { property: "og:description", content: "Review the digital prescription and send it to the parent via WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrescriptionPage,
});

const HINDI_DRUG: Record<string, string> = {
  Paracetamol: "पैरासिटामोल",
  Ibuprofen: "आइबुप्रोफ़ेन",
  Amoxicillin: "एमोक्सिसिलिन",
  Azithromycin: "एज़िथ्रोमाइसिन",
  Cetirizine: "सेटिरिज़िन",
  Ondansetron: "ओन्डेनसेट्रॉन",
  "Salbutamol (oral)": "सालबुटामोल (मुँह से)",
  "ORS + Zinc (Zinc)": "ORS + ज़िंक",
};

async function fetchPrescription(consultId: string) {
  const { data: consultation, error } = await supabase
    .from("consultations")
    .select("*, patients(*)")
    .eq("id", consultId)
    .maybeSingle();
  if (error) throw error;
  if (!consultation || !consultation.patients) throw new Error("Consultation not found.");
  const { data: rx, error: rxError } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("consultation_id", consultId)
    .order("created_at");
  if (rxError) throw rxError;
  return { consultation, patient: consultation.patients, prescriptions: rx ?? [] };
}

const fmtTime = (iso: string | null | undefined) =>
  (iso ? new Date(iso) : new Date()).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

function PrescriptionPage() {
  const { consultId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const doctorName = doctorDisplayName(user);
  const queryClient = useQueryClient();
  const queryKey = ["prescription", consultId];
  const q = useQuery({ queryKey, queryFn: () => fetchPrescription(consultId) });
  const [sending, setSending] = useState(false);
  const [announce, setAnnounce] = useState("");
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rx = q.data?.prescriptions ?? [];
  const sentAt = rx.length > 0 && rx.every((r) => r.whatsapp_sent_at) ? rx[0]?.whatsapp_sent_at ?? null : null;
  const readAt = rx.length > 0 && rx.every((r) => r.whatsapp_read_at) ? rx[0]?.whatsapp_read_at ?? null : null;

  async function markRead() {
    const { error } = await supabase
      .from("prescriptions")
      .update({ whatsapp_read_at: new Date().toISOString() })
      .eq("consultation_id", consultId);
    if (error) { toast.error(`Could not record read receipt: ${error.message}`); return; }
    setAnnounce("Parent has read the message.");
    await queryClient.invalidateQueries({ queryKey });
  }

  // Resume the simulated read receipt if the page reloads mid-flow.
  useEffect(() => {
    if (sentAt && !readAt && !readTimer.current) {
      readTimer.current = setTimeout(() => { readTimer.current = null; void markRead(); }, 3000);
    }
    return () => { if (readTimer.current) { clearTimeout(readTimer.current); readTimer.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentAt, readAt]);

  async function send() {
    if (!q.data) return;
    setSending(true);
    const { error } = await supabase
      .from("prescriptions")
      .update({ whatsapp_sent_at: new Date().toISOString() })
      .eq("consultation_id", consultId);
    setSending(false);
    if (error) { toast.error(`Could not send: ${error.message}`); return; }
    const p = q.data.patient;
    const msg = `Prescription sent to ${p.parent_phone ?? "parent"} (${p.parent_name ?? "Parent"})`;
    toast.success(msg);
    setAnnounce(msg);
    await queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div role="status" aria-live="polite" className="sr-only">{announce}</div>
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Prescription & WhatsApp delivery</h1>
        {q.isPending ? (
          <div role="status" aria-label="Loading prescription" className="grid animate-pulse gap-6 md:grid-cols-2">
            <Skeleton className="h-[520px] rounded-lg" />
            <Skeleton className="h-[520px] rounded-lg" />
          </div>
        ) : q.error || !q.data ? (
          <p role="alert" className="text-destructive">{q.error?.message ?? "Prescription not found."}</p>
        ) : (
          <>
            <div className="grid items-start gap-6 md:grid-cols-2">
              <PrescriptionCard data={q.data} doctorName={doctorName} />
              <WhatsAppPreview data={q.data} sentAt={sentAt} readAt={readAt} doctorName={doctorName} />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/dashboard"><ArrowLeft className="size-4" aria-hidden="true" />Back to Dashboard</Link>
              </Button>
              <Button size="lg" className="gap-2" onClick={send} disabled={!!sentAt || sending || rx.length === 0}
                aria-label={sentAt ? "Sent to parent" : "Send prescription to parent on WhatsApp"}>
                {sentAt ? <>Sent <Check className="size-4" aria-hidden="true" /></> : <><Send className="size-4" aria-hidden="true" />{sending ? "Sending…" : "Send to Parent"}</>}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

type Data = Awaited<ReturnType<typeof fetchPrescription>>;

function PrescriptionCard({ data, doctorName }: { data: Data; doctorName: string }) {
  const { consultation: c, patient: p, prescriptions: rx } = data;
  const date = new Date(c.consult_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return (
    <Card aria-labelledby="rx-title">
      <CardContent className="space-y-5 p-6">
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 id="rx-title" className="text-xl font-semibold text-primary">PediaCare Clinic</h2>
            <p className="text-sm text-foreground">{doctorName}</p>
          </div>
          <dl className="text-right text-sm">
            <div><dt className="sr-only">Date</dt><dd>{date}</dd></div>
            <div><dt className="inline text-muted-foreground">Rx ID: </dt><dd className="inline font-mono">{c.id.slice(0, 8).toUpperCase()}</dd></div>
          </dl>
        </header>
        <section aria-label="Patient details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div className="col-span-2"><dt className="text-muted-foreground">Patient</dt><dd className="font-medium">{p.full_name}</dd></div>
            <div><dt className="text-muted-foreground">Age</dt><dd>{formatAge(p.date_of_birth)}</dd></div>
            <div><dt className="text-muted-foreground">Weight</dt><dd>{p.weight_kg} kg</dd></div>
            <div><dt className="text-muted-foreground">Gender</dt><dd>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "—"}</dd></div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-muted-foreground">Allergies</dt>
              <dd className="flex flex-wrap gap-1 pt-0.5">
                {p.allergies.length ? p.allergies.map((a) => <Badge key={a} variant="destructive">{a}</Badge>) : "None known"}
              </dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="dx-h">
          <h3 id="dx-h" className="text-sm text-muted-foreground">Diagnosis</h3>
          <p className="font-medium text-foreground">{c.diagnosis || "—"}</p>
        </section>
        <section aria-labelledby="rx-h">
          <h3 id="rx-h" className="mb-2 text-sm text-muted-foreground">Prescription</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead className="text-right">Dose (mg)</TableHead>
                  <TableHead className="text-right">Times/day</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Total daily mg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rx.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.drug_name}</TableCell>
                    <TableCell className="text-right">{r.dosage_mg ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.frequency_per_day ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.duration_days ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.dosage_mg && r.frequency_per_day ? Number(r.dosage_mg) * r.frequency_per_day : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <footer className="flex justify-end pt-8">
          <div className="w-48 border-t border-foreground pt-1 text-center text-sm text-muted-foreground">{doctorName} — Signature</div>
        </footer>
      </CardContent>
    </Card>
  );
}

function WhatsAppPreview({ data, sentAt, readAt, doctorName }: { data: Data; sentAt: string | null; readAt: string | null; doctorName: string }) {
  const { consultation: c, patient: p, prescriptions: rx } = data;
  const maxDays = Math.max(0, ...rx.map((r) => r.duration_days ?? 0));
  const follow = new Date(c.consult_date);
  follow.setDate(follow.getDate() + maxDays);
  const followUp = follow.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" });
  const adv = buildAdvisory(p, followUp);
  const lines = rx.map((r) => {
    const name = HINDI_DRUG[r.drug_name] ?? r.drug_name;
    const freq = r.frequency_per_day ? `दिन में ${r.frequency_per_day} बार` : "";
    const days = r.duration_days ? `, ${r.duration_days} दिन तक` : "";
    return `• ${name} ${r.dosage_mg ?? ""} mg — ${freq}${days}`;
  });
  const time = fmtTime(sentAt);
  const ticks = !sentAt ? null : readAt ? (
    <CheckCheck className="size-4 text-wa-read" aria-label="Read" />
  ) : (
    <Check className="size-4 text-wa-meta" aria-label="Sent" />
  );
  const status = !sentAt ? "Not sent yet" : readAt ? `Read at ${fmtTime(readAt)}` : `Sent at ${time}`;

  return (
    <section aria-label="Mock WhatsApp chat preview — simulated, not a real WhatsApp message" className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        WhatsApp Preview (Mocked)
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="About this mocked preview">
                <Info className="size-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              In production, this triggers WhatsApp Business API. For the demo, the send flow is simulated; the audit trail is real (Supabase whatsapp_sent_at and whatsapp_read_at columns update on send).
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-border shadow-sm md:max-w-none">
        <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-wa-header-foreground">
          <div className="flex size-9 items-center justify-center rounded-full bg-wa-header-foreground/20 text-sm font-semibold" aria-hidden="true">PC</div>
          <div>
            <p className="font-semibold leading-tight">{p.parent_name ?? "Parent"}</p>
            <p className="text-xs opacity-90">{p.parent_phone ?? ""}</p>
          </div>
        </div>
        <div className="max-h-[560px] space-y-2 overflow-y-auto bg-wa-chat p-3 sm:p-4" lang="hi">
          <Bubble time={time} ticks={ticks}>
            <p className="font-devanagari whitespace-pre-line">
              {`नमस्ते ${p.parent_name ?? ""} जी। यहाँ ${p.full_name} के लिए ${doctorName} द्वारा दी गई पर्ची है:\n${lines.join("\n")}\n\n- ${doctorName} via PediaCare`}
            </p>
          </Bubble>
          {c.attach_fever_advisory && (
            <Bubble time={time} ticks={ticks}>
              <div className="font-devanagari space-y-1.5">
                {adv.hiHeader && <p className="text-xs text-wa-meta">{adv.hiHeader}</p>}
                <p className="font-semibold">आपके बच्चे के बुखार की देखभाल</p>
                {adv.banner && (
                  <p className={cn("rounded border-l-4 p-2 text-sm font-medium",
                    adv.banner.tone === "danger" ? "border-destructive bg-safety-danger-bg text-safety-danger" : "border-amber-600 bg-amber-50 text-amber-900")}>
                    {adv.banner.hi}
                  </p>
                )}
                <ul className="list-disc space-y-1 pl-4">
                  {adv.hi.map((t, i) => <li key={i}>{t.lead && <strong>{t.lead} </strong>}{t.text}</li>)}
                </ul>
              </div>
            </Bubble>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">Delivery status: {status}</p>
    </section>
  );
}

function Bubble({ children, time, ticks }: { children: React.ReactNode; time: string; ticks: React.ReactNode }) {
  return (
    <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-tr-none bg-wa-bubble px-3 py-2 text-sm text-wa-bubble-foreground shadow-sm">
      <p className="mb-1 text-xs font-semibold text-wa-header">PediaCare Clinic</p>
      {children}
      <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-wa-meta">
        <span>{time}</span>
        {ticks}
      </div>
    </div>
  );
}
