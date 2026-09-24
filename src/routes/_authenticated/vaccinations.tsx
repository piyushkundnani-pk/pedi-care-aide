import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, BellRing, Check, ChevronDown, Clock, Syringe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ReminderPreviewDialog } from "@/components/ReminderPreviewDialog";
import { Button } from "@/components/ui/button";
import { formatAge, todayISO } from "@/lib/pediacare";
import {
  IAP_SCHEDULE_VERSION,
  ageInMonths,
  buildSchedule,
  type ScheduleItem,
  type VaxRecord,
  type VaxStatus,
} from "@/lib/iap-schedule";

export const Route = createFileRoute("/_authenticated/vaccinations")({
  head: () => ({
    meta: [
      { title: "Vaccination Schedule — PediaCare" },
      { name: "description", content: "IAP 2025 immunisation schedule tracker with overdue alerts and reminders." },
      { property: "og:title", content: "Vaccination Schedule — PediaCare" },
      { property: "og:description", content: "IAP 2025 immunisation schedule tracker with overdue alerts and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VaccinationsPage,
});

type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string;
  weight_kg: number;
  parent_name: string | null;
};

type ReminderTarget = { patient: Patient; item: ScheduleItem };

async function fetchData() {
  const [p, r] = await Promise.all([
    supabase.from("patients").select("id, full_name, date_of_birth, weight_kg, parent_name").order("full_name"),
    supabase.from("vaccination_records").select("id, patient_id, vaccine_name, administered_date, reminder_sent_at"),
  ]);
  if (p.error) throw p.error;
  if (r.error) throw r.error;
  return { patients: (p.data ?? []) as Patient[], records: (r.data ?? []) as VaxRecord[] };
}

const QK = ["vaccination-schedule"];

function VaccinationsPage() {
  const qc = useQueryClient();
  const today = todayISO();
  const q = useQuery({ queryKey: QK, queryFn: fetchData });
  const [reminderTarget, setReminderTarget] = useState<ReminderTarget | null>(null);
  const [announcement, setAnnouncement] = useState("");

  async function upsert(patient: Patient, item: ScheduleItem, fields: { reminder_sent_at?: string; administered_date?: string; status?: string }) {
    if (item.record) {
      const { error } = await supabase.from("vaccination_records").update(fields).eq("id", item.record.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("vaccination_records").insert({
        patient_id: patient.id,
        vaccine_name: item.vaccine,
        scheduled_date: item.scheduledDate,
        status: item.status === "overdue" ? "overdue" : "scheduled",
        ...fields,
      });
      if (error) throw error;
    }
  }

  const remind = useMutation({
    mutationFn: ({ patient, item }: { patient: Patient; item: ScheduleItem }) =>
      upsert(patient, item, { reminder_sent_at: new Date().toISOString() }),
    onSuccess: async (_d, { patient }) => {
      const message = `Reminder sent to ${patient.parent_name ?? "parent"}`;
      toast.success(message);
      setAnnouncement(message);
      setReminderTarget(null);
      await qc.invalidateQueries({ queryKey: QK });
    },
    onError: () => {
      const message = "Could not send the reminder.";
      toast.error(message);
      setAnnouncement(message);
    },
  });

  const administer = useMutation({
    mutationFn: ({ patient, item }: { patient: Patient; item: ScheduleItem }) =>
      upsert(patient, item, { administered_date: today, status: "administered" }),
    onSuccess: (_d, { patient, item }) => {
      toast.success(`${item.vaccine} marked as administered for ${patient.full_name}`);
      void qc.invalidateQueries({ queryKey: QK });
    },
    onError: () => toast.error("Could not update the record."),
  });

  const rows = (q.data?.patients ?? []).map((patient) => ({
    patient,
    months: ageInMonths(patient.date_of_birth, today),
    schedule: buildSchedule(
      patient.date_of_birth,
      today,
      (q.data?.records ?? []).filter((r) => r.patient_id === patient.id),
    ),
  }));
  const attention = rows
    .map((r) => ({ ...r, due: r.schedule.filter((s) => s.status === "overdue" || s.status === "due-soon") }))
    .filter((r) => r.due.length > 0);

  const actions = (patient: Patient, item: ScheduleItem, withAdminister: boolean) => (
    <div className="flex flex-wrap gap-2">
      {withAdminister && (
        <Button
          size="sm"
          onClick={() => administer.mutate({ patient, item })}
          disabled={administer.isPending}
          aria-label={`Mark ${item.vaccine} as administered for ${patient.full_name}`}
        >
          Mark as Administered
        </Button>
      )}
      <ReminderButton
        item={item}
        pending={remind.isPending}
        onClick={() => setReminderTarget({ patient, item })}
        label={withAdminister ? "Send Reminder" : "Send WhatsApp Reminder"}
        patientName={patient.full_name}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Vaccination Schedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          IAP-compliant schedule computed from each child's date of birth.
        </p>

        {q.isLoading ? (
          <div className="mt-6 space-y-3" role="status" aria-label="Loading schedule">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : q.error ? (
          <p role="alert" className="mt-6 text-sm text-destructive">
            We couldn't load the schedule. Please refresh the page.
          </p>
        ) : (
          <>
            <section aria-labelledby="attention" className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 id="attention" className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <AlertTriangle className="size-4 text-safety-danger" aria-hidden="true" />
                Attention Required ({attention.length})
              </h2>
              {attention.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No overdue or upcoming vaccinations in the next 30 days.
                </p>
              ) : (
                <ul role="list" className="mt-2 divide-y divide-border">
                  {attention.map(({ patient, due }) => (
                    <li key={patient.id} className="py-4">
                      <p className="font-medium text-foreground">{patient.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatAge(patient.date_of_birth)} · {patient.weight_kg} kg
                      </p>
                      <ul role="list" className="mt-3 space-y-2">
                        {due.map((item) => (
                          <li
                            key={item.vaccine}
                            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{item.vaccine}</span>
                              <StatusBadge status={item.status} />
                              <span className="text-sm text-muted-foreground">{diffText(item)}</span>
                            </div>
                            {actions(patient, item, false)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="all-patients" className="mt-8">
              <h2 id="all-patients" className="text-base font-semibold text-foreground">
                All Patients Schedule View
              </h2>
              {rows.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No patients yet. Load sample data from the dashboard.
                </p>
              ) : (
                <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
                  {rows.map(({ patient, schedule, months }) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      months={months}
                      schedule={schedule}
                      actions={actions}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-3 py-1">Schedule: {IAP_SCHEDULE_VERSION}</span>
        </p>
        <ReminderPreviewDialog
          target={reminderTarget ? { parentName: reminderTarget.patient.parent_name, patientName: reminderTarget.patient.full_name, vaccine: reminderTarget.item.vaccine, scheduledDate: reminderTarget.item.scheduledDate } : null}
          open={Boolean(reminderTarget)}
          sending={remind.isPending}
          onOpenChange={(open) => { if (!open && !remind.isPending) setReminderTarget(null); }}
          onConfirm={() => { if (reminderTarget) remind.mutate(reminderTarget); }}
        />
      </main>
    </div>
  );
}

function diffText(item: ScheduleItem) {
  const n = Math.abs(item.daysDiff);
  if (item.status === "overdue") return `${n} day${n === 1 ? "" : "s"} overdue`;
  if (item.daysDiff === 0) return "Due today";
  return `Due in ${n} day${n === 1 ? "" : "s"}`;
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function StatusBadge({ status }: { status: VaxStatus }) {
  const map = {
    administered: { cls: "bg-safety-success-bg text-safety-success", label: "Administered", Icon: Check },
    overdue: { cls: "bg-safety-danger-bg text-safety-danger", label: "Overdue", Icon: AlertTriangle },
    "due-soon": { cls: "bg-safety-warning-bg text-safety-warning", label: "Due Soon", Icon: Clock },
    upcoming: { cls: "bg-muted text-muted-foreground", label: "Upcoming", Icon: Syringe },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${map.cls}`}>
      <map.Icon className="size-3" aria-hidden="true" />
      {map.label}
    </span>
  );
}

function ReminderButton({
  item,
  pending,
  onClick,
  label,
  patientName,
}: {
  item: ScheduleItem;
  pending: boolean;
  onClick: () => void;
  label: string;
  patientName: string;
}) {
  const sent = item.record?.reminder_sent_at;
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2"
      disabled={pending || Boolean(sent)}
      onClick={onClick}
      aria-label={
        sent ? `Reminder already sent for ${item.vaccine}` : `Send ${item.vaccine} reminder to ${patientName}'s parent`
      }
    >
      {sent ? (
        <>
          <Check className="size-4" aria-hidden="true" />
          Reminder sent{" "}
          {new Date(sent).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
        </>
      ) : (
        <>
          <BellRing className="size-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}

function PatientCard({
  patient,
  months,
  schedule,
  actions,
}: {
  patient: Patient;
  months: number;
  schedule: ScheduleItem[];
  actions: (p: Patient, i: ScheduleItem, admin: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const count = (s: VaxStatus[]) => schedule.filter((i) => s.includes(i.status)).length;
  const panelId = `schedule-${patient.id}`;
  return (
    <article className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left"
      >
        <div>
          <h3 className="font-semibold text-card-foreground">{patient.full_name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatAge(patient.date_of_birth)} ({months} months)
          </p>
          <p className="mt-1 text-sm text-foreground">
            {count(["administered"])} administered · {count(["overdue", "due-soon"])} due ·{" "}
            {count(["upcoming"])} upcoming
          </p>
        </div>
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">IAP schedule for {patient.full_name}</caption>
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2">Age Milestone</th>
                <th scope="col" className="px-4 py-2">Vaccine</th>
                <th scope="col" className="px-4 py-2">Scheduled Date</th>
                <th scope="col" className="px-4 py-2">Status</th>
                <th scope="col" className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedule.map((item) => (
                <tr key={item.vaccine}>
                  <td className="px-4 py-2 text-muted-foreground">{item.milestone}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{item.vaccine}</td>
                  <td className="px-4 py-2 text-foreground">{fmtDate(item.scheduledDate)}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">
                        {item.status === "administered" && item.record?.administered_date
                          ? `Given ${fmtDate(item.record.administered_date)}`
                          : item.status === "upcoming"
                            ? `On ${fmtDate(item.scheduledDate)}`
                            : diffText(item)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {item.status === "overdue" || item.status === "due-soon" ? actions(patient, item, true) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
