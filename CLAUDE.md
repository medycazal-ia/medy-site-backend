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
- **`/api/*`** (any host) → the API: `GET /api/profile` (public — fetched
  by `public-site/index.html` on load to render the profile card) / `PUT
  /api/profile` (admin-only), `POST /api/signups` (public — the header
  "S'inscrire" form on `public-site/index.html` calls this directly),
  `GET /api/projects` (public but not yet called by that page — the
  portfolio cards are still hard-coded, see "Not yet done"), `/api/crm/*`
  (admin-only, Airtable-backed CRM), `/api/twilio/*` and `/api/email/send`
  (admin-only sends + Twilio's public signature-verified webhooks).

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
application code: it has its own `<style>`/`<script>` blocks, copied
over as-is from what was extracted out of Canva Code (see `.memory`).
The profile card's data comes from `GET /api/profile` (see "Profil
public" below); there is no more `localStorage`-based local admin panel
— it existed early on but only ever wrote to the visiting browser's own
storage, never to anything other visitors could see, so it was removed
rather than fixed (see `.memory`). Its one image,
`public-site/avatar.jpg`, replaced the original `canva://...` URL that
only resolved inside Canva's own runtime (worthless once served from
anywhere else) — first with a real cropped photo, then, at Medy's
request, with a headshot crop of the same illustrated bald/orange-glasses
character used on the "Medy fait du cinéma" / "Medy fait ton tiers
payant" portfolio cards (`public-site/studio-agent.jpg` /
`tierspayant-agent.jpg`), for visual consistency across the page. See
`.memory` for the fuller history (an AI-generated realistic headshot
also briefly stood in for it before this).

**Separate project, do not mix**: `medycazal-ia/tp-opt` (the
"Guichet Tiers Payants" / tierspayant.site product for opticians) is an
unrelated codebase. tierspayant.site is referenced here only as data —
one entry in the `projects` list, linked externally.

### "Medy est outillé" card / "Ma boîte secrète" page

The first "Mes créations" card (`public-site/index.html`) no longer
links to tierspayant.site (that link moved to the third card, "Medy
fait ton tiers payant") — it now links to `public-site/boite-secrete.html`,
a second static page (same host-routing rules apply, served whenever
`boite-secrete.html` is requested under `medy.site`). It reuses
`tierspayant-agent.jpg` (same illustrated character, no new image was
generated for it) plus a small inline SVG toolbox icon: **no image was
actually fetched from the internet** for this — this sandbox's egress
proxy blocks arbitrary external hosts (even CDNs like jsdelivr/wikimedia,
confirmed via `curl`), and the ElevenLabs image-generation free-tier
quota was still exhausted at the time — so a hand-drawn inline SVG
toolbox icon was used instead (matches the site's existing inline-SVG
icon style, e.g. the arrow icons on every card).

`boite-secrete.html` is a simple client-side-gated page (no server
route, no API): a lock screen asks for an access code, hashed with
`crypto.subtle.digest("SHA-256", …)` and compared to a hex digest
constant (`ACCESS_CODE_HASH`) in the page's script — the plaintext code
is never stored in the page source. **This is not real security** (fully
bypassable via view-source + a bit of JS console work) — it's a light
"secret box" gate for a personal site, not a protection for sensitive
data. The unlocked state is kept in `sessionStorage` (relocks on new
browser session, persists across reloads in the same tab). Current
access code: `MEDYOUTILS26` (told to Medy separately — change it by
replacing `ACCESS_CODE_HASH` with the SHA-256 hex digest of a new code).

Once unlocked, the page shows two grids of small cards, each linking
out to a tool's own site (real backend integration, not deep-linked):
"Mes outils" (Higgsfield, Canva, Resend, Render, Vercel, Make, Airtable
— tools Medy named directly, whether or not they happen to be Claude
MCP connectors) and "Connectés à Claude" (ElevenLabs, Gamma, Gmail,
Google Calendar, Google Drive, HyperFrames by HeyGen, Lovable, Slack,
Stripe, Webflow, Zoom — every connector that came back `connected: true`
from this Claude session's `ListConnectors` at the time, minus Canva/
Make/Airtable already listed under "Mes outils" to avoid duplicates),
plus a dashed "D'autres bientôt" placeholder card at the very end. Medy
said this list will grow; add new tool cards to the relevant `.tool-grid`
in `boite-secrete.html` following the same markup pattern (`.tool-icon`
background/color pair should stay visually distinct from existing
cards — see the inline `style=` on each for the palette used so far).

**Red/green access badge**: both the "Accès privé" badge on the
index.html card (`#access-badge`) and the one on `boite-secrete.html`'s
lock screen (`#lock-status-badge`) toggle between `.access-locked`/
`.status-locked` (red) and `.access-unlocked`/`.status-unlocked` (green)
based on the same `sessionStorage["boite-secrete-unlocked"]` flag —
red by default, green once unlocked this session. On `boite-secrete.html`,
submitting the correct code flips the badge to green **first**, then
waits 450ms (`setTimeout(unlock, 450)`, form inputs disabled meanwhile)
before actually revealing `#tools-screen` — a deliberate "green flash
before the page opens" requested by Medy, not a loading delay for any
real async work. `index.html`'s badge is only ever read on page load
(no live cross-tab sync) — it reflects whatever `sessionStorage` said at
the time `index.html` itself was loaded, e.g. after navigating back
from `boite-secrete.html` in the same tab.

## Profil public

The profile card on `public-site/index.html` (name, job title, bio,
email, phone, photo) is real backend data, not hard-coded — a deliberate
fix after the local `localStorage` admin panel turned out to only ever
affect the editing browser's own view, never what real visitors saw.

- `server/src/db.ts`'s `ProfileStore` — a **singleton**, not a list (one
  JSON object at `config.profilePath`, default `server/data/profile.json`),
  unlike `ProjectStore`/`SignupStore`. Same atomic-write pattern as the
  rest of `db.ts`.
