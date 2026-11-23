# Roadmap: what is not built yet

## Phase 4: AI Redesign Studio (not connected)
Requirements: generation runs server-side only. Keys stay in a Supabase Edge Function or Cloudflare Worker secret and are never sent to the browser.

Proposed contract:
```
POST /functions/v1/redesign            (operator JWT required)
{ projectId, auditId, mode: preserve|modernize|app-like|rebrand|custom, instructions?, sections?: [id] }
→ { versionId, files: { "index.html", "styles.css", "app.js" }, sections: [{id, title}], changeSummary }
```
* Inputs are limited to approved audit findings and facts entered by the operator. The prompt forbids inventing testimonials, pricing, credentials or staff.
* Each version is stored in the `private` bucket as `projects/<id>/versions/<versionId>/…` with a `studio_docs` index → rollback.
* Previews are served from a separate origin (e.g. `preview.launchpage.link/<token>/`) inside a sandboxed iframe, so generated code is isolated from the app.
* Section regeneration sends `sections:[id]` and merges the result into the current version.
* The review screen (original vs redesign, before/after slider, device switcher, section approve/request changes) is built on top of these versions. The audit worker re-runs against the preview URL for automated retesting.

## Other gaps
* Hosted audit runner that polls `audit_jobs` (the table is ready).
* Client portal UI for `client_previews` (the table and RLS are ready).
* Before/after presentation export (depends on Phase 4).
* One-click Cloudflare deploy via API token stored server-side.
* Email notifications to followers when updates publish (Supabase Edge Function + a mail provider).
