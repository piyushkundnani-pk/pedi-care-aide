# Consultation and sample-data refinements

## What will change
- Replace the Hindi fever advisory with the supplied Devanagari copy and use a Devanagari-capable font stack in that preview.
- Limit frequency to 1–4 doses daily and duration to 1–14 days, with the requested helper guidance.
- Add drug-specific dosage guidance beneath each dose field.
- Change “Load Sample Data” into an explicit reset: remove only the signed-in clinician’s demo records, then recreate the same five fixed patients and today’s scheduled appointments.
- Show the exact confirmation: “Sample data reset — 5 patients loaded.”
- Keep sign-in free of automatic sample creation.

## Data isolation
- Add patient ownership to the database and scope access policies to the signed-in clinician.
- Cascade patient deletion to consultations, prescriptions, and vaccination records so a reset removes related records safely.
- Existing unowned legacy demo rows will no longer be visible to signed-in users.

## Technical details
- Use the current authenticated session for ownership and reset operations.
- Use fixed dates of birth and weights for deterministic sample patients.
- Validate frequency and duration limits before saving, in addition to browser input constraints.
- Verify the build and exercise the reset and consultation form in the signed-in preview when an authenticated session is available.
