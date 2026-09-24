# Three cross-screen polish fixes

## What will change

- Restrict automatic dose-safety calculations to the five verified generic drugs, matched case-insensitively. Unknown/free-text drugs will show only the requested neutral manual-verification message.
- Normalize every calculated patient-specific dose interval so the displayed lower value never exceeds the upper value, including when a single-dose cap applies.
- Change vaccination reminders to open an accessible WhatsApp-style confirmation dialog. Cancelling will make no change; confirming will persist `reminder_sent_at`, close the dialog, show the requested confirmation, and update the disabled sent state.
- Use the authenticated Google profile name for the doctor identity everywhere, with the email-prefix fallback and one consistent `Dr. [Full Name]` format.

## Technical details

- Add a small shared authenticated-doctor display-name helper/hook and use it in Dashboard and Prescription views.
- Keep the vaccination write in the existing authenticated browser flow and refresh the vaccination query after confirmation.
- Reuse the existing dialog, button, Devanagari font, WhatsApp theme tokens, and toast setup.
- Add focused tests/checks for formulary matching, ordered capped ranges, reminder cancel/confirm behavior, persistence, and name fallback.

## Verification

- Run the focused code checks and inspect the latest preview build status.
- Test signed-in flows in the browser: consultation safety banners, vaccination reminder modal/cancel/send, and doctor-name consistency on Dashboard and Prescription.
