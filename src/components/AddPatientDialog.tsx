import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { registerPatient, todayISO } from "@/lib/pediacare";

type Field = "name" | "dob" | "weight" | "gender" | "parent" | "phone";
const EMPTY = { name: "", dob: "", weight: "", gender: "", parent: "", phone: "", allergies: "" };

function validate(f: typeof EMPTY): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const name = f.name.trim();
  if (!name) e.name = "Full name is required.";
  else if (name.length < 2) e.name = "Full name must be at least 2 characters.";
  else if (name.length > 100) e.name = "Full name must be under 100 characters.";
  if (!f.dob) e.dob = "Date of birth is required.";
  else if (f.dob >= todayISO()) e.dob = "Date of birth must be in the past.";
  const w = Number(f.weight);
  if (!f.weight) e.weight = "Weight is required.";
  else if (!Number.isFinite(w) || w < 0.5 || w > 80) e.weight = "Weight must be 0.5–80 kg.";
  if (!f.gender) e.gender = "Select a gender.";
  if (!f.parent.trim()) e.parent = "Parent name is required.";
  else if (f.parent.trim().length > 100) e.parent = "Parent name must be under 100 characters.";
  if (!f.phone.trim()) e.phone = "Parent phone is required.";
  else if (!/^\+91\d{10}$/.test(f.phone.trim())) e.phone = "Phone must be +91 followed by 10 digits, e.g. +919820011223.";
  return e;
}

export function AddPatientDialog({ disabled }: { disabled?: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const errors = validate(form);
  const valid = Object.keys(errors).length === 0;

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: Field) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: Field) => (touched[k] ? errors[k] : undefined);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setForm(EMPTY);
      setTouched({});
    }
  }

  const register = useMutation({
    mutationFn: () =>
      registerPatient({
        full_name: form.name.trim(),
        date_of_birth: form.dob,
        weight_kg: Number(form.weight),
        gender: form.gender as "M" | "F",
        parent_name: form.parent.trim(),
        parent_phone: form.phone.trim(),
        allergies: form.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
          .slice(0, 20),
      }),
    onSuccess: () => {
      toast.success(`Patient ${form.name.trim()} registered. Added to Today's Appointments.`);
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not register patient."),
  });

  const fieldProps = (k: Field) => ({
    "aria-invalid": !!err(k),
    "aria-describedby": err(k) ? `ap-${k}-err` : undefined,
    className: cn(err(k) && "border-destructive focus-visible:ring-destructive"),
  });
  const ErrorText = ({ k }: { k: Field }) =>
    err(k) ? (
      <p id={`ap-${k}-err`} className="text-sm text-destructive">
        {err(k)}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="gap-2">
          <UserPlus className="size-4" aria-hidden="true" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-full flex-col overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
          <DialogDescription>Fields marked * are required.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !register.isPending) register.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ap-name">Full Name *</Label>
            <Input id="ap-name" value={form.name} maxLength={100} required autoComplete="off"
              onChange={(e) => set("name")(e.target.value)} onBlur={touch("name")} {...fieldProps("name")} />
            <ErrorText k="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-dob">Date of Birth *</Label>
            <Input id="ap-dob" type="date" value={form.dob} max={todayISO()} required
              onChange={(e) => set("dob")(e.target.value)} onBlur={touch("dob")} {...fieldProps("dob")} />
            <ErrorText k="dob" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-weight">Weight (kg) *</Label>
            <Input id="ap-weight" type="number" inputMode="decimal" step={0.1} min={0.5} max={80} value={form.weight} required
              onChange={(e) => set("weight")(e.target.value)} onBlur={touch("weight")} {...fieldProps("weight")} />
            <ErrorText k="weight" />
          </div>
          <fieldset className="space-y-1.5" aria-describedby={err("gender") ? "ap-gender-err" : undefined}>
            <legend className="text-sm font-medium">Gender *</legend>
            <RadioGroup value={form.gender} onValueChange={(v) => { set("gender")(v); touch("gender")(); }}
              onBlur={touch("gender")} className="flex gap-6" aria-invalid={!!err("gender")}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="M" id="ap-g-m" />
                <Label htmlFor="ap-g-m">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="F" id="ap-g-f" />
                <Label htmlFor="ap-g-f">Female</Label>
              </div>
            </RadioGroup>
            <ErrorText k="gender" />
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="ap-parent">Parent Name *</Label>
            <Input id="ap-parent" value={form.parent} maxLength={100} required
              onChange={(e) => set("parent")(e.target.value)} onBlur={touch("parent")} {...fieldProps("parent")} />
            <ErrorText k="parent" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-phone">Parent Phone *</Label>
            <Input id="ap-phone" type="tel" inputMode="tel" placeholder="+919820011223" value={form.phone} maxLength={13} required
              onChange={(e) => set("phone")(e.target.value.replace(/\s/g, ""))} onBlur={touch("phone")} {...fieldProps("phone")} />
            <ErrorText k="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-allergies">Allergies</Label>
            <Input id="ap-allergies" value={form.allergies} maxLength={300} placeholder="Penicillin, Peanuts"
              aria-describedby="ap-allergies-help" onChange={(e) => set("allergies")(e.target.value)} />
            <p id="ap-allergies-help" className="text-sm text-muted-foreground">Optional. Separate with commas.</p>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!valid || register.isPending} className="gap-2">
              {register.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Register Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
