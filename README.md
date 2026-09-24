# PediaCare Dashboard

Build a web app called "PediaCare" — an AI-native pediatric OPD tool for solo pediatricians in India.

Product context:

- Target user: solo pediatrician (Dr. Priya) seeing 25-40 children per day in India

- 4 core screens: Doctor Dashboard, Consultation, Prescription + WhatsApp Delivery, Vaccination Schedule

- Differentiator: real-time AI dose safety flag during prescription entry against IAP-published dose ranges

Architecture requirements:

- Frontend: React (Lovable default)

- Backend: Use Supabase for database and authentication (native Lovable integration)

- Auth: Google Sign-In via Supabase Auth

- Accessibility: WCAG 2.1 AA compliance — ARIA labels on all interactive elements, semantic HTML, keyboard navigation support, sufficient color contrast (4.5:1 minimum)

- Responsive: Desktop-first design that also works on tablet and mobile web. Test at 1440px, 1024px, 768px, and 375px breakpoints.

Design tone: clean, professional, medical-clinic feel. Calm blue-and-white palette. Clear typography (Inter or system font). NOT playful/childish — this is for doctors, not parents.

Database schema (create Supabase tables):

Table: patients

- id (uuid, primary key)

- full_name (text, not null)

- date_of_birth (date, not null)

- weight_kg (numeric, not null)

- gender (text — "M" or "F")

- parent_name (text)

- parent_phone (text with country code)

- allergies (text array)

- created_at (timestamptz default now())

Table: consultations

- id (uuid, primary key)

- patient_id (uuid, foreign key to patients)

- consult_date (timestamptz default now())

- symptoms (text)

- diagnosis (text)

- created_at (timestamptz default now())

Table: prescriptions

- id (uuid, primary key)

- consultation_id (uuid, foreign key to consultations)

- drug_name (text)

- dosage_mg (numeric)

- frequency_per_day (integer)

- duration_days (integer)

- whatsapp_sent_at (timestamptz, nullable)

- whatsapp_read_at (timestamptz, nullable)

Table: vaccination_records

- id (uuid, primary key)

- patient_id (uuid, foreign key to patients)

- vaccine_name (text)

- scheduled_date (date)

- administered_date (date, nullable)

- status (text — "scheduled" | "administered" | "overdue")

- reminder_sent_at (timestamptz, nullable)

Enable Row Level Security on all tables. For now, allow all authenticated users to read/write (single-tenant demo).

Auth flow:

- Landing page: "Sign in with Google" button

- After sign-in, redirect to /dashboard

- Add "Sign out" link in top-right of every screen

Add a "Load Sample Data" button in Settings (or accessible from Dashboard) that seeds 5 mock patients into the database — mix of ages 6 months to 8 years, mix of weights, 2 with allergies. Also seed today's appointments for those 5 patients and 2 vaccinations due today. This button should be idempotent (don't create duplicates on repeat clicks).

Screen 1 — Doctor Dashboard (build this first):

Route: /dashboard

- Header: "Good morning, Dr. Priya" + today's date + "Sign out" link + "Load Sample Data" button

- Metrics row: today's appointment count, vaccinations due today count, prescriptions written today count — all pulled from Supabase in real time

- "Today's Appointments" card: query patients with appointments today from database. Each row: name, formatted age (X years Y months if under 5, else X years), weight in kg, allergies indicator (red badge if any), "Start Consult" button that navigates to /consult/:patientId

- "Vaccinations Due Today" card: query vaccination_records where scheduled_date = today and status = "scheduled". Each row: patient name, age, vaccine name, "Send Reminder" button

- Empty states: friendly message + CTA to load sample data if no records exist

Do NOT build other screens yet. Ship this dashboard with:

- Real Supabase queries

- Working Google auth

- Load Sample Data button that works

- Full accessibility (keyboard nav, ARIA)

- Responsive at all breakpoints

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pedi-care-aide.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6901430f-0234-4e11-bbb0-cfc5dc8930be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
