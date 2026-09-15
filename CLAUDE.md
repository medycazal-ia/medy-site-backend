# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**One Express service, three faces**, split by what's requesting it:

- **`medy.site` / `www.medy.site`** (any browser) → `public-site/index.html`,
  Medy Cazal's personal portfolio page ("Profil Connecté"). Fully static
  (HTML/CSS/JS, Tailwind + Lucide via CDN, `localStorage` for the local
  "Administration" panel — profile/links/media). Originally built and
  hosted on **Canva Sites**; migrated here (as a static file this repo
  serves) specifically so Medy isn't dependent on Canva Code's editor for
  every change — see `.memory` for that history. `app.ts` picks this vs.
  the admin app purely by the request's `Host` header (see "Public site
  host routing" below); there is no other distinction.
- **Any other host** (`medy-site-backend.onrender.com`, `localhost`, ...)
  → the React admin app (`web/dist`), behind a login. This is what the
  hidden 5-click trigger on the public site's logo opens in a new tab.
- **`/api/*`** (any host) → the API: `GET /api/projects` / `POST
  /api/signups` (public — support the portfolio/signup pieces of
  `public-site/index.html`, though that page doesn't actually call them
  yet, see "Not yet done"), `/api/crm/*` (admin-only, Airtable-backed
  CRM), `/api/twilio/*` (admin-only sends + public signature-verified
  webhooks).

The React admin app (`web/`) covers portfolio/signups management, the 9
CRM resources (generic schema-driven CRUD — see "CRM admin UI" below),
and a Twilio composer (send SMS/WhatsApp, click-to-call) on the Messages
tab. Medy can still use Airtable's own interface directly for CRM data if
that's ever more convenient. See `docs/DESIGN.md` for the fuller
rationale and `README.md` for setup/deployment.

Live deployment: pushed to Render (`render.yaml` at repo root is the
blueprint) — custom domain (`medy.site`) not yet attached in the Render
dashboard, see README's "Site public medy.site".

## Public site host routing

`server/src/api/app.ts`: a middleware early in the chain checks
`req.hostname` against `config.publicSite.host` (env `PUBLIC_SITE_HOST`,
default `"medy.site"`) and its `www.` variant. A match (and skipping any
`/api/*` path, which always falls through regardless of host) serves
`public-site/` via `express.static`, falling back to
`public-site/index.html` for any other GET — otherwise the request falls
through to the existing `web/dist` admin static+catch-all, unchanged.
Test locally with `curl -H "Host: medy.site" http://localhost:4200/`
before touching real DNS.

`public-site/index.html` is a **complete, self-contained page** — no
build step, no dependency on `server/` or `web/` beyond being served by
the same process. Treat edits to it as editing a static asset, not
application code: it has its own `<style>`/`<script>` blocks and its own
`localStorage`-based state management (`STORE_KEY`), copied over as-is
from what was extracted out of Canva Code (see `.memory`). Its one image,
`public-site/avatar.jpg`, is a real photo of Medy (square-cropped from a
phone photo he uploaded), replacing the original `canva://...` URL that
only resolved inside Canva's own runtime — worthless once served from
anywhere else. (An AI-generated headshot briefly stood in for it — see
`.memory` for why that got replaced.)

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

## CRM admin UI (`web/src/crm/`)

The 9 CRM resources share an identical CRUD shape server-side
(`createCrudRouter`); the admin UI mirrors that with a single generic
page instead of 9 near-duplicate React files:

- `crm/schema.ts` — the only place that knows each resource's fields,
  types (`text`/`textarea`/`number`/`date`/`datetime`/`select`/`link`/
  `attachments`), select options, and which other resource a `link`
  field points to (`RESOURCES`, `RESOURCE_ORDER`). Adding a 10th CRM
  resource server-side means adding one entry here — no new component.
- `crm/CrmResourcePage.tsx` — given a `resourceKey`, fetches that
  resource's list AND every resource its `link` fields point to (to
  resolve IDs to readable labels), then renders a form (add/edit) and a
  table from the schema alone. `link` fields render as toggleable chips
  picked from the target resource's live list; `attachments` fields
  accept a URL (+ optional filename) since there's no upload endpoint —
  matches `writeAttachments` server-side, which fetches from a URL too.
- `crm/MessageComposer.tsx` — sits above the Messages resource table
  only, sends real SMS/WhatsApp/calls through `/api/twilio/*` (distinct
  from the generic CRUD form below it, which just edits `Messages` rows
  directly without sending anything — useful for logging a call made
  outside Twilio, e.g. from a personal phone).
- `App.tsx` nests two tab levels: `Portfolio du site` (existing
  Projects/Signups pages, untouched) vs `Clients` (the 9 CRM tabs from
  `RESOURCE_ORDER`). Switching CRM tabs remounts `CrmResourcePage` (React
  `key`) rather than trying to reset its internal state by hand.
