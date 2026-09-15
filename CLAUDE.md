# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Backend for **medy.site** ("Profil Connecté") — Medy Cazal's personal
portfolio site, built and hosted on **Canva Sites** (100% static HTML/JS,
no server-side code, `localStorage` for local-only state). This repo is
NOT the site itself (that lives in Canva); it's the small external API
that gives the static site two things it cannot have on its own:

- `GET /api/projects` (public) — the list of portfolio entries shown in
  the "Mes créations" section, fetched client-side from medy.site so new
  projects can be added without editing the Canva page.
- `POST /api/signups` (public) — captures the "S'inscrire" form, since
  `localStorage` is per-visitor and useless for collecting emails.

It has since grown into Medy's **client/CRM backend** too: `/api/crm/*`
(companies, contacts, client projects, meetings, audits, commercial
proposals, payments, roadmap steps, messages) — all admin-only, all
stored in **Airtable**, not JSON files. See "CRM / Airtable" below.

A small React admin app (`web/`) lets Medy manage the public portfolio
and signups (add/edit/delete projects, view/delete signups) behind a
single admin login. It does not yet have UI for the CRM resources
(Airtable's own interface is used for those today — see `.memory`). See
`docs/DESIGN.md` for the full rationale and `README.md` for setup/
deployment.

Live deployment: not yet deployed (Render free tier once created —
`render.yaml` at repo root is the blueprint; see README).

**Separate project, do not mix**: `medycazal-ia/tp-opt` (the
"Guichet Tiers Payants" / tierspayant.site product for opticians) is an
unrelated codebase. tierspayant.site is referenced here only as data —
one entry in the `projects` list, linked externally.

## Commands

Run from `server/` or `web/` respectively (no root-level script runner).

```bash
# server/
npm run dev          # tsx watch src/index.ts — API on :4200
npm run build         # tsc -p tsconfig.json -> dist/
npm test               # vitest run
npm run typecheck

# web/
npm run dev           # vite dev server on :5373, proxies /api -> :4200
npm run build          # tsc -b && vite build -> dist/
npm run typecheck
```

Production is a single Express process: build `web/` first, then
`server/`, then `node server/dist/index.js` (see `render.yaml`'s
`buildCommand` — order matters, `server/src/api/app.ts` serves
`web/dist` as static files).

## Architecture

**Auth**: stateless signed session cookie (HMAC of `adminId.expiresAt`,
no server-side session store) — `server/src/services/authService.ts`,
identical pattern to `tp-opt/vendor-admin`. A single bootstrap admin is
created on first boot from `ADMIN_USERNAME`/`ADMIN_PASSWORD`/
`SESSION_SECRET` (only read when `data/admins.json` doesn't exist yet).
**One role only** (no admin/user split): this is a single-owner site, not
a multi-tenant product — closer to `vendor-admin`'s model than to
`tp-opt`'s.

**Persistence**: flat JSON files under `server/data/`, one `Store` class
per entity in `db.ts` (atomic write: temp file + rename). Paths derive
from `config.ts`, overridable via `DATA_DIR`/`ADMINS_PATH`/
`PROJECTS_PATH`/`SIGNUPS_PATH`.
**Known limitation, accepted for now**: Render's free plan has no
persistent disk, so this data is wiped on every service sleep/wake cycle
(~15 min idle). Fine for a low-traffic personal portfolio during initial
setup; revisit (paid plan + disk, or a real DB) if signup volume grows.

**Public vs admin routes** (`server/src/api/app.ts` +
`api/routes/{projects,signups}.ts`): unlike `tp-opt`'s router-level
`requireAuth` mounting, here `GET /api/projects` and `POST /api/signups`
must stay public while their sibling routes (`GET /projects/all`,
project CRUD, `GET /signups`) need auth — so `requireAuth` is applied
per-route, not at the router mount.

**CORS**: blanket `cors()` (all origins, no credentials) — `GET
/api/projects` and `POST /api/signups` are called cross-origin from
medy.site (a different domain, Canva-hosted); admin routes are only ever
called same-origin (the bundled `web/` app served by this same Express
process in prod), so cookie auth works without needing a credentialed
CORS config.

**Tests** (`server/tests/`) spin up the real Express app on an ephemeral
port (`app.listen(0)`) and hit it with `fetch`, rather than mocking — env
vars pointing at a fresh temp dir are set *before* dynamically importing
`api/app.js`/`db.js`, since `config.ts` reads them at import time. Follow
this pattern for new integration tests.

## CRM / Airtable

Client data (companies, contacts, projects, meetings, audits, proposals,
payments, roadmap, messages) lives in an **Airtable base** ("Medy CRM —
Clients & Projets", `baseId` in `config.ts`/`AIRTABLE_BASE_ID`), not in
this server's JSON stores — deliberate choice so Medy can browse/edit
records directly in Airtable's own UI, not just through this API.

- `server/src/airtable/client.ts` — generic `AirtableTable<F>` REST
  client (list with pagination, get, create, update, remove). Holds the
  only place `AIRTABLE_API_KEY` is read; the key never reaches `web/` or
  any public route.
- One file per entity in `server/src/airtable/` (`companies.ts`,
  `contacts.ts`, `clientProjects.ts`, `meetings.ts`, `audits.ts`,
  `proposals.ts`, `payments.ts`, `roadmap.ts`, `messages.ts`): each maps
  Airtable's French field names (exactly as created in the base — do not
  rename fields in Airtable without updating the matching `Fields`
  interface here) to a clean camelCase type, via `fromRecord`/`toFields`.
  Linked-record fields become `string[]` of record IDs (no nested
  resolution); attachment fields go through `mapping.ts`'s
  `readAttachments`/`writeAttachments` — writing an attachment means
  giving Airtable a URL to fetch, there is no file upload endpoint here.
- `server/src/airtable/crudRouter.ts` — the 9 resources are identical
  CRUD shapes, so routes are generated once (`createCrudRouter`) instead
  of hand-repeated; `server/src/api/routes/crm.ts` wires each repo to its
  path under `/api/crm/`.
- **Mounted entirely behind `requireAuth`** in `app.ts` (router-level,
  unlike `projects`/`signups`): every `/api/crm/*` route needs an admin
  session, no exceptions — this is client data, never public.
- Errors: `HttpError` (`httpError.ts`) carries an HTTP status; a
  catch-all error-handling middleware at the end of `app.ts` converts
  any thrown `HttpError` to its JSON response and logs anything else as
  a 500. `AirtableError extends HttpError` (in `airtable/client.ts`)
  logs the real Airtable status/body server-side but never leaks it to
  the client (always a generic 502).
- **Testing boundary**: `tests/mapping.test.ts` unit-tests the pure
  `readAttachments`/`writeAttachments`/`linkIds` helpers; `tests/crm.test.ts`
  checks every `/api/crm/*` resource 401s without a session — neither
  needs a real `AIRTABLE_API_KEY`. There is no integration test that
  hits real Airtable (no key available in CI/this environment); verify
  manually against the live base once `AIRTABLE_API_KEY` is set.

## Not yet done

- Render service not created/deployed yet.
- medy.site's own Canva Code JS has not been updated to call this API
  (still uses hard-coded portfolio cards and a `mailto:` signup link from
  the first design-canvas draft — see `docs/DESIGN.md`'s "Intégration
  côté medy.site" section for what needs to change once this is
  deployed).
- `AIRTABLE_API_KEY` not yet generated/set anywhere — `/api/crm/*` will
  500 until it is (see `.env.example`).
- No admin UI for the 9 CRM resources — Medy uses Airtable's own
  interface for now; build React pages here only if that stops being
  enough (e.g. once medy.site itself needs to read/write CRM data, which
  would need public, scoped endpoints this API doesn't expose yet).
- Messaging/telephony/video/transcription connectors (WhatsApp, click-
  to-call, visio, audio transcription) discussed but not implemented:
  proposed stack is Twilio (WhatsApp+SMS+voice), Daily.co (visio),
  AssemblyAI (transcription), Stripe (payment proposals) — blocked on
  the user creating those accounts and handing over API keys.
