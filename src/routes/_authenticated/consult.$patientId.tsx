import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Plus, Trash2, XOctagon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAge } from "@/lib/pediacare";
import { DRUGS, checkDose, getAllergyWarning, type SafetyResult } from "@/lib/doses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/consult/$patientId")({
  head: () => ({
    meta: [
      { title: "Consultation — PediaCare" },
      { name: "description", content: "Record symptoms, diagnosis and weight-based prescriptions." },
      { property: "og:title", content: "Consultation — PediaCare" },
      { property: "og:description", content: "Record symptoms, diagnosis and weight-based prescriptions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsultPage,
});

type Row = { key: string; drug: string; dose: string; freq: string; days: string };
const newRow = (): Row => ({ key: crypto.randomUUID(), drug: "", dose: "", freq: "", days: "5" });

function ConsultPage() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [attachFeverAdvisory, setAttachFeverAdvisory] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("patients").select("*").eq("id", patientId).maybeSingle();
      if (!active) return;
      if (error) setError(error.message);
      else if (!data) setError("Patient not found.");
      else {
        setPatient(data);
        const { data: c } = await supabase
          .from("consultations")
          .select("symptoms")
          .eq("patient_id", patientId)
          .order("consult_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (active && c?.symptoms) setSymptoms(c.symptoms);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  useEffect(() => {
    if (/fever/i.test(diagnosis)) setAttachFeverAdvisory(true);
  }, [diagnosis]);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const results = rows.map((r) =>
    patient ? checkDose(r.drug, r.dose === "" ? null : Number(r.dose), Number(patient.weight_kg)) : null,
  );
  const allergyWarnings = rows.map((row) => patient ? getAllergyWarning(row.drug, patient.allergies) : null);
  const hasDanger = results.some((r) => r?.level === "danger") || allergyWarnings.some(Boolean);

  async function save(): Promise<void> {
    if (!patient) return;
    const filled = rows.filter((r) => r.drug);
    if (!diagnosis.trim()) { toast.error("Please enter a diagnosis."); return; }
    if (filled.length === 0) { toast.error("Add at least one drug."); return; }
    if (filled.some((r) => !r.dose || !r.freq)) { toast.error("Each drug needs a dose and frequency."); return; }
    setSaving(true);
    const { data: consult, error: cErr } = await supabase
      .from("consultations")
      .insert({
        patient_id: patient.id,
        symptoms: symptoms || null,
        diagnosis,
        attach_fever_advisory: attachFeverAdvisory,
      })
      .select("id")
      .single();
    if (cErr || !consult) {
      setSaving(false);
      { toast.error(cErr?.message ?? "Could not save consultation."); return; }
    }
    const { error: pErr } = await supabase.from("prescriptions").insert(
      filled.map((r) => ({
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

        {loading ? (
          <p role="status" className="text-muted-foreground">Loading patient…</p>
        ) : error || !patient ? (
          <p role="alert" className="text-destructive">{error}</p>
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
            <Card className="order-2 md:order-1">
              <CardHeader><CardTitle>Clinical notes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea id="symptoms" rows={5} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis <span aria-hidden="true">*</span></Label>
                  <Textarea id="diagnosis" rows={5} required aria-required="true" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="order-1 md:order-2">
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
                    onCheckedChange={(checked) => setAttachFeverAdvisory(checked === true)}
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
                  </div>
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
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? "Saving…" : "Save & Generate Prescription"}
              </Button>
            </div>
          </form>
        )}
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
  const level = result?.level ?? "none";
  const Icon = level === "ok" ? CheckCircle2 : level === "warn" ? AlertTriangle : level === "danger" ? XOctagon : Info;

  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium text-foreground">Drug {n}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-drug`}>Drug</Label>
          <Select
            value={row.drug}
            onValueChange={(v) => {
              const d = DRUGS.find((x) => x.name === v);
              onChange({ drug: v, freq: row.freq || String(d?.defaultFreq ?? "") });
            }}
          >
            <SelectTrigger id={`${id}-drug`} aria-label={`Select drug ${n}`}>
              <SelectValue placeholder="Choose a drug" />
            </SelectTrigger>
            <SelectContent>
              {DRUGS.map((d) => (
                <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            aria-describedby={allergyWarning ? `${allergyId} ${flagId}` : flagId}
            aria-invalid={level === "danger" || level === "warn"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-freq`}>Times/day</Label>
          <Input id={`${id}-freq`} type="number" min={1} max={6} value={row.freq} onChange={(e) => onChange({ freq: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-days`}>Days</Label>
          <Input id={`${id}-days`} type="number" min={1} value={row.days} onChange={(e) => onChange({ days: e.target.value })} />
        </div>
        <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={!canRemove} onClick={onRemove} aria-label={`Remove drug ${n}`}>
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
    </fieldset>
  );
}
