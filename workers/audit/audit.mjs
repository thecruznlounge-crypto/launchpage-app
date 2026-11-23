#!/usr/bin/env node
/* LaunchPage audit worker — evidence-based website audit in a real headless browser.
   Usage: node audit.mjs <url> [--out reports] [--max-pages 10] [--lighthouse] [--allow-local]
   Output: <out>/<host>-<timestamp>/report.json (+ PNG screenshots). Import report.json in Studio → Project → Findings.
   Nothing is estimated: every issue carries the evidence that produced it and is marked
   "confirmed" (deterministic check) or "potential" (heuristic — needs human verification). */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import crypto from 'node:crypto';

const VERSION = '1.0.0';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = k => args.includes(k);
const target = args.find(a => /^https?:\/\//i.test(a) || (!a.startsWith('--') && a.includes('.')));
const OUT = opt('--out', 'reports');
const MAX = Math.max(1, Math.min(50, parseInt(opt('--max-pages', '10'), 10) || 10));
const ALLOW_LOCAL = flag('--allow-local');

/* ---------- URL validation + SSRF guard ---------- */
function isPrivateIP(ip) {
  if (net.isIPv4(ip)) { const [a, b] = ip.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127); }
  const l = ip.toLowerCase(); return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l === '::';
}
async function validateUrl(raw) {
  if (!raw) throw new Error('Usage: node audit.mjs https://example.com');
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { throw new Error('Invalid URL: ' + raw); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) URLs can be audited');
  if (!ALLOW_LOCAL) {
    const addrs = net.isIP(u.hostname) ? [u.hostname] : (await dns.lookup(u.hostname, { all: true }).catch(() => { throw new Error('Domain does not resolve: ' + u.hostname); })).map(a => a.address);
    if (addrs.some(isPrivateIP)) throw new Error('Refusing to audit a private/internal address (use --allow-local for your own dev server)');
  }
  u.hash = ''; return u;
}

/* ---------- issue helpers ---------- */
const issues = [];
const seen = new Set();
function add(i) {
  const key = i.title + '|' + i.page + '|' + (i.key || '');
  if (seen.has(key)) return; seen.add(key);
  issues.push({ id: crypto.createHash('sha1').update(key).digest('hex').slice(0, 10), status: 'open', ...i, key: undefined });
}
const norm = h => { try { const u = new URL(h); u.hash = ''; return u.href; } catch { return null; } };