- `server/src/api/routes/profile.ts`: `GET /api/profile` is public
  (fetched by `public-site/index.html` on load); `PUT /api/profile` is
  `requireAuth` — only Medy can change his own public profile.
- `public-site/index.html`'s `loadProfile()` fetches `/api/profile` on
  `DOMContentLoaded` and falls back to a hard-coded `DEFAULT_PROFILE`
  object if the request fails (service asleep, offline) — the page must
  never show blank fields just because the backend is unreachable.
  `renderPublic()` sets `#public-avatar`'s `src` directly now (fixed a
  real bug: the old code set `.style.backgroundImage` on an `<img>`,
  which has no effect on that element — harmless only because
  `photo_url` was always empty before this was wired up).
- `web/src/pages/Profile.tsx` (admin tab "Mon profil", first tab under
  "Portfolio du site"): a plain form, no schema-driven abstraction
  needed for a single-object resource like this (unlike the 9 CRM
  resources). `api.getPublicProfile`/`api.updatePublicProfile` in
  `web/src/api.ts` — named to avoid colliding with the pre-existing
  (and, as of this writing, still unused anywhere in the UI)
  `api.updateCredentials` for changing the admin's own login/password.
- Same persistence caveat as projects/signups: lost on every Render
  free-tier sleep cycle until there's a persistent disk or a real DB.
- `DEFAULT_PROFILE` (`server/src/db.ts`) and `public-site/index.html`'s
  own `DEFAULT_PROFILE` JS fallback were both updated together at Medy's
  request: `firstName` is now `"Medy Harry"`, `jobTitle` is now
  `"Consultant Digital et IA"` (was `"Consultant RH et Digital"`). This
  only changes the **code-level default** — since the real live profile
  lives in Render's ephemeral `server/data/profile.json` (see caveat
  above), whatever Medy already saved via the admin "Mon profil" form in
  production takes precedence and won't change until he re-saves it
  there himself (or the service sleeps and falls back to this new
  default).

### CV pop-up ("Voir mon CV")

`public-site/index.html` has a "Voir mon CV" button (`#cv-trigger`,
right under the bio in the profile card) that opens an in-page modal
(`#cv-modal-overlay`/`#cv-modal`, plain CSS + vanilla JS, no library) —
this is what Medy called a "popote" (a garbled "pop-up"). The modal
reuses live profile data (name, job title, bio, avatar — same source as
the rest of the page, kept in sync from `renderPublic()`) and adds a
video placeholder block (`#cv-video-btn`) for the video Medy said he'll
record later about his background, travels and experience: it reads
`data-video-url` off the button, and since that's currently empty,
clicking it just shows a "Vidéo bientôt disponible" message instead of
opening anything. **To wire up the real video once it exists**: set
`data-video-url="<url>"` on `#cv-video-btn` in the HTML — no JS change
needed, the click handler already opens whatever URL is there in a new
tab. Closes via the × button, clicking the overlay backdrop, or Escape.

No CV content (work history, dates, past roles) was invented for this —
Medy said the actual story will be told in the video, so the modal's
"Parcours & expériences" section stays a short pointer to that video
rather than fabricated biographical text.

## Inscriptions

`POST /api/signups` is deliberately reused by two different callers
instead of having a separate admin-only creation route — a signup was
never sensitive data, so there's no reason to gate creation behind
`requireAuth` even when it's Medy adding one himself:

- `public-site/index.html`'s header "S'inscrire" form (email only, no
  name field — kept low-friction for an anonymous visitor) posts here
  with `source: "header"`.
- `web/src/pages/Signups.tsx`'s "Ajouter une inscription" form (name
  optional + email) posts to the exact same endpoint with
  `source: "admin"`, for logging someone Medy met in person or spoke to
  by phone. `Signup.name` (`server/src/types.ts`) is optional for this
  reason — a header signup never sends one.
