# Deploy

## Cloudflare Pages (recommended)
1. Push this repo to GitHub (`launchpage-app`).
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build command: *(none)* · Build output directory: `/`
4. Custom domain → `launchpage.link` (DNS already on Cloudflare, or move nameservers from Namecheap).
5. `_headers` in the repo sets `sw.js` to no-cache and adds security headers.

Every push to `main` deploys automatically.

## Namecheap cPanel
1. cPanel → File Manager → `public_html` (or the addon-domain folder).
2. Settings → tick **Show Hidden Files** (so `.well-known` and `.htaccess` upload).
3. Upload a ZIP of the repo (without `workers/`, `supabase/`, `docs/`), then Extract.
4. `.htaccess` forces HTTPS and disables caching for `sw.js`.
5. SSL/TLS Status → run AutoSSL if the domain shows no certificate.

## Google Play (Trusted Web Activity)
1. Deploy over HTTPS first. Then run the audit worker against the live URL and confirm "PWA install eligibility: meets checked criteria".
2. Go to pwabuilder.com → enter `https://launchpage.link` → Package for Android (or use `bubblewrap init`).
3. In Play Console, copy the **App signing** SHA-256 fingerprint into `.well-known/assetlinks.json` and set `package_name`. Redeploy.
4. Upload the generated `.aab`. Store screenshots are in `img/screenshot-*.png`.

## Client sites
The Studio **never** deploys to a client domain by itself. Before a project can be marked *Launched*, record the explicit approval in Project → Deploy (with an approval reference). Then deploy with the client's credentials using the steps above, or hand off the ZIP.
