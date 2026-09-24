import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReminderPreview = {
  parentName: string | null;
  patientName: string;
  vaccine: string;
  scheduledDate: string; // ISO yyyy-mm-dd
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function ReminderPreviewDialog({
  target,
  open,
  sending,
  onOpenChange,
  onConfirm,
}: {
  target: ReminderPreview | null;
  open: boolean;
  sending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const parentName = target?.parentName ?? "Parent";
  const scheduledDate = target ? fmtDate(target.scheduledDate) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>WhatsApp Preview (Mocked)</DialogTitle>
          <DialogDescription>Review the vaccination reminder before recording it as sent.</DialogDescription>
        </DialogHeader>
        {target && (
          <section aria-label="Mock WhatsApp vaccination reminder preview" className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-3 bg-wa-header px-4 py-3 text-wa-header-foreground">
              <div className="flex size-9 items-center justify-center rounded-full bg-wa-header-foreground/20 text-sm font-semibold" aria-hidden="true">PC</div>
              <div>
                <p className="font-semibold leading-tight">{parentName}</p>
                <p className="text-xs opacity-90">PediaCare Clinic</p>
              </div>
            </div>
            <div className="bg-wa-chat p-4">
              <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-wa-bubble px-3 py-2 text-sm text-wa-bubble-foreground shadow-sm">
                <p lang="hi" className="font-devanagari">
                  नमस्ते {parentName} जी। {target.patientName} का अगला टीका {target.vaccine} {scheduledDate} को निर्धारित है। कृपया समय पर क्लिनिक आएं। - PediaCare Clinic
                </p>
                <p lang="en" className="mt-3 border-t border-wa-meta/30 pt-2 text-xs">
                  Reminder: {target.patientName}&apos;s next vaccine {target.vaccine} is scheduled for {scheduledDate}. Please visit the clinic on time.
                </p>
                <p className="mt-1 text-right text-[11px] text-wa-meta">{new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
          </section>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button type="button" onClick={onConfirm} disabled={sending} className="gap-2">
            <Send className="size-4" aria-hidden="true" />
            {sending ? "Sending…" : "Confirm Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
