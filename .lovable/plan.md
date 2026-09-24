# Consultation loading and prefetch

## Changes
- Move patient and latest-symptoms retrieval into a shared TanStack Query definition keyed by patient ID.
- Prefetch that query after a Start Consult link remains hovered or keyboard-focused for 200ms; cancel the timer when pointer or focus leaves.
- Read the same cached query on the Consultation screen so navigation reuses prefetched data.
- Show an immediate pulsing skeleton with a patient-card block, two textarea blocks, and a prescription-form block while data is unavailable.

## Verification
- Confirm a delayed hover populates the patient query cache.
- Confirm direct navigation shows the skeleton while loading and then renders the consultation.
- Check keyboard focus prefetch, signed-in navigation, runtime errors, and the final build.
