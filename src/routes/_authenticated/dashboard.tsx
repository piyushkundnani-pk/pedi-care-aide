import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  Syringe,
  FileText,
  AlertTriangle,
  Database,
  Loader2,
  BellRing,
  Check,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ReminderPreviewDialog } from "@/components/ReminderPreviewDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  formatAge,
  formatToday,
  greeting,
  runOnboardingIfNeeded,
  todayBounds,
  mergeSampleData,
  resetDemoData,
  todayISO,
} from "@/lib/pediacare";
import { consultPatientQueryOptions } from "@/lib/patient-query";
import { doctorDisplayName } from "@/lib/doctor-name";
import { AddPatientDialog } from "@/components/AddPatientDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Doctor Dashboard — PediaCare" },
      {
        name: "description",
        content:
          "Today's appointments, vaccinations due and prescriptions written, at a glance.",
      },
      { property: "og:title", content: "Doctor Dashboard — PediaCare" },
      {
        property: "og:description",
        content:
          "Today's appointments, vaccinations due and prescriptions written, at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string;
  weight_kg: number;
  allergies: string[] | null;
};

async function fetchAppointments() {
  const today = todayISO();
  const { data, error } = await supabase
    .from("consultations")
    .select(
      "id, consult_date, patient_id, appointment_status, patients(id, full_name, date_of_birth, weight_kg, allergies)",
    )
    .eq("appointment_date", today)
    .order("consult_date", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      status: row.appointment_status,
      patient: row.patients as unknown as PatientRow | null,
    }))
    .filter((r) => r.patient !== null) as { id: string; status: string; patient: PatientRow }[];
}

async function fetchVaccinations() {
  const { data, error } = await supabase
    .from("vaccination_records")
    .select(
      "id, vaccine_name, scheduled_date, reminder_sent_at, patients(id, full_name, date_of_birth, weight_kg, allergies, parent_name)",
    )
    .eq("scheduled_date", todayISO())
    .eq("status", "scheduled")
    .order("vaccine_name", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      vaccine_name: row.vaccine_name,
      scheduled_date: row.scheduled_date,
      reminder_sent_at: row.reminder_sent_at,
      patient: row.patients as unknown as (PatientRow & { parent_name: string | null }) | null,
    }))
    .filter((r) => r.patient !== null) as {
    id: string;
    vaccine_name: string;
    scheduled_date: string;
    reminder_sent_at: string | null;
    patient: PatientRow & { parent_name: string | null };
  }[];
}

