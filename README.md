# Ivy Group CRM

Internal lead & client management system for the Ivy Group Real Estate marketing
team — a real-time analytics dashboard, a searchable client directory with a
Kanban pipeline, reporting/exports, follow-up management, CSV/Excel import, and
admin settings for lead sources, campaigns, and user roles.

Built with Next.js (App Router), TypeScript, Tailwind + shadcn/ui, and Supabase
(Postgres, Auth, Row-Level Security, Realtime).

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- [ffmpeg](https://ffmpeg.org) only if you need to re-process the login page's
  background video/logo assets — not required to run the app day to day

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Wait for provisioning to finish, then go to **Project Settings → API**. You'll need:
   - **Project URL**
   - **anon / public** key
   - **service_role** key (keep this secret — server-only)

## 2. Configure environment variables

Copy the example env file and fill in the values from step 1:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`.env.local` is gitignored — never commit real keys.

## 3. Run the database migrations + seed data

Open your project's **SQL Editor** in the Supabase dashboard
(`https://supabase.com/dashboard/project/<your-project-ref>/sql/new`) and run
these in order:

1. [`supabase/migrations/20260725000000_init_schema.sql`](supabase/migrations/20260725000000_init_schema.sql) —
   all enums, tables, RLS policies, triggers, and the `leads`/`activities` Realtime publication.
2. [`supabase/migrations/20260726000000_saved_queries.sql`](supabase/migrations/20260726000000_saved_queries.sql) —
   adds the `saved_queries` table used by the Reports query builder (added after the
   initial schema, once the reporting feature needed somewhere to persist named filters).
3. [`supabase/migrations/20260727000000_user_deletion_fk_fixes.sql`](supabase/migrations/20260727000000_user_deletion_fk_fixes.sql) —
   changes `leads.assigned_to`, `activities.created_by`, and `saved_queries.created_by` to
   `ON DELETE SET NULL` so removing a user from Settings no longer fails on foreign key constraints.
4. [`supabase/migrations/20260728000000_property_types_table.sql`](supabase/migrations/20260728000000_property_types_table.sql) —
   converts the `property_type` enum column into an editable `property_types` lookup table
   (admins can add/remove property types from Settings, same as lead sources).
5. [`supabase/migrations/20260729000000_sales_agents_table.sql`](supabase/migrations/20260729000000_sales_agents_table.sql) —
   adds the `sales_agents` table (name, phone, email) and repoints `leads.assigned_to` to
   reference it instead of `profiles` — sales managers are contacts the admin maintains, not
   CRM users.
6. [`supabase/migrations/20260730000000_lead_column_labels.sql`](supabase/migrations/20260730000000_lead_column_labels.sql) —
   adds the `lead_column_labels` table so admins can rename the leads table's column headers
   from Settings without touching the underlying field names.
7. [`supabase/migrations/20260731000000_status_labels.sql`](supabase/migrations/20260731000000_status_labels.sql) —
   adds the `status_labels` table so admins can rename what each pipeline stage is called
   (Kanban, badges, filters, reports) without touching the underlying `lead_status` enum.
8. [`supabase/migrations/20260801000000_lead_type_and_referrals.sql`](supabase/migrations/20260801000000_lead_type_and_referrals.sql) —
   adds `leads.lead_type` ("Direct Client" / "Real Estate Agent") and an optional
   `leads.referred_by_lead_id` self-reference, so agent contacts stay in the same pipeline
   as buyer leads while being distinguishable and, when known, linkable to the clients
   they've referred.
9. [`supabase/migrations/20260802000000_lead_evidence.sql`](supabase/migrations/20260802000000_lead_evidence.sql) —
   adds the `lead_evidence` table (dated notes/screenshots per lead, for proving contact
   if ownership is ever disputed) and a private `lead-evidence` Storage bucket with its
   RLS policies for the actual file bytes.
10. [`supabase/migrations/20260803000000_project_locations.sql`](supabase/migrations/20260803000000_project_locations.sql) —
   adds `property_types.location` and seeds the four current developments (Ivy Park,
   Ivy Myst, Blossoms Ivy, Luckinn Ivy) with their locations — "property type" now means
   an actual named project, and its location auto-fills on the lead form when selected.
11. [`supabase/migrations/20260804000000_pipeline_stages.sql`](supabase/migrations/20260804000000_pipeline_stages.sql) —
   converts pipeline status from a fixed enum into an admin-manageable `pipeline_stages`
   table (add/rename/reorder/delete from Settings), preserving every lead's existing
   stage and any labels already customized. "New Lead", "Closed - Won", and
   "Closed - Lost" stay protected from deletion since reporting logic depends on them.
12. [`supabase/seed.sql`](supabase/seed.sql) —
   seeds 12 lead sources, 4 sample campaigns, and 8 sample Nairobi buyer leads with activity timelines.

If you have the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
linked to this project instead, you can run:

```bash
supabase db push
```

(the CLI reads migrations from `supabase/migrations/` in order; run `seed.sql`
separately, e.g. `supabase db execute -f supabase/seed.sql` or paste it into the
SQL Editor as above).

## 4. Install dependencies & start the dev server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). New sign-ups default to the
**viewer** role (read-only) — sign in via password or magic link on `/login`.

## 5. Promote a user to admin

New accounts default to `viewer`. After signing up through `/login`, promote
yourself (or anyone else) to `admin` by running this in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@ivygroup.co.ke';
```

Admins can also promote/demote other users from **Settings → Users & roles**
in the app itself once you have at least one admin account.

## Project structure

```
src/
  app/
    (auth)/login/            — sign-in (email/password + magic link), video hero panel
    (dashboard)/             — protected app shell (sidebar + topbar, pinned; content scrolls)
      dashboard/             — KPIs, charts, activity feed (realtime)
      leads/                 — client directory: Table + Kanban views
      leads/[id]/            — lead profile + communication timeline
      leads/import/          — CSV/Excel import wizard (admin only)
      follow-ups/            — Overdue / Due Today / Upcoming hub
      reports/               — query builder + canned reports + CSV/Excel/PDF export
      settings/              — lead sources, campaigns, users & roles (admin only)
      error.tsx              — branded error boundary for the whole app shell
    auth/callback/           — magic-link session exchange
    error.tsx, not-found.tsx — branded root-level error/404 pages
    icon.png                 — favicon (Next.js App Router icon convention)
  components/
    auth/                    — login form
    layout/                  — sidebar, topbar, nav, user menu, logo
    command-palette/         — ⌘K palette (navigate, search leads, quick-create)
    leads/, kanban/           — directory table, Kanban board, lead detail/timeline
    dashboard/               — KPI cards, charts, activity feed
    follow-ups/, reports/, import/, settings/ — one folder per feature area
    shared/                  — cross-feature components (e.g. export buttons)
    ui/                      — shadcn/ui (Radix-based) components
  hooks/
    use-realtime-leads-refresh.ts — shared Supabase Realtime → router.refresh() hook
  lib/
    supabase/                — browser / server / proxy / admin Supabase clients
    constants.ts             — lead status & priority enums + validated brand colors
    dashboard-metrics.ts, report-metrics.ts, follow-ups.ts, leads.ts — pure aggregation/logic
    import/                  — spreadsheet parsing, column mapping, row validation
    export.ts                — CSV / Excel / PDF export helpers
  types/database.types.ts    — typed Supabase schema (hand-authored to match migrations)
supabase/
  migrations/                — SQL schema migrations, run in filename order
  seed.sql                   — sample data
public/                      — logo, favicon source, and login page background video/poster
source-assets/                — original uploaded brand files (not served; kept for reference)
```

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Radix) ·
Supabase (Postgres, Auth, RLS, Realtime) · TanStack Table · @dnd-kit ·
Recharts · React Hook Form + Zod · date-fns · papaparse + SheetJS/xlsx · jsPDF

## Notes on a few implementation decisions

- **Status/priority colors were run through a colorblindness/contrast validator**
  (not eyeballed) before being used in badges, Kanban columns, and dashboard
  charts. The 6 active pipeline stages are a single-hue ordinal ramp (lightness
  increases as a deal progresses); Closed-Won/Lost/On Hold get fixed, validated
  colors. See `src/lib/constants.ts`.
- **The sidebar/topbar are pinned to the viewport** — only the page content
  scrolls beneath them (`src/app/(dashboard)/layout.tsx`).
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** — auth/session handling
  lives in `src/proxy.ts`. Its route matcher excludes common static asset
  extensions (images, video, fonts) so it doesn't intercept and redirect
  requests for the login page's background video.
- The login page's background video (`public/ivy-myst-bg.mp4`/`.webm`) was
  converted from a raw MPEG transport stream with ffmpeg; a static poster image
  is shown instead when the visitor's OS requests reduced motion.
