import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/prescription/$consultId")({
  head: () => ({
    meta: [
      { title: "Prescription — PediaCare" },
      { name: "description", content: "Review and send the prescription via WhatsApp." },
      { property: "og:title", content: "Prescription — PediaCare" },
      { property: "og:description", content: "Review and send the prescription via WhatsApp." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrescriptionPage,
});

function PrescriptionPage() {
  const { consultId } = Route.useParams();
  return (
    <div className="min-h-screen bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Prescription saved</h1>
        <p className="mt-2 text-muted-foreground">
          Consultation {consultId.slice(0, 8)} was saved. The prescription and WhatsApp delivery screen is next.
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