async function main() {
  const start = await validateUrl(target);
  const origin = start.origin;
  const startedAt = new Date().toISOString();
  const dir = path.join(OUT, `${start.hostname}-${startedAt.replace(/[:.]/g, '-')}`);
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: false });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 LaunchPageAudit/' + VERSION });
  const queue = [start.href], visited = new Set(), pages = [], allLinks = new Map();

  while (queue.length && pages.length < MAX) {
    const url = queue.shift(); if (visited.has(url)) continue; visited.add(url);
    const rec = { url, files: {} };
    process.stdout.write(`• ${url}\n`);
    for (const [kind, ctx] of [['mobile', mobile], ['desktop', desktop]]) {
      const page = await ctx.newPage();
      const consoleErrs = [], failed = [], bad = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 300)); });
      page.on('pageerror', e => consoleErrs.push('Uncaught: ' + e.message.slice(0, 300)));
      page.on('requestfailed', r => failed.push(`${r.failure()?.errorText || 'failed'} ${r.url()}`.slice(0, 300)));
      page.on('response', r => { if (r.status() >= 400 && r.url() !== url) bad.push(`${r.status()} ${r.url()}`.slice(0, 300)); });
      let resp;
      try { resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 }); await page.waitForTimeout(1200); }
      catch (e) { add({ severity: 'high', category: 'Availability', page: url, title: 'Page failed to load', description: `The page did not finish loading on ${kind}.`, evidence: e.message.slice(0, 400), suggestion: 'Check hosting, DNS and server errors for this URL.', verification: 'confirmed', key: kind }); await page.close(); continue; }
      const status = resp?.status() ?? 0; rec.status = rec.status ?? status;
      if (status >= 400) add({ severity: 'high', category: 'Availability', page: url, title: `Page returns HTTP ${status}`, description: 'Visitors get an error response.', evidence: `GET ${url} → ${status}`, suggestion: 'Fix the route or redirect it to a working page.', verification: 'confirmed' });
      const shot = path.join(dir, `${pages.length}-${kind}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {}); rec.files[kind] = path.basename(shot);
      if (kind === 'mobile' && pages.length < 5) { const jpg = await page.screenshot({ type: 'jpeg', quality: 45 }).catch(() => null); if (jpg) rec.shots = { mobile: 'data:image/jpeg;base64,' + jpg.toString('base64') }; }

      const d = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const sel = el => el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        const name = el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.querySelector('img[alt]')?.alt || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.innerText) || '').trim();
        const iw = innerWidth;
        const overflow = document.documentElement.scrollWidth > iw + 1 ? [...document.querySelectorAll('body *')].filter(e => vis(e) && e.getBoundingClientRect().right > iw + 2 && getComputedStyle(e).position !== 'fixed').slice(0, 6).map(e => `${sel(e)} right=${Math.round(e.getBoundingClientRect().right)}px`) : [];
        const imgsNoAlt = [...document.images].filter(i => !i.hasAttribute('alt') && vis(i)).slice(0, 10).map(i => i.currentSrc || i.src);
        const inputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea')].filter(vis);
        const unlabeled = inputs.filter(i => !(i.labels && i.labels.length) && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby') && !i.title).slice(0, 10).map(i => sel(i) + (i.name ? `[name=${i.name}]` : '') + (i.placeholder ? ` placeholder="${i.placeholder}"` : ''));
        const clickables = [...document.querySelectorAll('a[href],button,[role=button]')].filter(vis);
        const noName = clickables.filter(e => !name(e)).slice(0, 10).map(e => e.outerHTML.slice(0, 140));
        const small = clickables.filter(e => { const r = e.getBoundingClientRect(); return (r.width < 24 || r.height < 24) && !e.closest('p,li') }).slice(0, 8).map(e => `${sel(e)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} "${name(e).slice(0, 30)}"`);
        const top = clickables.filter(e => e.getBoundingClientRect().top < 200);
        const overlaps = [];
        for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
          const a = top[i].getBoundingClientRect(), b = top[j].getBoundingClientRect();
          if (top[i].contains(top[j]) || top[j].contains(top[i])) continue;
          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (ix * iy > 0.3 * Math.min(a.width * a.height, b.width * b.height)) overlaps.push(`"${name(top[i]).slice(0, 25)}" ⟷ "${name(top[j]).slice(0, 25)}"`);
        }
        const ids = {}; document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1);
        const forms = [...document.forms].map(f => ({ action: f.getAttribute('action') || '(same page)', method: (f.method || 'get').toUpperCase(), fields: f.elements.length, hasSubmit: !!f.querySelector('[type=submit],button:not([type=button])'), password: !!f.querySelector('input[type=password]'), emailNoAuto: [...f.querySelectorAll('input[type=email]')].filter(i => !i.autocomplete).length }));
        const nav = performance.getEntriesByType('navigation')[0];
        const bytes = performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), nav?.transferSize || 0);
        return {
          title: document.title, desc: document.querySelector('meta[name=description]')?.content || '', h1: [...document.querySelectorAll('h1')].filter(vis).map(h => h.innerText.trim().slice(0, 60)),
          viewport: document.querySelector('meta[name=viewport]')?.content || '', lang: document.documentElement.lang, canonical: document.querySelector('link[rel=canonical]')?.href || '',
          robots: document.querySelector('meta[name=robots]')?.content || '', manifest: document.querySelector('link[rel=manifest]')?.href || '',
          links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => /^https?:/.test(h)),
          overflow, imgsNoAlt, unlabeled, noName, small, overlaps: overlaps.slice(0, 6), dupIds: Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k).slice(0, 8), forms,
          menuBtn: !!document.querySelector('[aria-expanded],button[aria-controls],.menu-toggle,.hamburger,.navbar-toggler'),
          perf: nav ? { ttfb: Math.round(nav.responseStart), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), bytes } : null,
          proto: location.protocol
        };
      });
      rec.title = rec.title ?? d.title;
      const P = { page: url };
      if (consoleErrs.length) add({ ...P, severity: 'medium', category: 'Console', title: `JavaScript errors in console (${kind})`, description: `${consoleErrs.length} console error(s) while loading the page.`, evidence: consoleErrs.slice(0, 8).join('\n'), suggestion: 'Fix the scripts throwing these errors; they can break features silently.', verification: 'confirmed', key: kind });
      if (bad.length) add({ ...P, severity: 'medium', category: 'Network', title: 'Resources returning HTTP errors', description: `${bad.length} request(s) on this page returned 4xx/5xx.`, evidence: [...new Set(bad)].slice(0, 10).join('\n'), suggestion: 'Remove or fix references to missing assets/APIs.', verification: 'confirmed' });
      if (failed.length) add({ ...P, severity: 'low', category: 'Network', title: 'Requests failed to complete', description: 'Some requests failed (blocked, timed out, or aborted). Some may be analytics/ad blockers.', evidence: [...new Set(failed)].slice(0, 10).join('\n'), suggestion: 'Check each URL; remove dead third-party scripts.', verification: 'potential' });
      if (kind === 'mobile') {
        if (d.overflow.length) add({ ...P, severity: 'medium', category: 'Layout', title: 'Horizontal overflow on mobile', description: 'Content is wider than a 390px phone screen, causing sideways scrolling.', evidence: d.overflow.join('\n'), suggestion: 'Constrain widths (max-width:100%), allow wrapping, or fix fixed-width elements listed.', verification: 'confirmed' });
        if (!/width=device-width/.test(d.viewport)) add({ ...P, severity: 'high', category: 'Mobile', title: 'Missing responsive viewport meta tag', description: 'Without it, phones render the desktop layout zoomed out.', evidence: `<meta name="viewport" content="${d.viewport}">`, suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', verification: 'confirmed' });
        if (d.small.length) add({ ...P, severity: 'low', category: 'Accessibility', title: 'Small tap targets on mobile', description: 'Interactive elements smaller than 24×24px are hard to tap.', evidence: d.small.join('\n'), suggestion: 'Give buttons/links at least 44×44px touch area.', verification: 'potential' });
        if (d.overlaps.length) add({ ...P, severity: 'high', category: 'Navigation', title: 'Overlapping header controls on mobile', description: 'Interactive elements in the header overlap each other, making them hard to use or discover.', evidence: d.overlaps.join('\n'), suggestion: 'Collapse the navigation into a menu on small screens and give the logo its own space.', verification: 'potential' });
        if (d.perf) { const p = d.perf; if (p.load > 5000 || p.bytes > 3e6) add({ ...P, severity: 'medium', category: 'Performance', title: 'Slow or heavy page load (mobile)', description: 'Measured in this run with the browser Navigation Timing API (not a lab score).', evidence: `TTFB ${p.ttfb}ms · DOMContentLoaded ${p.dcl}ms · load ${p.load}ms · ${(p.bytes / 1e6).toFixed(2)}MB transferred`, suggestion: 'Compress images (WebP/AVIF), defer non-critical scripts, enable caching/CDN.', verification: 'potential' }); rec.perf = p; }
        // navigation test: try the menu toggle
        if (d.menuBtn) {
          const ok = await page.evaluate(async () => {
            const b = document.querySelector('[aria-expanded],button[aria-controls],.menu-toggle,.hamburger,.navbar-toggler'); if (!b) return null;
            const before = [...document.querySelectorAll('a[href]')].filter(a => a.getBoundingClientRect().width > 0).length; b.click(); await new Promise(r => setTimeout(r, 600));
            return { before, after: [...document.querySelectorAll('a[href]')].filter(a => a.getBoundingClientRect().width > 0).length, expanded: b.getAttribute('aria-expanded') };
          }).catch(() => null);
          if (ok && ok.after <= ok.before && ok.expanded !== 'true') add({ ...P, severity: 'medium', category: 'Navigation', title: 'Mobile menu toggle did not reveal links', description: 'Tapping the menu button did not show any additional navigation links.', evidence: `visible links before ${ok.before}, after ${ok.after}, aria-expanded=${ok.expanded}`, suggestion: 'Verify the menu opens on touch devices and updates aria-expanded.', verification: 'potential' });
        }
      } else {
        // desktop-only (dedupe page-level checks)
        if (!d.title) add({ ...P, severity: 'medium', category: 'SEO', title: 'Missing page title', description: 'No <title>.', evidence: '<title></title>', suggestion: 'Add a unique 30–60 character title.', verification: 'confirmed' });
        else if (d.title.length > 65 || d.title.length < 10) add({ ...P, severity: 'low', category: 'SEO', title: 'Title length outside 10–65 characters', description: 'Search results may truncate or under-describe the page.', evidence: `"${d.title}" (${d.title.length} chars)`, suggestion: 'Aim for 30–60 characters.', verification: 'confirmed' });
        if (!d.desc) add({ ...P, severity: 'low', category: 'SEO', title: 'Missing meta description', description: 'Search engines will pick arbitrary text.', evidence: 'no <meta name="description">', suggestion: 'Add a 70–160 character description.', verification: 'confirmed' });
        if (!d.h1.length) add({ ...P, severity: 'low', category: 'SEO', title: 'No visible H1 heading', description: 'Pages should have one main heading.', evidence: 'h1 count = 0', suggestion: 'Add one descriptive <h1>.', verification: 'confirmed' });
        else if (d.h1.length > 1) add({ ...P, severity: 'low', category: 'SEO', title: 'Multiple H1 headings', description: 'More than one visible H1.', evidence: d.h1.join(' | '), suggestion: 'Keep one H1; use H2/H3 for sections.', verification: 'potential' });
        if (!d.lang) add({ ...P, severity: 'low', category: 'Accessibility', title: 'Missing lang attribute', description: 'Screen readers can’t pick the right pronunciation.', evidence: '<html> has no lang', suggestion: 'Add <html lang="en">.', verification: 'confirmed' });
        if (/noindex/i.test(d.robots)) add({ ...P, severity: 'high', category: 'SEO', title: 'Page is set to noindex', description: 'Search engines are told not to index this page.', evidence: `<meta name="robots" content="${d.robots}">`, suggestion: 'Remove noindex if this page should be found in search.', verification: 'confirmed' });
        if (d.imgsNoAlt.length) add({ ...P, severity: 'medium', category: 'Accessibility', title: 'Images missing alt text', description: `${d.imgsNoAlt.length} visible image(s) have no alt attribute.`, evidence: d.imgsNoAlt.join('\n'), suggestion: 'Add descriptive alt text (or alt="" for decorative images).', verification: 'confirmed' });
        if (d.unlabeled.length) add({ ...P, severity: 'medium', category: 'Accessibility', title: 'Form fields without labels', description: 'Placeholders are not labels; screen readers can’t announce these fields.', evidence: d.unlabeled.join('\n'), suggestion: 'Add <label for> or aria-label to each field.', verification: 'confirmed' });
        if (d.noName.length) add({ ...P, severity: 'medium', category: 'Accessibility', title: 'Links/buttons without an accessible name', description: 'Icon-only controls need a text label for assistive tech.', evidence: d.noName.join('\n'), suggestion: 'Add aria-label or visible text.', verification: 'confirmed' });
        if (d.dupIds.length) add({ ...P, severity: 'low', category: 'Accessibility', title: 'Duplicate element IDs', description: 'Duplicate IDs break label/ARIA references.', evidence: d.dupIds.join(', '), suggestion: 'Make each id unique.', verification: 'confirmed' });
        d.forms.forEach((f, i) => {
          if (f.password && d.proto !== 'https:') add({ ...P, severity: 'critical', category: 'Forms', title: 'Password form on insecure HTTP', description: 'Credentials would be sent unencrypted.', evidence: `form #${i + 1} action=${f.action}`, suggestion: 'Serve the site over HTTPS only.', verification: 'confirmed', key: 'f' + i });
          if (!f.hasSubmit) add({ ...P, severity: 'low', category: 'Forms', title: 'Form without a submit control', description: 'Form may rely on scripts only.', evidence: JSON.stringify(f), suggestion: 'Add a real submit button so Enter/assistive tech works.', verification: 'potential', key: 'f' + i });
          if (f.emailNoAuto) add({ ...P, severity: 'low', category: 'Forms', title: 'Email field without autocomplete', description: 'Autofill helps mobile users finish forms.', evidence: JSON.stringify(f), suggestion: 'Add autocomplete="email".', verification: 'potential', key: 'f' + i });
        });
        rec.forms = d.forms;
        for (const h of d.links) { const n = norm(h); if (!n) continue; if (!allLinks.has(n)) allLinks.set(n, url); if (n.startsWith(origin) && !visited.has(n) && !queue.includes(n) && !/\.(pdf|jpg|jpeg|png|gif|webp|zip|mp4|mp3|svg)$/i.test(n)) queue.push(n); }
        if (url === start.href) { rec.manifest = d.manifest; rec.proto = d.proto; rec.canonical = d.canonical; }
      }
      await page.close();
    }
    pages.push(rec);
  }

  /* ---------- broken link check ---------- */
  const req = desktop.request;
  const links = [...allLinks.entries()].slice(0, 150);
  await Promise.all(links.map(async ([link, from]) => {
    try {
      let r = await req.head(link, { timeout: 15000, maxRedirects: 5 }).catch(() => null);
      if (!r || r.status() === 405 || r.status() === 501) r = await req.get(link, { timeout: 15000, maxRedirects: 5 });
      const s = r.status();
      if (s === 404 || s === 410 || s >= 500) add({ page: from, severity: link.startsWith(origin) ? 'high' : 'medium', category: 'Links', title: `Broken link (HTTP ${s})`, description: 'A link on this page leads to an error.', evidence: link, suggestion: 'Update or remove the link.', verification: 'confirmed', key: link });
      else if (s >= 400) add({ page: from, severity: 'low', category: 'Links', title: `Link returned HTTP ${s}`, description: 'May be blocking automated checks rather than broken.', evidence: link, suggestion: 'Open it manually to confirm.', verification: 'potential', key: link });
    } catch (e) { add({ page: from, severity: 'low', category: 'Links', title: 'Link could not be reached', description: 'Network error or timeout while checking.', evidence: `${link}\n${String(e.message).slice(0, 150)}`, suggestion: 'Open it manually to confirm.', verification: 'potential', key: link }); }
  }));

  /* ---------- PWA eligibility ---------- */
  const first = pages[0] || {};
  const pwa = { https: start.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(start.hostname), manifest: !!first.manifest, checks: {} };
  if (first.manifest) {
    try {
      const m = await (await req.get(first.manifest)).json();
      const icons = (m.icons || []).map(i => i.sizes || '');
      pwa.checks = { name: !!(m.name || m.short_name), start_url: !!m.start_url, display: ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].includes(m.display), icon192: icons.some(s => /192x192/.test(s)), icon512: icons.some(s => /512x512/.test(s)), maskable: (m.icons || []).some(i => /maskable/.test(i.purpose || '')) };
    } catch (e) { pwa.checks.parse = false; pwa.manifestError = e.message; }
  }
  const p = await mobile.newPage(); await p.goto(start.href, { waitUntil: 'load' }).catch(() => {});
  pwa.serviceWorker = await p.evaluate(async () => { if (!('serviceWorker' in navigator)) return false; for (let i = 0; i < 10; i++) { const r = await navigator.serviceWorker.getRegistration(); if (r?.active || r?.installing || r?.waiting) return true; await new Promise(x => setTimeout(x, 500)); } return false; }).catch(() => false);
  await p.close();
  const missing = [];
  if (!pwa.https) missing.push('Site is not served over HTTPS');
  if (!pwa.manifest) missing.push('No <link rel="manifest">');
  for (const [k, v] of Object.entries(pwa.checks)) if (!v && k !== 'maskable') missing.push('Manifest check failed: ' + k);
  if (!pwa.serviceWorker) missing.push('No active service worker registered');
  pwa.eligible = missing.length === 0;
  if (missing.length) add({ page: start.href, severity: 'medium', category: 'PWA', title: 'Not installable as an app (PWA)', description: 'The site does not meet the browser install criteria checked here.', evidence: missing.join('\n'), suggestion: 'Generate a PWA kit in LaunchPage Studio → Tools → PWA Kit and deploy it over HTTPS.', verification: 'confirmed' });
  else if (!pwa.checks.maskable) add({ page: start.href, severity: 'low', category: 'PWA', title: 'No maskable icon', description: 'Android may show the icon on a white circle.', evidence: 'manifest icons have no purpose:"maskable"', suggestion: 'Add a maskable 512px icon.', verification: 'confirmed' });

  /* ---------- optional Lighthouse ---------- */
  let lighthouse = null, lighthouseError;
  if (flag('--lighthouse')) {
    try {
      const lh = (await import('lighthouse')).default; const cl = await import('chrome-launcher');
      const chrome = await cl.launch({ chromeFlags: ['--headless=new', '--no-sandbox'], chromePath: process.env.CHROME_PATH });
      const r = await lh(start.href, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
      await chrome.kill();
      lighthouse = Object.fromEntries(Object.entries(r.lhr.categories).map(([k, v]) => [k, v.score]));
      await fs.writeFile(path.join(dir, 'lighthouse.json'), JSON.stringify(r.lhr));
    } catch (e) { lighthouseError = 'Lighthouse not run: ' + e.message + ' (npm i lighthouse chrome-launcher)'; }
  }

  await browser.close();
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => (a.verification === b.verification ? 0 : a.verification === 'confirmed' ? -1 : 1) || sevOrder[a.severity] - sevOrder[b.severity]);
  const report = {
    tool: 'launchpage-audit-worker', version: VERSION, url: start.href, startedAt, finishedAt: new Date().toISOString(),
    settings: { maxPages: MAX, viewports: ['390x844 mobile', '1366x900 desktop'] },
    pages, issues, pwa, ...(lighthouse ? { lighthouse } : {}), ...(lighthouseError ? { lighthouseError } : {}),
    summary: { pages: pages.length, linksChecked: links.length, confirmed: issues.filter(i => i.verification === 'confirmed').length, potential: issues.filter(i => i.verification !== 'confirmed').length, bySeverity: Object.fromEntries(Object.keys(sevOrder).map(s => [s, issues.filter(i => i.severity === s).length])) }
  };
  await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nDone: ${pages.length} pages, ${issues.length} findings (${report.summary.confirmed} confirmed, ${report.summary.potential} potential)\nReport: ${path.join(dir, 'report.json')}`);
}

main().catch(async e => {
  console.error('Audit failed:', e.message);
  try { await fs.mkdir(OUT, { recursive: true }); await fs.writeFile(path.join(OUT, `failed-${Date.now()}.json`), JSON.stringify({ tool: 'launchpage-audit-worker', version: VERSION, url: target || '', error: e.message, pages: [], issues: [], finishedAt: new Date().toISOString() }, null, 2)); } catch {}
  process.exit(1);
});
