# PediaCare — AI-Native Pediatric OPD Software

> A pediatric-first, AI-assisted clinical workflow tool for solo and small-practice pediatricians in India. Built as a discovery-package submission for Vardaam Web Solutions — Product Engineer role.

**Live Demo:** https://pedi-care-aide.lovable.app
**Full PRD:** [Notion Workspace]([NOTION_URL])
**Walkthrough:** [Loom Video]([LOOM_URL]) *(follow-up submission — Friday 25 Sept)*

---

## Table of Contents

- [Overview](#overview)
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

**Sign in with Google to explore the live demo. All 5 sample patients and their history load with a single click.**

---

## The Problem

Solo pediatricians in India see 30–40 children per day in OPD but rely on tools that are either:

- **Pediatric-specific SMB players** (PediaNex at ₹6,228/doctor/year) — pediatric-native features but no AI-assisted clinical decision support, no visible ABDM readiness, no antibiotic stewardship layer
- **Generalist HMS with pediatric modules** (Sara Technologies — pediatric as one of 15+ verticals) — SMS/email only, no WhatsApp, no ABDM
- **Enterprise-tier tools** (Practo Ray, Adrine) — priced for hospital chains, documented pediatric gaps (no age-in-months, no decimal dosing)

This leads to cognitive overload during consult, illegible handwritten prescriptions, manual vaccination tracking, and defensive prescribing under parent pressure — compromising both clinical quality and practice viability.

*Full market analysis and evidence base in the [Notion PRD]([NOTION_URL]).*

---

## Core Workflows

The MVP demonstrates 4 core workflows end-to-end:

### 1. Doctor Dashboard
Today's appointments, vaccinations due, prescriptions written — all pulled from Supabase in real time. Sign in with Google; sample data loads on first visit.

### 2. Pediatric Consultation with AI Dose Safety Flag
The star feature. Real-time weight-based dose safety check against IAP Standard Treatment Guidelines. Traffic-light indicator (green/amber/red) updates as the doctor types. Also handles allergy cross-check and age-adaptive fever advisory attachment.

### 3. Prescription + WhatsApp Delivery
Digital prescription generated in vernacular (Devanagari Hindi), delivered to parent's WhatsApp with read-receipt tracking. Optional fever advisory attached when clinical context warrants.

### 4. Vaccination Schedule Tracker
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
|  | Consultation |  | (client-side, IAP STG 2025)  |     |
|  | Prescription |  +------------------------------+     |
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
|  |    records       |                                   |
|  +------------------+                                   |
+---------------------------------------------------------+
```

**Design decisions worth flagging:**

- **AI Dose Safety Flag is deterministic, not ML.** It is a versioned rule engine against IAP Standard Treatment Guidelines 2025. Every EMR in production uses this pattern for clinical safety — ML is unsafe for dose safety at MVP scale. Rules are tagged with version provenance (`IAP STG 2025 v1.0`) for auditability.
- **WhatsApp send is simulated in the demo; the audit trail is real.** Every "Send" click UPDATEs `whatsapp_sent_at` in Postgres. In production this triggers the WhatsApp Business API; the persistence layer is production-shaped either way.
- **Auth is real.** Google Sign-In via Supabase Auth. Session persistence across page loads.
- **Data is real.** Every action writes to Postgres. Refresh, sign out, sign in — state persists.

---

## Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | React (built via Lovable) | Fast iteration for discovery-package prototype; production would remain React with the same component structure |
| Backend | Supabase (Postgres + Auth + Realtime) | Handles database, authentication, and RLS in one service; production-ready |
| Auth | Supabase Auth + Google OAuth | Real OAuth flow; no shortcuts |
| Client-side State | React hooks + in-memory prefetch cache | Sufficient for MVP scope |
| Styling | Tailwind CSS (Lovable default) | Rapid iteration; maintainable |
| Deployment | Lovable-hosted preview | Direct-deploy pipeline; production would move to Vercel/Netlify with Supabase remaining as the data layer |

---

## What's Real vs. Mocked

Transparency matters. Here's exactly what's real functionality versus what's simulated for the demo scope.

### Real
- Google Sign-In authentication (Supabase Auth)
- Full CRUD on patients, consultations, prescriptions, vaccination_records (real Postgres writes)
- Session persistence — sign out and sign back in, data remains
- AI Dose Safety Flag calculation (client-side rule engine against IAP STG 2025)
- Allergy cross-check against known drug families (Penicillin → Amoxicillin, NSAID → Ibuprofen)
- Vaccination schedule computation from date of birth
- Age-adaptive fever advisory (different content for infants under 3 months, toddlers 3–24 months, and children 2+ years)
- Real-time input validation with inline error messaging
- Real-time dose safety recalculation on every keystroke
- Route-level prefetch on hover (Dashboard → Consultation transition latency reduced from ~2600ms cold to ~400ms warm)

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
- Latency in the dev preview environment is ~400ms warm (down from 2600ms cold on first navigation via prefetching); production would target under 300ms via CDN and warm caches
- Single-clinic support; multi-doctor and multi-clinic support is Phase 3

### Phase 2 (3–6 months post-MVP)

- ABDM ABHA ID registration UX and integration
- Parent-side patient record view (mobile app or web)
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
2. Get the Lovable project source: https://pedi-care-aide.lovable.app
3. Configure a Supabase project — schema documented in the Notion PRD
4. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Run:

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
