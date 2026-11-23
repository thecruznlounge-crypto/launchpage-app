# LaunchPage.link 2.0

**Who Can? I Can!** · Discover. Build. Launch.

A mobile-first, installable PWA with two connected experiences:

1. **Public LaunchPage**: discover upcoming launches, follow approved progress, join waitlists, and offer help through Opportunity Radar / I Can Help and the Collective Founders Club.
2. **Private LaunchPage Studio**: projects, real website audits, milestone and progress publishing, client records, PWA export, and a deployment approval gate.

Vanilla HTML, CSS and JS with no build step. You can upload it to cPanel or Cloudflare Pages exactly as it is.

## Status by phase

| Phase | What | Status |
|---|---|---|
| 1 · Public redesign | New design system, Home / Launches / Detail / I Can / Saved / HQ, search, filters, waitlist, share, follow, announcements, one-tap install, offline | ✅ Built and browser-tested |
| 2 · Backend foundation | Supabase auth (magic link), roles, RLS, submissions, launches, Studio sync, storage buckets | ✅ Schema and RLS tested on Postgres 16. ⚠️ App ↔ Supabase wiring is written but **not yet tested against a live Supabase project** |
| 3 · Automated audits | `workers/audit`: Playwright worker that crawls pages, takes screenshots, checks links, overflow, accessibility, SEO, forms, console/network errors, PWA eligibility, and Lighthouse (optional). Studio imports the reports | ✅ Worker and import tested locally. Hosted queue (`audit_jobs` table) is ready but no hosted runner yet |
| 4 · AI Redesign Studio | Server-side generation, previews, section regeneration, versions | ⛔ Not built. The Studio says "Not connected" and has no fake buttons. See `docs/ROADMAP.md` |
| 5 · Public progress | Studio milestones (done → approved → published) and Draft / Scheduled / Published updates feed the public pages | ✅ Built and tested (local mode) |
| 6 · Production & delivery | Clients (estimates, deposits, payment status, history), PWA Kit ZIP, CSV export, audit Markdown and PDF (print) export, backup and restore, deploy checklist with an explicit-approval gate | ✅ Built and tested. ⛔ Before/after presentations and one-click deploy integrations are not built |

## Modes

* **Local mode** (default, `js/config.js` left blank): all data stays in this browser on this device. Studio is protected by a device PIN. Nothing syncs.
* **Cloud mode**: fill in `supabaseUrl` and `supabaseAnonKey` in `js/config.js`. See `docs/SETUP.md`.

## Structure

```
index.html            app shell
manifest.webmanifest  PWA manifest (maskable icon, shortcuts, screenshots)
sw.js                 offline-first service worker
css/styles.css        design system
js/config.js          runtime config (Supabase URL + anon key ONLY)
js/data.js            13 seeded launches (preserved from v1)
js/store.js           data layer, v1→v2 migration, Supabase adapter
js/app.js             router, shell, public experience
js/studio.js          Studio
js/zip.js             dependency-free ZIP writer
img/                  icons + store screenshots
.well-known/          assetlinks.json template (Play Store / TWA)
supabase/migrations/  schema + RLS + seed
workers/audit/        audit worker (Node + Playwright)
docs/                 SETUP, DEPLOY, ROADMAP, v1 README
```

## Data migration from v1

The v1 keys `lp_saved` and `lp_signups` are read in place. Legacy signups get an id and a type, and nothing is deleted. To move a device's data to Supabase, use Studio → Tools → Backup & Restore. See `docs/SETUP.md` for the import step.

## Changes from v1

* "Graduate to mypwa.store" now reads **Graduate to Hunnyhive** (`hunnyhive.app`). You can configure this in `js/config.js`.
* Public progress is now calculated only from owner-approved, published milestones. All 13 seeds keep their original milestones, so they still show 50%.