- Both land in the same `SignupStore` / admin table; `source`
  distinguishes them after the fact. `GET /api/signups` (listing) stays
  `requireAuth` — reading the list is what needs to be admin-only, not
  creating an entry.

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
- `App.tsx` nests two tab levels: `Portfolio du site` (Profil/Projects/
  Signups pages — see "Profil public" above for the first one) vs
  `Clients` (the 9 CRM tabs from `RESOURCE_ORDER`). Switching CRM tabs
  remounts `CrmResourcePage` (React `key`) rather than trying to reset
  its internal state by hand.
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

## Email (Resend)

Same shape and same reasoning as Twilio, much smaller: one provider, one
send path, no inbound webhook (Resend has one for delivery events, not
wired up — not needed yet).

- `server/src/email/client.ts` — `sendEmail(to, subject, text)`, a plain
  `fetch` call to Resend's REST API (no SDK dependency, matching the
  `airtable/client.ts` style — no need for a client library over a
  single simple POST endpoint). Throws a clear `HttpError` naming
  whichever of `RESEND_API_KEY`/`EMAIL_FROM` is missing, exactly like
  `twilio/client.ts` does for its own env vars.
- `server/src/api/routes/email.ts`: `POST /api/email/send`, mounted
  behind `requireAuth` at the router level in `app.ts` (unlike Twilio's
  per-route mounting — there's no public webhook counterpart here, so
  the whole router can require a session). Logs a `CrmMessage` row
  (Airtable `Messages`, canal `"Email"`) after the send succeeds, same
  as Twilio's outbound paths.
- `web/src/crm/MessageComposer.tsx` gained a third mode (`"message" |
  "email" | "call"`) alongside the existing SMS/WhatsApp/click-to-call
  ones — same component, not a separate one, since it's the same
  "compose and log to Messages" shape. Picking a contact prefills their
  email instead of phone when in email mode.
- **Testing boundary**: `tests/email.test.ts` mirrors `twilio.test.ts`
  exactly — auth gate (401), payload validation (400), missing-env-var
  error (500 naming `RESEND_API_KEY`) — no real send, no `RESEND_API_KEY`
  in this environment.

## Not yet done

- `medy.site` custom domain is attached in Render (Custom Domains: both
  `medy.site` and `www.medy.site` verified, certificate issued, DNS zone
  at the registrar has the matching `A`/`CNAME` records) — the profile
  data is real and served from this backend (see "Profil public"
  below). Portfolio cards ("Mes créations") are still the hard-coded
  markup from the Canva extraction, not yet reading `GET /api/projects`
  — see next bullet.
- `public-site/index.html` still doesn't call `GET /api/projects` — the
  portfolio cards ("Mes créations") are still the hard-coded markup
  extracted from Canva Code, not yet wired to this repo's own API
  (unlike the profile card and the signup form, which are both wired —
  see "Profil public" and "Inscriptions" below). Low priority: the page
  works fine as-is; wiring it up mainly matters if Medy wants to
  add/edit portfolio projects without a code change.
- `AIRTABLE_API_KEY` is set and working in production — `/api/crm/*` is
  live. Two gotchas hit while setting it up, worth knowing if `/api/crm/*`
  ever 401s/403s/404s again after a key rotation: (1) Airtable's token
  list page only ever shows the token's short *ID*, never the full
  secret again after creation — copying that ID instead of the secret
  shown once at creation time looks like a valid-but-wrong key and fails
  auth; (2) a token's **Access** (which bases/workspaces it can reach) is
  separate from its **Scopes** (what it's allowed to do) — a token can
  have perfect scopes and zero bases granted, which reads as "invalid
  permissions" or a bare 404, not as an obviously-empty-access error.
- `TWILIO_*` is fully set (SID/token/phone numbers) and click-to-call
  works in production. SMS/WhatsApp free-text sends still fail on this
  **trial** Twilio account, for two separate reasons: (1) trial accounts
  can only message phone numbers added as a Verified Caller ID in the
  Twilio console; (2) trial accounts can only send **predefined SMS
  templates**, not arbitrary text — this specific limit only lifts by
  moving the account to pay-as-you-go billing (adding a card), it's not
  a config fix. WhatsApp's sandbox allows free text instead of templates,
  but only within 24h of the recipient's last inbound message to the
  sandbox number (re-sending the "join <sandbox-name>" code refreshes
  that window).
- Visio (Daily.co) and audio transcription (AssemblyAI) — proposed but
  nothing built yet, same blocker (no account/API key).
- `RESEND_API_KEY` is set and `medy.site` is a verified sending domain
  in Resend (DKIM + FPS records in the registrar's DNS zone, "Activer la
  réception" left off since Medy already has real mailboxes on this
  domain elsewhere — enabling it would fight that setup over the `MX`
  record). `EMAIL_FROM` should be an address on that verified domain
  (e.g. `contact@medy.site`), not the default `onboarding@resend.dev` —
  the Resend sandbox address can only email the account owner and is
  more likely to land in spam.
- Payment proposals (Stripe) — the `Paiements`/`Propositions commerciales`
  Airtable tables exist and are reachable via `/api/crm/payments` and
  `/api/crm/proposals`, but nothing generates a real Stripe payment link
  yet.
