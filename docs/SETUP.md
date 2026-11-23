# Setup

## 1. Run locally
```bash
python3 -m http.server 8080      # or any static server
# open http://localhost:8080
```
Service workers need `localhost` or HTTPS.

## 2. Connect Supabase (Cloud mode)
1. Create a project at supabase.com.
2. SQL Editor → run, in order:
   - `supabase/migrations/20261123000001_init.sql`
   - `supabase/migrations/20261123000002_seed_launches.sql`
3. Authentication → URL Configuration → add your site URL (e.g. `https://launchpage.link`) to **Site URL** and **Redirect URLs**.
4. Project Settings → API → copy **Project URL** and **anon public** key into `js/config.js`.
   **Never** put the `service_role` key or any AI key in the frontend.
5. Open `/#/studio`, sign in with your email (magic link).
6. Make yourself an operator (SQL editor, once):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### Roles
| role | can |
|---|---|
| member | sign in; nothing private |
| client | see `client_previews` rows approved for their email, record approve/changes |
| operator | full Studio, read submissions, publish launches & updates |
| admin | operator + change roles |

### What RLS guarantees (tested on Postgres 16)
* Visitors can **insert** waitlist / help / founders submissions only with `consent = true`, and can never read them back.
* Private launches and draft / future-scheduled updates are invisible to the public.
* Members cannot promote themselves.
* `studio_docs` (projects, clients, audits, private notes) are operator-only.

## 3. Moving local data to the cloud
Studio → Tools → Backup & Restore → **Export backup** on the device that has the data. After you connect Supabase and sign in as operator on that same device, each project, client and audit is pushed to the cloud the next time you save it. Public submissions made in local mode stay on that device. Re-enter important ones or export the CSV from Studio → Tools → Submissions.

## 4. Audit worker
```bash
cd workers/audit
npm install                 # installs Playwright + Chromium
node audit.mjs https://client-site.com --out reports --max-pages 15
node audit.mjs http://localhost:8080 --allow-local    # your own dev server
npm i lighthouse chrome-launcher && node audit.mjs https://site.com --lighthouse
```
Import `reports/<host>-<time>/report.json` in Studio → Project → Findings.
Private/internal IPs are refused unless `--allow-local` is passed (SSRF guard for hosted use).

**Hosted worker (next step):** run the same script on a server/container that polls `public.audit_jobs` (status `queued`) using the `service_role` key, writes `report` + `status`, and keeps the key server-side.
