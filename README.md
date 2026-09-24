# PediaCare — AI-Native Pediatric OPD Software

> A pediatric-first, AI-assisted clinical workflow tool for solo and small-practice pediatricians in India. Built as a discovery-package submission for Vardaam Web Solutions — Product Engineer role.

**Live Demo:** https://pedi-care-aide.lovable.app
**Full PRD:** [Notion Workspace](https://bolder-delphinium-aa0.notion.site/PediaCare-PRD-v1-3e59c135fda6806f8592e975424ad569#3e59c135fda68039b76ee58474e38cf6)
**Walkthrough:** Loom Video *(follow-up submission — Friday 25 Sept)*

---

## Table of Contents

- [Overview](#overview)
- [How to Review This Demo](#how-to-review-this-demo)
- [The Problem](#the-problem)
- [Core Workflows](#core-workflows)
- [Positioning Wedge](#positioning-wedge)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [What's Real vs. Mocked](#whats-real-vs-mocked)
- [Known Limitations & Phase 2 Roadmap](#known-limitations--phase-2-roadmap)
- [Running Locally](#running-locally)
- [Author](#author)

---

## Overview

PediaCare is a discovery-package prototype for a pediatric-first, ABDM-ready OPD clinical workflow tool built specifically for India's SMB pediatric segment (solo and small-practice pediatricians in Tier 1–3 cities). It demonstrates the product thesis, competitive positioning, and end-to-end user experience for a "next-generation" pediatric SaaS that goes beyond the current market's feature depth.

**Sign in with Google to explore the live demo. Click "Load Sample Data" to seed 5 patients and start clicking through the workflows.**

---

## How to Review This Demo

The fastest way to evaluate PediaCare is to click through the live app in the order below. Total time: ~5 minutes.

### 1. Sign in
Open https://pedi-care-aide.lovable.app — sign in with any Google account. Authentication runs through Supabase Auth + Google OAuth (real flow, not mocked).

### 2. Load sample data
On the Dashboard, click **"Load Sample Data"** (or "Reset Demo Data" if you've explored before). This seeds 5 patients with realistic vaccination histories, today's appointments, and vaccinations due today. All data writes to real Supabase Postgres tables.

### 3. Register a walk-in patient (optional but recommended)
Click **"+ Add Patient"** on the Dashboard header. Add a child with any name, DOB, and weight. Use the "Vaccination History" section to indicate whether the child has received all age-appropriate vaccinations to date, or select from a checklist which have actually been administered. On save, the patient appears in Today's Appointments and their IAP vaccination schedule is auto-computed.

### 4. Test the AI Dose Safety Flag (the star feature)
Click **"Start Consult"** on Aarav Sharma (6 months, 7.4 kg). In the prescription form:
- Pick **Paracetamol**, enter dose **75 mg** → green banner (within IAP safe range)
- Change dose to **150 mg** → red banner (above IAP ceiling for 7.4 kg)
- Try selecting **Amoxicillin** on Ananya Iyer (allergic to Penicillin) → red allergy warning banner appears

### 5. Send a prescription
Enter a diagnosis and save. On the Prescription screen, review the digital prescription card and the WhatsApp preview (Devanagari Hindi). Click **"Send to Parent"** — the `whatsapp_sent_at` column updates in Supabase (real audit trail).

### 6. Explore vaccinations
Click **"Vaccinations"** in the top nav. See patients with overdue or due-soon vaccines. Click **"Send WhatsApp Reminder"** on any row to see the vernacular reminder mock preview and confirm the send.

### 7. Verify persistence
Sign out and back in. All your data persists. This is real Postgres, not client-side state.

**If you spot any bug or unexpected behavior, it is documented in the [Known Limitations](#known-limitations--phase-2-roadmap) section — nothing has been hidden.**

---

## The Problem

Solo pediatricians in India see 30–40 children per day in OPD but rely on tools that are either:

- **Pediatric-specific SMB players** (PediaNex at ₹6,228/doctor/year) — pediatric-native features but no AI-assisted clinical decision support, no visible ABDM readiness, no antibiotic stewardship layer
- **Generalist HMS with pediatric modules** (Sara Technologies — pediatric as one of 15+ verticals) — SMS/email only, no WhatsApp, no ABDM
- **Enterprise-tier tools** (Practo Ray, Adrine) — priced for hospital chains, documented pediatric gaps (no age-in-months, no decimal dosing)

This leads to cognitive overload during consult, illegible handwritten prescriptions, manual vaccination tracking, and defensive prescribing under parent pressure — compromising both clinical quality and practice viability.

*Full market analysis and evidence base in the [Notion PRD](https://bolder-delphinium-aa0.notion.site/Vardaam_Pediatric_PRD_v1-0509c135fda682ddae02814af033a3d6).*

---

## Core Workflows

The MVP demonstrates 5 core workflows end-to-end:

### 1. Register Walk-in Patient
Doctor or receptionist registers a new pediatric patient during their first visit. Captures core profile (DOB, weight, allergies, parent details) plus structured vaccination history — the doctor confirms whether the child has all age-appropriate vaccinations to date, or checks a list of what has actually been administered. System auto-creates today's appointment and computes the IAP vaccination schedule so new patients don't get a wall of false "overdue" flags.

**Design choice:** Add Patient is optimized for the walk-in registration pattern (dominant use case for solo pediatricians). Pre-scheduled patient registration and receptionist-driven record migration are Phase 2 features aligned to when clinics scale beyond single-doctor operations.

### 2. Doctor Dashboard
Today's appointments, vaccinations due, prescriptions written — all pulled from Supabase in real time. Vaccination reminders trigger the same WhatsApp mock preview as the Vaccinations screen (consistent UX).

### 3. Pediatric Consultation with AI Dose Safety Flag
The star feature. Real-time weight-based dose safety check against IAP Standard Treatment Guidelines. Traffic-light indicator (green/amber/red) updates as the doctor types. Also handles allergy cross-check and age-adaptive fever advisory attachment.

### 4. Prescription + WhatsApp Delivery
Digital prescription generated in vernacular (Devanagari Hindi), delivered to parent's WhatsApp with read-receipt tracking. Optional fever advisory attached when clinical context warrants.

### 5. Vaccination Schedule Tracker
IAP-compliant schedule auto-computed from each child's date of birth. Overdue and due-soon vaccines surface in an Attention Required section with one-click WhatsApp reminder delivery (with mock preview).

---

## Positioning Wedge

PediaCare is positioned as the **next-generation** SMB pediatric tool — **V2 to PediaNex's V1**.

PediaNex validated the SMB pediatric market at ₹6,228/doctor/year. PediaCare extends the category with the layer PediaNex doesn't offer:

1. **AI-assisted clinical decision support** — real-time weight-based dose safety flag, drug interaction check, vernacular fever advisory
2. **Antibiotic stewardship as a first-class feature** — vernacular fever advisory sheets give parents visible action, reducing pressure for unnecessary antibiotic prescribing
3. **ABDM-ready architecture from Day 1** — patient records designed for future ABHA linkage; registration UX in Phase 2 aligned to the 2027 mandate approach
4. **Vernacular WhatsApp parent engagement** — Sara has SMS/email only; PediaNex has WhatsApp prescriptions but not vernacular clinical advisory content

Target price: **₹10,000–15,000/doctor/year** (approximately 1.6× PediaNex), justified by the AI clinical decision support layer, ABDM future-proofing, and antibiotic stewardship layer.

---

## Architecture

```
+---------------------------------------------------------+
|                    Frontend (React)                     |
|  +--------------+  +------------------------------+     |
|  | Dashboard    |  | AI Dose Safety Flag Engine   |     |
|  | Add Patient  |  | (client-side, IAP STG 2025)  |     |
|  | Consultation |  +------------------------------+     |
|  | Prescription |                                       |
|  | Vaccinations |                                       |
|  +--------------+                                       |
+---------------------+-----------------------------------+
                      |
                      | Supabase JS Client
                      v
+---------------------------------------------------------+
|                       Supabase                          |
|  +------------------+   +----------------------------+  |
|  |  Postgres DB     |   |  Auth (Google OAuth)       |  |
|  |  - patients      |   |  - session management      |  |
|  |  - consultations |   |  - RLS policies            |  |
|  |  - prescriptions |   +----------------------------+  |
|  |  - vaccination_  |                                   |
|  |    records      |                                    |
|  |  - appointments  |                                   |
|  +------------------+                                   |
+---------------------------------------------------------+
```

**Design decisions worth flagging:**

- **AI Dose Safety Flag is deterministic, not ML.** It is a versioned rule engine against IAP Standard Treatment Guidelines 2025. Every EMR in production uses this pattern for clinical safety — ML is unsafe for dose safety at MVP scale. Rules are tagged with version provenance (`IAP STG 2025 v1.0`) for auditability.
- **WhatsApp send is simulated in the demo; the audit trail is real.** Every "Send" click UPDATEs `whatsapp_sent_at` in Postgres. In production this triggers the WhatsApp Business API; the persistence layer is production-shaped either way.
- **Auth is real.** Google Sign-In via Supabase Auth. Session persistence across page loads.
- **Data is real.** Every action writes to Postgres. Refresh, sign out, sign in — state persists.
- **Vaccination history is user-captured, not assumed.** Walk-in registration asks the doctor to confirm or list prior vaccinations, so new patients aren't misrepresented as neglected.

---

## Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | React (built via Lovable) | Fast iteration for discovery-package prototype; production would remain React with the same component structure |
| Backend | Supabase (Postgres + Auth + Realtime) | Handles database, authentication, and RLS in one service; production-ready |
| Auth | Supabase Auth + Google OAuth | Real OAuth flow; no shortcuts |
| Client-side State | React hooks + in-memory prefetch cache | Sufficient for MVP scope |
| Styling | Tailwind CSS (Lovable default) | Rapid iteration; maintainable |
| Deployment | Lovable-hosted preview (auto-syncs to GitHub on every publish) | Direct-deploy pipeline; production would move to Vercel/Netlify with Supabase remaining as the data layer |

---

## What's Real vs. Mocked

Transparency matters. Here's exactly what's real functionality versus what's simulated for the demo scope.

### Real
- Google Sign-In authentication (Supabase Auth)
- Full CRUD on patients, consultations, prescriptions, vaccination_records, appointments (real Postgres writes)
- Session persistence — sign out and sign back in, data remains
- AI Dose Safety Flag calculation (client-side rule engine against IAP STG 2025)
- Allergy cross-check against known drug families (Penicillin → Amoxicillin, NSAID → Ibuprofen)
- Vaccination schedule computation from date of birth
- Age-adaptive fever advisory (different content for infants under 3 months, toddlers 3–24 months, and children 2+ years)
- Real-time input validation with inline error messaging and value clamping
- Real-time dose safety recalculation on every keystroke
- Route-level prefetch on hover (Dashboard → Consultation transition latency reduced from ~2600ms cold to ~400ms warm)
- Idempotent seeder with "Reset Demo Data" (destructive with confirmation) and "Load Sample Data" (additive merge preserving user progress) buttons

### Mocked (with clear disclosure in the UI)
- **WhatsApp delivery**: send action UPDATEs `whatsapp_sent_at` in DB (real audit trail) but no actual WhatsApp message is sent. In production this integrates the WhatsApp Business API. Every mock is labeled clearly in the UI.
- **Read receipt simulation**: after 3 seconds, `whatsapp_read_at` is written to DB to demonstrate the audit trail. Real read receipts come from WhatsApp Business API in production.
- **Vaccination reminder WhatsApp preview**: same pattern — real DB write to `reminder_sent_at`, mocked delivery.

---

## Known Limitations & Phase 2 Roadmap

Being explicit about what's out of MVP scope:

### Known limitations of the demo

- Sample data uses 5 preset patients loaded via the "Load Sample Data" and "Reset Demo Data" buttons
- Drug formulary is hardcoded to 5 common pediatric drugs (Paracetamol, Ibuprofen, Amoxicillin, Azithromycin, Cetirizine); free-text entry is supported but suppresses the dose safety flag with a clear disclosure banner
- IAP rule table is embedded client-side; production would move this to a versioned `dose_safety_rules` Postgres table with quarterly clinical review board updates
- Latency in the dev preview environment is ~400ms warm (down from ~2600ms cold on first navigation via prefetching); production would target under 300ms via CDN and warm caches
- Single-clinic support; multi-doctor and multi-clinic support is Phase 3
- Add Patient supports walk-in registration only; pre-scheduled and future-dated appointments are Phase 2

### Deliberately deferred to Phase 2 (product design choice, not oversight)

- **Patient Chronology View** — a dedicated screen showing a patient's past consultations, prescriptions, and vaccinations in one timeline. In the MVP, the doctor sees relevant patient state in the top card on the Consultation screen. A full chronology view is Phase 2.

### Phase 2 (3–6 months post-MVP)

- ABDM ABHA ID registration UX and integration
- Patient Chronology View (doctor-side timeline)
- Parent-side patient record view (mobile app or web)
- Pre-scheduled patient registration and future-dated appointment booking
- Growth chart tracking (WHO and IAP percentiles) with milestone flags
- Additional regional WhatsApp language templates (Tamil, Telugu, Marathi, Bengali)
- Payment gateway integration
- Extended AI voice scribe capability beyond the dose safety flag

### Phase 3 (6–12 months)

- Multi-doctor and multi-clinic support
- Insurance claim integration (Ayushman Bharat, private)
- Analytics dashboard for clinic owners
- Referral network across pediatricians
- Camp and school screening mode

### Explicitly Not-in-Roadmap

- Multi-specialty expansion (dental, orthopedic, adult general medicine) — dilutes pediatric-first positioning
- Video-first telemedicine — WhatsApp async is the messaging layer for this product
- Hospital IPD features — hospital-tier is a separate product category

---

## Running Locally

The live demo is the recommended way to review this project. If you want to run it locally:

1. Clone this repository
2. Configure a Supabase project — schema documented in the Notion PRD
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Run:

```bash
npm install
npm run dev
```

---

## Author

**Piyush Kundnani**

- 8+ years enterprise B2B SaaS engineering (Cornerstone OnDemand, Pune)
- Certificate Program in Product Management and Agentic AI — IIT Patna x Masai (2026)
- LinkedIn: [linkedin.com/in/piyush-kundnani-67312594](https://linkedin.com/in/piyush-kundnani-67312594)
- GitHub: [github.com/piyushkundnani-pk](https://github.com/piyushkundnani-pk)

---

*Submitted 24 September 2026 as part of the Vardaam Web Solutions Product Engineer assignment.*
