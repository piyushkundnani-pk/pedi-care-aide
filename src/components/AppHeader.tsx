import { Link, useRouter } from "@tanstack/react-router";
import { Stethoscope, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    await router.navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="PediaCare home"
        >
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Stethoscope className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            PediaCare
          </span>
        </Link>
        <Button variant="ghost" onClick={signOut} className="gap-2">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
