import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/consult/$patientId")({
  head: () => ({
    meta: [
      { title: "Consultation — PediaCare" },
      {
        name: "description",
        content: "Record symptoms, diagnosis and weight-based prescriptions.",
      },
      { property: "og:title", content: "Consultation — PediaCare" },
      {
        property: "og:description",
        content: "Record symptoms, diagnosis and weight-based prescriptions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsultPage,
});

function ConsultPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Consultation screen
        </h1>
        <p className="mt-2 text-muted-foreground">
          This screen is next in line. It will hold symptoms, diagnosis and the
          prescription pad with live dose safety checks.
        </p>
        <Button asChild variant="outline" className="mt-6 gap-2">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </Button>
      </main>
    </div>
  );
}