async function fetchPrescriptionCount() {
  const { start, end } = todayBounds();
  const { count, error } = await supabase
    .from("prescriptions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) throw error;
  return count ?? 0;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const doctorName = doctorDisplayName(user);

  const appointments = useQuery({
    queryKey: ["appointments", todayISO()],
    queryFn: fetchAppointments,
  });
  const vaccinations = useQuery({
    queryKey: ["vaccinations", todayISO()],
    queryFn: fetchVaccinations,
  });
  const prescriptions = useQuery({
    queryKey: ["prescription-count", todayISO()],
    queryFn: fetchPrescriptionCount,
  });

  useEffect(() => {
    const channel = supabase
      .channel("pediacare-dashboard")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        void queryClient.invalidateQueries();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const reset = useMutation({
    mutationFn: resetDemoData,
    onSuccess: (res) => {
      void queryClient.invalidateQueries();
      toast.success(`Demo data reset for ${res.email}. 5 patients loaded with today's schedule.`);
    },
    onError: () => toast.error("Could not reset the demo data. Please try again."),
  });

  const seed = useMutation({
    mutationFn: mergeSampleData,
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Seed data merged. Existing progress preserved.");
    },
    onError: () => toast.error("Could not load the sample data. Please try again."),
  });

  const autoSeeded = useRef(false);
  useEffect(() => {
    if (autoSeeded.current) return;
    autoSeeded.current = true;
    runOnboardingIfNeeded()
      .then((seeded) => {
        if (seeded) {
          void queryClient.invalidateQueries();
          toast.success("Welcome! 5 sample patients loaded for today.");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [reminderRow, setReminderRow] = useState<Awaited<ReturnType<typeof fetchVaccinations>>[number] | null>(null);
  const reminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vaccination_records")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vaccinations", todayISO()] });
      toast.success(`Reminder sent to ${reminderRow?.patient.parent_name ?? "the parent"}`);
      setReminderRow(null);
    },
    onError: () => toast.error("Could not send the reminder."),
  });

  const queue = (appointments.data ?? []).filter((a) => a.status !== "completed");
  const completed = (appointments.data ?? []).filter((a) => a.status === "completed");
  const [completedOpen, setCompletedOpen] = useState(true);

  const isEmpty =
    (appointments.data?.length ?? 0) === 0 && (vaccinations.data?.length ?? 0) === 0;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = seed.isPending || reset.isPending;

  const seedButton = (
    <Button
      onClick={() => seed.mutate()}
      disabled={busy}
      variant="outline"
      className="gap-2"
    >
      {seed.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Database className="size-4" aria-hidden="true" />
      )}
      {seed.isPending ? "Loading sample data…" : "Load Sample Data"}
    </Button>
  );

  const headerButtons = (
    <div className="flex flex-wrap gap-2">
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            disabled={busy}
            className="gap-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {reset.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="size-4" aria-hidden="true" />
            )}
            {reset.isPending ? "Resetting…" : "Reset Demo Data"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all patients, consultations, prescriptions, and vaccination
              records, then reload the 5 sample patients with fresh vaccination history.
              Reminders sent or vaccines marked administered during this session will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => reset.mutate()}
            >
              Yes, Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {seedButton}
      <AddPatientDialog disabled={busy} />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {greeting()}, {doctorName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatToday()}</p>
          </div>
          {headerButtons}
        </div>

        <section aria-label="Today at a glance" className="mt-6">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              icon={CalendarCheck}
              label="Appointments today"
              value={appointments.isLoading ? undefined : queue.length}
              loading={appointments.isLoading}
            />
            <Metric
              icon={Syringe}
              label="Vaccinations due today"
              value={vaccinations.data?.length}
              loading={vaccinations.isLoading}
            />
            <Metric
              icon={FileText}
              label="Prescriptions written today"
              value={prescriptions.data}
              loading={prescriptions.isLoading}
            />
          </ul>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Card title="Today's Appointments">
            {appointments.isLoading ? (
              <Skeleton rows={3} />
            ) : appointments.error ? (
              <ErrorNote />
            ) : queue.length === 0 ? (
              <EmptyState
                message="No appointments booked for today."
                hint={
                  isEmpty
                    ? "Load a few sample patients to see how a clinic day looks."
                    : undefined
                }
                action={isEmpty ? seedButton : undefined}
              />
            ) : (
              <ul role="list" className="divide-y divide-border">
                {queue.map(({ id, patient }) => (
                  <li
                    key={id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {patient.full_name}
                        {patient.allergies && patient.allergies.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                            <AlertTriangle className="size-3" aria-hidden="true" />
                            Allergy: {patient.allergies.join(", ")}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatAge(patient.date_of_birth)} · {patient.weight_kg} kg
                      </p>
                    </div>
                    <StartConsultLink patient={patient} queryClient={queryClient} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Vaccinations Due Today">
            {vaccinations.isLoading ? (
              <Skeleton rows={2} />
            ) : vaccinations.error ? (
              <ErrorNote />
            ) : vaccinations.data!.length === 0 ? (
              <EmptyState
                message="No vaccinations scheduled for today."
                hint={
                  isEmpty
                    ? "Sample data includes two immunisations due today."
                    : undefined
                }
              />
            ) : (
              <ul role="list" className="divide-y divide-border">
                {vaccinations.data!.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {row.patient.full_name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatAge(row.patient.date_of_birth)} · {row.vaccine_name}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-2"
                      disabled={reminder.isPending || Boolean(row.reminder_sent_at)}
                      onClick={() => setReminderRow(row)}
                      aria-label={`Send ${row.vaccine_name} reminder to ${row.patient.full_name}'s parent`}
                    >
                      {row.reminder_sent_at ? (
                        <>
                          <Check className="size-4" aria-hidden="true" />
                          Reminder sent{" "}
                          {new Date(row.reminder_sent_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </>
                      ) : (
                        <>
                          <BellRing className="size-4" aria-hidden="true" />
                          Send Reminder
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <ReminderPreviewDialog
              target={reminderRow ? { parentName: reminderRow.patient.parent_name, patientName: reminderRow.patient.full_name, vaccine: reminderRow.vaccine_name, scheduledDate: reminderRow.scheduled_date } : null}
              open={Boolean(reminderRow)}
              sending={reminder.isPending}
              onOpenChange={(o) => { if (!o && !reminder.isPending) setReminderRow(null); }}
              onConfirm={() => { if (reminderRow) reminder.mutate(reminderRow.id); }}
            />
          </Card>
        </div>

        {completed.length > 0 && (
          <Collapsible open={completedOpen} onOpenChange={setCompletedOpen} className="mt-6">
            <section aria-labelledby="completed-today" className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between rounded-md text-left"
                  aria-label={`${completedOpen ? "Collapse" : "Expand"} completed today (${completed.length})`}
                >
                  <h2 id="completed-today" className="text-base font-semibold text-card-foreground">
                    Completed Today ({completed.length})
                  </h2>
                  <ChevronDown className={`size-5 transition-transform ${completedOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul role="list" className="mt-2 divide-y divide-border">
                  {completed.map(({ id, patient }) => (
                    <li key={id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{patient.full_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatAge(patient.date_of_birth)} · {patient.weight_kg} kg
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link
                          to="/prescription/$consultId"
                          params={{ consultId: id }}
                          aria-label={`View prescription for ${patient.full_name}`}
                        >
                          View Prescription
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </section>
          </Collapsible>
        )}
      </main>
    </div>
  );
}

function StartConsultLink({ patient, queryClient }: { patient: PatientRow; queryClient: ReturnType<typeof useQueryClient> }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePrefetch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void queryClient.prefetchQuery(consultPatientQueryOptions(patient.id));
      timerRef.current = null;
    }, 200);
  };

  const cancelPrefetch = () => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => cancelPrefetch, []);

  return (
    <Button asChild size="sm" className="shrink-0">
      <Link
        to="/consult/$patientId"
        params={{ patientId: patient.id }}
        onMouseEnter={schedulePrefetch}
        onMouseLeave={cancelPrefetch}
        onFocus={schedulePrefetch}
        onBlur={cancelPrefetch}
        onClick={() => {
          cancelPrefetch();
          const w = window as unknown as { __consultTimer?: boolean };
          if (w.__consultTimer) console.timeEnd("dashboard-to-consult");
          console.time("dashboard-to-consult");
          w.__consultTimer = true;
        }}
        aria-label={`Start consultation for ${patient.full_name}`}
      >
        Start Consult
      </Link>
    </Button>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-card-foreground" aria-live="polite">
            {loading ? "—" : (value ?? 0)}
          </p>
        </div>
      </div>
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`card-${title.replace(/\W+/g, "-").toLowerCase()}`}
      className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2
        id={`card-${title.replace(/\W+/g, "-").toLowerCase()}`}
        className="text-base font-semibold text-card-foreground"
      >
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 py-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function ErrorNote() {
  return (
    <p role="alert" className="py-6 text-sm text-destructive">
      We couldn't load this list. Please refresh the page.
    </p>
  );
}

function EmptyState({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: string | undefined;
  action?: React.ReactNode | undefined;
}) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
