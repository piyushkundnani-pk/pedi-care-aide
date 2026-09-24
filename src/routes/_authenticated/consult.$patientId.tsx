import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Plus, Trash2, XOctagon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAge } from "@/lib/pediacare";
import { DRUGS, DOSE_RULES_VERSION, checkDose, drugLabel, getAllergyWarning, type SafetyResult } from "@/lib/doses";
import { todayISO } from "@/lib/pediacare";
import { cn } from "@/lib/utils";
import { consultPatientQueryOptions } from "@/lib/patient-query";
import { buildAdvisory, type AdvisoryPatient } from "@/lib/advisory";

export const Route = createFileRoute("/_authenticated/consult/$patientId")({
  head: () => ({
    meta: [
      { title: "Consultation — PediaCare" },
      { name: "description", content: "Record symptoms, diagnosis and weight-based prescriptions." },
      { property: "og:title", content: "Consultation — PediaCare" },
      { property: "og:description", content: "Record symptoms, diagnosis and weight-based prescriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsultPage,
});

type Row = { key: string; drug: string; dose: string; freq: string; days: string; freqErr?: boolean; daysErr?: boolean };

/** Clamps a typed integer into [1, max]; reports whether the typed value was out of range. */
function clampInput(raw: string, max: number): { value: string; error: boolean } {
  if (raw === "") return { value: "", error: false };
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return { value: "", error: true };
  if (n > max) return { value: String(max), error: true };
  if (n < 1) return { value: "1", error: true };
  return { value: String(n), error: false };
}
const newRow = (): Row => ({ key: crypto.randomUUID(), drug: "", dose: "", freq: "", days: "5" });

function ConsultPage() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const patientQuery = useQuery(consultPatientQueryOptions(patientId));
  const patient = patientQuery.data?.patient ?? null;
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [feverOverride, setFeverOverride] = useState<boolean | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const attachFeverAdvisory = feverOverride ?? /fever/i.test(diagnosis);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const w = window as unknown as { __consultTimer?: boolean };
    if (w.__consultTimer) {
      console.timeEnd("dashboard-to-consult");
      w.__consultTimer = false;
    }
  }, []);

  useEffect(() => {
    if (patientQuery.data?.symptoms) setSymptoms(patientQuery.data.symptoms);
  }, [patientQuery.data?.symptoms]);

  const maxDays = Math.max(0, ...rows.map((r) => Number(r.days) || 0));
  const followUp = new Date();
  followUp.setDate(followUp.getDate() + maxDays);
  const followUpText = followUp.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const results = rows.map((r) =>
    patient ? checkDose(r.drug, r.dose === "" ? null : Number(r.dose), Number(patient.weight_kg)) : null,
  );
  const allergyWarnings = rows.map((row) => patient ? getAllergyWarning(row.drug, patient.allergies) : null);
  const hasDanger = results.some((r) => r?.level === "danger") || allergyWarnings.some(Boolean);

  const hasValidationErrors = rows.some((r) => r.freqErr || r.daysErr);

  async function save(): Promise<void> {
    if (hasValidationErrors) { toast.error("Fix validation errors before saving."); return; }
    if (!patient) return;
    const filled = rows.filter((r) => r.drug);
    if (!diagnosis.trim()) { toast.error("Please enter a diagnosis."); return; }
    if (filled.length === 0) { toast.error("Add at least one drug."); return; }
    if (filled.some((r) => !r.dose || !r.freq)) { toast.error("Each drug needs a dose and frequency."); return; }
    if (filled.some((r) => Number(r.freq) < 1 || Number(r.freq) > 4)) { toast.error("Times per day must be between 1 and 4."); return; }
    if (filled.some((r) => !r.days || Number(r.days) < 1 || Number(r.days) > 14)) { toast.error("Prescription days must be between 1 and 14."); return; }
    setSaving(true);
    const today = todayISO();
    const fields = {
      symptoms: symptoms || null,
      diagnosis,
      attach_fever_advisory: attachFeverAdvisory,
      appointment_status: "completed",
    };
    const { data: appt } = await supabase
      .from("consultations")
      .select("id")
      .eq("patient_id", patient.id)
      .in("appointment_status", ["scheduled", "in-progress"])
      .gte("consult_date", `${today}T00:00:00`)
      .lte("consult_date", `${today}T23:59:59`)
      .order("consult_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) { setSaving(false); toast.error("You must be signed in."); return; }
    const { data: consult, error: cErr } = appt
      ? await supabase.from("consultations").update(fields).eq("id", appt.id).select("id").single()
      : await supabase.from("consultations").insert({ user_id: userId, patient_id: patient.id, ...fields }).select("id").single();
    if (cErr || !consult) {
      setSaving(false);
      { toast.error(cErr?.message ?? "Could not save consultation."); return; }
    }
    const { error: pErr } = await supabase.from("prescriptions").insert(
      filled.map((r) => ({
        user_id: userId,
        consultation_id: consult.id,
        drug_name: r.drug,
        dosage_mg: Number(r.dose),
        frequency_per_day: Number(r.freq),
        duration_days: r.days ? Number(r.days) : null,
      })),
    );
    setSaving(false);
    if (pErr) { toast.error(pErr.message); return; }
    toast.success("Consultation and prescription saved.");
    navigate({ to: "/prescription/$consultId", params: { consultId: consult.id } });
    return;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" className="mb-4 gap-2 px-2">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>

        {patientQuery.isPending ? (
          <div role="status" aria-label="Loading consultation" className="animate-pulse space-y-6">
            <Skeleton className="h-[120px] w-full rounded-lg" />
            <div className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Skeleton className="h-[360px] rounded-lg" aria-label="Loading drug entry form" />
              <div className="space-y-5 rounded-lg border border-border bg-card p-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-28 w-full rounded-md" aria-label="Loading symptoms field" />
                <Skeleton className="h-28 w-full rounded-md" aria-label="Loading diagnosis field" />
              </div>
            </div>
            <span className="sr-only">Loading patient…</span>
          </div>
        ) : patientQuery.error || !patient ? (
          <p role="alert" className="text-destructive">{patientQuery.error?.message ?? "Patient not found."}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-6"
            aria-labelledby="consult-title"
          >
            <Card>
              <CardHeader>
                <CardTitle id="consult-title" className="text-2xl">{patient.full_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <Info2 label="Age" value={formatAge(patient.date_of_birth)} />
                  <Info2 label="Weight" value={`${patient.weight_kg} kg`} />
                  <Info2 label="Gender" value={patient.gender === "F" ? "Female" : patient.gender === "M" ? "Male" : "—"} />
                  <Info2 label="Parent" value={patient.parent_name ?? "—"} />
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Allergies:</span>
                  {patient.allergies.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None known</span>
                  ) : (
                    patient.allergies.map((a) => (
                      <Badge key={a} variant="destructive">{a}</Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card className="md:col-span-1">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Prescription</CardTitle>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setRows((r) => [...r, newRow()])}>
                  <Plus className="size-4" aria-hidden="true" /> Add drug
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {rows.map((r, i) => (
                  <DrugRow
                    key={r.key}
                    index={i}
                    row={r}
                    result={results[i] ?? null}
                    allergyWarning={allergyWarnings[i] ?? null}
                    canRemove={rows.length > 1}
                    onChange={(p) => update(r.key, p)}
                    onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  />
                ))}
                <div className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <Checkbox
                    id="attach-fever-advisory"
                    checked={attachFeverAdvisory}
                    onCheckedChange={(checked) => setFeverOverride(checked === true)}
                    aria-describedby="fever-advisory-description"
                    className="size-5"
                  />
                  <div>
                    <Label htmlFor="attach-fever-advisory" className="cursor-pointer leading-5">
                      Attach vernacular fever advisory to WhatsApp message
                    </Label>
                    <p id="fever-advisory-description" className="text-xs text-muted-foreground">
                      Automatically selected when the diagnosis mentions fever.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="mt-1 min-h-6 text-sm font-medium text-primary underline underline-offset-2"
                    >
                      Preview advisory sheet
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-1">
              <CardHeader><CardTitle>Clinical notes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea id="symptoms" rows={5} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis <span aria-hidden="true">*</span></Label>
                  <Textarea id="diagnosis" rows={5} required aria-required="true" value={diagnosis} onChange={(e) => { setDiagnosis(e.target.value); setFeverOverride(null); }} />
                </div>
              </CardContent>
            </Card>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              {hasDanger && (
                <p className="text-sm text-destructive" role="status">
                  Safety flags present — review before saving.
                </p>
              )}
              <span title={hasValidationErrors ? "Fix validation errors before saving." : undefined} className="inline-flex">
                <Button type="submit" size="lg" disabled={saving || hasValidationErrors} aria-describedby={hasValidationErrors ? "save-blocked" : undefined}>
                  {saving ? "Saving…" : "Save & Generate Prescription"}
                </Button>
              </span>
              {hasValidationErrors && <span id="save-blocked" className="sr-only">Fix validation errors before saving.</span>}
            </div>
          </form>
        )}
        <AdvisoryDialog open={previewOpen} onOpenChange={setPreviewOpen} followUp={followUpText} patient={patient} />
      </main>
    </div>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DrugRow({
  index, row, result, allergyWarning, canRemove, onChange, onRemove,
}: {
  index: number; row: Row; result: SafetyResult | null; allergyWarning: string | null; canRemove: boolean;
  onChange: (p: Partial<Row>) => void; onRemove: () => void;
}) {
  const id = useId();
  const flagId = `${id}-flag`;
  const allergyId = `${id}-allergy`;
  const n = index + 1;
  const normalizedDrug = row.drug.trim().toLocaleLowerCase();
  const inFormulary = !row.drug || DRUGS.some((d) => d.name.toLocaleLowerCase() === normalizedDrug);
  const level = result?.level ?? "none";
  const doseHelpId = `${id}-dose-help`;
  const frequencyHelpId = `${id}-frequency-help`;
  const daysHelpId = `${id}-days-help`;
  const doseHelp = row.drug === "Amoxicillin"
    ? "Enter dose per single administration — daily total will be computed"
    : ["Paracetamol", "Ibuprofen", "Azithromycin", "Cetirizine"].includes(row.drug)
      ? "Enter dose per single administration"
      : null;
  const Icon = level === "ok" ? CheckCircle2 : level === "warn" ? AlertTriangle : level === "danger" ? XOctagon : Info;

  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium text-foreground">Drug {n}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-drug`}>Drug</Label>
          <DrugCombobox
            id={`${id}-drug`}
            n={n}
            value={row.drug}
            onChange={(v) => {
              const d = DRUGS.find((x) => x.name.toLocaleLowerCase() === v.trim().toLocaleLowerCase());
              onChange({ drug: v, freq: row.freq || (d ? String(d.defaultFreq) : "") });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-dose`}>Dose (mg)</Label>
          <Input
            id={`${id}-dose`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={row.dose}
            onChange={(e) => onChange({ dose: e.target.value })}
            aria-label={`Dose in milligrams for drug ${n}`}
            aria-describedby={[doseHelp ? doseHelpId : null, allergyWarning ? allergyId : null, flagId].filter(Boolean).join(" ")}
            aria-invalid={level === "danger" || level === "warn"}
          />
          {doseHelp && <p id={doseHelpId} className="text-xs italic text-muted-foreground">{doseHelp}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-freq`}>Times/day</Label>
          <Input id={`${id}-freq`} type="number" inputMode="numeric" min={1} max={4} value={row.freq}
            onChange={(e) => { const c = clampInput(e.target.value, 4); onChange({ freq: c.value, freqErr: c.error }); }}
            aria-invalid={row.freqErr || undefined}
            aria-describedby={row.freqErr ? `${id}-freq-err ${frequencyHelpId}` : frequencyHelpId}
            className={cn(row.freqErr && "border-destructive ring-1 ring-destructive animate-[pulse_0.4s_ease-in-out_2]")} />
          {row.freqErr && <p id={`${id}-freq-err`} role="alert" className="text-xs font-medium text-destructive">Times/day must be 1-4.</p>}
          <p id={frequencyHelpId} className="text-xs text-muted-foreground">1–4 doses per day (max realistic pediatric frequency)</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-days`}>Days</Label>
          <Input id={`${id}-days`} type="number" inputMode="numeric" min={1} max={14} value={row.days}
            onChange={(e) => { const c = clampInput(e.target.value, 14); onChange({ days: c.value, daysErr: c.error }); }}
            aria-invalid={row.daysErr || undefined}
            aria-describedby={row.daysErr ? `${id}-days-err ${daysHelpId}` : daysHelpId}
            className={cn(row.daysErr && "border-destructive ring-1 ring-destructive animate-[pulse_0.4s_ease-in-out_2]")} />
          {row.daysErr && <p id={`${id}-days-err`} role="alert" className="text-xs font-medium text-destructive">Days must be 1-14.</p>}
          <p id={daysHelpId} className="text-xs text-muted-foreground">Standard OPD prescription: 3–7 days. Longer courses (up to 14 days) for specific antibiotics.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11 justify-self-end sm:col-span-2" disabled={!canRemove} onClick={onRemove} aria-label={`Remove drug ${n}`}>
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {allergyWarning && (
        <div
          id={allergyId}
          role="alert"
          aria-label={`Allergy warning for drug ${n}`}
          className="mt-3 flex items-start gap-2 rounded-md border border-safety-danger bg-safety-danger-bg px-3 py-2 text-sm font-semibold text-safety-danger"
        >
          <XOctagon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{allergyWarning}</span>
        </div>
      )}
      {!inFormulary ? (
        <div
          id={flagId}
          role="status"
          aria-live="polite"
          aria-label={`Dose safety check for drug ${n}`}
          className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Drug not in verified formulary. Dose safety check unavailable — please verify manually against IAP guidelines.</span>
        </div>
      ) : (
      <div
        id={flagId}
        role="status"
        aria-live="polite"
        aria-label={`Dose safety check for drug ${n}`}
        className={cn(
          "mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
          level === "ok" && "border-safety-success bg-safety-success-bg font-medium text-safety-success",
          level === "warn" && "border-safety-warning bg-safety-warning-bg font-medium text-safety-warning",
          level === "danger" && "border-safety-danger bg-safety-danger-bg font-semibold text-safety-danger",
          level === "none" && "border-border bg-muted/50 text-muted-foreground",
        )}
      >
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="sr-only">{level === "ok" ? "Safe: " : level === "warn" ? "Warning: " : level === "danger" ? "Danger: " : ""}</span>
          {result?.message ?? "Select a drug to check dose."}
        </span>
      </div>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">Rules: {DOSE_RULES_VERSION}</p>
    </fieldset>
  );
}

function DrugCombobox({ id, n, value, onChange }: { id: string; n: number; value: string; onChange: (v: string) => void }) {
  const known = DRUGS.find((d) => d.name === value);
  const [text, setText] = useState(known ? drugLabel(known) : value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `${id}-list`;
  const q = text.trim().toLowerCase();
  const options = DRUGS.filter((d) => !q || drugLabel(d).toLowerCase().includes(q));

  const commit = (v: string) => {
    const match = DRUGS.find((d) => d.name.toLowerCase() === v.trim().toLowerCase() || drugLabel(d).toLowerCase() === v.trim().toLowerCase());
    if (match) { setText(drugLabel(match)); onChange(match.name); }
    else onChange(v.trim());
  };
  const pick = (i: number) => {
    const d = options[i];
    if (!d) return;
    setText(drugLabel(d));
    onChange(d.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-label={`Drug ${n}: search or type a drug name`}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search generic or brand…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); commit(text); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") {
            e.preventDefault();
            if (open && options[active]) pick(active); else { commit(text); setOpen(false); }
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && options.length > 0 && (
        <ul id={listId} role="listbox" aria-label={`Drug options for drug ${n}`} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm text-popover-foreground shadow-md">
          {options.map((d, i) => (
            <li
              key={d.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(i); }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-3 py-2", i === active && "bg-accent text-accent-foreground")}
            >
              {drugLabel(d)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdvisoryDialog({ open, onOpenChange, followUp, patient }: { open: boolean; onOpenChange: (o: boolean) => void; followUp: string; patient: AdvisoryPatient }) {
  // Age is computed when the dialog renders (i.e. when the preview is opened).
  const { enHeader, hiHeader, banner, en, hi } = buildAdvisory(patient, followUp);
  const bannerClass = banner?.tone === "danger"
    ? "border-destructive bg-destructive/10 text-destructive"
    : "border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fever advisory sheet</DialogTitle>
          <DialogDescription>This is sent to the parent on WhatsApp with the prescription.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="hi">
          <TabsList aria-label="Advisory language">
            <TabsTrigger value="hi">Hindi</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>
          <TabsContent value="hi" lang="hi" className="font-devanagari">
            {hiHeader && <p className="mt-2 text-sm font-medium text-muted-foreground">{hiHeader}</p>}
            <h3 className="mt-2 font-semibold text-foreground">आपके बच्चे के बुखार की देखभाल</h3>
            {banner && <p role="note" className={cn("mt-2 rounded-md border-l-4 p-3 text-sm font-medium", bannerClass)}>{banner.hi}</p>}
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-foreground">{hi.map((t, i) => <li key={i}>{t.lead && <strong>{t.lead} </strong>}{t.text}</li>)}</ul>
          </TabsContent>
          <TabsContent value="en" lang="en">
            {enHeader && <p className="mt-2 text-sm font-medium text-muted-foreground">{enHeader}</p>}
            <h3 className="mt-2 font-semibold text-foreground">Fever Care for Your Child</h3>
            {banner && <p role="note" className={cn("mt-2 rounded-md border-l-4 p-3 text-sm font-medium", bannerClass)}>{banner.en}</p>}
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-foreground">{en.map((t, i) => <li key={i}>{t.lead && <strong>{t.lead} </strong>}{t.text}</li>)}</ul>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
