import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, ShieldCheck, Syringe, MessageSquare } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PediaCare — AI-native pediatric OPD software" },
      {
        name: "description",
        content:
          "PediaCare helps solo pediatricians run a faster OPD: consultations, IAP-checked dosing, WhatsApp prescriptions and vaccination tracking.",
      },
      { property: "og:title", content: "PediaCare — AI-native pediatric OPD software" },
      {
        property: "og:description",
        content:
          "Consultations, real-time dose safety checks, WhatsApp prescriptions and vaccination reminders for solo pediatricians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Stethoscope,
    title: "Faster consultations",
    body: "Patient age, weight and allergies on screen before the child sits down.",
  },
  {
    icon: ShieldCheck,
    title: "Real-time dose safety",
    body: "Every dose checked against IAP-published mg/kg ranges as you type.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp prescriptions",
    body: "Send a clean prescription to the parent's phone and see when it is read.",
  },
  {
    icon: Syringe,
    title: "Vaccination tracking",
    body: "Due and overdue immunisations surfaced daily, with parent reminders.",
  },
];

function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void router.navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void router.navigate({ to: "/dashboard" });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("We couldn't sign you in. Please try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    await router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Stethoscope className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PediaCare
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Pediatric OPD software
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Run a 40-patient OPD day without losing the details.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              PediaCare is built for solo pediatricians in India — weight-based dosing
              checks, WhatsApp prescriptions and vaccination follow-up in one calm
              workspace.
            </p>

            <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-base font-semibold text-card-foreground">
                Sign in to your clinic
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your Google account. No passwords to remember between clinics.
              </p>
              <Button
                size="lg"
                className="mt-5 w-full gap-3 sm:w-auto"
                onClick={signIn}
                disabled={busy}
              >
                <GoogleMark />
                {busy ? "Opening Google…" : "Sign in with Google"}
              </Button>
              <p
                role="status"
                aria-live="polite"
                className="mt-3 text-sm text-destructive"
              >
                {error}
              </p>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold text-card-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.2h6.5c-.1 1-.8 2.6-2.3 3.6l3.5 2.7c2.1-1.9 3.3-4.8 3.3-8.3z"
      />
      <path
        fill="#4CAF50"
        d="M12 23.5c3 0 5.6-1 7.5-2.7l-3.5-2.7c-1 .7-2.3 1.2-4 1.2-3 0-5.6-2-6.5-4.8L1.9 17c1.9 3.8 5.8 6.5 10.1 6.5z"
      />
      <path
        fill="#1976D2"
        d="M5.5 14.5A6.9 6.9 0 0 1 5.1 12c0-.9.2-1.7.4-2.5L1.9 6.9A11.5 11.5 0 0 0 .5 12c0 1.8.4 3.6 1.4 5.1l3.6-2.6z"
      />
      <path
        fill="#F44336"
        d="M12 4.7c2.1 0 3.6.9 4.4 1.7l3.2-3.1C17.6 1.4 15 .5 12 .5 7.7.5 3.8 3.2 1.9 6.9l3.6 2.6C6.4 6.7 9 4.7 12 4.7z"
      />
    </svg>
  );
}