- Degrades visibly, not silently: with no `AIRTABLE_API_KEY` (or no
  `TWILIO_*`), every CRM tab still renders its full form and an empty
  table, with the server's `HttpError` message shown in the usual
  `.error-banner` — verified by hand (Puppeteer + a local build) since
  this has no automated test of its own; screenshots weren't kept, but
  re-run the same check after any change here (start `server/dist` with
  no `AIRTABLE_API_KEY`/`TWILIO_*`, log in, click through all tabs) if
  you touch this code — a raw stack trace or blank tab means something
  broke silently.

## Messagerie / téléphonie (Twilio)

`server/src/twilio/` wraps the official `twilio` SDK. Nothing here talks
to Twilio unless `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` are set — every
call path throws a clear `HttpError` naming the missing env var instead
of failing obscurely.

- `twilio/client.ts` — `sendMessage(channel, to, body)` (SMS or WhatsApp,
  same Twilio Messages API, differs only by `from`/`to` prefix) and
  `initiateClickToCall(to)` (calls `TWILIO_MY_PHONE_NUMBER` first; once
  Medy answers, Twilio requests TwiML from `/api/twilio/voice/connect`
  which dials the client's number — the classic click-to-call pattern,
  Medy's own number never dials out directly).
- `api/routes/twilio.ts`: `POST /api/twilio/messages` and `POST
  /api/twilio/call` are `requireAuth` (only Medy can send messages or
  place calls); both log a `CrmMessage` row (Airtable `Messages` table)
  after the Twilio call succeeds, tagged `Sortant`. `POST
  /api/twilio/inbound` (SMS/WhatsApp received) and `POST
  /api/twilio/voice/connect` (Twilio requesting the dial TwiML) are
  necessarily public — Twilio can't send a session cookie — so they're
  protected instead by `twilio/verifySignature.ts`'s
  `verifyTwilioSignature` middleware (checks `X-Twilio-Signature` against
  `PUBLIC_BASE_URL + req.originalUrl`; refuses with 500 if
  `TWILIO_AUTH_TOKEN`/`PUBLIC_BASE_URL` aren't set, 403 if the signature
  doesn't match). `inbound` tries to match the sender's phone number to
  an existing `Contact` (`contactRepo.findByPhone`, a loose last-9-digits
  comparison — Airtable formula matching was too brittle across phone
  formats) before logging the message as `Entrant`.
- Needs `express.urlencoded()` in `app.ts` alongside `express.json()`:
  Twilio posts webhooks as form-encoded, never JSON.
- `PUBLIC_BASE_URL` must exactly match the URL Twilio is configured to
  hit (falls back to Render's auto-injected `RENDER_EXTERNAL_URL` if
  unset) — a mismatch breaks signature verification. Doesn't work from
  localhost without a public tunnel (ngrok); Twilio must be able to reach
  it.
- **Testing boundary** (same reasoning as Airtable): `tests/twilio.test.ts`
  checks the auth/signature gates (401 without a session, 500 when
  Twilio env vars are absent) — no test sends a real message, no
  `TWILIO_*` credentials exist in this environment.

## Not yet done

- `medy.site` custom domain not yet attached in the Render dashboard —
  `public-site/index.html` only serves today under whatever host the
  Render service answers to when its `Host` header matches
  `config.publicSite.host`; until DNS + the dashboard step are done,
  visitors to the real medy.site still see whatever hosted it before
  (Canva, if not yet repointed).
- `public-site/index.html` still doesn't call `GET /api/projects` /
  `POST /api/signups` — it's the page as extracted from Canva Code
  (hard-coded portfolio cards, `mailto:` signup link), not yet wired to
  this repo's own API. Low priority: the page works fine as-is; wiring it
  up mainly matters if Medy wants to add/edit portfolio projects without
  a code change.
- `AIRTABLE_API_KEY` not yet generated/set anywhere — `/api/crm/*` will
  500 until it is (see `.env.example`).
- All `TWILIO_*` env vars unset — nothing in `server/src/twilio/` can run
  until Medy creates a Twilio account and hands over Account
  SID/Auth Token/a phone number (see `.env.example` for exactly what's
  needed, including the WhatsApp sandbox number for testing before Meta
  Business approval).
- Visio (Daily.co) and audio transcription (AssemblyAI) — proposed but
  nothing built yet, same blocker (no account/API key).
- Payment proposals (Stripe) — the `Paiements`/`Propositions commerciales`
  Airtable tables exist and are reachable via `/api/crm/payments` and
  `/api/crm/proposals`, but nothing generates a real Stripe payment link
  yet.
