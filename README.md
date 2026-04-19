# SmartSeason — Field Monitoring System

A simple full-stack web app to track crop progress across fields during a growing season.
Coordinators (Admins) get a complete overview; Field Agents focus on the fields they own.

Built with **React + Vite + TypeScript + Tailwind** on the frontend, **Lovable Cloud (Supabase: Postgres, Auth, Row-Level Security)** on the backend.

---

## Setup

```bash
npm install
npm run dev
```

The Lovable Cloud backend (database + auth) is already provisioned and connected through `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. No extra setup needed.

### Demo accounts

Sign up from `/auth?mode=signup` and pick a role at signup. Suggested demo accounts:

| Role         | Email                    | Password   |
|--------------|--------------------------|------------|
| Coordinator  | `admin@smartseason.dev`  | `demo1234` |
| Field Agent  | `agent@smartseason.dev`  | `demo1234` |

(Create them yourself via the signup page — role is selected during signup.)

---

## Data model

- **profiles** — auto-created on signup (full name, email)
- **user_roles** — `admin` | `agent` (kept in a **separate table** to prevent privilege escalation via profile updates; checked through a `SECURITY DEFINER` `has_role()` function to avoid RLS recursion)
- **fields** — `name`, `crop_type`, `planting_date`, `stage`, `stage_changed_at`, `assigned_agent_id`, `location`, `area_hectares`
- **field_updates** — append-only log of notes & stage transitions (`previous_stage`, `new_stage`, `note`, `author_id`)

A `track_stage_change` trigger updates `stage_changed_at` whenever a field's stage moves — this is what powers the time-based status logic.

### Row-Level Security

- **Admins** can see / create / update / delete every field and read every update.
- **Agents** can only see and update fields where `assigned_agent_id = auth.uid()`, and can only insert updates on those fields.
- All writes are validated server-side by RLS — clients can't fake `author_id` or write to fields they don't own.

---

## Field stage lifecycle

```
Planted → Growing → Ready → Harvested
```

Agents move fields forward (or correct backwards) from the field detail page. Each stage change is recorded in `field_updates`.

## Status logic (computed, not stored)

Status is derived on the fly from `stage` + `stage_changed_at` so it's always up-to-date.

| Status        | Rule                                                                    |
|---------------|-------------------------------------------------------------------------|
| **Completed** | `stage = harvested`                                                     |
| **At Risk**   | Field has been in its current stage longer than the threshold:          |
|               | • Planted > 14 days  • Growing > 60 days  • Ready > 7 days              |
| **Active**    | Anything else                                                           |

Thresholds live in `src/lib/fieldStatus.ts` (`STAGE_THRESHOLD_DAYS`) — easy to tune per crop or organisation.

**Why time-based?** It's deterministic, transparent, and surfaces the most actionable signal: a field that should have moved on but hasn't. No extra inputs from the agent are required.

---

## App structure

- `src/pages/Index.tsx` — public landing page
- `src/pages/Auth.tsx` — sign in / sign up (role selection happens here)
- `src/pages/Dashboard.tsx` — routes to Admin or Agent dashboard based on role
- `src/pages/AdminDashboard.tsx` — KPI tiles, charts (stage bar, status pie), filterable fields table, "New field" dialog with agent assignment
- `src/pages/AgentDashboard.tsx` — KPI tiles, stage chart, card grid of assigned fields
- `src/pages/FieldDetail.tsx` — field details, activity timeline, "Log update" form (stage change + note)
- `src/lib/fieldStatus.ts` — single source of truth for stage labels, thresholds and status computation
- `src/hooks/useAuth.tsx` — auth context with role lookup

---

## Design decisions & trade-offs

- **Roles in a dedicated table.** Storing roles on `profiles` would let any authenticated user with `update profiles` rights escalate privileges. The `user_roles` table + `has_role()` security-definer function is the standard Supabase pattern.
- **Computed status, not stored.** Status changes purely as time passes — storing it would mean a cron job and stale rows. Computing it client-side is cheap and always correct.
- **Append-only updates.** `field_updates` records both free-text notes and stage transitions in one timeline, so the audit trail and the agent's observation log are the same thing.
- **Open signup with role choice.** Picked for demo speed. In production, agents would more realistically be invited by an admin (the role enum and RLS policies already support that flow — only the signup UI would change).
- **No edit-field UI for the MVP.** Agents update *stage* and *notes*; admins can re-create fields. Kept narrow to honour "prioritise clarity over completeness".

## Assumptions

- One agent per field. Multiple-agent assignments would mean a join table.
- Same thresholds for all crops. A real product would let admins configure thresholds per crop.
- Email confirmation is left enabled by default on Lovable Cloud; for the demo you can disable it in Cloud → Auth Settings to make signup instant.
