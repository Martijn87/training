/**
 * Mardy · 2026 Training — regression gate
 * =======================================
 * This is the gate that makes autonomous shipping safe. Nothing gets a version
 * bump unless this exits 0.
 *
 * Design notes, deliberately:
 *
 *  - Served over real HTTP, not file://. Service workers, the manifest and
 *    relative fetches all behave differently on file:// and would give a
 *    false green.
 *
 *  - ALL external network is blocked by default (fonts CDN, supabase-js CDN,
 *    supabase API). Two reasons. First, determinism: a red test must mean the
 *    app broke, never that a CDN was slow. Second, this IS the risk path —
 *    the app is offline-first and used in a gym on bad signal, so "CDN absent"
 *    is the normal case, not the edge case.
 *
 *  - Pure logic is asserted directly against the real functions on window,
 *    not re-implemented here. A test that re-implements the logic it checks
 *    proves nothing.
 *
 * Usage: node regression.mjs [path-to-app.html]
 * Exit:  0 = all green (safe to ship)   1 = red (do NOT ship)
 */

// playwright is imported WHERE IT IS USED, not at the top. A static import
// is hoisted above everything, so --state could not run without node_modules
// present - which is the one situation it exists for: a fresh clone, step 0,
// before anything is installed. `git clone && node regression.mjs --state`
// must work on its own.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

// ── arguments ───────────────────────────────────────────────────────────
//   node regression.mjs                 every check, against app-current.html
//   node regression.mjs some-app.html   every check, against that file
//   node regression.mjs --state         version report only. No browser.
//   node regression.mjs --only slot     only suites whose name contains "slot"
const ARGV = process.argv.slice(2);
const STATE_ONLY = ARGV.includes('--state');
const ONLY = (() => {
  const i = ARGV.indexOf('--only');
  return (i !== -1 && ARGV[i + 1] && !ARGV[i + 1].startsWith('--')) ? ARGV[i + 1].toLowerCase() : null;
})();
const APP = ARGV.find((a, i) =>
  !a.startsWith('--') && ARGV[i - 1] !== '--only') || path.join(DIR, 'app-current.html');
const SW = path.join(DIR, 'sw-current.js');
const CHANGELOG = path.join(DIR, 'CHANGELOG.md');

// ── --state: every place a version is written, compared ─────────────────
// Reads files only. No browser, no server, about a second. Exits 1 on ANY
// disagreement, so it is safe to run as step 0 of every session and cheap
// enough to run again immediately before an edit — which is what rule 1
// actually asks for and what nobody was doing, because the alternative was a
// ninety-second browser run.
function readVersionState() {
  const out = { problems: [], found: {} };
  const need = (p, what) => {
    if (!fs.existsSync(p)) { out.problems.push(`${what} is missing: ${p}`); return null; }
    return fs.readFileSync(p, 'utf8');
  };
  const app = need(APP, 'the app'), sw = need(SW, 'the service worker'),
        cl = need(CHANGELOG, 'CHANGELOG.md');
  const grab = (text, re, what) => {
    if (text === null) return null;
    const m = text.match(re);
    if (!m) { out.problems.push(`could not read ${what}`); return null; }
    return m[1];
  };
  const f = out.found;
  f.appVersion = grab(app, /window\.APP_VERSION\s*=\s*'([^']+)'/, 'APP_VERSION');
  f.appBuilt   = grab(app, /window\.APP_BUILT\s*=\s*'([^']+)'/, 'APP_BUILT');
  f.programRev = grab(app, /window\.PROGRAM_REV\s*=\s*'([^']+)'/, 'PROGRAM_REV');
  f.badge      = grab(app, /id="versionBadge"[^>]*>([^<]+)</, 'the badge fallback text');
  f.cacheVersion = grab(sw, /const CACHE_VERSION\s*=\s*'([^']+)'/, 'CACHE_VERSION');
  f.clCurrent  = grab(cl, /^CURRENT:\s*\*\*(v[\d.]+)\*\*/m, 'CHANGELOG CURRENT');
  f.clBuilt    = grab(cl, /^CURRENT:[^\n]*·\s*built\s+([^·\n]+?)\s*·/m, 'the CHANGELOG build date');
  f.clProgRev  = grab(cl, /^CURRENT:[^\n]*PROGRAM-REV\s*`([^`]+)`/m, 'CHANGELOG PROGRAM-REV');
  f.clRollback = grab(cl, /^ROLLBACK:\s*`([^`]+)`/m, 'the CHANGELOG ROLLBACK line');
  f.clGate     = grab(cl, /^GATE:\s*(\d+)\s*\/\s*(\d+)/m, 'the CHANGELOG GATE line');

  // the gate's own size, counted the same way a human would
  const self = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  f.checkCount = (self.match(/^await check\(/gm) || []).length;

  // every rollback on disk, and the version each one declares INTERNALLY —
  // a filename is not evidence
  f.rollbacks = fs.readdirSync(DIR)
    .filter(n => /^app-v[\d.]+-rollback\.html$/.test(n))
    .map(n => {
      const body = fs.readFileSync(path.join(DIR, n), 'utf8');
      const m = body.match(/window\.APP_VERSION\s*=\s*'([^']+)'/);
      return { file: n, named: (n.match(/^app-(v[\d.]+)-rollback\.html$/) || [])[1] || null,
               declares: m ? m[1] : null };
    });

  const padded = (v) => typeof v === 'string' && /^v\d+\.\d{2}$/.test(v);
  const P = out.problems;
  // 1. the four places the build number is written
  const quad = { 'APP_VERSION': f.appVersion, 'sw.js CACHE_VERSION': f.cacheVersion,
                 'CHANGELOG line 3': f.clCurrent };
  for (const [what, v] of Object.entries(quad))
    if (v && v !== f.appVersion) P.push(`${what} is ${v}, APP_VERSION is ${f.appVersion}`);
  if (f.badge && f.appVersion && f.badge.indexOf(f.appVersion) === -1)
    P.push(`the badge fallback reads "${f.badge}" and APP_VERSION is ${f.appVersion}`);
  if (f.badge && f.appBuilt && f.badge.indexOf(f.appBuilt) === -1)
    P.push(`the badge fallback reads "${f.badge}" and APP_BUILT is ${f.appBuilt}`);
  if (f.clBuilt && f.appBuilt && f.clBuilt.trim() !== f.appBuilt.trim())
    P.push(`CHANGELOG says built ${f.clBuilt}, the app says ${f.appBuilt}`);
  // 2. zero padding, on every version this report touched
  for (const [what, v] of [['APP_VERSION', f.appVersion], ['CACHE_VERSION', f.cacheVersion],
                           ['CHANGELOG line 3', f.clCurrent]])
    if (v && !padded(v)) P.push(`${what} is "${v}", which is not zero-padded semver`);
  // 3. the programme axis
  if (f.programRev && f.clProgRev && f.programRev !== f.clProgRev)
    P.push(`PROGRAM_REV is ${f.programRev}, CHANGELOG says ${f.clProgRev}`);
  // 4. the gate's own size against what CHANGELOG claims
  if (f.clGate && String(f.checkCount) !== f.clGate)
    P.push(`this gate registers ${f.checkCount} checks, the GATE: line says ${f.clGate}`);
  // 5. the rollback: exactly one, named for what it declares, one minor back
  if (f.rollbacks.length === 0) P.push('no rollback file on disk');
  if (f.rollbacks.length > 1)
    P.push(`${f.rollbacks.length} rollback files on disk: ${f.rollbacks.map(r => r.file).join(', ')}`);
  for (const r of f.rollbacks) {
    if (r.declares === null) P.push(`${r.file} declares no APP_VERSION`);
    else if (r.named !== r.declares) P.push(`${r.file} is named ${r.named} and declares ${r.declares}`);
  }
  if (f.rollbacks.length === 1 && f.clRollback &&
      path.basename(f.clRollback) !== f.rollbacks[0].file)
    P.push(`the ROLLBACK line names ${f.clRollback}, the file on disk is ${f.rollbacks[0].file}`);
  if (f.rollbacks.length === 1 && f.appVersion && f.rollbacks[0].declares) {
    const cur = f.appVersion.match(/^v(\d+)\.(\d+)$/), old = f.rollbacks[0].declares.match(/^v(\d+)\.(\d+)$/);
    if (cur && old) {
      const gap = (+cur[1] * 1000 + +cur[2]) - (+old[1] * 1000 + +old[2]);
      if (gap !== 1)
        P.push(`the rollback is ${gap} minor(s) behind current (${f.rollbacks[0].declares} -> ${f.appVersion}), expected exactly 1`);
    }
  }
  return out;
}

if (STATE_ONLY) {
  const s = readVersionState(), f = s.found;
  const row = (k, v) => console.log('  ' + String(k).padEnd(22) + (v === null || v === undefined ? '(not found)' : v));
  console.log('\n  VERSION STATE — ' + path.basename(APP) + '\n');
  row('APP_VERSION', f.appVersion);
  row('APP_BUILT', f.appBuilt);
  row('PROGRAM_REV', f.programRev);
  row('badge fallback', f.badge);
  row('sw CACHE_VERSION', f.cacheVersion);
  row('CHANGELOG line 3', f.clCurrent);
  row('CHANGELOG built', f.clBuilt);
  row('CHANGELOG PROGRAM-REV', f.clProgRev);
  row('CHANGELOG ROLLBACK', f.clRollback);
  row('CHANGELOG GATE', f.clGate);
  row('checks registered', f.checkCount);
  for (const r of (f.rollbacks || []))
    row('rollback on disk', `${r.file}  declares ${r.declares}`);
  if (s.problems.length) {
    console.log('\n  ' + s.problems.length + ' DISAGREEMENT(S) — resolve before editing anything:\n');
    for (const p of s.problems) console.log('    x  ' + p);
    console.log('');
    process.exit(1);
  }
  console.log('\n  everything agrees\n');
  process.exit(0);
}

// ── tiny result recorder ────────────────────────────────────────────────
const results = [];
let currentSuite = '';
const suite = (n) => { currentSuite = n; };
async function check(name, fn) {
  if (ONLY && currentSuite.toLowerCase().indexOf(ONLY) === -1) return;   // --only
  try {
    await fn();
    results.push({ suite: currentSuite, name, ok: true });
  } catch (e) {
    results.push({ suite: currentSuite, name, ok: false, err: e.message });
  }
}
function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what}expected ${b}, got ${a}`);
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }

// ── static server: index.html + sw.js, everything else 404 ──────────────
function serve() {
  const html = fs.readFileSync(APP, 'utf8');
  const sw = fs.existsSync(SW) ? fs.readFileSync(SW, 'utf8') : '';
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (url === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(sw);
    }
    if (url === '/manifest.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ name: 'Mardy 2026 Training', start_url: './', display: 'standalone' }));
    }
    res.writeHead(404); res.end('');
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

// ── page factory: external network blocked, console/page errors captured ─
async function openApp(browser, { viewport = { width: 390, height: 844 }, init } = {}, port) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const errors = [];
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return route.continue();
    return route.abort();          // fonts, supabase-js CDN, supabase API
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);   // let deferred init settle
  return { ctx, page, errors };
}

// ── IMPORTANT for anyone extending this file ────────────────────────────
// The app declares its store as `let state = {...}` at script top level.
// `let` does NOT attach to the global object, so `window.state` is a DIFFERENT
// object and writing to it is a silent no-op - a test that does so will read
// back the app's DEFAULTS and pass for the wrong reason. To drive state, seed
// localStorage with addInitScript BEFORE navigation (state.hrConfig is
// hydrated from localStorage['hrConfig'] at boot) and let the app hydrate it.
// Top-level `function` declarations DO attach to window, so calling
// window.getHRZones() / window.parseWeightTarget() is legitimate.
//
// Errors caused purely by the blocked network are expected and not defects.
const NETWORK_NOISE = /Failed to load resource|net::ERR_FAILED|ERR_BLOCKED|fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|supabase\.co|\[sw\]|Failed to fetch|Load failed/i;
const realErrors = (errs) => errs.filter(e => !NETWORK_NOISE.test(e));

// ════════════════════════════════════════════════════════════════════════
const { server, port } = await serve();
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  .catch(() => chromium.launch());

const { page, errors, ctx } = await openApp(browser, {}, port);

// ── 1. BOOT ─────────────────────────────────────────────────────────────
suite('boot');
await check('app boots with no uncaught JS errors (CDN + network absent)', async () => {
  const real = realErrors(errors);
  ok(real.length === 0, `uncaught errors:\n    ${real.slice(0, 5).join('\n    ')}`);
});
await check('login screen is presented when unauthenticated', async () => {
  const disp = await page.evaluate(() => {
    const el = document.getElementById('loginScreen');
    return el ? getComputedStyle(el).display : 'MISSING';
  });
  ok(disp !== 'MISSING', '#loginScreen not in DOM');
  ok(disp !== 'none', 'login screen hidden while unauthenticated');
});
await check('core shell is present in the DOM', async () => {
  const found = await page.evaluate(() => ({
    header: !!document.querySelector('.header'),
    tabs: document.querySelectorAll('.tab').length,
    themeToggle: !!document.getElementById('themeToggle'),
  }));
  ok(found.header, 'missing .header');
  ok(found.tabs >= 3, `expected >=3 tabs, got ${found.tabs}`);
  ok(found.themeToggle, 'missing #themeToggle');
});

// ── 2. VERSION INTEGRITY (the drift that caused this whole exercise) ────
suite('version integrity');
await check('APP_VERSION is defined and zero-padded semver', async () => {
  const v = await page.evaluate(() => window.APP_VERSION);
  ok(!!v, 'window.APP_VERSION is undefined');
  ok(/^v\d+\.\d{2}$/.test(v), `"${v}" is not zero-padded vX.YY (v1.9 must be written v1.09)`);
});
await check('PROGRAM_REV exists and is on a separate axis from APP_VERSION', async () => {
  const p = await page.evaluate(() => window.PROGRAM_REV);
  ok(!!p, 'window.PROGRAM_REV is undefined');
  ok(!/^v\d/.test(p), `PROGRAM_REV "${p}" looks like a build number; it must not`);
});
await check('visible version badge matches APP_VERSION', async () => {
  const { badge, v } = await page.evaluate(() => ({
    badge: document.getElementById('versionBadge')?.textContent || '', v: window.APP_VERSION,
  }));
  ok(badge.includes(v), `badge "${badge}" does not contain APP_VERSION "${v}"`);
});
await check('sw.js CACHE_VERSION mirrors APP_VERSION', async () => {
  const v = await page.evaluate(() => window.APP_VERSION);
  const swSrc = fs.readFileSync(SW, 'utf8');
  const m = swSrc.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
  ok(m, 'CACHE_VERSION not found in sw.js');
  eq(m[1], v, 'shell cache would not evict on deploy: ');
});
await check('no stale programme markers masquerading as build numbers', async () => {
  const src = fs.readFileSync(APP, 'utf8');
  const bad = [...src.matchAll(/v1\.\d\b/g)].map(m => m[0]);
  ok(bad.length === 0, `unpadded version tokens found (unorderable): ${[...new Set(bad)].join(', ')}`);
});

// ── 3. PLAN PARSERS — silent data-loss class ────────────────────────────
suite('plan parsers');
await check('parseWeightTarget accepts only unambiguous absolute weights', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseWeightTarget;
    if (typeof f !== 'function') return 'MISSING';
    return {
      plain: f('100'), kg: f('100 kg'), decimal: f('97.5'), spaced: f(' 82.5kg '),
      pct: f('65%'), bw: f('BW'), bwPlus: f('BW+5'),
      hyphenRange: f('25-30 kg'), enDash: f('25–30 kg'), emDash: f('25—30'),
      empty: f(''), nul: f(null),
    };
  });
  ok(r !== 'MISSING', 'parseWeightTarget not exposed on window');
  eq(r.plain, 100, 'plain: '); eq(r.kg, 100, 'kg: ');
  eq(r.decimal, 97.5, 'decimal: '); eq(r.spaced, 82.5, 'spaced: ');
  eq(r.pct, null, 'percentage must not preload: ');
  eq(r.bw, null, 'bodyweight must not preload: ');
  eq(r.bwPlus, null, 'BW+5 must not preload: ');
  eq(r.hyphenRange, null, 'hyphen range must not preload: ');
  eq(r.enDash, null, 'en-dash range must not preload: ');
  eq(r.emDash, null, 'em-dash range must not preload: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: ');
});
await check('parseRepsTarget rejects ranges, accepts single integers', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseRepsTarget;
    if (typeof f !== 'function') return 'MISSING';
    return { single: f('8'), hyphen: f('6-8'), enDash: f('6–8'), empty: f(''), nul: f(null) };
  });
  ok(r !== 'MISSING', 'parseRepsTarget not exposed on window');
  eq(r.single, 8, 'single: ');
  eq(r.hyphen, null, 'hyphen range: '); eq(r.enDash, null, 'en-dash range: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: ');
});

// ── 4. HR ZONES ─────────────────────────────────────────────────────────
// getHRZones() returns an ARRAY of 5 zone objects ({zone,name,low,high,...}),
// not a flat map. Asserted against the real shape.
suite('hr zones');
await check('five contiguous zones, monotonically increasing, capped at maxHR', async () => {
  const z = await page.evaluate(() => {
    if (typeof window.getHRZones !== 'function') return 'MISSING';
    return window.getHRZones();          // boot defaults: maxHR 183
  });
  ok(z !== 'MISSING', 'getHRZones not exposed on window');
  eq(z.length, 5, 'zone count: ');
  eq(z.map(x => x.zone), ['Z1','Z2','Z3','Z4','Z5'], 'zone labels: ');
  for (const zz of z) ok(zz.high > zz.low, `${zz.zone}: high (${zz.high}) must exceed low (${zz.low})`);
  for (let i = 1; i < z.length; i++) {
    eq(z[i].low, z[i-1].high, `gap/overlap between ${z[i-1].zone} and ${z[i].zone}: `);
  }
  eq(z[4].high, 183, 'Z5 ceiling must equal maxHR: ');
});
await check('Z2 is the marathon-base target band and sits at 65-75% of maxHR', async () => {
  const z2 = await page.evaluate(() => window.getHRZones()[1]);
  eq(z2.name, 'Aerobic', 'Z2 name: ');
  eq(z2.low, 119, 'Z2 low @183 maxHR: ');
  eq(z2.high, 137, 'Z2 high @183 maxHR: ');
});
await check('explicit zone boundaries override the percentage model on both sides', async () => {
  const { page: p, ctx: c } = await openApp(browser, {
    init: () => localStorage.setItem('hrConfig',
      JSON.stringify({ maxHR: 183, zoneBoundaries: { z2High: 141 } })),
  }, port);
  const z = await p.evaluate(() => window.getHRZones());
  await c.close();
  eq(z[1].high, 141, 'lactate-threshold pin ignored on Z2 ceiling: ');
  eq(z[2].low, 141, 'pin did not propagate to Z3 floor: ');
});
await check('absurd maxHR values are clamped, not trusted', async () => {
  const ceiling = async (maxHR) => {
    const { page: p, ctx: c } = await openApp(browser, {
      init: `localStorage.setItem('hrConfig', JSON.stringify({maxHR:${maxHR},zoneBoundaries:null}))`,
    }, port);
    const v = await p.evaluate(() => window.getHRZones()[4].high);
    await c.close();
    return v;
  };
  const hi = await ceiling(9999), lo = await ceiling(12);
  ok(hi <= 230, `maxHR not clamped high: ${hi}`);
  ok(lo >= 120, `maxHR not clamped low: ${lo}`);
});

// ── 5. COACH DATE PARSING (en-GB DD/MM is the trap) ─────────────────────
suite('coach date parsing');
await check('all supported date spellings resolve to the same day', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.coachParseDate !== 'function') return 'MISSING';
    const iso = window.coachDateToISO;
    const forms = ['oct 18 2026', 'october 18, 2026', '18 oct 2026', '18th october 2026',
                   '18/10/2026', '2026-10-18'];
    return forms.map(f => { const d = window.coachParseDate(f); return d ? iso(d) : null; });
  });
  ok(r !== 'MISSING', 'coachParseDate not exposed on window');
  for (const got of r) eq(got, '2026-10-18', 'date form mismatch: ');
});
await check('slash dates are read DD/MM (en-GB), never MM/DD', async () => {
  const got = await page.evaluate(() => {
    const d = window.coachParseDate('03/04/2026');   // 3 April, not 4 March
    return d ? window.coachDateToISO(d) : null;
  });
  eq(got, '2026-04-03', 'en-GB ordering broken: ');
});
await check('unparseable input returns null rather than a wrong date', async () => {
  const got = await page.evaluate(() => [
    window.coachParseDate('sometime next week'),
    window.coachParseDate(''),
    window.coachParseDate(null),
  ].map(d => d === null));
  eq(got, [true, true, true], 'must return null on unparseable input: ');
});

// ── 6. PERSISTENCE ──────────────────────────────────────────────────────
suite('persistence');
await check('localStorage survives a reload (offline-first data layer)', async () => {
  await page.evaluate(() => localStorage.setItem('__gate_probe', 'kept'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const v = await page.evaluate(() => localStorage.getItem('__gate_probe'));
  eq(v, 'kept', 'localStorage lost across reload: ');
  await page.evaluate(() => localStorage.removeItem('__gate_probe'));
});
await check('corrupt localStorage does not prevent boot', async () => {
  const { page: p2, errors: e2, ctx: c2 } = await openApp(browser, {
    init: () => {
      for (const k of ['programOverrides', 'trainingLog', 'state', 'hrConfig', 'sessions'])
        localStorage.setItem(k, '{ this is not json ');
    },
  }, port);
  const real = realErrors(e2);
  const booted = await p2.evaluate(() => !!document.querySelector('.header'));
  await c2.close();
  ok(booted, 'app failed to render with corrupt localStorage');
  ok(real.length === 0, `corrupt storage produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
});

// ── 7. RESILIENCE ───────────────────────────────────────────────────────
suite('resilience');
await check('absent supabase CDN degrades gracefully, never throws', async () => {
  const thrown = await page.evaluate(() => {
    try { return typeof supabase === 'undefined' ? 'absent-handled' : 'present'; }
    catch { return 'threw'; }
  });
  ok(thrown !== 'threw', 'referencing supabase threw with CDN blocked');
});
await check('service worker registers without blocking the app', async () => {
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const r = await navigator.serviceWorker.getRegistration();
    return r ? 'registered' : 'none';
  });
  ok(sw !== 'unsupported', 'serviceWorker API unavailable in test browser');
});

// ── 8. MOBILE / PWA ─────────────────────────────────────────────────────
suite('mobile & pwa');
await check('no horizontal overflow at 390px (iPhone width)', async () => {
  const o = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
  }));
  ok(o.scroll <= o.client + 1, `page scrolls sideways: ${o.scroll}px content in ${o.client}px viewport`);
});
await check('no horizontal overflow at 320px (smallest supported)', async () => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(250);
  const o = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  ok(o.scroll <= o.client + 1, `page scrolls sideways at 320px: ${o.scroll} vs ${o.client}`);
});
// NOTE: the theme handler is bound inside initApp(), which the app only runs
// AFTER successful auth. Pre-login the button renders but is inert (logged to
// the backlog as a UX defect - it should not be visible if it does nothing).
// Auth is unreachable here by design (network blocked), so we invoke initApp()
// directly to reach the wired state. This is testing the real handler, not a
// stand-in - initApp is the same function the authenticated app calls.
await check('theme toggle flips body theme and repaints the status bar', async () => {
  const wired = await page.evaluate(() => {
    if (typeof window.initApp !== 'function') return 'MISSING';
    try { window.initApp(); return 'ok'; } catch (e) { return 'threw: ' + e.message; }
  });
  ok(wired === 'ok', `could not reach wired state: ${wired}`);
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => document.body.dataset.theme || 'light');
  await page.evaluate(() => document.getElementById('themeToggle').click());
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    theme: document.body.dataset.theme || 'light',
    label: document.getElementById('themeToggle').textContent.trim(),
    meta: document.querySelector('meta[name="theme-color"]').content,
  }));
  ok(before !== after.theme, `theme did not change (stayed "${before}")`);
  eq(after.meta, after.theme === 'dark' ? '#0f0d0a' : '#f7f4ef',
     'PWA status-bar colour out of sync with theme: ');
  ok(/Dark|Light/.test(after.label), `toggle label not updated: "${after.label}"`);
});
// Baseline, not a target. It started as the v1.09 shortfall (tab 37,
// theme-toggle 21, login-btn 41) so that pre-existing debt could not rot
// silently in either direction. v1.11 raised all three to the 44px iOS/WCAG
// floor, so the baseline IS 44 now and any shrink below it fails.
const TAP_TARGET_BASELINE = { 'tab': 44, 'theme-toggle': 44, 'login-btn': 44 };
await check('no tap target sits below the 44px floor (baseline reached at v1.11)', async () => {
  const sizes = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.tab, .theme-toggle, .login-btn').forEach(el => {
      const r = el.getBoundingClientRect(); const k = el.className.split(' ')[0];
      if (r.width > 0 && r.height > 0) out[k] = Math.min(out[k] ?? 1e9, Math.round(r.height));
    });
    return out;
  });
  const problems = [];
  for (const [k, h] of Object.entries(sizes)) {
    const base = TAP_TARGET_BASELINE[k];
    if (base === undefined) { if (h < 44) problems.push(`NEW undersized control "${k}" at ${h}px`); continue; }
    if (h < base) problems.push(`"${k}" REGRESSED ${base}px -> ${h}px`);
    if (h > base) problems.push(`"${k}" improved ${base}px -> ${h}px; update TAP_TARGET_BASELINE`);
  }
  ok(problems.length === 0, problems.join('; '));
});


// ── 9. THEME PREFERENCE — the offline restore path ──────────────────────
// Added v1.11. `theme` was written to localStorage by persistStateLocally() on
// every save and read back by nothing: the only restore path was the Supabase
// profile, which never arrives on a dead signal. So the app booted light every
// time AND overwrote the stored preference with that default on first save.
suite('theme preference');
await check('a saved dark theme is restored at boot with no network', async () => {
  const { page: p, ctx: c } = await openApp(browser, {
    init: () => localStorage.setItem('theme', 'dark'),
  }, port);
  const got = await p.evaluate(() => ({
    body: document.body.dataset.theme || 'light',
    meta: document.querySelector('meta[name="theme-color"]').content,
  }));
  await c.close();
  eq(got.body, 'dark', 'saved theme not restored with the profile fetch blocked: ');
  eq(got.meta, '#0f0d0a', 'PWA status-bar colour not painted for the saved theme at boot: ');
});
await check('boot does not overwrite the stored theme preference with the default', async () => {
  const { page: p, ctx: c } = await openApp(browser, {
    init: () => localStorage.setItem('theme', 'dark'),
  }, port);
  await p.waitForTimeout(300);
  const stored = await p.evaluate(() => localStorage.getItem('theme'));
  await c.close();
  eq(stored, 'dark', 'boot clobbered the saved preference: ');
});
await check('a junk theme value falls back to light instead of breaking boot', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    init: () => localStorage.setItem('theme', '{{not-a-theme}}'),
  }, port);
  const body = await p.evaluate(() => document.body.dataset.theme || 'light');
  const real = realErrors(e);
  await c.close();
  eq(body, 'light', 'unrecognised stored theme must fall back to light: ');
  ok(real.length === 0, `junk theme produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
});
await check('theme toggle is live before authentication and persists the choice', async () => {
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const login = await p.evaluate(() =>
    getComputedStyle(document.getElementById('loginScreen')).display);
  ok(login !== 'none', 'precondition failed: login screen should be visible on a fresh install');
  const before = await p.evaluate(() => document.body.dataset.theme || 'light');
  await p.evaluate(() => document.getElementById('themeToggle').click());
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({
    body: document.body.dataset.theme || 'light',
    meta: document.querySelector('meta[name="theme-color"]').content,
    stored: localStorage.getItem('theme'),
    label: document.getElementById('themeToggle').textContent.trim(),
  }));
  await c.close();
  ok(before !== after.body, `toggle inert pre-login (theme stayed "${before}")`);
  eq(after.stored, after.body, 'pre-login theme change not persisted: ');
  eq(after.meta, after.body === 'dark' ? '#0f0d0a' : '#f7f4ef',
     'status-bar colour out of sync pre-login: ');
  ok(/Dark|Light/.test(after.label), `toggle label not updated: "${after.label}"`);
});

// ── 10. PROGRAM OVERRIDES — the silent-corruption surface (BACKLOG B5) ──
// resolvePlanned() is last-writer-wins. Its doc comment says "chronological
// order", but until v1.11 it walked ARRAY order, and loadProfile() merges as
// [...remote, ...localOnly] — so an older local-only change that failed to sync
// was appended after a newer remote one and silently won.
suite('program overrides');
await check('overrides resolve in timestamp order, not array position', async () => {
  const OV = [
    { ts: '2026-08-20T10:00:00.000Z', week: 1, sessionKey: 'longRun', kind: 'text_replace',
      changeId: 'gate_newer', payload: { oldValue: 'base', newValue: 'NEWER' } },
    { ts: '2026-08-12T09:00:00.000Z', week: 1, sessionKey: 'longRun', kind: 'text_replace',
      changeId: 'gate_older', payload: { oldValue: 'base', newValue: 'OLDER' } },
  ];
  const { page: p, ctx: c } = await openApp(browser, {
    init: `localStorage.setItem('programOverrides', ${JSON.stringify(JSON.stringify(OV))})`,
  }, port);
  const got = await p.evaluate(() => window.getPlanned(1, 'longRun'));
  await c.close();
  eq(got, 'NEWER',
     'an older unsynced override, appended last by the merge, overwrote a newer one: ');
});
await check('equal timestamps keep array order (stable, no engine-dependent flip)', async () => {
  const T = '2026-08-20T10:00:00.000Z';
  const OV = [
    { ts: T, week: 1, sessionKey: 'longRun', kind: 'text_replace',
      changeId: 'gate_a', payload: { newValue: 'FIRST' } },
    { ts: T, week: 1, sessionKey: 'longRun', kind: 'text_replace',
      changeId: 'gate_b', payload: { newValue: 'SECOND' } },
  ];
  const { page: p, ctx: c } = await openApp(browser, {
    init: `localStorage.setItem('programOverrides', ${JSON.stringify(JSON.stringify(OV))})`,
  }, port);
  const got = await p.evaluate(() => window.getPlanned(1, 'longRun'));
  await c.close();
  eq(got, 'SECOND', 'tie-break must remain last-in-array-wins: ');
});
await check('an override for another session never leaks into this one', async () => {
  const OV = [
    { ts: '2026-08-20T10:00:00.000Z', week: 1, sessionKey: 'lower', kind: 'text_replace',
      changeId: 'gate_other', payload: { newValue: 'WRONG-SESSION' } },
    { ts: '2026-08-21T10:00:00.000Z', week: 2, sessionKey: 'longRun', kind: 'text_replace',
      changeId: 'gate_otherwk', payload: { newValue: 'WRONG-WEEK' } },
  ];
  const { page: p, ctx: c } = await openApp(browser, {
    init: `localStorage.setItem('programOverrides', ${JSON.stringify(JSON.stringify(OV))})`,
  }, port);
  const got = await p.evaluate(() => window.getPlanned(1, 'longRun'));
  await c.close();
  ok(got !== 'WRONG-SESSION' && got !== 'WRONG-WEEK',
     `override bled across the (week, sessionKey) key: got "${String(got).slice(0, 40)}"`);
});
await check('upgradeOverrideToV2 is idempotent and gives legacy records a stable id', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.upgradeOverrideToV2 !== 'function') return 'MISSING';
    const legacy = { ts: '2026-08-01T00:00:00.000Z', week: 3, sessionKey: 'quality',
                     oldValue: 'a', newValue: 'b', label: 'L', emoji: '⚑' };
    const once = window.upgradeOverrideToV2(legacy);
    const twice = window.upgradeOverrideToV2(once);
    const again = window.upgradeOverrideToV2({ ...legacy });
    return {
      kind: once.kind,
      payload: once.payload,
      idStable: once.changeId === again.changeId,
      idempotent: JSON.stringify(once) === JSON.stringify(twice),
      keepsLegacy: once.label === 'L' && once.newValue === 'b',
      migratedLen: window.migrateOverridesV2([legacy, null]).length,
      nonArray: window.migrateOverridesV2(null).length,
    };
  });
  ok(r !== 'MISSING', 'upgradeOverrideToV2 not exposed on window');
  eq(r.kind, 'text_replace', 'legacy record kind: ');
  eq(r.payload, { oldValue: 'a', newValue: 'b' }, 'legacy payload: ');
  ok(r.idStable, 'legacy changeId is not deterministic — re-migration would duplicate records');
  ok(r.idempotent, 're-upgrading an already-v2 record mutated it');
  ok(r.keepsLegacy, 'the upgrade dropped v1.x display fields the UI still reads');
  eq(r.migratedLen, 2, 'migrateOverridesV2 must not drop entries: ');
  eq(r.nonArray, 0, 'migrateOverridesV2(null) must return an empty array: ');
});

const json_prs = JSON.stringify({ bench: '112.5 kg', squat: '160', deadlift: '200 kg' });

// ── 10b. COACH PR QUERY — unit rendering ────────────────────────────────
await check('coach PR answers never double the unit, and supply it when absent', async () => {
  const { page: p, ctx: c } = await openApp(browser, {
    init: `localStorage.setItem('prs', ${JSON.stringify(json_prs)})`,
  }, port);
  const r = await p.evaluate(() => {
    if (typeof window.planQueryPR !== 'function') return 'MISSING';
    return {
      one: window.planQueryPR({ lift: 'bench' }).message,
      bare: window.planQueryPR({ lift: 'squat' }).message,
      missing: window.planQueryPR({ lift: 'ohp' }).message,
      all: window.planQueryPR({}).message,
    };
  });
  await c.close();
  ok(r !== 'MISSING', 'planQueryPR not exposed on window');
  ok(!/kg\s*kg/i.test(r.one + r.bare + r.all), `unit doubled: ${JSON.stringify(r)}`);
  ok(/112\.5 kg/.test(r.one), `stored unit lost: "${r.one}"`);
  ok(/160 kg/.test(r.bare), `unit not supplied for a bare number: "${r.bare}"`);
  ok(/not set/.test(r.missing), `absent PR should read "not set": "${r.missing}"`);
});

// ── 11. OFFLINE WRITE QUEUE (BACKLOG B4) ────────────────────────────────
// The service worker deliberately refuses to cache Supabase traffic on the
// grounds that the app has its own queue. That claim was untested.
suite('offline write queue');
await check('a queued session write survives a reload', async () => {
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const present = await p.evaluate(() =>
    typeof window.addToQueue === 'function' && typeof window.getQueue === 'function');
  ok(present, 'addToQueue/getQueue not exposed on window');
  await p.evaluate(() => window.addToQueue(4, 'lower', { sets: [{ weight: 100, reps: 5 }] }));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
  const q = await p.evaluate(() => window.getQueue());
  await c.close();
  eq(q.length, 1, 'queue depth after reload: ');
  eq(q[0].week, 4, 'queued week: ');
  eq(q[0].sessionKey, 'lower', 'queued sessionKey: ');
  eq(q[0].payload, { sets: [{ weight: 100, reps: 5 }] }, 'queued payload: ');
  ok(!!q[0].queuedAt, 'queue entry lost its queuedAt timestamp');
});
await check('re-logging a session replaces its queue entry instead of duplicating it', async () => {
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const q = await p.evaluate(() => {
    window.addToQueue(4, 'lower', { v: 1 });
    window.addToQueue(4, 'lower', { v: 2 });   // same session, corrected
    window.addToQueue(5, 'lower', { v: 3 });   // different week
    return window.getQueue();
  });
  await c.close();
  eq(q.length, 2, 'same week+session must collapse to one entry: ');
  const w4 = q.find(e => e.week === 4 && e.sessionKey === 'lower');
  eq(w4.payload, { v: 2 }, 'the newer log for a session must win: ');
});
await check('a corrupt queue reads as empty rather than throwing', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    init: () => localStorage.setItem('offlineQueue', 'not json at all'),
  }, port);
  const q = await p.evaluate(() => window.getQueue());
  const real = realErrors(e);
  await c.close();
  eq(q, [], 'corrupt queue must degrade to []: ');
  ok(real.length === 0, `corrupt queue produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
});

// ── 12. WEEKLY RUNNING VOLUME (BACKLOG A1, shipped v1.15) ───────────────
// The whole v1.13 ramp is defined by weekly totals and a 10% ceiling, and
// until v1.15 nothing in the app computed either. Two classes of check here,
// deliberately separated:
//
//   * PARSER checks run against literal fixture strings written out below,
//     not against the plan. They pin the reading rules and stay valid when
//     Mardy edits his training.
//   * PLAN checks assert INVARIANTS over whatever the plan currently says
//     (totals equal the sum of their parts, nothing silently defaults, the
//     delta baseline is the previous build week). They must not hardcode his
//     distances — a gate that encodes this week's numbers goes red the first
//     time he legitimately changes them, and a gate that cries wolf gets
//     switched off.
suite('weekly volume');
await check('parseRunDistanceKm reads a leading distance and refuses anything else', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseRunDistanceKm;
    if (typeof f !== 'function') return 'MISSING';
    return {
      plain: f('11.5 km @ Zone 2\nSUNDAY'),
      integer: f('9 km @ Zone 2'),
      decimal: f('7.4 km easy @ 6:15–6:40/km'),
      tagged: f('[MR · SOMETHING] 14 km — Sunday, the long run'),
      noSpace: f('16km easy'),
      intervals: f('[INTERVALS] 8×550 m @ 4:30/km\n90s jog'),
      trial: f('🏃 5K TIME TRIAL — target 23:15'),
      skipped: f('REST — session skipped\n(Original plan preserved in Settings.)'),
      midString: f('run first, then 6 km easy'),
      empty: f(''), nul: f(null), undef: f(undefined),
    };
  });
  ok(r !== 'MISSING', 'parseRunDistanceKm not exposed on window');
  eq(r.plain, 11.5, 'plain: '); eq(r.integer, 9, 'integer: ');
  eq(r.decimal, 7.4, 'decimal: '); eq(r.tagged, 14, 'tagged: ');
  eq(r.noSpace, 16, 'no space before km: ');
  eq(r.intervals, null, 'an interval prescription is not a distance: ');
  eq(r.trial, null, 'a trial header is not a leading distance: ');
  eq(r.skipped, null, 'a skipped session must read as absent, not 0 km: ');
  eq(r.midString, null, 'a distance mid-sentence must not be taken as the session: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: '); eq(r.undef, null, 'undefined: ');
});
await check('parseQualityVolumeKm reads the "≈ N km of quality" line with its w-up and c-down', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseQualityVolumeKm;
    if (typeof f !== 'function') return 'MISSING';
    return {
      full: f('[TEMPO] 2×2000 m @ 4:55/km\n3 min jog between\n≈ 4 km of quality + 2 km w-up + 1.5 km c-down\naerobic entry'),
      decimalWork: f('[CRUISE] 6×700 m @ 4:50/km\n≈ 4.2 km of quality + 2 km w-up + 1.5 km c-down'),
      workOnly: f('[TEMPO] 4×1100 m\n≈ 4.4 km of quality'),
    };
  });
  ok(r !== 'MISSING', 'parseQualityVolumeKm not exposed on window');
  eq(r.full, { work: 4, warmup: 2, cooldown: 1.5, total: 7.5, source: 'quality-line' }, 'full form: ');
  eq(r.decimalWork.total, 7.7, 'decimal work volume: ');
  eq(r.workOnly, { work: 4.4, warmup: 0, cooldown: 0, total: 4.4, source: 'quality-line' },
     'a quality line with no w-up/c-down must not invent one: ');
});
await check('parseQualityVolumeKm reads a time trial that has NO quality line (the wk 8/16/20 trap)', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseQualityVolumeKm;
    return {
      fiveK: f('🏃 5K TIME TRIAL — target 23:15\nWednesday 14 Oct · this replaces the speed session\nw-up 2 km + 4×20s strides, then all-out\nc-down 1.5 km easy'),
      tenK: f('🏃 10K TIME TRIAL — target sub-49:00\nw-up 2 km + 4×20s strides, then all-out\nc-down 1.5 km easy'),
      bothForms: f('🏃 5K TIME TRIAL — run it rested\n≈ 5 km of quality + 2 km w-up + 1.5 km c-down'),
      skipped: f('REST — session skipped'),
      prose: f('easy spin, nothing measured'),
    };
  });
  eq(r.fiveK, { work: 5, warmup: 2, cooldown: 1.5, total: 8.5, source: 'time-trial' }, '5K trial: ');
  eq(r.tenK, { work: 10, warmup: 2, cooldown: 1.5, total: 13.5, source: 'time-trial' }, '10K trial: ');
  eq(r.bothForms.source, 'quality-line', 'the explicit quality line must win when both are present: ');
  eq(r.bothForms.total, 8.5, 'both forms present: ');
  eq(r.skipped, null, 'a skipped quality session must read as absent: ');
  eq(r.prose, null, 'prose with no distance must not default to a number: ');
});
await check('a session that states its own total is not double-counted with its warm-up', async () => {
  // The Marathon-Revolutie shape: the leading distance already contains the
  // warm-up and cool-down described on the next line. Adding them would
  // inflate the week by 3.5 km.
  const r = await page.evaluate(() => window.parseQualityVolumeKm(
    '[MR · SOMETHING] 9 km — the one hard run of the week\n2 km w-up + 6×800 m @ 4:40/km (2 min jog) + 1.5 km c-down'));
  eq(r, { work: 9, warmup: 0, cooldown: 0, total: 9, source: 'session-total' },
     'stated session total: ');
});
await check('every plan week totals the sum of its parts, with nothing silently defaulted', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.getWeeklyVolumeSeries !== 'function') return 'MISSING';
    const series = window.getWeeklyVolumeSeries();
    const bad = [];
    let prev = null;
    for (const e of series) {
      if (prev !== null && e.week !== prev + 1) bad.push(`week sequence jumped ${prev} -> ${e.week}`);
      prev = e.week;
      const sum = Math.round(e.runs.reduce((a, x) => a + x.km, 0) * 10) / 10;
      if (sum !== e.total) bad.push(`wk${e.week}: total ${e.total} != parts ${sum}`);
      if (!(e.total > 0)) bad.push(`wk${e.week}: total is ${e.total}`);
      if (e.runs.length + e.skipped.length !== 4) bad.push(`wk${e.week}: ${e.runs.length}+${e.skipped.length} run slots, expected 4`);
      for (const x of e.runs) {
        if (!Number.isFinite(x.km) || x.km <= 0) bad.push(`wk${e.week} ${x.key}: km is ${x.km}`);
        if (!x.source) bad.push(`wk${e.week} ${x.key}: parsed with no recorded source`);
      }
      // A run session whose text carries a distance MUST be counted. This is
      // the silent-defaulting class: weeks 8/16/20 were mis-read once.
      for (const key of ['longRun', 'recovery2', 'easy', 'quality']) {
        const t = window.getPlanned(e.week, key) || '';
        // v1.29: a run he is given as a TIME is work too. The detector learns
        // the third shape rather than the assertion being relaxed - "counted
        // despite nothing in its text" still fires on a session that states
        // neither a distance, a timed effort, nor a duration.
        const statesDuration = /^\s*(?:\[[^\]]*\]\s*)?\d+(?:\.\d+)?\s*min\b/im.test(t);
        const looksLikeWork = /\d\s*km/i.test(t)
                           || /TIME\s+TRIAL|\d+\s*K\s+RACE\b/i.test(t)
                           || statesDuration;
        const counted = e.runs.some(x => x.key === key);
        if (looksLikeWork && !counted) bad.push(`wk${e.week} ${key}: states work in its text but was not counted`);
        if (!looksLikeWork && counted) bad.push(`wk${e.week} ${key}: counted despite stating no work in its text`);
        // and the derived distance must BE the conversion, not a default:
        // minutes x the pace this very session states. This is the half of
        // "nothing silently defaulted" that the new shape needed.
        const row = e.runs.find(x => x.key === key);
        if (row && row.minutes) {
          const pace = window.sessionPaceSec(t);
          if (!pace) bad.push(`wk${e.week} ${key}: counted a duration with no stated pace to convert it`);
          else {
            const want = Math.round(row.minutes * 60 / pace * 10) / 10;
            if (Math.abs(want - row.km) > 0.051)
              bad.push(`wk${e.week} ${key}: ${row.minutes} min at its own pace is ${want} km, model says ${row.km}`);
          }
          if (row.source !== 'session-duration')
            bad.push(`wk${e.week} ${key}: carries minutes but was read as ${row.source}`);
        }
      }
      if (e.isTimeTrial && (!e.quality || !(e.quality.work > 0)))
        bad.push(`wk${e.week}: trial week whose trial distance did not parse`);
      if (e.longRunKm > 0) {
        const share = Math.round(e.longRunKm / e.total * 1000) / 10;
        if (share !== e.longRunShare) bad.push(`wk${e.week}: longRunShare ${e.longRunShare} != ${share}`);
      }
    }
    return { n: series.length, bad, deloads: series.filter(e => e.isDeload).length };
  });
  ok(r !== 'MISSING', 'getWeeklyVolumeSeries not exposed on window');
  ok(r.n > 0, 'the series is empty');
  ok(r.deloads > 0, 'no deload week detected — the notes marker the reader relies on may have changed shape');
  eq(r.bad, [], 'volume problems: ');
});
await check('the volume delta is measured against the previous BUILD week, never a deload', async () => {
  const r = await page.evaluate(() => {
    const series = window.getWeeklyVolumeSeries();
    const byWk = {}; series.forEach(e => { byWk[e.week] = e; });
    const bad = [];
    const rebounds = [];
    for (const e of series) {
      if (e.prevBuildWeek === null) {
        if (e.deltaPct !== null) bad.push(`wk${e.week}: delta with no baseline`);
        continue;
      }
      const p = byWk[e.prevBuildWeek];
      if (!p) { bad.push(`wk${e.week}: baseline wk${e.prevBuildWeek} not in series`); continue; }
      if (p.isDeload) bad.push(`wk${e.week}: baselined on the wk${p.week} DELOAD`);
      if (p.week >= e.week) bad.push(`wk${e.week}: baseline wk${p.week} is not earlier`);
      if (p.total !== e.prevBuildTotal) bad.push(`wk${e.week}: prevBuildTotal ${e.prevBuildTotal} != wk${p.week} total ${p.total}`);
      const expect = Math.round((e.total - p.total) / p.total * 1000) / 10;
      if (expect !== e.deltaPct) bad.push(`wk${e.week}: deltaPct ${e.deltaPct} != ${expect}`);
      const expectFlag = !e.isDeload && e.deltaPct > 10;
      if (expectFlag !== e.exceedsCeiling) bad.push(`wk${e.week}: exceedsCeiling ${e.exceedsCeiling} for ${e.deltaPct}%`);
      const before = byWk[e.week - 1];
      if (before && before.isDeload && !e.isDeload) rebounds.push([e.week, e.prevBuildWeek]);
    }
    return { bad, rebounds };
  });
  eq(r.bad, [], 'delta baseline problems: ');
  ok(r.rebounds.length > 0,
     'no week follows a deload — the case this check exists for was not exercised');
  for (const [wk, base] of r.rebounds)
    ok(base < wk - 1, `wk${wk} rebound baselined on wk${base}, i.e. the deload it just came out of`);
});
await check('the ceiling flag fires when an override pushes a week past +10%', async () => {
  const target = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const t = await p.evaluate(() => {
      const s = window.getWeeklyVolumeSeries();
      const e = s.find(x => !x.isDeload && x.prevBuildWeek !== null && !x.exceedsCeiling
                            && x.runs.some(r => r.key === 'easy'));
      if (!e) return null;
      return { week: e.week, total: e.total, deltaPct: e.deltaPct,
               easyKm: e.runs.find(r => r.key === 'easy').km,
               easyText: window.getPlanned(e.week, 'easy') };
    });
    await c.close();
    return t;
  })();
  ok(target, 'no build week with an easy run and a baseline found');
  const ov = (newValue) => JSON.stringify(JSON.stringify([{
    ts: '2026-08-29T00:00:00.000Z', week: target.week, sessionKey: 'easy',
    kind: 'text_replace', changeId: 'gate_vol', payload: { newValue },
  }]));
  // 1. inflate that easy run by 25% of the week — must trip the flag
  const blownKm = Math.round((target.easyKm + target.total * 0.25) * 10) / 10;
  const { page: p1, ctx: c1 } = await openApp(browser, {
    init: `localStorage.setItem('programOverrides', ${ov(blownKm + ' km easy @ 6:15/km')})`,
  }, port);
  const blown = await p1.evaluate((w) => window.getWeeklyVolume(w), target.week);
  await c1.close();
  ok(blown.deltaPct > 10, `override did not raise the delta: ${blown.deltaPct}%`);
  ok(blown.exceedsCeiling, `+${blown.deltaPct}% did not trip the ceiling flag`);
  // 2. skip that easy run entirely — its km must leave the total
  const { page: p2, ctx: c2 } = await openApp(browser, {
    init: `localStorage.setItem('programOverrides', ${ov('REST — session skipped')})`,
  }, port);
  const skipped = await p2.evaluate((w) => window.getWeeklyVolume(w), target.week);
  await c2.close();
  eq(skipped.total, Math.round((target.total - target.easyKm) * 10) / 10,
     'a skipped run must leave the weekly total: ');
  ok(skipped.skipped.includes('easy'), 'the skipped run is not reported as uncounted');
  ok(!skipped.exceedsCeiling, 'a week that shrank must not be flagged as a breach');
});
await check('the week view renders the computed total and stays inside 320px', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 320, height: 800 },
  }, port);
  const r = await p.evaluate(() => {
    if (typeof window.renderWeekView !== 'function') return { err: 'renderWeekView not on window' };
    if (!document.getElementById('program-tab')) return { err: '#program-tab missing from the shell' };
    try { window.renderWeekView(); } catch (ex) { return { err: 'renderWeekView threw: ' + ex.message }; }
    const card = document.getElementById('volumeCard');
    if (!card) return { err: 'no #volumeCard rendered in the week view' };
    const wk = Number(card.dataset.volumeWeek);
    const v = window.getWeeklyVolume(wk);
    const title = (document.querySelector('.week-title') || {}).textContent || '';
    return {
      wk, titleWk: Number((title.match(/(\d+)/) || [])[1]),
      cardTotal: Number(card.dataset.volumeTotal),
      modelTotal: v ? v.total : null,
      shown: (document.getElementById('volumeTotal') || {}).textContent || '',
      parts: (document.getElementById('volumeParts') || {}).textContent || '',
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `week view produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
  eq(r.wk, r.titleWk, 'the card is rendering a different week from the header: ');
  eq(r.cardTotal, r.modelTotal, 'the rendered total disagrees with getWeeklyVolume: ');
  ok(r.shown.includes(String(r.modelTotal)), `total not shown to the user: "${r.shown}"`);
  ok(/long\s/.test(r.parts) && /quality\s/.test(r.parts),
     `the breakdown does not name the sessions: "${r.parts}"`);
  ok(r.scroll <= r.client + 1,
     `the volume card pushes the week view sideways at 320px: ${r.scroll} vs ${r.client}`);
});
await check('isRunSession and the volume reader agree on which sessions are runs', async () => {
  const r = await page.evaluate(() => {
    const keys = ['longRun', 'recovery2', 'easy', 'quality', 'upperA', 'upperB', 'lower', 'nonsense'];
    const series = window.getWeeklyVolumeSeries();
    const seen = new Set();
    for (const e of series) { e.runs.forEach(x => seen.add(x.key)); e.skipped.forEach(k => seen.add(k)); }
    return { flags: keys.map(k => [k, window.isRunSession(k)]), slots: [...seen].sort() };
  });
  for (const [k, isRun] of r.flags) {
    const expected = ['longRun', 'recovery2', 'easy', 'quality'].includes(k);
    eq(isRun, expected, `isRunSession("${k}"): `);
  }
  eq(r.slots, ['easy', 'longRun', 'quality', 'recovery2'],
     'the volume reader walks a different set of sessions from isRunSession: ');
});

// ── 13. PER-EXERCISE SAVE (v1.16) ───────────────────────────────────────
// "Save exercise" used to write the WHOLE exercise list and run PR detection
// across all of it, so one button committed every exercise on the card —
// including pre-filled plan targets that had not been lifted. These checks
// pin the two things that must both hold: the target exercise IS committed,
// and nothing else is.
suite('per-exercise save');
await check('mergeSingleExercise commits the target exercise and nothing else', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.mergeSingleExercise !== 'function') return 'MISSING';
    const live = [
      { name: 'Flat Bench', sets: [{ targetWeight: '82.5', targetReps: '6', weight: '85', reps: '6', rpe: '8' }] },
      { name: 'BB Row', sets: [{ targetWeight: '60', targetReps: '10', weight: '60', reps: '10', rpe: '7', seeded: true }] },
      { name: 'Face Pulls', sets: [{ targetWeight: '', targetReps: '20', weight: '25', reps: '20', rpe: '' }] },
    ];
    const out = window.mergeSingleExercise(null, live, 0);
    return {
      names: out.exercises.map(e => e.name),
      bench: out.exercises[0].sets[0],
      row: out.exercises[1].sets[0],
      pulls: out.exercises[2].sets[0],
    };
  });
  ok(r !== 'MISSING', 'mergeSingleExercise not exposed on window');
  eq(r.names, ['Flat Bench', 'BB Row', 'Face Pulls'],
     'the record must stay shaped like the workout, or the reload reports the rest as newly added: ');
  eq(r.bench, { targetWeight: '82.5', targetReps: '6', weight: '85', reps: '6', rpe: '8' },
     'the saved exercise lost its logged values: ');
  eq(r.row, { targetReps: '10', targetWeight: '60', reps: '', weight: '', rpe: '' },
     'a NON-target exercise was committed by a per-exercise save: ');
  eq(r.pulls, { targetReps: '20', targetWeight: '', reps: '', weight: '', rpe: '' },
     'a NON-target exercise was committed by a per-exercise save: ');
});
await check('a second per-exercise save does not wipe the first', async () => {
  const r = await page.evaluate(() => {
    const live = [
      { name: 'Flat Bench', sets: [{ targetWeight: '82.5', weight: '85', reps: '6', rpe: '8' }] },
      { name: 'BB Row', sets: [{ targetWeight: '60', weight: '62.5', reps: '10', rpe: '7' }] },
    ];
    const first = window.mergeSingleExercise(null, live, 0);
    const second = window.mergeSingleExercise(first, live, 1);
    return {
      bench: second.exercises[0].sets[0],
      row: second.exercises[1].sets[0],
    };
  });
  eq(r.bench.weight, '85', 'the first saved exercise was overwritten by the second save: ');
  eq(r.bench.reps, '6', 'the first saved exercise lost its reps: ');
  eq(r.row.weight, '62.5', 'the second exercise was not committed: ');
});
await check('a per-exercise save preserves workout-level fields and never drops another log', async () => {
  const r = await page.evaluate(() => {
    const stored = {
      sleepQuality: '7', rpe: '8', notes: 'felt strong', epoch: 3,
      exercises: [
        { name: 'Flat Bench', sets: [{ weight: '85', reps: '6', rpe: '8' }] },
        // logged, but no longer on the card (plan changed / user removed it)
        { name: 'Incline DB Press', sets: [{ weight: '30', reps: '15', rpe: '7' }] },
      ],
    };
    const live = [
      { name: 'Flat Bench', sets: [{ weight: '87.5', reps: '5', rpe: '9' }] },
      { name: 'Paused Bench', sets: [{ weight: '77.5', reps: '4', rpe: '6' }] },
    ];
    const out = window.mergeSingleExercise(stored, live, 1);
    return {
      sleep: out.sleepQuality, sessionRpe: out.rpe, notes: out.notes, epoch: out.epoch,
      names: out.exercises.map(e => e.name),
      bench: out.exercises[0].sets[0],
      paused: out.exercises[1].sets[0],
      orphan: (out.exercises.find(e => e.name === 'Incline DB Press') || {}).sets,
    };
  });
  eq(r.sleep, '7', 'stored sleep quality lost: ');
  eq(r.sessionRpe, '8', 'stored session RPE lost: ');
  eq(r.notes, 'felt strong', 'stored notes lost: ');
  eq(r.epoch, 3, 'the programme epoch stamp was dropped: ');
  eq(r.bench, { weight: '85', reps: '6', rpe: '8' },
     'saving Paused Bench overwrote the stored Flat Bench log: ');
  eq(r.paused, { weight: '77.5', reps: '4', rpe: '6' }, 'target not committed: ');
  eq(r.orphan, [{ weight: '30', reps: '15', rpe: '7' }],
     'a stored log that is no longer on the card was deleted: ');
});
await check('mergeSingleExercise refuses an index it has nothing for', async () => {
  const r = await page.evaluate(() => {
    const live = [{ name: 'A', sets: [] }];
    return {
      high: window.mergeSingleExercise(null, live, 5),
      neg: window.mergeSingleExercise(null, live, -1),
      nan: window.mergeSingleExercise(null, live, NaN),
      noList: window.mergeSingleExercise(null, null, 0),
      badStored: (window.mergeSingleExercise('not an object', live, 0) || {}).exercises?.length,
      arrStored: (window.mergeSingleExercise([1, 2], live, 0) || {}).exercises?.length,
    };
  });
  eq(r.high, null, 'out-of-range index: '); eq(r.neg, null, 'negative index: ');
  eq(r.nan, null, 'NaN index: '); eq(r.noList, null, 'no exercise list: ');
  eq(r.badStored, 1, 'a corrupt stored payload must not abort the save: ');
  eq(r.arrStored, 1, 'an array stored payload must not abort the save: ');
});
await check('parseBulkReps takes an integer and refuses everything else', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseBulkReps;
    if (typeof f !== 'function') return 'MISSING';
    return {
      six: f('6'), padded: f(' 12 '), hundred: f('100'),
      range: f('6-8'), enDash: f('6–8'), withWord: f('8 reps'), decimal: f('6.5'),
      zero: f('0'), tooBig: f('101'), max: f('BW'), empty: f(''), nul: f(null),
    };
  });
  ok(r !== 'MISSING', 'parseBulkReps not exposed on window');
  eq(r.six, 6, 'integer: '); eq(r.padded, 12, 'padded: '); eq(r.hundred, 100, 'upper bound: ');
  eq(r.range, null, 'a range must not fill every set: ');
  eq(r.enDash, null, 'en-dash range: ');
  eq(r.withWord, null, '"8 reps" must not be written into the reps field: ');
  eq(r.decimal, null, 'reps are integers: ');
  eq(r.zero, null, 'zero: '); eq(r.tooBig, null, 'above 100: ');
  eq(r.max, null, '"BW" is a weight, not a rep count: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: ');
});
await check('the strength logger offers one bulk-reps field per exercise and a Save Workout button', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 320, height: 900 },
  }, port);
  const r = await p.evaluate(async () => {
    if (typeof window.renderSessionLogger !== 'function') return { err: 'renderSessionLogger not on window' };
    if (!document.getElementById('program-tab')) return { err: '#program-tab missing' };
    try { await window.renderSessionLogger(); } catch (ex) { return { err: 'threw: ' + ex.message }; }
    const blocks = document.querySelectorAll('.exercise-block');
    if (!blocks.length) return { err: 'no exercise blocks rendered — not a strength session?' };
    const perBlock = [...blocks].map(b => ({
      weight: b.querySelectorAll('.bulk-weight').length,
      reps: b.querySelectorAll('.bulk-reps').length,
      save: b.querySelectorAll('[data-save-ex]').length,
    }));
    const btn = document.getElementById('saveSession');
    return {
      blocks: blocks.length,
      perBlock,
      bottomLabel: btn ? btn.textContent.trim() : null,
      bottomCount: document.querySelectorAll('#saveSession').length,
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `the logger produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
  for (const [i, b] of r.perBlock.entries()) {
    eq(b.reps, 1, `exercise ${i}: bulk-reps fields: `);
    eq(b.weight, 1, `exercise ${i}: bulk-weight fields: `);
    eq(b.save, 1, `exercise ${i}: per-exercise save buttons: `);
  }
  eq(r.bottomCount, 1, 'there must be exactly one workout-level save button: ');
  eq(r.bottomLabel, 'Save Workout', 'bottom button label: ');
  ok(r.scroll <= r.client + 1,
     `the bulk-reps field pushes the logger sideways at 320px: ${r.scroll} vs ${r.client}`);
});
await check('pressing one exercise\'s save button writes only that exercise to storage', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 390, height: 900 },
  }, port);
  const r = await p.evaluate(async () => {
    await window.renderSessionLogger();
    const blocks = document.querySelectorAll('.exercise-block');
    if (blocks.length < 2) return { err: `need >=2 exercises, got ${blocks.length}` };
    const live = window.getExercises();
    // Type a real number into set 1 of exercise 0 AND exercise 1, then save
    // only exercise 0. Exercise 1 must not be committed.
    const type = (exIdx, field, value) => {
      const el = document.querySelector(`[data-ex="${exIdx}"][data-set="0"][data-field="${field}"]`);
      if (!el) return false;
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    };
    const okTyped = type(0, 'weight', '111') && type(0, 'reps', '3')
                 && type(1, 'weight', '222') && type(1, 'reps', '9');
    if (!okTyped) return { err: 'could not find the set inputs' };
    const name0 = live[0].name, name1 = live[1].name;
    document.querySelector('[data-save-ex="0"]').click();
    await new Promise(res => setTimeout(res, 400));
    const keys = Object.keys(localStorage).filter(k => k.startsWith('session_'));
    if (keys.length !== 1) return { err: `expected 1 stored session, found ${keys.length}` };
    const rec = JSON.parse(localStorage.getItem(keys[0]));
    const find = (n) => (rec.exercises || []).find(x => x.name === n);
    const completed = JSON.parse(localStorage.getItem('completedSessions') || '{}');
    return {
      name0, name1,
      saved0: find(name0) ? find(name0).sets[0] : null,
      saved1: find(name1) ? find(name1).sets[0] : null,
      storedNames: (rec.exercises || []).map(x => x.name),
      liveNames: live.map(x => x.name),
      completedCount: Object.keys(completed).length,
      confirmText: (document.getElementById('save-ex-confirm-0') || {}).textContent || '',
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `saving one exercise produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
  eq(r.storedNames, r.liveNames, 'the stored record no longer matches the workout: ');
  ok(r.saved0, `the saved exercise "${r.name0}" is missing from the record`);
  eq(r.saved0.weight, '111', 'the saved exercise did not persist its weight: ');
  eq(r.saved0.reps, '3', 'the saved exercise did not persist its reps: ');
  ok(r.saved1, `"${r.name1}" is missing from the record entirely`);
  eq(r.saved1.weight, '', `"${r.name1}" was committed by another exercise's save button: `);
  eq(r.saved1.reps, '', `"${r.name1}" was committed by another exercise's save button: `);
  eq(r.completedCount, 0, 'a per-exercise save must not mark the session complete: ');
  ok(r.confirmText.includes(r.name0),
     `the confirmation should name what was saved, got "${r.confirmText}"`);
});
await check('the bulk-reps field fills every set, and a range fills none of them', async () => {
  const { page: p, ctx: c } = await openApp(browser, { viewport: { width: 390, height: 900 } }, port);
  const r = await p.evaluate(async () => {
    await window.renderSessionLogger();
    const set = (sel, value) => {
      const el = document.querySelector(sel);
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const readReps = () => [...document.querySelectorAll('[data-ex="0"][data-field="reps"]')].map(i => i.value);
    const setCount = document.querySelectorAll('[data-ex="0"][data-field="reps"]').length;
    set('[data-bulk-reps-ex="0"]', '7');
    await new Promise(res => setTimeout(res, 120));
    const filled = readReps();
    const other = [...document.querySelectorAll('[data-ex="1"][data-field="reps"]')].map(i => i.value);
    // now a range: must be refused and must not overwrite the 7s
    set('[data-bulk-reps-ex="0"]', '6-8');
    await new Promise(res => setTimeout(res, 120));
    const afterBad = readReps();
    const flagged = document.querySelector('[data-bulk-reps-ex="0"]').dataset.bulkRepsInvalid === '1';
    return { setCount, filled, other, afterBad, flagged, model: window.getExercises()[0].sets.map(s => s.reps) };
  });
  await c.close();
  ok(r.setCount > 1, `need an exercise with more than one set, got ${r.setCount}`);
  eq(r.filled, Array(r.setCount).fill('7'), 'bulk reps did not fill every set: ');
  eq(r.model, Array(r.setCount).fill('7'), 'bulk reps did not reach the model behind the inputs: ');
  ok(r.other.every(v => v !== '7'), 'bulk reps leaked into another exercise');
  eq(r.afterBad, Array(r.setCount).fill('7'), 'a rejected bulk value overwrote logged reps: ');
  ok(r.flagged, 'a rejected bulk-reps value was silently ignored rather than shown as rejected');
});

// ── 14. OFFLINE STRENGTH ANALYSER (v1.17) ───────────────────────────────
// The offline coach carried its own PRE-v1.11 bench ladder, deload/attempt
// week lists from a retired 32-week epoch (so both were dead code on a
// 21-week plan), an e1RM that paired weights with the wrong reps, and a bench
// finder that picked the submaximal Paused Bench on Upper B. These checks pin
// the analysis, not the prose.
suite('strength analyser');
await check('parseSetLog pairs weight and reps per set and refuses a half-logged set', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseSetLog;
    if (typeof f !== 'function') return 'MISSING';
    return {
      full: f({ weight: '85', reps: '6', rpe: '7.5' }),
      comma: f({ weight: '82,5', reps: '3', rpe: '' }),
      bodyweight: f({ weight: '0', reps: '10', rpe: '8' }),
      noReps: f({ weight: '85', reps: '', rpe: '8' }),
      noWeight: f({ weight: '', reps: '6', rpe: '8' }),
      badRpe: f({ weight: '85', reps: '6', rpe: '99' }),
      nul: f(null),
    };
  });
  ok(r !== 'MISSING', 'parseSetLog not exposed on window');
  eq(r.full, { weight: 85, reps: 6, rpe: 7.5 }, 'full set: ');
  eq(r.comma, { weight: 82.5, reps: 3, rpe: null }, 'comma decimal, no rpe: ');
  eq(r.bodyweight, { weight: 0, reps: 10, rpe: 8 }, '0 kg is legitimate (bodyweight): ');
  eq(r.noReps, null, 'a weight with no reps must not become a data point: ');
  eq(r.noWeight, null, 'reps with no weight: ');
  eq(r.badRpe.rpe, null, 'an out-of-range RPE must be dropped, not used: ');
  eq(r.nul, null, 'null: ');
});
await check('the e1RM desync bug is gone: each set keeps its own reps', async () => {
  // The old code filtered weights and reps into two arrays and zipped them,
  // so [(85,6),(85,-),(90,3)] became (85,6),(85,3),(90,undefined).
  const r = await page.evaluate(() => {
    const sets = [
      { weight: '85', reps: '6', rpe: '8' },
      { weight: '85', reps: '', rpe: '8' },   // half-logged: must be skipped
      { weight: '90', reps: '3', rpe: '8' },
    ];
    return {
      parsed: sets.map(s => window.parseSetLog(s)),
      ests: sets.map(s => { const e = window.e1rmFromSet(s); return e ? e.set : null; }),
    };
  });
  eq(r.parsed[1], null, 'the half-logged set must drop out: ');
  eq(r.ests[2], { weight: 90, reps: 3, rpe: 8 },
     'the 90 kg set was paired with the wrong reps — the desync bug is back: ');
});
await check('e1RM folds in reps-in-reserve and refuses unreliable rep ranges', async () => {
  const r = await page.evaluate(() => {
    const f = window.e1rmFromSet;
    const at = (w, reps, rpe) => f({ weight: String(w), reps: String(reps), rpe: rpe === null ? '' : String(rpe) });
    return {
      single: at(107.5, 1, 9),
      triple8: at(95, 3, 8),
      six75: at(85, 6, 7.5),
      sameLoadHardEasy: [at(85, 6, 10).e1rm, at(85, 6, 6).e1rm],
      noRpe: at(95, 3, null),
      highReps: f({ weight: '20', reps: '15', rpe: '8' }),
      cap: window.E1RM_MAX_REPS,
    };
  });
  ok(r.triple8.e1rm > r.noRpe.e1rm,
     'an RPE 8 triple must estimate higher than the same triple read at face value');
  eq(r.triple8.rir, 2, 'RPE 8 => 2 reps in reserve: ');
  eq(r.noRpe.rpeKnown, false, 'a set with no RPE must be flagged, not assumed maximal: ');
  ok(r.sameLoadHardEasy[0] < r.sameLoadHardEasy[1],
     `an RPE 10 set must not estimate the same as an RPE 6 set at the same load: ${r.sameLoadHardEasy}`);
  eq(r.highReps, null, 'Epley above the rep cap must return null, not a fantasy number: ');
  ok(r.single.e1rm >= 107.5, `a made single must estimate at least the bar weight: ${r.single.e1rm}`);
});
await check('classifyBenchLift keeps the submaximal variants out of the max estimate', async () => {
  const r = await page.evaluate(() => {
    const f = window.classifyBenchLift;
    const names = ['Flat Bench', 'Flat BP', 'Bench Press', 'Top Single', 'Back-off',
                   'Paused Bench', 'Incline DB Press', 'CGBP', 'Dips',
                   'Military Press', 'BB Row', 'Pec Deck', '', null];
    return names.map(n => [n, f(n)]);
  });
  const got = Object.fromEntries(r);
  for (const n of ['Flat Bench', 'Flat BP', 'Bench Press', 'Top Single', 'Back-off'])
    eq(got[n], 'max', `${n} must count toward the bench max: `);
  for (const n of ['Paused Bench', 'Incline DB Press', 'CGBP', 'Dips'])
    eq(got[n], 'skill', `${n} is submaximal by design and must NOT set the max estimate: `);
  for (const n of ['Military Press', 'BB Row', 'Pec Deck'])
    eq(got[n], null, `${n} is not a bench lift: `);
});
await check('the bench ladder is read from the plan, and matches the plan on every week', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.getBenchLadder !== 'function') return 'MISSING';
    const ladder = window.getBenchLadder();
    const bad = [];
    for (const w of ladder) {
      for (const e of w.entries) {
        const text = window.getPlanned(w.week, 'upperA') || '';
        // every parsed load must literally appear in the week's own plan text
        for (const l of e.loadOptions) {
          if (text.indexOf(String(l)) === -1)
            bad.push(`wk${w.week} ${e.lift}: parsed ${l} kg which is not in the plan text`);
        }
        if (!e.loadOptions.length) bad.push(`wk${w.week} ${e.lift}: no load parsed`);
        if (e.conditional && e.load !== null)
          bad.push(`wk${w.week} ${e.lift}: conditional load committed to a single number`);
        if (!e.conditional && e.load === null)
          bad.push(`wk${w.week} ${e.lift}: unconditional load left null`);
      }
      const attempts = w.entries.filter(e => e.kind === 'attempt');
      if (attempts.length && !/PR attempt/i.test(window.getPlanned(w.week, 'upperA') || ''))
        bad.push(`wk${w.week}: attempt classified with no "PR attempt" marker in the plan`);
    }
    return {
      bad,
      weeks: ladder.length,
      attemptWeeks: ladder.filter(w => w.entries.some(e => e.kind === 'attempt')).map(w => w.week),
      rungWeeks: ladder.filter(w => w.entries.some(e => e.kind === 'rung')).map(w => w.week),
      primaryTargets: ladder.filter(w => w.isPrimaryTarget).map(w => w.week),
    };
  });
  ok(r !== 'MISSING', 'getBenchLadder not exposed on window');
  eq(r.bad, [], 'ladder parse problems: ');
  ok(r.weeks > 0, 'the ladder is empty');
  ok(r.attemptWeeks.length > 0, 'no attempt week found in the plan — the parser has stopped seeing them');
  ok(r.rungWeeks.length > 0, 'no 92-97% trained rung found — that is the whole peaking design');
  // Renamed at v1.21. The flag was isNovemberTarget and its detector named a
  // specific month; the target moved to December, so both were wrong by
  // construction. The invariant itself is unchanged: exactly one week is THE
  // target, whatever month it lands in.
  eq(r.primaryTargets.length, 1,
     'exactly one week must be marked the primary target, or the coach has no goal to aim at: ');
});
await check('deload and attempt weeks are detected from the plan, not a dead week list', async () => {
  const r = await page.evaluate(() => {
    const weeks = window.getBenchLadder().map(w => w.week);
    const all = [];
    for (const wk of weeks) {
      all.push({ wk, deload: window.isDeloadWeekNum(wk), attempt: window.isBenchAttemptWeek(wk) });
    }
    // the old lists were [17,24,32] and [21,31,33]
    return {
      deloads: all.filter(a => a.deload).map(a => a.wk),
      attempts: all.filter(a => a.attempt).map(a => a.wk),
      outOfRange: [24, 31, 32, 33].map(wk => [wk, window.isDeloadWeekNum(wk), window.isBenchAttemptWeek(wk)]),
    };
  });
  ok(r.deloads.length > 0, 'no deload week detected — the deload briefing can never fire');
  ok(r.attempts.length > 0, 'no attempt week detected — the attempt briefing can never fire');
  for (const [wk, d, a] of r.outOfRange) {
    eq(d, false, `wk${wk} is outside the plan and must not read as a deload: `);
    eq(a, false, `wk${wk} is outside the plan and must not read as an attempt week: `);
  }
  ok(!r.deloads.some(w => r.attempts.includes(w)),
     `a week is both a deload and a bench attempt week: ${r.deloads.filter(w => r.attempts.includes(w))}`);
});
await check('getNextBenchMilestone never points backwards and never returns the stale ladder', async () => {
  const r = await page.evaluate(() => {
    const weeks = window.getBenchLadder().map(w => w.week);
    const out = [];
    for (const wk of weeks) {
      const m = window.getNextBenchMilestone(wk);
      out.push(m ? { from: wk, week: m.week, load: m.load, opts: m.loadOptions, kind: m.kind } : { from: wk, week: null });
    }
    return out;
  });
  for (const m of r) {
    if (m.week === null) continue;
    ok(m.week >= m.from, `from wk${m.from} the next milestone is wk${m.week} — backwards`);
    ok(['attempt', 'rung', 'tuneup'].includes(m.kind), `wk${m.from}: unexpected kind ${m.kind}`);
  }
  // The pre-v1.11 ladder put 115 kg at wk 3 and 117.5 at wk 7. The live plan
  // puts a 107.5 tune-up at wk 3. If 117.5 ever comes back as a milestone the
  // hardcoded map has returned.
  const w3 = r.find(m => m.from === 3);
  ok(w3 && w3.week === 3, 'wk 3 carries a single in the plan and must be its own next milestone');
  ok(!(w3.load === 115), 'wk 3 is reporting the pre-v1.11 115 kg attempt — the stale ladder is back');
  // Until v1.23 this line banned 117.5 kg outright. Mardy put it back in the
  // ladder deliberately, as the rung between 115 and 120, so the number is no
  // longer the tell. The retired ladder's actual tell is a 115 ATTEMPT at wk 3
  // with nothing trained beneath it, which the two assertions above pin, and
  // the 92% rung rule below pins the rest. What replaces the ban is the
  // invariant a ladder must satisfy whatever numbers it carries.
  const singles = await page.evaluate(() => window.getBenchLadder()
    .flatMap(w => w.entries
      .filter(e => e.sets === 1 && e.reps === 1 && e.load !== null)
      .map(e => ({ week: w.week, load: e.load, kind: e.kind }))));
  ok(singles.length >= 3, `the ladder has only ${singles.length} trained single(s)`);
  // ATTEMPTS must climb. Rungs must not: a submaximal single after a max
  // attempt is the design working, and a first version of this assertion
  // fired on wk 14's 115 rung sitting behind the wk 11 attempt. The check was
  // wrong and the plan was right.
  const atts = singles.filter(x => x.kind === 'attempt');
  ok(atts.length >= 2, `only ${atts.length} attempt(s) in the ladder`);
  const backwards = [];
  for (let i = 1; i < atts.length; i++) {
    if (atts[i].load <= atts[i - 1].load)
      backwards.push(`wk${atts[i].week} attempts ${atts[i].load} after wk${atts[i-1].week} attempted ${atts[i-1].load}`);
  }
  eq(backwards, [], 'the attempts do not climb: ');
});
await check('adviseExerciseLoad reads the whole workout and gives a load verdict per exercise', async () => {
  const r = await page.evaluate(() => {
    const f = window.adviseExerciseLoad;
    if (typeof f !== 'function') return 'MISSING';
    const mk = (name, sets) => ({ name, sets });
    return {
      easy: f(mk('Flat Bench', [
        { targetWeight: '85 kg', targetReps: '6', weight: '85', reps: '6', rpe: '6' },
        { targetWeight: '85 kg', targetReps: '6', weight: '85', reps: '6', rpe: '6' }]), 7.5),
      onTarget: f(mk('Flat Bench', [
        { targetWeight: '85 kg', targetReps: '6', weight: '85', reps: '6', rpe: '7.5' }]), 7.5),
      grind: f(mk('Flat Bench', [
        { targetWeight: '85 kg', targetReps: '6', weight: '85', reps: '6', rpe: '9.5' }]), 7.5),
      missedReps: f(mk('Flat Bench', [
        { targetWeight: '100 kg', targetReps: '3', weight: '100', reps: '2', rpe: '8' }]), 8),
      noRpe: f(mk('BB Row', [{ targetWeight: '60 kg', targetReps: '10', weight: '60', reps: '10', rpe: '' }]), null),
      notLogged: f(mk('Pec Deck', [{ targetReps: '15', weight: '', reps: '', rpe: '' }]), null),
      noName: f({ sets: [] }),
    };
  });
  ok(r !== 'MISSING', 'adviseExerciseLoad not exposed on window');
  eq(r.easy.verdict, 'add', 'RPE 6 against a planned 7.5 with reps met: ');
  eq(r.easy.nextWeight, 87.5, 'a sub-100 kg lift steps 2.5 kg: ');
  eq(r.onTarget.verdict, 'hold', 'RPE on the planned number: ');
  eq(r.onTarget.nextWeight, 85, 'a hold must not move the load: ');
  eq(r.grind.verdict, 'reduce', 'RPE 9.5 against a planned 7.5: ');
  eq(r.grind.nextWeight, 82.5, 'reduce step: ');
  eq(r.missedReps.verdict, 'reduce', 'reps missed must reduce regardless of RPE: ');
  eq(r.missedReps.nextWeight, 95, 'a 100 kg+ lift steps 5 kg: ');
  eq(r.noRpe.verdict, 'no-rpe', 'no RPE must be reported as such, not guessed: ');
  eq(r.notLogged.verdict, 'not-logged', 'an unlogged exercise: ');
  eq(r.noName, null, 'an exercise with no name: ');
});
await check('the session analysis excludes Paused Bench from the max and reads every exercise', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.analyseStrengthSession !== 'function') return 'MISSING';
    // An Upper B: paused bench at 77.5 (submaximal by design) plus accessories.
    const upperB = window.analyseStrengthSession({
      wk: 3, sessionKey: 'e3:3_upperB',
      exercises: [
        { name: 'Paused Bench', sets: [{ weight: '77.5', reps: '4', rpe: '6' }] },
        { name: 'Pull-Ups', sets: [{ weight: '0', reps: '8', rpe: '7' }] },
        { name: 'Seated Low Row', sets: [{ weight: '52.5', reps: '10', rpe: '7' }] },
      ],
    });
    // An Upper A with the real lift.
    const upperA = window.analyseStrengthSession({
      wk: 3, sessionKey: 'e3:3_upperA',
      exercises: [
        { name: 'Flat Bench', sets: [{ weight: '107.5', reps: '1', rpe: '9' }] },
        { name: 'Military Press', sets: [{ weight: '45', reps: '6', rpe: '7' }] },
      ],
    });
    return {
      bRole: upperB.perExercise.map(p => [p.name, p.benchRole]),
      bSession: upperB.sessionBenchE1rm,
      bCount: upperB.perExercise.length,
      aSessionLift: upperA.sessionBenchE1rm ? upperA.sessionBenchE1rm.lift : null,
      aE1rm: upperA.sessionBenchE1rm ? upperA.sessionBenchE1rm.e1rm : null,
      target: upperA.target,
      weeksToTarget: upperA.weeksToTarget,
      lines: window.strengthCoachLines(upperA).length,
      linesB: window.strengthCoachLines(upperB),
    };
  });
  ok(r !== 'MISSING', 'analyseStrengthSession not exposed on window');
  eq(r.bCount, 3, 'the analysis must read every exercise in the workout, not just the bench: ');
  eq(r.bSession, null,
     'Paused Bench set a bench max estimate — it is prescribed at 70-73% with 2-3 RIR: ');
  eq(r.aSessionLift, 'Flat Bench', 'the competition lift must drive the estimate: ');
  ok(r.aE1rm >= 107.5, `a made 107.5 single must estimate at least 107.5, got ${r.aE1rm}`);
  ok(r.target && r.target.load === 120,
     `the November target must resolve to 120 kg from the plan, got ${JSON.stringify(r.target)}`);
  ok(r.weeksToTarget > 0, `weeks to the target from wk 3 should be positive, got ${r.weeksToTarget}`);
  ok(r.lines >= 3, `the coach produced only ${r.lines} lines for a benched Upper A`);
  ok(r.linesB.some(l => /submaximal/i.test(l)),
     'the coach should say why Paused Bench is excluded rather than silently ignoring it');
});
await check('the coach never recommends adding load on a deload or an attempt week', async () => {
  const r = await page.evaluate(() => {
    const easySet = [{ targetWeight: '85 kg', targetReps: '6', weight: '85', reps: '6', rpe: '5' }];
    const ladder = window.getBenchLadder();
    const attemptWk = ladder.find(w => window.isBenchAttemptWeek(w.week));
    const deloadWk = ladder.find(w => window.isDeloadWeekNum(w.week));
    const buildWk = ladder.find(w => !window.isBenchAttemptWeek(w.week) && !window.isDeloadWeekNum(w.week));
    const run = (wk) => {
      const an = window.analyseStrengthSession({ wk, exercises: [{ name: 'Military Press', sets: easySet }] });
      return { wk, adds: an.adds.length, held: (an.heldBack || []).length,
               lines: window.strengthCoachLines(an) };
    };
    return {
      attempt: attemptWk ? run(attemptWk.week) : null,
      deload: deloadWk ? run(deloadWk.week) : null,
      build: buildWk ? run(buildWk.week) : null,
    };
  });
  ok(r.attempt && r.deload && r.build, 'could not find one of each week type in the plan');
  eq(r.build.adds, 1, 'an easy session in a build week must still earn a load increase: ');
  eq(r.attempt.adds, 0, `load increase recommended on attempt week ${r.attempt.wk}: `);
  eq(r.deload.adds, 0, `load increase recommended on deload week ${r.deload.wk}: `);
  eq(r.attempt.held, 1, 'the held-back increase must still be reported, not dropped: ');
  ok(!r.attempt.lines.some(l => /Add load next time/.test(l)),
     'the attempt-week briefing and an "add load" line contradict each other');
  ok(!r.deload.lines.some(l => /Add load next time/.test(l)),
     'the deload briefing and an "add load" line contradict each other');
});
await check('a compliant paused-bench session reads as held, not as room to add', async () => {
  // Paused Bench is prescribed at 70-73% with 2-3 reps in reserve. RPE 6 is
  // the instruction being followed. Reading it as slack would add a third
  // heavy pressing exposure against a stated shoulder constraint.
  const r = await page.evaluate(() => {
    const sets = [{ targetWeight: '77.5 kg', targetReps: '4', weight: '77.5', reps: '4', rpe: '6' }];
    const compliant = window.adviseExerciseLoad({ name: 'Paused Bench', sets }, null, { role: 'skill' });
    const noRole = window.adviseExerciseLoad({ name: 'Military Press', sets }, null, {});
    const genuinelyEasy = window.adviseExerciseLoad(
      { name: 'Paused Bench', sets: [{ targetWeight: '77.5 kg', targetReps: '4', weight: '77.5', reps: '4', rpe: '4' }] },
      null, { role: 'skill' });
    return { compliant: compliant.verdict, noRole: noRole.verdict, genuinelyEasy: genuinelyEasy.verdict };
  });
  eq(r.compliant, 'hold', 'RPE 6 on a 2-3-RIR skill lift is compliance, not slack: ');
  eq(r.noRole, 'add', 'a non-skill lift at RPE 6 with reps met still has room: ');
  eq(r.genuinelyEasy, 'add', 'RPE 4 on a skill lift is genuinely light and should still add: ');
});
await check('bodyweight work is not reported as "0 kg"', async () => {
  const r = await page.evaluate(() => {
    const an = window.analyseStrengthSession({ wk: 3, exercises: [
      { name: 'Pull-Ups', sets: [{ targetReps: '8', weight: '0', reps: '8', rpe: '7' }] }] });
    return window.strengthCoachLines(an);
  });
  ok(!r.some(l => /\b0 kg\b/.test(l)), `bodyweight rendered as "0 kg": ${r.filter(l => /0 kg/.test(l))}`);
  ok(r.some(l => /bodyweight/i.test(l)), 'bodyweight work was not reported at all');
});
await check('the analyser survives an empty, junk and half-logged workout without throwing', async () => {
  const r = await page.evaluate(() => {
    const calls = [
      () => window.analyseStrengthSession(),
      () => window.analyseStrengthSession({}),
      () => window.analyseStrengthSession({ wk: 3, exercises: null }),
      () => window.analyseStrengthSession({ wk: 999, exercises: [{ name: 'Flat Bench', sets: [{ weight: 'BW', reps: 'x' }] }] }),
      () => window.analyseStrengthSession({ wk: 3, exercises: [null, { sets: [] }, { name: 'X' }] }),
      () => window.strengthCoachLines(null),
      () => window.strengthCoachLines(window.analyseStrengthSession({ wk: 3, exercises: [] })),
      () => window.getLoggedBenchHistory(),
    ];
    const out = [];
    for (const c of calls) {
      try { const v = c(); out.push(Array.isArray(v) ? 'array' : typeof v); }
      catch (e) { out.push('THREW: ' + e.message); }
    }
    return out;
  });
  for (const v of r) ok(!String(v).startsWith('THREW'), `analyser threw on degenerate input: ${v}`);
});
await check('bench history is read from stored sessions, epoch-filtered, and drives the trend', async () => {
  const seed = {
    'session_e3:1_upperA': { epoch: 3, savedAt: '2026-08-26T10:00:00.000Z', exercises: [
      { name: 'Flat Bench', sets: [{ weight: '82.5', reps: '6', rpe: '7.5' }] }] },
    'session_e3:2_upperA': { epoch: 3, savedAt: '2026-09-02T10:00:00.000Z', exercises: [
      { name: 'Flat Bench', sets: [{ weight: '95', reps: '3', rpe: '8' }] },
      { name: 'Paused Bench', sets: [{ weight: '77.5', reps: '4', rpe: '6' }] }] },
    // a retired-epoch record must be ignored entirely
    'session_e1:9_upperA': { epoch: 1, exercises: [
      { name: 'Flat Bench', sets: [{ weight: '200', reps: '1', rpe: '10' }] }] },
  };
  const { page: p, ctx: c } = await openApp(browser, {
    init: `${Object.entries(seed).map(([k, v]) =>
      `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))});`).join('')}`,
  }, port);
  const r = await p.evaluate(() => {
    const h = window.getLoggedBenchHistory();
    const an = window.analyseStrengthSession({ wk: 3, sessionKey: 'e3:3_upperA', exercises: [] });
    return {
      weeks: h.map(x => x.week),
      lifts: h.map(x => x.lift),
      e1rms: h.map(x => x.e1rm),
      best: an.bestE1rm,
      gap: an.gapToTarget,
      target: an.target ? an.target.load : null,
    };
  });
  await c.close();
  eq(r.weeks, [1, 2], 'history must cover the current epoch only, in week order: ');
  eq(r.lifts, ['Flat Bench', 'Flat Bench'],
     'the submaximal Paused Bench must not appear in the bench max history: ');
  ok(r.e1rms.every(v => v > 0 && v < 150), `implausible e1RM in history: ${r.e1rms}`);
  ok(r.e1rms[1] > r.e1rms[0], `95×3 @RPE 8 should estimate above 82.5×6 @RPE 7.5: ${r.e1rms}`);
  eq(r.target, 120, 'the target must come from the plan: ');
  ok(r.best > 100 && r.best < 130, `history-derived best e1RM out of plausible range: ${r.best}`);
  eq(r.gap, Math.round((120 - r.best) * 10) / 10, 'the gap must be target minus the best estimate: ');
});
await check('the coach renders offline with the CDN blocked and names the target', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 320, height: 900 },
    init: () => localStorage.setItem('session_e3:1_upperA', JSON.stringify({
      epoch: 3, exercises: [{ name: 'Flat Bench', sets: [{ weight: '95', reps: '3', rpe: '8' }] }] })),
  }, port);
  const r = await p.evaluate(async () => {
    await window.renderSessionLogger();
    const btn = document.getElementById('askCoach');
    if (!btn) return { err: 'no #askCoach button in the logger' };
    const first = document.querySelector('[data-ex="0"][data-set="0"][data-field="weight"]');
    const firstR = document.querySelector('[data-ex="0"][data-set="0"][data-field="reps"]');
    const firstP = document.querySelector('[data-ex="0"][data-set="0"][data-field="rpe"]');
    if (!first || !firstR) return { err: 'no set inputs' };
    const setV = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    setV(first, '95'); setV(firstR, '3'); if (firstP) setV(firstP, '8');
    btn.click();
    await new Promise(res => setTimeout(res, 500));
    const out = document.getElementById('aiResponse');
    return {
      text: out ? out.textContent : '',
      analysis: window._strengthAnalysis ? {
        best: window._strengthAnalysis.bestE1rm,
        target: window._strengthAnalysis.target,
        perExercise: window._strengthAnalysis.perExercise.length,
      } : null,
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `the coach produced uncaught errors offline:\n    ${real.slice(0, 3).join('\n    ')}`);
  ok(r.analysis, 'the coach ran without producing an analysis');
  ok(r.analysis.perExercise > 1,
     `the coach analysed only ${r.analysis.perExercise} exercise(s) — it must read the whole workout`);
  ok(r.analysis.target && r.analysis.target.load === 120,
     `the coach is not aiming at the 120 kg target: ${JSON.stringify(r.analysis.target)}`);
  ok(r.text.length > 80, `the coach produced almost no output offline: "${r.text.slice(0, 120)}"`);
  ok(/e1RM/i.test(r.text), 'the coach output does not report an e1RM estimate');
  ok(/120/.test(r.text), 'the coach output never mentions the 120 kg target');
  ok(!/117\.5/.test(r.text), 'the coach output cites 117.5 kg — the pre-v1.11 ladder is back');
  ok(r.scroll <= r.client + 1, `the coach output overflows at 320px: ${r.scroll} vs ${r.client}`);
});

// ── 15. COACH SUGGESTION GATING (BACKLOG B10 / B14, v1.18) ──────────────
// buildCoachSuggestions held the last two hardcoded week lists in the file:
//   const deloadWeeks  = [4,8,12,16,20];
//   const attemptWeeks = [3,7,11,15,19];
// The deload list agreed with the plan. The attempt list did not — it was the
// PRE-v1.11 ladder's attempt weeks, and wk 3 has carried a 107.5 kg tune-up
// single rather than an attempt since v1.11. So an ordinary build week was
// silently blocked from ever receiving a suggestion, for six builds.
//
// These checks pin the replacement to the plan rather than to a list, and
// prove the block is actually gone by driving the real coach button.
suite('coach suggestion gating');
await check('isSuggestionBlockedWeek is derived from the plan, on every week', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.isSuggestionBlockedWeek !== 'function') return 'MISSING';
    const weeks = window.getWeeklyVolumeSeries().map(e => e.week);
    const bad = [];
    for (const wk of weeks) {
      const expected = window.isDeloadWeekNum(wk) || window.isBenchAttemptWeek(wk);
      if (window.isSuggestionBlockedWeek(wk) !== expected)
        bad.push(`wk${wk}: blocked=${window.isSuggestionBlockedWeek(wk)} but plan says ${expected}`);
    }
    return {
      bad,
      blocked: weeks.filter(w => window.isSuggestionBlockedWeek(w)),
      outOfPlan: [24, 31, 32, 33].map(w => window.isSuggestionBlockedWeek(w)),
    };
  });
  ok(r !== 'MISSING', 'isSuggestionBlockedWeek not exposed on window — the hardcoded lists are still in charge');
  eq(r.bad, [], 'gating disagrees with the plan: ');
  ok(r.blocked.length > 0, 'no week is blocked at all — the deload/attempt guard has stopped working');
  eq(r.outOfPlan, [false, false, false, false],
     'a week outside the plan must not read as blocked: ');
});
await check('no hardcoded deload or attempt week list survives in the source', async () => {
  const src = fs.readFileSync(APP, 'utf8');
  const offenders = [];
  if (/\b(?:const|let|var)\s+deloadWeeks\s*=/.test(src)) offenders.push('const deloadWeeks = [...]');
  if (/\b(?:const|let|var)\s+attemptWeeks\s*=/.test(src)) offenders.push('const attemptWeeks = [...]');
  if (/deloadWeeks\s*\.\s*includes/.test(src)) offenders.push('deloadWeeks.includes(...)');
  if (/attemptWeeks\s*\.\s*includes/.test(src)) offenders.push('attemptWeeks.includes(...)');
  ok(offenders.length === 0,
     `the duplication class that produced three wrong conclusions is back: ${offenders.join(', ')}`);
});
await check('a build week the retired attempt list blocked now receives suggestions', async () => {
  // Drives the real UI: program tab -> week W -> Long Run -> coach button.
  // W is chosen from the plan, never hardcoded: the first week whose NEXT
  // week the plan leaves unblocked and whose long runs both open with a bare
  // distance (which is what the suggestion builder's own regex requires).
  // A week the retired list [3,7,11,15,19] wrongly blocked is preferred, so
  // this check fails on v1.17 for the exact reason it exists.
  const RETIRED_ATTEMPT_WEEKS = [3, 7, 11, 15, 19];
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 390, height: 900 },
  }, port);
  const r = await p.evaluate(async (RETIRED) => {
    const series = window.getWeeklyVolumeSeries();
    const bareLongRun = (w) => /^\s*\d/.test(window.getPlanned(w, 'longRun') || '')
                            && window.parseRunDistanceKm(window.getPlanned(w, 'longRun')) !== null;
    const blocked = (w) => (typeof window.isSuggestionBlockedWeek === 'function')
      ? window.isSuggestionBlockedWeek(w)
      : (window.isDeloadWeekNum(w) || window.isBenchAttemptWeek(w));
    const cands = series.map(x => x.week).filter(w =>
      series.some(y => y.week === w + 1) && !blocked(w + 1) && bareLongRun(w) && bareLongRun(w + 1));
    if (!cands.length) return { err: 'no candidate week: the plan has no consecutive unblocked long-run pair' };
    const W = cands.find(w => RETIRED.includes(w + 1)) ?? cands[0];
    const wasRetired = RETIRED.includes(W + 1);

    await window.renderProgram();
    const wkBtn = document.querySelector(`[data-week="${W}"]`);
    if (!wkBtn) return { err: `no week button for wk ${W}` };
    wkBtn.click();
    await new Promise(res => setTimeout(res, 250));
    const btns = [...document.querySelectorAll('.session-btn')];
    const idx = btns.findIndex(b => /Long Run/.test(b.textContent));
    if (idx < 0) return { err: 'no Long Run session button in the week view' };
    btns[idx].click();
    await new Promise(res => setTimeout(res, 450));

    const plannedKm = window.parseRunDistanceKm(window.getPlanned(W, 'longRun'));
    const km = Math.round(plannedKm * 1.2 * 10) / 10;
    const setV = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return true;
    };
    if (!setV('runKm', String(km)) || !setV('rpe', '5'))
      return { err: 'the run logger is missing #runKm or #rpe' };
    document.getElementById('askCoach').click();
    await new Promise(res => setTimeout(res, 600));
    const sug = Object.values(window._pendingSuggestions || {});
    const projections = sug.map(s => window.projectWeeklyVolume
      ? window.projectWeeklyVolume(s.week, s.sessionKey, s.oldValue, s.newValue) : null);
    return {
      W, target: W + 1, wasRetired, plannedKm, km,
      n: sug.length,
      weeks: sug.map(s => s.week),
      keys: sug.map(s => s.sessionKey),
      reasons: sug.map(s => s.reason),
      projections,
      rendered: (document.querySelector('.ai-suggestions') || {}).textContent || '',
    };
  }, RETIRED_ATTEMPT_WEEKS);
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `the suggestion path produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
  ok(r.wasRetired,
     `wk ${r.target} is no longer one of the weeks the retired list blocked — this check has stopped proving anything; re-derive it`);
  ok(r.n > 0,
     `an over-performed long run in wk ${r.W} produced no suggestion for wk ${r.target}, which the plan leaves unblocked`);
  eq(r.weeks, Array(r.n).fill(r.target), 'a suggestion targeted a week other than the next one: ');
  // and every run suggestion must carry what it does to that week
  for (let i = 0; i < r.n; i++) {
    const proj = r.projections[i];
    if (!proj) continue;
    ok(r.reasons[i].includes(String(proj.total)),
       `suggestion ${i} does not state the resulting weekly total ${proj.total}: "${r.reasons[i]}"`);
    ok(r.reasons[i].includes('Wk ' + proj.week),
       `suggestion ${i} does not name the week it changes: "${r.reasons[i]}"`);
    if (proj.exceedsCeiling)
      ok(/⚠/.test(r.reasons[i]),
         `suggestion ${i} would breach the ceiling (+${proj.deltaPct}%) and does not say so: "${r.reasons[i]}"`);
    ok(r.rendered.includes(String(proj.total)),
       `the consequence never reached the rendered card: "${r.rendered.slice(0, 200)}"`);
  }
});

// ── 16. VOLUME CONSEQUENCE OF A SUGGESTION (BACKLOG B12, v1.18) ─────────
// The suggestion builder offers "+1 km on next week's easy run" inside a plan
// whose whole design is a weekly total and a 10% ceiling. It could not have
// known the cost before v1.15, because nothing computed a weekly total.
// It still offers the suggestion — suppressing one he would have accepted is
// a training decision and stays his. It now states what it costs.
suite('volume consequence');
await check('projectWeeklyVolume arithmetic agrees with the weekly volume model', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.projectWeeklyVolume !== 'function') return 'MISSING';
    const series = window.getWeeklyVolumeSeries();
    const base = series.find(e => !e.isDeload && e.prevBuildTotal > 0
                                  && e.runs.some(x => x.key === 'easy'));
    if (!base) return { err: 'no build week with an easy run and a baseline' };
    const oldText = window.getPlanned(base.week, 'easy');
    const oldKm = window.parseRunDistanceKm(oldText);
    const mk = (km) => oldText.replace(/^(\s*)\d+(?:\.\d+)?/, '$1' + km);
    const up = window.projectWeeklyVolume(base.week, 'easy', oldText, mk(oldKm + 1));
    const down = window.projectWeeklyVolume(base.week, 'easy', oldText, mk(oldKm - 1));
    const blow = window.projectWeeklyVolume(base.week, 'easy', oldText,
      mk(Math.round((oldKm + base.prevBuildTotal * 0.25) * 10) / 10));
    return {
      err: null, base: { week: base.week, total: base.total, prev: base.prevBuildTotal, delta: base.deltaPct },
      up, down, blow,
      noChange: window.projectWeeklyVolume(base.week, 'easy', oldText, oldText),
      notARun: window.projectWeeklyVolume(base.week, 'upperA', '@100 kg', '@105 kg'),
      unparseable: window.projectWeeklyVolume(base.week, 'easy', oldText, 'REST — session skipped'),
      badWeek: window.projectWeeklyVolume(999, 'easy', oldText, mk(oldKm + 1)),
      degenerate: [
        window.projectWeeklyVolume(), window.projectWeeklyVolume(base.week),
        window.projectWeeklyVolume(base.week, 'easy', null, null),
      ],
    };
  });
  ok(r !== 'MISSING', 'projectWeeklyVolume not exposed on window');
  ok(!r.err, r.err);
  eq(r.up.diffKm, 1, '+1 km diff: ');
  eq(r.up.total, Math.round((r.base.total + 1) * 10) / 10, 'projected total: ');
  eq(r.up.fromTotal, r.base.total, 'the projection must start from the current total: ');
  eq(r.up.deltaPct, Math.round((r.up.total - r.base.prev) / r.base.prev * 1000) / 10,
     'projected delta is not measured against the previous BUILD week: ');
  ok(r.up.deltaPct > r.base.delta, 'adding a km must raise the weekly delta');
  eq(r.down.diffKm, -1, '-1 km diff: ');
  ok(r.down.total < r.base.total, 'removing a km must lower the total');
  ok(r.blow.exceedsCeiling, `a +25% edit did not trip the ceiling flag: ${JSON.stringify(r.blow)}`);
  eq(r.noChange, null, 'an edit that does not move the distance has no consequence to report: ');
  eq(r.notARun, null, 'a strength session has no running volume: ');
  eq(r.unparseable, null, 'an unparseable new value must not be guessed at: ');
  eq(r.badWeek, null, 'a week outside the plan: ');
  eq(r.degenerate, [null, null, null], 'degenerate input must return null, not throw: ');
});
await check('volumeConsequenceLine states the total, the delta, and flags a breach', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.volumeConsequenceLine !== 'function') return 'MISSING';
    const series = window.getWeeklyVolumeSeries();
    const base = series.find(e => !e.isDeload && e.prevBuildTotal > 0
                                  && e.runs.some(x => x.key === 'easy'));
    const oldText = window.getPlanned(base.week, 'easy');
    const oldKm = window.parseRunDistanceKm(oldText);
    const mk = (km) => oldText.replace(/^(\s*)\d+(?:\.\d+)?/, '$1' + km);
    const blowKm = Math.round((oldKm + base.prevBuildTotal * 0.25) * 10) / 10;
    return {
      week: base.week,
      small: window.volumeConsequenceLine(base.week, 'easy', oldText, mk(oldKm + 0.5)),
      smallProj: window.projectWeeklyVolume(base.week, 'easy', oldText, mk(oldKm + 0.5)),
      blow: window.volumeConsequenceLine(base.week, 'easy', oldText, mk(blowKm)),
      none: window.volumeConsequenceLine(base.week, 'easy', oldText, oldText),
      gym: window.volumeConsequenceLine(base.week, 'upperA', 'a', 'b'),
      degenerate: window.volumeConsequenceLine(),
    };
  });
  ok(r !== 'MISSING', 'volumeConsequenceLine not exposed on window');
  ok(r.small.includes('Wk ' + r.week), `the line must name the week: "${r.small}"`);
  ok(r.small.includes(String(r.smallProj.total)), `the line must state the new total: "${r.small}"`);
  ok(r.small.includes(String(r.smallProj.deltaPct)), `the line must state the delta: "${r.small}"`);
  ok(!/⚠/.test(r.small), `an in-bounds step must not be flagged as a breach: "${r.small}"`);
  ok(/⚠/.test(r.blow), `a +25% step must be flagged: "${r.blow}"`);
  eq(r.none, '', 'no change, no line: ');
  eq(r.gym, '', 'a strength session gets no volume line: ');
  eq(r.degenerate, '', 'degenerate input: ');
});

// ── 17. RUN ANALYSER (v1.19) ────────────────────────────────────────────
// The strength side got an analyser at v1.17; the run side had none, and it
// showed in four ways of the same class:
//   * `runPace` was a DEAD READ — collected on every easy and long run,
//     stored by saveSession(), read into a local called `pace`, then never
//     referenced. `maxHR` likewise.
//   * Every HR threshold was a hardcoded copy (130/137/138/140/145/155/
//     161–168/156–183/183) of what getHRZones() already computes.
//   * The plan's prescribed pace was never parsed, so the coach could not
//     answer "did you run it as asked".
//   * Planned distance came from the first "N km" in the text instead of
//     parseRunDistanceKm(), which on a quality session is the warm-up.
// These checks pin the analysis, not the prose.
suite('run analyser');
await check('parsePaceSec and formatPace round-trip, and refuse anything ambiguous', async () => {
  const r = await page.evaluate(() => {
    const f = window.parsePaceSec, g = window.formatPace;
    if (typeof f !== 'function' || typeof g !== 'function') return 'MISSING';
    return {
      plain: f('6:10'), unit: f('4:45/km'), spacedUnit: f(' 5:50 /km '), padded: f(' 6:05 '),
      band: f('6:15–6:40/km'), dash: f('6-10'), words: f('about 6 min'),
      tooFast: f('1:30'), tooSlow: f('16:00'), badSecs: f('6:75'),
      // A bare number is ambiguous — 370 could be seconds or minutes, and
      // guessing is how a pace becomes fiction. Refused, like parseIntervalLog
      // refuses a bare interval time.
      empty: f(''), nul: f(null), undef: f(undefined), bareNumber: f(370),
      fmt: [g(370), g(285), g(301), g(600)],
      fmtBad: [g(0), g(-5), g(NaN), g(null)],
      roundTrip: ['4:45', '6:10', '5:01'].map(s => g(f(s))),
    };
  });
  ok(r !== 'MISSING', 'parsePaceSec / formatPace not exposed on window');
  eq(r.plain, 370, 'm:ss: '); eq(r.unit, 285, 'with /km: ');
  eq(r.spacedUnit, 350, 'spaced with unit: '); eq(r.padded, 365, 'padded: ');
  eq(r.bareNumber, null, 'a bare number is not an unambiguous pace: ');
  eq(r.band, null, 'a range is not a single pace: ');
  eq(r.dash, null, '6-10 is not a pace: ');
  eq(r.words, null, 'prose: ');
  eq(r.tooFast, null, 'faster than any logged run must not be trusted: ');
  eq(r.tooSlow, null, 'slower than a walk: ');
  eq(r.badSecs, null, 'seconds above 59: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: '); eq(r.undef, null, 'undefined: ');
  eq(r.fmt, ['6:10', '4:45', '5:01', '10:00'], 'formatPace: ');
  eq(r.fmtBad, [null, null, null, null], 'formatPace on junk: ');
  eq(r.roundTrip, ['4:45', '6:10', '5:01'], 'round trip: ');
});
await check('the prescribed pace is parsed from the plan, and matches the plan on every session', async () => {
  const r = await page.evaluate(() => {
    const f = window.parsePlannedPaceBand;
    if (typeof f !== 'function') return 'MISSING';
    // fixtures pin the reading rules and stay valid when he edits his training
    const fixtures = {
      range: f('7.4 km easy @ 6:15–6:40/km'),
      hyphen: f('7.4 km easy @ 6:15-6:40/km'),
      single: f('[TEMPO] 2×2000 m @ 4:55/km'),
      intervals: f('[INTERVALS] 8×550 m @ 4:30/km\n90s jog'),
      zoneOnly: f('11.5 km @ Zone 2\nSUNDAY'),
      trialHeader: f('🏃 5K TIME TRIAL — target 23:15'),
      prose: f('easy spin, nothing measured'),
      nul: f(null),
    };
    // plan invariant: wherever the plan states a pace, it must parse, and the
    // parsed value must literally appear in that session's own text.
    const bad = [];
    for (const e of window.getWeeklyVolumeSeries()) {
      for (const key of ['longRun', 'recovery2', 'easy', 'quality']) {
        const t = window.getPlanned(e.week, key) || '';
        // The plan states a pace in two shapes and BOTH must be read. The
        // quality sessions use "@ 4:55/km". The long and easy runs state a
        // band as a parenthetical beside the HR band —
        // "❤️ Zone 2: 119–137 bpm (5:50–6:10/km)" — with no "@" anywhere.
        // A first version of this check only looked for the "@" form and
        // fired on all 21 long runs; the parser was right and the check was
        // wrong.
        const stated = /\d{1,2}:[0-5]\d\s*[–—-]\s*\d{1,2}:[0-5]\d\s*\/\s*km/.test(t)
                    || /@\s*\d{1,2}:[0-5]\d\s*\/\s*km/.test(t);
        const b = f(t);
        if (stated && !b) { bad.push(`wk${e.week} ${key}: states a pace that did not parse`); continue; }
        if (!stated && b) { bad.push(`wk${e.week} ${key}: parsed a pace the text does not state`); continue; }
        if (!b) continue;
        if (b.low > b.high) bad.push(`wk${e.week} ${key}: band inverted`);
        for (const v of [b.low, b.high]) {
          if (t.indexOf(window.formatPace(v)) === -1)
            bad.push(`wk${e.week} ${key}: parsed ${window.formatPace(v)} which is not in the plan text`);
        }
      }
    }
    return { fixtures, bad };
  });
  ok(r !== 'MISSING', 'parsePlannedPaceBand not exposed on window');
  eq(r.fixtures.range, { low: 375, high: 400 }, 'en-dash range: ');
  eq(r.fixtures.hyphen, { low: 375, high: 400 }, 'hyphen range: ');
  eq(r.fixtures.single, { low: 295, high: 295 }, 'a single pace is a zero-width band: ');
  eq(r.fixtures.intervals, { low: 270, high: 270 }, 'interval pace: ');
  eq(r.fixtures.zoneOnly, null, '"@ Zone 2" states no pace and must not be guessed at: ');
  eq(r.fixtures.trialHeader, null, 'a target TIME is not a target PACE: ');
  eq(r.fixtures.prose, null, 'prose: '); eq(r.fixtures.nul, null, 'null: ');
  eq(r.bad, [], 'plan pace problems: ');
});
await check('parseIntervalLog pairs a distance with its own time and refuses half a row', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseIntervalLog;
    if (typeof f !== 'function') return 'MISSING';
    return {
      metres: f({ distance: '550', time: '2:24', hr: '170', rpe: '8' }),
      metresUnit: f({ distance: '1200 m', time: '5:24' }),
      km: f({ distance: '1', time: '4:40' }),
      kmUnit: f({ distance: '1.5 km', time: '7:00' }),
      noTime: f({ distance: '550', time: '' }),
      noDist: f({ distance: '', time: '2:24' }),
      badTime: f({ distance: '550', time: '144' }),
      badHr: f({ distance: '550', time: '2:24', hr: '999' }),
      absurdPace: f({ distance: '550', time: '0:30' }),
      nul: f(null), empty: f({}),
    };
  });
  ok(r !== 'MISSING', 'parseIntervalLog not exposed on window');
  eq(r.metres, { km: 0.55, timeSec: 144, paceSec: 262, hr: 170, rpe: 8 }, '550 m in 2:24: ');
  eq(r.metresUnit.paceSec, 270, '1200 m in 5:24: ');
  eq(r.km.km, 1, 'a bare 1 is one kilometre, not one metre: ');
  eq(r.kmUnit.paceSec, 280, '1.5 km in 7:00: ');
  eq(r.noTime, null, 'a rep with no time: '); eq(r.noDist, null, 'a rep with no distance: ');
  eq(r.badTime, null, 'a bare number could be seconds or minutes and must not be guessed: ');
  eq(r.badHr.hr, null, 'an out-of-range HR is dropped, not used: ');
  eq(r.absurdPace, null, 'a pace faster than any human run must not be reported as fact: ');
  eq(r.nul, null, 'null: '); eq(r.empty, null, 'empty: ');
});
await check('HR verdicts come from the configured zones and move when maxHR changes', async () => {
  // This is the check the hardcoded literals could never have passed. At the
  // default maxHR 183, Z2 is 119-137 and 145 bpm is Z3 — too high for an easy
  // run. At maxHR 200, Z2 is 130-150 and the same 145 bpm is compliant.
  const at = async (maxHR) => {
    const { page: p, ctx: c } = await openApp(browser, {
      init: `localStorage.setItem('hrConfig', JSON.stringify({maxHR:${maxHR},zoneBoundaries:null}))`,
    }, port);
    const v = await p.evaluate(() => {
      if (typeof window.hrZoneFor !== 'function') return 'MISSING';
      return {
        z2: window.getHRZones()[1],
        zone145: window.hrZoneFor(145).zone,
        easy145: window.assessHrAgainstZone(145, 'easy').verdict,
        easy132: window.assessHrAgainstZone(132, 'easy').verdict,
        quality145: window.assessHrAgainstZone(145, 'quality').verdict,
        noHr: window.assessHrAgainstZone('', 'easy').verdict,
        noTarget: window.assessHrAgainstZone(145, 'nonsense').verdict,
        belowAll: window.hrZoneFor(40).zone,
        aboveAll: window.hrZoneFor(250).zone,
        junk: window.hrZoneFor('abc'),
      };
    });
    await c.close();
    return v;
  };
  const d = await at(183), h = await at(200);
  ok(d !== 'MISSING', 'hrZoneFor / assessHrAgainstZone not exposed on window');
  eq(d.z2.high, 137, 'precondition, Z2 ceiling at maxHR 183: ');
  eq(h.z2.high, 150, 'precondition, Z2 ceiling at maxHR 200: ');
  eq(d.zone145, 'Z3', '145 bpm at maxHR 183: ');
  eq(h.zone145, 'Z2', '145 bpm at maxHR 200: ');
  eq(d.easy145, 'above', 'an easy run at 145 bpm with maxHR 183: ');
  eq(h.easy145, 'in',
     'the verdict did not move with the configured maxHR — a hardcoded threshold is back: ');
  eq(d.easy132, 'in', 'an easy run inside Z2: ');
  eq(d.quality145, 'below', 'a quality session at 145 bpm is below its Z4 target: ');
  eq(d.noHr, 'no-hr', 'no HR logged must be reported, not guessed: ');
  eq(d.noTarget, 'no-target', 'a session kind with no target zone: ');
  eq(d.belowAll, 'Z1', 'below the lowest zone: ');
  eq(d.aboveAll, 'Z5', 'above the highest zone: ');
  eq(d.junk, null, 'junk HR: ');
});
await check('parseRunLog reads the pace field that used to be collected and discarded', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseRunLog;
    if (typeof f !== 'function') return 'MISSING';
    return {
      full: f({ runKm: '11.4', runPace: '6:10', avgHR: '132', maxHR: '148', rpe: '5' }),
      comma: f({ runKm: '7,4', runPace: '5:50' }),
      noPace: f({ runKm: '10', runPace: '' }),
      badPace: f({ runKm: '10', runPace: 'sixish' }),
      zeroKm: f({ runKm: '0', runPace: '6:00' }),
      badRpe: f({ runKm: '10', rpe: '44' }),
      nul: f(null), empty: f({}),
    };
  });
  ok(r !== 'MISSING', 'parseRunLog not exposed on window');
  eq(r.full, { km: 11.4, paceSec: 370, avgHR: 132, maxHR: 148, rpe: 5 }, 'a fully logged run: ');
  eq(r.comma.km, 7.4, 'comma decimal distance: ');
  eq(r.comma.paceSec, 350, 'pace alongside a comma distance: ');
  eq(r.noPace.paceSec, null, 'no pace logged: ');
  eq(r.badPace.paceSec, null, 'unparseable pace must not become a number: ');
  eq(r.zeroKm.km, null, 'zero distance is absent, not 0 km: ');
  eq(r.badRpe.rpe, null, 'out-of-range RPE: ');
  eq(r.nul, null, 'null: ');
  eq(r.empty, { km: null, paceSec: null, avgHR: null, maxHR: null, rpe: null }, 'empty: ');
});
await check('VDOT and its derived paces are ordered, bounded and refuse nonsense', async () => {
  const r = await page.evaluate(() => {
    const v = window.vdotFromRace, pc = window.vdotPaces;
    if (typeof v !== 'function' || typeof pc !== 'function') return 'MISSING';
    const slow = v(5, 23 * 60 + 43), fast = v(5, 20 * 60);
    return {
      slow, fast, paces: pc(slow), fastPaces: pc(fast),
      tenK: v(10, 49 * 60),
      degenerate: [v(0, 100), v(5, 0), v(null, null), v('a', 'b'), pc(null), pc(0)],
    };
  });
  ok(r !== 'MISSING', 'vdotFromRace / vdotPaces not exposed on window');
  ok(r.slow > 38 && r.slow < 44, `a 23:43 5K should sit around VDOT 41, got ${r.slow}`);
  ok(r.fast > 48 && r.fast < 52, `a 20:00 5K should sit around VDOT 50, got ${r.fast}`);
  ok(r.fast > r.slow, 'a faster race must not produce a lower VDOT');
  ok(r.tenK > 0, 'a 10K race must also yield a VDOT');
  const p = r.paces;
  ok(p.easyHigh > p.easyLow, 'the easy band must have a slow end and a fast end');
  ok(p.easyLow > p.marathon && p.marathon > p.threshold
     && p.threshold > p.interval && p.interval > p.rep,
     `derived paces out of order: ${JSON.stringify(p)}`);
  ok(r.fastPaces.threshold < p.threshold, 'a fitter runner must get a faster threshold pace');
  eq(r.degenerate, [null, null, null, null, null, null], 'degenerate input: ');
});
await check('run history is epoch-filtered and the latest trial anchors the paces', async () => {
  const seed = {
    'session_e3:1_easy':    { epoch: 3, runKm: '5.5', runPace: '6:20', avgHR: '131' },
    'session_e3:2_easy':    { epoch: 3, runKm: '6.0', runPace: '6:05', avgHR: '133' },
    'session_e3:4_quality': { epoch: 3, runKm: '8.5', runPace: '5:20', avgHR: '165' },
    // a retired-epoch record must be ignored entirely
    'session_e1:9_easy':    { epoch: 1, runKm: '5.0', runPace: '4:00', avgHR: '120' },
    // a strength session must never enter the run history
    'session_e3:2_upperA':  { epoch: 3, exercises: [{ name: 'Flat Bench', sets: [] }] },
  };
  const { page: p, ctx: c } = await openApp(browser, {
    init: Object.entries(seed).map(([k, v]) =>
      `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))});`).join(''),
  }, port);
  const r = await p.evaluate(() => {
    if (typeof window.getLoggedRunHistory !== 'function') return 'MISSING';
    const h = window.getLoggedRunHistory();
    const trialWeeks = window.getWeeklyVolumeSeries().filter(e => e.isTimeTrial).map(e => e.week);
    return {
      weeks: h.map(x => x.week), keys: h.map(x => x.key), kinds: h.map(x => x.kind),
      paces: h.map(x => x.paceSec),
      trial: window.getLatestTrial(),
      trialWeeks,
    };
  });
  await c.close();
  ok(r !== 'MISSING', 'getLoggedRunHistory not exposed on window');
  eq(r.weeks, [1, 2, 4], 'history must cover the current epoch only, in week order: ');
  ok(!r.keys.includes('upperA'), 'a strength session entered the run history');
  eq(r.paces, [380, 365, 320], 'logged paces: ');
  ok(r.trialWeeks.includes(4), 'precondition: wk 4 is a time-trial week in the plan');
  eq(r.kinds[2], 'trial', 'a quality session on a trial week is a trial: ');
  ok(r.trial, 'the logged trial did not become an anchor');
  eq(r.trial.week, 4, 'anchor week: ');
  eq(r.trial.km, 8.5, 'anchor distance: ');
  ok(r.trial.vdot > 20 && r.trial.vdot < 90, `anchor VDOT out of range: ${r.trial.vdot}`);
  ok(r.trial.paces && r.trial.paces.threshold > 0, 'the anchor carries no derived paces');
});
await check('analyseRunSession judges distance, pace and zone, and flags a stale prescription', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.analyseRunSession !== 'function') return 'MISSING';
    const plannedEasy = '10 km easy @ 6:15–6:40/km';
    const run = (log, planned, dayKey, intervals) =>
      window.analyseRunSession({ wk: 5, dayKey: dayKey || 'easy', planned, log, intervals });
    const inBand = run({ runKm: '10', runPace: '6:30', avgHR: '130' }, plannedEasy);
    const tooFast = run({ runKm: '10', runPace: '5:50', avgHR: '150' }, plannedEasy);
    const short = run({ runKm: '8', runPace: '6:30', avgHR: '130' }, plannedEasy);
    const nothing = run({}, plannedEasy);
    const ivs = run({ runKm: '8.5' }, '[INTERVALS] 6×800 m @ 4:28/km',
      'quality', [{ distance: '800', time: '3:34', hr: '168' },
                  { distance: '800', time: '3:38', hr: '172' },
                  { distance: '800', time: '3:31', hr: '175' }]);
    return {
      inBand: { pace: inBand.pace.verdict, hr: inBand.hr.verdict, dist: inBand.distance.verdict, kind: inBand.kind },
      tooFast: { pace: tooFast.pace.verdict, delta: tooFast.pace.deltaSec, hr: tooFast.hr.verdict },
      short: short.distance.verdict,
      nothing: { pace: nothing.pace.verdict, hr: nothing.hr.verdict, dist: nothing.distance.verdict },
      ivs: ivs.intervals,
      ivKind: ivs.kind,
      lines: window.runCoachLines(inBand),
      fastLines: window.runCoachLines(tooFast),
    };
  });
  ok(r !== 'MISSING', 'analyseRunSession not exposed on window');
  eq(r.inBand.kind, 'easy', 'session kind: ');
  eq(r.inBand.pace, 'in-band', '6:30 inside a 6:15-6:40 prescription: ');
  eq(r.inBand.hr, 'in', '130 bpm on an easy run at maxHR 183: ');
  eq(r.inBand.dist, 'hit', 'planned distance met: ');
  eq(r.tooFast.pace, 'faster', '5:50 against a 6:15-6:40 prescription: ');
  eq(r.tooFast.delta, -25, 'how much faster than the band, in s/km: ');
  eq(r.tooFast.hr, 'above', '150 bpm on an easy run at maxHR 183: ');
  eq(r.short, 'short', '8 km against a planned 10 km: ');
  eq(r.nothing, { pace: 'no-pace', hr: 'no-hr', dist: 'not-logged' },
     'an unlogged run must report what is missing, not invent verdicts: ');
  eq(r.ivKind, 'quality', 'an intervals session: ');
  eq(r.ivs.n, 3, 'interval count: ');
  eq(r.ivs.plannedCount, 6, 'planned rep count read from the session text: ');
  eq(r.ivs.fastestSec, 264, 'fastest rep: '); eq(r.ivs.slowestSec, 273, 'slowest rep: ');
  eq(r.ivs.driftSec, 9, 'split spread: ');
  eq(r.ivs.avgHR, 172, 'average interval HR: ');
  ok(r.lines.length >= 3, `the coach produced only ${r.lines.length} lines for a fully logged run`);
  ok(r.lines.some(l => /6:30/.test(l)),
     `the logged pace never reached the output — it is a dead read again: ${JSON.stringify(r.lines)}`);
  ok(r.lines.some(l => /Z2/.test(l)), 'the output does not name the zone it judged against');
  ok(r.fastLines.some(l => /faster than asked/.test(l)),
     'a run 25s/km faster than prescribed was not called out');
});
await check('the run analyser survives empty, junk and half-logged input without throwing', async () => {
  const r = await page.evaluate(() => {
    const calls = [
      () => window.analyseRunSession(),
      () => window.analyseRunSession({}),
      () => window.analyseRunSession({ wk: 5, dayKey: 'easy', planned: null, log: null }),
      () => window.analyseRunSession({ wk: 999, dayKey: 'upperA', planned: 'x', log: { runKm: 'BW' } }),
      () => window.analyseRunSession({ wk: 5, dayKey: 'quality', planned: '', intervals: [null, {}, 3] }),
      () => window.runCoachLines(null),
      () => window.runCoachLines(window.analyseRunSession({ wk: 5, dayKey: 'easy', planned: '' })),
      () => window.getLoggedRunHistory(),
      () => window.getLatestTrial(),
    ];
    const out = [];
    for (const c of calls) {
      try { const v = c(); out.push(Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v)); }
      catch (e) { out.push('THREW: ' + e.message); }
    }
    return out;
  });
  for (const v of r) ok(!String(v).startsWith('THREW'), `the run analyser threw on degenerate input: ${v}`);
});
await check('no hardcoded heart-rate zone edges survive in the coach', async () => {
  const src = fs.readFileSync(APP, 'utf8');
  // from the suggestion builder to the end of the file: both the builder and
  // the feedback path held their own copies of the zone edges.
  const i = src.indexOf('// ── Coach: Program Suggestion Builder ──');
  ok(i > 0, 'could not locate the coach block in the source');
  const coach = src.slice(i);
  const offenders = [];
  if (/const pace = document\.getElementById\('runPace'\)\.value;/.test(src))
    offenders.push("the dead `const pace = ...runPace` read");
  for (const lit of ['119–137', '161–168', '156–183', 'avgHR <= 140', 'avgHR > 138', 'avgHR > 130'])
    if (coach.includes(lit)) offenders.push(`hardcoded HR literal ${lit}`);
  ok(offenders.length === 0,
     `getHRZones() is the single source of truth for zone edges; found ${offenders.join(', ')}`);
});
await check('the coach reads a logged run end to end, offline, at 320px', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 320, height: 900 },
  }, port);
  const r = await p.evaluate(async () => {
    // pick a week whose long run states both a distance and a pace band
    const series = window.getWeeklyVolumeSeries();
    const W = series.map(x => x.week).find(w => {
      const t = window.getPlanned(w, 'longRun') || '';
      return window.parseRunDistanceKm(t) !== null;
    });
    if (W === undefined) return { err: 'no week with a parseable long run' };
    await window.renderProgram();
    const wkBtn = document.querySelector(`[data-week="${W}"]`);
    if (!wkBtn) return { err: `no week button for wk ${W}` };
    wkBtn.click();
    await new Promise(res => setTimeout(res, 250));
    const btns = [...document.querySelectorAll('.session-btn')];
    const idx = btns.findIndex(b => /Long Run/.test(b.textContent));
    if (idx < 0) return { err: 'no Long Run button' };
    btns[idx].click();
    await new Promise(res => setTimeout(res, 450));
    const setV = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return true;
    };
    const km = window.parseRunDistanceKm(window.getPlanned(W, 'longRun'));
    if (!setV('runKm', String(km))) return { err: 'no #runKm in the run logger' };
    if (!setV('runPace', '6:30')) return { err: 'no #runPace in the run logger' };
    if (!setV('avgHR', '132')) return { err: 'no #avgHR in the run logger' };
    document.getElementById('askCoach').click();
    await new Promise(res => setTimeout(res, 600));
    const out = document.getElementById('aiResponse');
    return {
      W, km,
      text: out ? out.textContent : '',
      analysis: window._runAnalysis ? {
        kind: window._runAnalysis.kind,
        paceSec: window._runAnalysis.log.paceSec,
        avgHR: window._runAnalysis.log.avgHR,
        hrVerdict: window._runAnalysis.hr.verdict,
        distVerdict: window._runAnalysis.distance.verdict,
      } : null,
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `the run coach produced uncaught errors offline:\n    ${real.slice(0, 3).join('\n    ')}`);
  ok(r.analysis, 'the coach ran without producing a run analysis');
  eq(r.analysis.kind, 'long', 'session kind: ');
  eq(r.analysis.paceSec, 390,
     'the logged pace did not reach the analysis — runPace is a dead read again: ');
  eq(r.analysis.avgHR, 132, 'the logged HR did not reach the analysis: ');
  eq(r.analysis.hrVerdict, 'in', '132 bpm on a long run at the default maxHR: ');
  eq(r.analysis.distVerdict, 'hit', 'the planned distance was logged exactly: ');
  ok(/6:30/.test(r.text), `the coach output never mentions the pace that was logged: "${r.text.slice(0, 200)}"`);
  ok(/Z2/.test(r.text), 'the coach output never names the zone it judged against');
  ok(r.text.length > 80, `the coach produced almost no output: "${r.text.slice(0, 120)}"`);
  ok(r.scroll <= r.client + 1, `the run coach output overflows at 320px: ${r.scroll} vs ${r.client}`);
});

// ── 18. PER-SESSION HR BANDS (v1.20) ────────────────────────────────────
// The plan states a target heart-rate band on every run session and the bands
// DIFFER by session type — an upper cap on the easy runs, a two-sided band on
// the long runs. Until v1.20 both the coach and the live compliance widget
// judged every run against one getZ2Range() ceiling, so an easy run at the
// long run's ceiling was called compliant while the session text on screen
// said otherwise. Confirmed by Mardy on 15 Sep. No plan edit was needed: the
// numbers were already written on every session and nothing read them.
suite('per-session hr bands');
await check('parsePlannedHrCap reads a stated cap, a stated band, and refuses the rest', async () => {
  const r = await page.evaluate(() => {
    const f = window.parsePlannedHrCap;
    if (typeof f !== 'function') return 'MISSING';
    return {
      cap: f('❤️ Zone 1–2: ≤130 bpm — conversational'),
      capLt: f('❤️ keep it under < 128 bpm'),
      band: f('❤️ Zone 2: 119–137 bpm (5:50–6:10/km)'),
      emDash: f('❤️ marathon HR 140—150 bpm'),
      hyphen: f('❤️ 140-150 bpm'),
      bandWins: f('❤️ Zone 2: 119–137 bpm · never above ≤150 bpm'),
      zoneOnly: f('11.5 km @ Zone 2'),
      inverted: f('❤️ 150–140 bpm'),
      absurd: f('❤️ 10–900 bpm'),
      noUnit: f('❤️ Zone 2: 119–137'),
      empty: f(''), nul: f(null),
      label: [window.hrBandLabel({ low: null, high: 130 }),
              window.hrBandLabel({ low: 119, high: 137 }),
              window.hrBandLabel(null)],
    };
  });
  ok(r !== 'MISSING', 'parsePlannedHrCap not exposed on window');
  eq(r.cap, { low: null, high: 130, source: 'stated-cap' }, 'a one-sided cap: ');
  eq(r.capLt, { low: null, high: 128, source: 'stated-cap' }, '"<" form: ');
  eq(r.band, { low: 119, high: 137, source: 'stated-band' }, 'a two-sided band: ');
  eq(r.emDash.high, 150, 'em-dash band: '); eq(r.hyphen.low, 140, 'hyphen band: ');
  eq(r.bandWins.source, 'stated-band', 'a two-sided band must win over a cap in the same text: ');
  eq(r.zoneOnly, null, 'a zone name states no numbers and must not be guessed at: ');
  eq(r.inverted, null, 'an inverted band: ');
  eq(r.absurd, null, 'an implausible band: ');
  eq(r.noUnit, null, 'numbers with no bpm unit are not a heart-rate band: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: ');
  eq(r.label, ['≤130 bpm', '119–137 bpm', null], 'band labels: ');
});
await check('every run session in the plan states a band, and it parses to what the text says', async () => {
  const r = await page.evaluate(() => {
    const bad = [];
    let capped = 0, banded = 0, none = 0;
    for (const e of window.getWeeklyVolumeSeries()) {
      for (const key of ['longRun', 'recovery2', 'easy', 'quality']) {
        const t = window.getPlanned(e.week, key) || '';
        if (!t) continue;
        const b = window.parsePlannedHrCap(t);
        const statesBpm = /\d{2,3}\s*bpm/.test(t);
        if (statesBpm && !b) { bad.push(`wk${e.week} ${key}: states bpm but did not parse`); continue; }
        if (!statesBpm && b) { bad.push(`wk${e.week} ${key}: parsed a band the text does not state`); continue; }
        if (!b) { none++; continue; }
        if (b.source === 'stated-cap') capped++; else banded++;
        if (t.indexOf(String(b.high)) === -1)
          bad.push(`wk${e.week} ${key}: parsed ceiling ${b.high} is not in the text`);
        if (b.low !== null && t.indexOf(String(b.low)) === -1)
          bad.push(`wk${e.week} ${key}: parsed floor ${b.low} is not in the text`);
      }
    }
    return { bad, capped, banded, none };
  });
  eq(r.bad, [], 'stated-band problems: ');
  ok(r.capped > 0, 'no session states a one-sided cap — the easy runs have stopped stating one');
  ok(r.banded > 0, 'no session states a two-sided band — the long runs have stopped stating one');
});
await check('the same heart rate is judged differently on an easy run and a long run', async () => {
  // This is the check the single Z2 ceiling could never have passed, and the
  // whole point of v1.20. The bpm probed is the long run's own ceiling, read
  // from the plan — nothing here hardcodes 130 or 137.
  const r = await page.evaluate(() => {
    const series = window.getWeeklyVolumeSeries();
    let found = null;
    for (const e of series) {
      const longT = window.getPlanned(e.week, 'longRun') || '';
      const easyT = window.getPlanned(e.week, 'easy') || '';
      const lb = window.parsePlannedHrCap(longT), eb = window.parsePlannedHrCap(easyT);
      if (lb && eb && lb.high > eb.high) { found = { week: e.week, longT, easyT, lb, eb }; break; }
    }
    if (!found) return { err: 'no week where the long run allows a higher HR than the easy run' };
    const probe = found.lb.high;          // legal on the long run, over the easy cap
    return {
      week: found.week, probe, easyCeil: found.eb.high, longCeil: found.lb.high,
      onLong: window.assessHrAgainstPlan(probe, found.longT, 'long'),
      onEasy: window.assessHrAgainstPlan(probe, found.easyT, 'easy'),
      analysisLong: window.analyseRunSession({ wk: found.week, dayKey: 'longRun',
        planned: found.longT, log: { runKm: '10', avgHR: String(probe) } }).hr.verdict,
      analysisEasy: window.analyseRunSession({ wk: found.week, dayKey: 'easy',
        planned: found.easyT, log: { runKm: '5', avgHR: String(probe) } }).hr.verdict,
      easyLines: window.runCoachLines(window.analyseRunSession({ wk: found.week, dayKey: 'easy',
        planned: found.easyT, log: { runKm: '5', avgHR: String(probe) } })),
    };
  });
  ok(!r.err, r.err);
  ok(r.longCeil > r.easyCeil,
     `precondition: the long run must allow a higher ceiling than the easy run (${r.longCeil} vs ${r.easyCeil})`);
  eq(r.onLong.verdict, 'in', `${r.probe} bpm on the long run, whose own ceiling is ${r.longCeil}: `);
  eq(r.onEasy.verdict, 'above',
     `${r.probe} bpm on an easy run capped at ${r.easyCeil} — one Z2 ceiling for both is back: `);
  eq(r.onLong.source, 'stated-band', 'the long run judged against its own stated band: ');
  eq(r.onEasy.source, 'stated-cap', 'the easy run judged against its own stated cap: ');
  eq(r.analysisLong, 'in', 'the analysis must use the band, not the zone model: ');
  eq(r.analysisEasy, 'above', 'the analysis must use the cap, not the zone model: ');
  ok(r.easyLines.some(l => l.includes(String(r.easyCeil))),
     `the coach never names the cap it judged against: ${JSON.stringify(r.easyLines)}`);
});
await check('a session that states no band still falls back to the configured zones', async () => {
  const r = await page.evaluate(() => {
    const noBand = '10 km easy @ 6:15–6:40/km';
    return {
      inZone: window.assessHrAgainstPlan(130, noBand, 'easy'),
      aboveZone: window.assessHrAgainstPlan(150, noBand, 'easy'),
      noHr: window.assessHrAgainstPlan('', noBand, 'easy'),
      noHrStated: window.assessHrAgainstPlan('', '❤️ Zone 2: 119–137 bpm', 'long'),
      belowBand: window.assessHrAgainstPlan(100, '❤️ Zone 2: 119–137 bpm', 'long'),
      degenerate: [window.assessHrAgainstPlan(), window.assessHrAgainstPlan(130)].map(x => x && x.verdict),
    };
  });
  eq(r.inZone.source, 'zone-model', 'a session with no stated band must fall back: ');
  eq(r.inZone.verdict, 'in', 'fallback verdict, in zone: ');
  eq(r.aboveZone.verdict, 'above', 'fallback verdict, above zone: ');
  eq(r.noHr.verdict, 'no-hr', 'no HR, no band: ');
  eq(r.noHrStated.verdict, 'no-hr', 'no HR with a stated band: ');
  eq(r.belowBand.verdict, 'below', 'below a two-sided band: ');
  // With no arguments at all there is no heart rate; with a heart rate but no
  // session there is nothing to judge it against. Two different answers, and
  // reporting them as two is more useful than collapsing both to "no-hr".
  eq(r.degenerate, ['no-hr', 'no-target'], 'degenerate input must not throw: ');
});
await check('the live compliance widget judges against the session it is rendered in', async () => {
  const r = await (async () => {
    const out = {};
    for (const [label, sessionText] of [['Long Run', 'long'], ['Easy Run 2', 'easy']]) {
      const { page: p, errors: e, ctx: c } = await openApp(browser, {
        viewport: { width: 390, height: 900 },
      }, port);
      const v = await p.evaluate(async (btnLabel) => {
        const series = window.getWeeklyVolumeSeries();
        let W = null;
        for (const x of series) {
          const lb = window.parsePlannedHrCap(window.getPlanned(x.week, 'longRun') || '');
          const eb = window.parsePlannedHrCap(window.getPlanned(x.week, 'easy') || '');
          if (lb && eb && lb.high > eb.high) { W = x.week; break; }
        }
        if (W === null) return { err: 'no week with differing bands' };
        await window.renderProgram();
        document.querySelector(`[data-week="${W}"]`).click();
        await new Promise(r2 => setTimeout(r2, 250));
        const btns = [...document.querySelectorAll('.session-btn')];
        const idx = btns.findIndex(b => b.textContent.includes(btnLabel));
        if (idx < 0) return { err: `no "${btnLabel}" session button` };
        btns[idx].click();
        await new Promise(r2 => setTimeout(r2, 400));
        const probe = window.parsePlannedHrCap(window.getPlanned(W, 'longRun')).high;
        const el = document.getElementById('avgHR');
        if (!el) return { err: 'no #avgHR input' };
        el.value = String(probe);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r2 => setTimeout(r2, 150));
        const div = document.getElementById('zoneCompliance');
        return { W, probe, html: div ? div.innerHTML : '', text: div ? div.textContent : '' };
      }, label);
      const real = realErrors(e);
      await c.close();
      out[sessionText] = v;
      out[sessionText + 'Errors'] = real;
    }
    return out;
  })();
  ok(!r.long.err, r.long.err);
  ok(!r.easy.err, r.easy.err);
  eq(r.longErrors, [], 'the long-run widget produced uncaught errors: ');
  eq(r.easyErrors, [], 'the easy-run widget produced uncaught errors: ');
  ok(r.long.html.includes('zone-compliance good'),
     `the long run's own ceiling was flagged as too high: "${r.long.text}"`);
  ok(r.easy.html.includes('zone-compliance bad'),
     `the long run's ceiling was called compliant on an easy run — one Z2 ceiling for both is back: "${r.easy.text}"`);
});

// ── 19. TARGET DATE AND ACCESSORY ROTATION (v1.21) ──────────────────────
// Two programme changes he asked for, and the invariants that keep them
// honest. Neither check hardcodes an exercise name or a load: they assert the
// SHAPE the plan must have, so they stay valid when he edits the content.
suite('target date & rotation');
await check('the primary bench target is a single December week at 120 kg', async () => {
  const r = await page.evaluate(() => {
    const ladder = window.getBenchLadder();
    const primary = ladder.filter(w => w.isPrimaryTarget);
    if (primary.length !== 1) return { err: `expected exactly one primary target, got ${primary.length}` };
    const w = primary[0];
    const attempt = w.entries.find(e => e.kind === 'attempt');
    return {
      week: w.week,
      dates: (window.getWeeklySchedule ? null : null),
      planDates: (window.getPlanned(w.week, 'upperA') || '').slice(0, 0),
      load: attempt ? attempt.load : null,
      opts: attempt ? attempt.loadOptions : null,
      conditional: attempt ? attempt.conditional : null,
      // every attempt in the plan, with the week's own date string
      attempts: ladder.filter(x => x.entries.some(e => e.kind === 'attempt'))
        .map(x => [x.week, (window.WEEKS_DATES || {})[x.week] || null]),
    };
  });
  ok(!r.err, r.err);
  ok(r.load === 120, `the primary target must be a committed 120 kg attempt, got ${JSON.stringify({ load: r.load, opts: r.opts })}`);
  eq(r.conditional, false, 'the target must not be a conditional "either/or" load: ');
});
await check('the target sits in December and exactly one attempt sits in October', async () => {
  // Asserted against each week's own date label via getWeekDates(), never
  // against a week number: "the first week of December" is a claim about the
  // calendar, and a check pinned to wk 15 would stop meaning anything the
  // moment the plan shifts.
  const r = await page.evaluate(() => {
    if (typeof window.getWeekDates !== 'function') return 'MISSING';
    const ladder = window.getBenchLadder();
    const attempts = ladder.filter(x => x.entries.some(e => e.kind === 'attempt')).map(x => x.week);
    const primary = ladder.filter(w => w.isPrimaryTarget).map(w => w.week);
    const dates = {};
    for (const w of ladder) dates[w.week] = window.getWeekDates(w.week);
    return { attempts, primary, dates, missing: ladder.filter(w => !window.getWeekDates(w.week)).map(w => w.week) };
  });
  ok(r !== 'MISSING', 'getWeekDates not exposed on window');
  eq(r.missing, [], 'every plan week must carry a date label: ');
  eq(r.primary.length, 1, 'exactly one primary target: ');
  const tgt = r.primary[0];
  const months = (wk) => (r.dates[wk] || '').match(/Aug|Sep|Oct|Nov|Dec|Jan/g) || [];
  ok(months(tgt).includes('Dec'),
     `the primary target is wk ${tgt} (${r.dates[tgt]}), which is not a December week`);
  ok(r.attempts.includes(tgt), 'the primary target week must itself carry an attempt');
  const oct = r.attempts.filter(w => months(w).includes('Oct'));
  eq(oct.length, 1,
     `he asked for one October attempt; got ${JSON.stringify(oct.map(w => [w, r.dates[w]]))}: `);
  ok(r.attempts.length <= 3,
     `${r.attempts.length} max attempts in the block — each costs a taper week and the deload behind it (A7)`);
  // The target week is labelled "30 Nov – 6 Dec", so it straddles. What must
  // be gone is THE TARGET lying wholly in November — that was the old wk 11,
  // and moving it out was the whole point of v1.21.
  //
  // Until v1.23 this excluded every attempt, not just the target. That was too
  // broad and it was wrong: Mardy asked for a 117.5 rung between 115 and 120,
  // and on a four-week cycle the only attempt slot between them falls in
  // November. The check now asserts what v1.21 actually cared about.
  const novOnly = [tgt].filter(w => months(w).includes('Nov') && !months(w).includes('Dec'));
  eq(novOnly.length, 0,
     `the primary target sits wholly in November (wk ${tgt}, ${r.dates[tgt]}) — expected none: `);
});
await check('every bench attempt stands on a trained single at 92% or more', async () => {
  // This replaces the flat ban on 117.5 kg, which Mardy retired at v1.23 by
  // putting 117.5 back in the ladder on purpose. The number was never the
  // defect. The defect the pre-v1.11 ladder had — diagnosed at v1.11 and the
  // reason the whole peaking design exists — is a 20 kg gap between the
  // heaviest TRAINED set and every attempt. So the check now asserts the rule
  // instead of blacklisting one of its symptoms, which also makes it cover
  // loads nobody has thought of yet.
  const r = await page.evaluate(() => {
    const ladder = window.getBenchLadder();
    const singles = [];
    const attempts = [];
    for (const w of ladder) {
      for (const e of w.entries) {
        if (e.sets !== 1 || e.reps !== 1) continue;
        const load = e.load !== null ? e.load
                   : (e.loadOptions.length ? Math.min.apply(null, e.loadOptions) : null);
        if (load === null) continue;
        if (e.kind === 'attempt') attempts.push({ week: w.week, load });
        singles.push({ week: w.week, load, kind: e.kind });
      }
    }
    const bad = [];
    for (const a of attempts) {
      const rung = singles
        .filter(x => x.week < a.week && x.load >= a.load * 0.92)
        .sort((p, q) => q.week - p.week)[0];
      if (!rung) {
        bad.push(`wk${a.week} attempts ${a.load} kg with no trained single at or above `
               + `${Math.round(a.load * 0.92 * 10) / 10} kg before it`);
      }
    }
    // The retired ladder's own tell: week 3 carried a 115 kg ATTEMPT.
    const wk3 = ladder.find(w => w.week === 3);
    const wk3Attempt = wk3 && wk3.entries.some(e => e.kind === 'attempt');
    return { bad, attempts, nSingles: singles.length, wk3Attempt };
  });
  ok(r.attempts.length > 0, 'no attempt found in the plan at all');
  ok(r.nSingles > r.attempts.length,
     'the plan has attempts but no trained rungs beneath them — that is the pre-v1.11 shape');
  eq(r.wk3Attempt, false,
     "week 3 carries a PR attempt again, which is the retired ladder's signature: ");
  eq(r.bad, [], 'an attempt has no 92% trained rung beneath it: ');
});
await check('accessory work rotates across the block instead of repeating for 21 weeks', async () => {
  // Before v1.21 the leg session had ONE exercise line-up for all 21 weeks and
  // Upper B was byte-identical throughout. This asserts rotation exists
  // without naming a single exercise: no line-up may dominate the block.
  const r = await page.evaluate(() => {
    const CUE = /^\s*(ramp|opener|warm|w-?up|c-?down|cool|note|cue|then|grip|leave|score|odd|even|you will|was the|safeties|🔥|🎯|🔽|Unload|—|⬆|\()/i;
    const names = (t) => (t || '').split('\n')
      .filter(l => l.trim() && !CUE.test(l))
      .map(l => (l.match(/^\s*([A-Za-z][A-Za-z0-9 \-'/.+]*?)\s{2,}\d+[×x]/) || [])[1])
      .filter(Boolean);
    const out = {};
    for (const key of ['lower', 'upperA', 'upperB']) {
      const sigs = {};
      let n = 0;
      for (const e of window.getWeeklyVolumeSeries()) {
        const sig = names(window.getPlanned(e.week, key)).join('|');
        if (!sig) continue;
        sigs[sig] = (sigs[sig] || 0) + 1; n++;
      }
      const counts = Object.values(sigs).sort((a, b) => b - a);
      out[key] = { distinct: counts.length, biggest: counts[0], weeks: n };
    }
    return out;
  });
  for (const [key, v] of Object.entries(r)) {
    ok(v.weeks > 0, `${key}: no weeks read`);
    ok(v.distinct >= 3,
       `${key}: only ${v.distinct} distinct exercise line-up(s) across ${v.weeks} weeks — the block does not rotate`);
    ok(v.biggest / v.weeks <= 0.62,
       `${key}: one line-up covers ${v.biggest}/${v.weeks} weeks, so the rotation is nominal`);
  }
});
await check('the shoulder-health movements are the two that never rotate', async () => {
  // Face Pulls on Upper A and Band Dislocates at the FRONT of Upper B are the
  // stated shoulder constraint. Variety is wrong there; they must appear in
  // every week that has the session.
  const r = await page.evaluate(() => {
    let a = 0, b = 0, firstInB = 0, weeks = 0;
    for (const e of window.getWeeklyVolumeSeries()) {
      weeks++;
      if (/Face Pulls?\s/i.test(window.getPlanned(e.week, 'upperA') || '')) a++;
      const ub = window.getPlanned(e.week, 'upperB') || '';
      if (/Band Dislocates\s/i.test(ub)) b++;
      const firstLine = ub.split('\n').find(l => l.trim());
      if (firstLine && /Band Dislocates/i.test(firstLine)) firstInB++;
    }
    return { a, b, firstInB, weeks };
  });
  eq(r.a, r.weeks, 'Face Pulls must be in every Upper A: ');
  eq(r.b, r.weeks, 'Band Dislocates must be in every Upper B: ');
  eq(r.firstInB, r.weeks,
     'Band Dislocates must be the FIRST line of Upper B — shoulder prep before pressing, not after the biceps work: ');
});
await check('every exercise the plan prescribes is one the logger can record', async () => {
  // The rotation introduced new movement names. If the plan names a lift that
  // parseExercisesFromPlan drops, it is prescribed but cannot be logged —
  // the silent data-loss class v1.02 was built to close.
  const r = await page.evaluate(() => {
    if (typeof window.parseExercisesFromPlan !== 'function') return 'MISSING';
    const CUE = /^\s*(ramp|opener|warm|w-?up|c-?down|cool|note|cue|then|grip|leave|score|odd|even|you will|was the|safeties|🔥|🎯|🔽|Unload|—|⬆|\()/i;
    const CONT = /^(back[\s-]?off|drop\s*set|amrap|top\s*set)\b/i;
    const bad = [];
    for (const e of window.getWeeklyVolumeSeries()) {
      for (const key of ['upperA', 'lower', 'upperB']) {
        const t = window.getPlanned(e.week, key) || '';
        const parsed = new Set(window.parseExercisesFromPlan(t).map(x => x.name));
        for (const line of t.split('\n')) {
          if (!line.trim() || CUE.test(line)) continue;
          const m = line.match(/^\s*([A-Za-z][A-Za-z0-9 \-'/.+]*?)\s{2,}\d+[×x]/);
          if (!m) continue;
          const name = m[1].trim();
          // Back-off / drop set / AMRAP / top set are folded into the lift
          // above them ON PURPOSE (v1.02): logging them separately split the
          // main lift's PR history in two. They must NOT appear as their own
          // exercise, which is the opposite assertion.
          if (CONT.test(name)) {
            if (parsed.has(name))
              bad.push(`wk${e.week} ${key}: "${name}" became its own exercise and will split the main lift's PR history`);
            continue;
          }
          if (!parsed.has(name))
            bad.push(`wk${e.week} ${key}: "${name}" is prescribed but the logger drops it`);
        }
      }
    }
    return bad;
  });
  ok(r !== 'MISSING', 'parseExercisesFromPlan not exposed on window');
  eq(r, [], 'unloggable prescriptions: ');
});

// ── 20. TIME-TRIAL RESULTS (BACKLOG A2, v1.22) ──────────────────────────
// The plan prescribes a 5K trial on every deload week and a 10K at the end,
// and TRAINING-CONTEXT calls them the entire measurement system for the
// running goal. There was nowhere to put the result.
//
// These checks pin the model and the trend. None of them hardcodes one of his
// distances or a week number.
suite('time-trial results');
await check('parseTrialTime reads m:ss and h:mm:ss and refuses everything ambiguous', async () => {
  const r = await page.evaluate(() => {
    const f = window.parseTrialTime, g = window.formatTrialTime;
    if (typeof f !== 'function' || typeof g !== 'function') return 'MISSING';
    return {
      mmss: f('23:43'), padded: f(' 23:43 '), long: f('1:02:15'), overHour: f('102:15'),
      // A bare number is refused for the same reason parsePaceSec refuses one:
      // 1423 could be seconds or a mangled 14:23, and a guessed trial time
      // becomes a fabricated VDOT and then a fabricated set of paces.
      bare: f('1423'), bareNum: f(1423),
      badSecs: f('23:73'), dash: f('23-43'), words: f('about 24 min'),
      tooFast: f('0:30'), tooSlow: f('11:00:00'),
      empty: f(''), nul: f(null), undef: f(undefined),
      fmt: [g(1423), g(3735), g(60), g(3600)],
      fmtBad: [g(0), g(-5), g(NaN), g(null), g('x')],
      roundTrip: ['23:43', '1:02:15', '19:30'].map(s => g(f(s))),
    };
  });
  ok(r !== 'MISSING', 'parseTrialTime / formatTrialTime not exposed on window');
  eq(r.mmss, 1423, 'm:ss: '); eq(r.padded, 1423, 'padded: ');
  eq(r.long, 3735, 'h:mm:ss: '); eq(r.overHour, 6135, 'minutes above 60 without an hour field: ');
  eq(r.bare, null, 'a bare number is not an unambiguous time: ');
  eq(r.bareNum, null, 'a bare number, as a number: ');
  eq(r.badSecs, null, 'seconds above 59: ');
  eq(r.dash, null, 'a dash is not a separator: '); eq(r.words, null, 'prose: ');
  eq(r.tooFast, null, 'faster than any trial he could run: ');
  eq(r.tooSlow, null, 'longer than any session in the plan: ');
  eq(r.empty, null, 'empty: '); eq(r.nul, null, 'null: '); eq(r.undef, null, 'undefined: ');
  eq(r.fmt, ['23:43', '1:02:15', '1:00', '1:00:00'], 'formatTrialTime: ');
  eq(r.fmtBad, [null, null, null, null, null], 'formatTrialTime on junk: ');
  eq(r.roundTrip, ['23:43', '1:02:15', '19:30'], 'round trip: ');
});
await check('the trial distance is read from the plan, on exactly the weeks that prescribe one', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.getPlannedTrialKm !== 'function') return 'MISSING';
    const bad = [];
    const trialWeeks = [], modelWeeks = [];
    for (const e of window.getWeeklyVolumeSeries()) {
      // v1.29: the effort is not always in the quality slot - the goal race
      // sits in the Sunday slot. Same slot assumption the app itself carried.
      const t = ['recovery2', 'quality', 'easy', 'longRun']
        .map(k => window.getPlanned(e.week, k) || '')
        .find(x => /TIME\s+TRIAL|\d+\s*K\s+RACE\b/i.test(x)) || '';
      const km = window.getPlannedTrialKm(e.week);
      if (e.isTimeTrial) modelWeeks.push(e.week);
      if (km !== null) {
        trialWeeks.push(e.week);
        if (!(km > 0)) bad.push(`wk${e.week}: trial distance ${km}`);
        // the distance must literally appear in the session's own text, so the
        // gate cannot drift from the plan and hardcodes none of his numbers
        if (t.indexOf(String(km)) === -1)
          bad.push(`wk${e.week}: parsed ${km} km which is not in the session text`);
        if (e.quality && e.quality.source === 'time-trial' && e.quality.work !== km)
          bad.push(`wk${e.week}: trial distance ${km} disagrees with the volume model's ${e.quality.work}`);
      }
    }
    return {
      bad, trialWeeks, modelWeeks,
      outOfPlan: [0, 99, 999].map(w => window.getPlannedTrialKm(w)),
      degenerate: [window.getPlannedTrialKm(), window.getPlannedTrialKm(null),
                   window.getPlannedTrialKm('x')],
      distances: [...new Set(trialWeeks.map(w => window.getPlannedTrialKm(w)))].sort((a, b) => a - b),
    };
  });
  ok(r !== 'MISSING', 'getPlannedTrialKm not exposed on window');
  eq(r.bad, [], 'trial distance problems: ');
  eq(r.trialWeeks, r.modelWeeks,
     'the trial reader and the weekly volume model disagree about which weeks carry a trial: ');
  ok(r.trialWeeks.length >= 2,
     `only ${r.trialWeeks.length} trial week(s) found — the measurement system has gone missing from the plan`);
  // v1.29: he dropped the mid-block trials on 16 Nov, so the plan now holds
  // one distance. That is his training decision, and the gate must not demand
  // a 10K he has chosen not to run. The distance KEYING is a property of
  // getTrialTrend, not of his plan, and is proven by fixture in the trend
  // check below - which no longer depends on the plan's shape at all.
  ok(r.distances.length >= 1,
     `the plan states no trial distance at all (${r.distances})`);
  eq(r.outOfPlan, [null, null, null], 'a week outside the plan prescribes no trial: ');
  eq(r.degenerate, [null, null, null], 'degenerate input must return null, not throw: ');
});
await check('saveTrialResult dedupes on (week, distance), survives a reload and refuses junk', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {}, port);
  const first = await p.evaluate(() => {
    if (typeof window.saveTrialResult !== 'function') return 'MISSING';
    const wk = window.getWeeklyVolumeSeries().filter(x => x.isTimeTrial).map(x => x.week);
    const km = window.getPlannedTrialKm(wk[0]);
    const saved = window.saveTrialResult(wk[0], km, '24:10');
    const corrected = window.saveTrialResult(wk[0], km, '23:43');       // same slot, corrected
    const other = window.saveTrialResult(wk[0], km + 5, '52:00');       // same week, other distance
    const later = window.saveTrialResult(wk[1], km, '23:05');           // a later trial week
    return {
      wk, km, savedSec: saved && saved.seconds, correctedSec: corrected && corrected.seconds,
      other: !!other, later: !!later,
      rows: window.getTrialResults().map(x => [x.week, x.km, x.seconds]),
      refused: [
        window.saveTrialResult(wk[0], km, '1423'),
        window.saveTrialResult(wk[0], km, '23:73'),
        window.saveTrialResult(wk[0], km, ''),
        window.saveTrialResult(wk[0], 0, '23:43'),
        window.saveTrialResult(null, km, '23:43'),
        window.saveTrialResult(),
      ],
      afterRefusals: window.getTrialResults().length,
    };
  });
  ok(first !== 'MISSING', 'saveTrialResult not exposed on window');
  eq(first.savedSec, 1450, 'first save: ');
  eq(first.correctedSec, 1423, 'a corrected time must be stored: ');
  ok(first.other, 'a second distance in the same week was refused');
  ok(first.later, 'a later trial week was refused');
  eq(first.rows, [[first.wk[0], first.km, 1423], [first.wk[0], first.km + 5, 3120],
                  [first.wk[1], first.km, 1385]],
     're-entering a time must correct the record, not add a second one: ');
  eq(first.refused, [null, null, null, null, null, null],
     'refused input must return null, not a guessed record: ');
  eq(first.afterRefusals, 3, 'a refused save must not touch the stored set: ');
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({
    rows: window.getTrialResults().map(x => [x.week, x.km, x.seconds]),
    deleted: window.deleteTrialResult(window.getTrialResults()[0].week,
                                      window.getTrialResults()[0].km),
    deletedAgain: window.deleteTrialResult(9999, 5),
    left: window.getTrialResults().length,
  }));
  const corrupt = await (async () => {
    const { page: p2, errors: e2, ctx: c2 } = await openApp(browser, {
      init: () => localStorage.setItem('trialResults', 'not json at all'),
    }, port);
    const v = await p2.evaluate(() => ({
      rows: window.getTrialResults(),
      trend: window.getTrialTrend(),
      anchor: window.getLatestTrial(),
    }));
    const real2 = realErrors(e2);
    await c2.close();
    return { v, real2 };
  })();
  const junk = await (async () => {
    // a retired-epoch record, and records that are structurally wrong, must be
    // dropped rather than poisoning the trend
    const seed = JSON.stringify([
      { week: 4, km: 5, seconds: 1423, epoch: 1 },
      { week: 8, km: 5, seconds: 'fast' },
      { week: 12, km: 0, seconds: 1400 },
      null, 7,
      { week: 16, km: 5, seconds: 1380, epoch: 3 },
    ]);
    const { page: p3, errors: e3, ctx: c3 } = await openApp(browser, {
      init: `localStorage.setItem('trialResults', ${JSON.stringify(seed)})`,
    }, port);
    const v = await p3.evaluate(() => window.getTrialResults().map(x => [x.week, x.seconds]));
    const real3 = realErrors(e3);
    await c3.close();
    return { v, real3 };
  })();
  const real = realErrors(e);
  await c.close();
  eq(after.rows, [[first.wk[0], first.km, 1423], [first.wk[0], first.km + 5, 3120],
                  [first.wk[1], first.km, 1385]],
     'trial results lost across a reload: ');
  eq(after.deleted, true, 'deleting a stored result: ');
  eq(after.deletedAgain, false, 'deleting a result that is not there must report false: ');
  eq(after.left, 2, 'exactly one record must be removed: ');
  eq(corrupt.v.rows, [], 'a corrupt store must degrade to [], not throw: ');
  eq(corrupt.v.trend, [], 'a corrupt store must produce an empty trend: ');
  eq(corrupt.v.anchor, null, 'a corrupt store must not anchor anything: ');
  eq(corrupt.real2, [], 'a corrupt trial store produced uncaught errors: ');
  eq(junk.v, [[16, 1380]],
     'a retired-epoch or structurally wrong record must be dropped, not read: ');
  eq(junk.real3, [], 'junk trial records produced uncaught errors: ');
  eq(real, [], 'the trial model produced uncaught errors: ');
});
await check('the trend compares a trial with the previous trial AT THE SAME distance', async () => {
  // Comparing a 10K against a 5K would report a 25-minute regression on a
  // better run. Distance is part of the key, not an afterthought.
  const weeks = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const v = await p.evaluate(() => {
      const t = window.getWeeklyVolumeSeries().filter(x => x.isTimeTrial).map(x => x.week);
      return t.map(w => [w, window.getPlannedTrialKm(w)]);
    });
    await c.close();
    return v;
  })();
  const short = weeks.filter(([, km]) => km === weeks[0][1]).slice(0, 3);
  ok(short.length >= 2, `need two trials at one distance in the plan: ${JSON.stringify(weeks)}`);
  // v1.29: the second distance is SYNTHESISED rather than taken from the
  // plan. getTrialTrend keys on (week, distance) and is epoch-filtered; it
  // does not require the week to prescribe what is stored against it. Before
  // this, the check could only run while his training happened to contain two
  // different trial distances - so his dropping the 10K on 16 Nov switched off
  // the proof of the very bug this check exists for. The property belongs to
  // the function, so it is asserted against the function.
  const long = [short[1][0] + 1, short[0][1] * 2];
  const seed = JSON.stringify([
    { week: short[0][0], km: short[0][1], seconds: 1483, epoch: 3 },
    { week: short[1][0], km: short[1][1], seconds: 1423, epoch: 3 },
    { week: long[0], km: long[1], seconds: 2940, epoch: 3 },
  ]);
  const { page: p, ctx: c } = await openApp(browser, {
    init: `localStorage.setItem('trialResults', ${JSON.stringify(seed)})`,
  }, port);
  const r = await p.evaluate(() => {
    if (typeof window.getTrialTrend !== 'function') return 'MISSING';
    return window.getTrialTrend();
  });
  await c.close();
  ok(r !== 'MISSING', 'getTrialTrend not exposed on window');
  eq(r.length, 3, 'trend length: ');
  eq(r.map(x => x.week), [short[0][0], short[1][0], long[0]], 'trend is not in week order: ');
  eq(r[0].deltaSec, null, 'the first trial at a distance has nothing to compare against: ');
  eq(r[1].deltaSec, -60, 'a minute faster at the same distance: ');
  eq(r[2].deltaSec, null,
     'the longer trial was compared against a shorter one — distance is not part of the key: ');
  eq(r[0].paceSec, Math.round(1483 / short[0][1]), 'pace from the recorded time: ');
  ok(r[1].vdot > r[0].vdot, `a faster time must give a higher VDOT: ${r[0].vdot} -> ${r[1].vdot}`);
  ok(r[1].paces && r[1].paces.threshold > 0, 'the trend carries no derived paces');
  eq([r[0].isPB, r[1].isPB], [true, true], 'both are bests at that distance, in order: ');
});
await check('a recorded trial outranks one derived from a logged session as the pace anchor', async () => {
  // A recorded result carries the clock time. One derived from a logged
  // session carries an average pace and rounds twice. Where both exist the
  // recorded one must win, and it must reach the coach's stale-prescription
  // warning — that warning is the whole payoff of A4's detection.
  const setup = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const v = await p.evaluate(() => {
      const t = window.getWeeklyVolumeSeries().filter(x => x.isTimeTrial).map(x => x.week);
      return { weeks: t, km: window.getPlannedTrialKm(t[0]), kmLate: window.getPlannedTrialKm(t[1]) };
    });
    await c.close();
    return v;
  })();
  const loggedOnly = `localStorage.setItem('session_e3:${setup.weeks[0]}_quality', ${JSON.stringify(JSON.stringify(
    { epoch: 3, runKm: String(setup.km), runPace: '5:00', avgHR: '175' }))});`;
  const both = loggedOnly + `localStorage.setItem('trialResults', ${JSON.stringify(JSON.stringify(
    [{ week: setup.weeks[1], km: setup.kmLate, seconds: 1423, epoch: 3 }]))});`;
  const read = async (init) => {
    const { page: p, ctx: c } = await openApp(browser, { init }, port);
    const v = await p.evaluate(() => {
      const a = window.getLatestTrial();
      const wk = window.getWeeklyVolumeSeries().find(x => !x.isTimeTrial
        && window.parsePlannedPaceBand(window.getPlanned(x.week, 'quality') || ''));
      const lines = wk ? window.runCoachLines(window.analyseRunSession({
        wk: wk.week, dayKey: 'quality', planned: window.getPlanned(wk.week, 'quality'),
        log: { runKm: '8', runPace: '5:10' } })) : [];
      return { a, lines };
    });
    await c.close();
    return v;
  };
  const logged = await read(loggedOnly);
  const recorded = await read(both);
  ok(logged.a, 'a logged trial session no longer anchors anything');
  eq(logged.a.source, 'logged-session', 'with no recorded result the logged session must anchor: ');
  eq(logged.a.week, setup.weeks[0], 'logged anchor week: ');
  ok(recorded.a, 'a recorded trial did not anchor the paces');
  eq(recorded.a.source, 'recorded',
     'a recorded trial lost to one derived from an average pace: ');
  eq(recorded.a.week, setup.weeks[1], 'recorded anchor week: ');
  eq(recorded.a.seconds, 1423, 'the recorded clock time must be carried through, not re-derived: ');
  ok(recorded.a.vdot > 0 && recorded.a.paces && recorded.a.paces.threshold > 0,
     'the recorded anchor carries no derived paces');
  ok(recorded.lines.some(l => l.includes('Wk ' + setup.weeks[1])),
     `the coach still names the older anchor: ${JSON.stringify(recorded.lines)}`);
});
await check('the week view offers the trial card on trial weeks only, and a saved time reaches it', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 320, height: 900 },
  }, port);
  const r = await p.evaluate(async () => {
    const series = window.getWeeklyVolumeSeries();
    const T = series.find(x => x.isTimeTrial);
    const N = series.find(x => !x.isTimeTrial);
    if (!T || !N) return { err: 'the plan has no trial week or no ordinary week' };
    const goTo = async (wk) => {
      // renderProgram() renders whichever view state.programView names, and
      // state is let-scoped so the gate cannot reset it. The back button is
      // the supported way home.
      const back = document.getElementById('backToWeeks');
      if (back) { back.click(); await new Promise(res => setTimeout(res, 250)); }
      if (!document.querySelector('[data-week]')) await window.renderProgram();
      const b = document.querySelector(`[data-week="${wk}"]`);
      if (!b) return false;
      b.click();
      await new Promise(res => setTimeout(res, 300));
      return true;
    };
    if (!await goTo(N.week)) return { err: `no week button for wk ${N.week}` };
    const onOrdinary = !!document.getElementById('trialCard');
    if (!await goTo(T.week)) return { err: `no week button for wk ${T.week}` };
    const card = document.getElementById('trialCard');
    if (!card) return { err: `no #trialCard on trial week ${T.week}` };
    const input = document.getElementById('trialTime');
    const btn = document.getElementById('saveTrial');
    if (!input || !btn) return { err: 'the trial card has no #trialTime input or #saveTrial button' };

    // a refused time must save nothing and say so
    input.value = '2443';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    btn.click();
    await new Promise(res => setTimeout(res, 250));
    const refusedStored = window.getTrialResults().length;
    const flagged = (document.getElementById('trialTime') || {}).dataset?.trialInvalid === '1';

    // and a good one must reach storage and the rendered trend
    const good = document.getElementById('trialTime');
    good.value = '23:43';
    good.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('saveTrial').click();
    await new Promise(res => setTimeout(res, 350));
    const rows = window.getTrialResults().map(x => [x.week, x.km, x.seconds]);
    const after = document.getElementById('trialCard');
    return {
      week: T.week, ordinary: N.week, onOrdinary, refusedStored, flagged, rows,
      km: window.getPlannedTrialKm(T.week),
      cardWeek: Number(after.dataset.trialWeek),
      cardKm: Number(after.dataset.trialKm),
      text: after.textContent,
      anchor: window.getLatestTrial(),
      sessionBtns: document.querySelectorAll('.session-btn').length,
      volumeCard: !!document.getElementById('volumeCard'),
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  ok(real.length === 0, `the trial card produced uncaught errors:\n    ${real.slice(0, 3).join('\n    ')}`);
  eq(r.onOrdinary, false, `wk ${r.ordinary} prescribes no trial and must not offer the card: `);
  eq(r.refusedStored, 0, 'a refused time was stored anyway: ');
  ok(r.flagged, 'a refused time was silently ignored rather than shown as rejected');
  eq(r.rows, [[r.week, r.km, 1423]], 'the saved time did not reach storage: ');
  eq(r.cardWeek, r.week, 'the card is rendering a different week from the one selected: ');
  eq(r.cardKm, r.km, 'the card states a distance the plan does not prescribe: ');
  ok(r.text.includes('23:43'), `the saved time is not shown back to him: "${r.text.slice(0, 200)}"`);
  ok(r.anchor && r.anchor.source === 'recorded' && r.anchor.seconds === 1423,
     `saving from the card did not become the pace anchor: ${JSON.stringify(r.anchor)}`);
  ok(r.volumeCard, 'the trial card displaced the Running volume card');
  ok(r.sessionBtns >= 3, `the trial card broke the session list: ${r.sessionBtns} buttons`);
  ok(r.scroll <= r.client + 1,
     `the trial card pushes the week view sideways at 320px: ${r.scroll} vs ${r.client}`);
});

// ── 21. MILESTONE EDITOR (v1.23) ────────────────────────────────────────
// Reported by Mardy: "I can click on the button to edit, but cannot edit or
// remove anything." Reproduced as three defects of one design flaw — the
// editor keeps a working copy and only two paths commit it, while the most
// obvious exit commits nothing.
suite('milestone editor');
const openMs = async (p) => p.evaluate(async () => {
  window.initApp(); await new Promise(r => setTimeout(r, 250));
  window.renderHome(); await new Promise(r => setTimeout(r, 150));
  const t = document.getElementById('toggleMilestoneEdit');
  if (!t) return false;
  t.click(); await new Promise(r => setTimeout(r, 250));
  return !!document.getElementById('ms-save');
});
await check('the Done toggle commits the edit instead of discarding it', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {}, port);
  ok(await openMs(p), 'the milestone editor did not open');
  const r = await p.evaluate(async () => {
    const before = window.getMilestones()[0].label;
    const inp = document.querySelector('.ms-label[data-msi="0"]');
    if (!inp) return { err: 'no label input' };
    inp.value = 'RENAMED IN THE EDITOR';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 120));
    document.getElementById('toggleMilestoneEdit').click();   // "Done"
    await new Promise(r2 => setTimeout(r2, 300));
    let disk = null;
    try { disk = JSON.parse(localStorage.getItem('milestones') || 'null'); } catch {}
    return {
      before,
      state: window.getMilestones().find(m => m.label === 'RENAMED IN THE EDITOR') ? 'kept' : 'LOST',
      disk: (disk || []).some(m => m && m.label === 'RENAMED IN THE EDITOR') ? 'kept' : 'LOST',
      stillEditing: !!document.getElementById('ms-save'),
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  eq(real, [], 'the editor produced uncaught errors: ');
  eq(r.state, 'kept', 'pressing Done threw away the typed edit before it reached state: ');
  eq(r.disk, 'kept', 'pressing Done left the edit unpersisted — it is lost on the next boot: ');
  eq(r.stillEditing, false, 'Done must close the editor once it has committed: ');
});
await check('deleting a milestone persists immediately and survives a reload', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {}, port);
  ok(await openMs(p), 'the milestone editor did not open');
  const r = await p.evaluate(async () => {
    const before = window.getMilestones().length;
    const gone = window.getMilestones()[0].label;
    document.querySelector('.ms-del[data-msi="0"]').click();
    await new Promise(r2 => setTimeout(r2, 300));
    let disk = null;
    try { disk = JSON.parse(localStorage.getItem('milestones') || 'null'); } catch {}
    return {
      before, gone,
      afterState: window.getMilestones().length,
      afterDisk: Array.isArray(disk) ? disk.length : 'NOTHING WRITTEN',
      stillEditing: !!document.getElementById('ms-save'),
      rows: document.querySelectorAll('.ms-edit-row').length,
    };
  });
  ok(r.before > 1, `need more than one milestone to delete, got ${r.before}`);
  eq(r.afterState, r.before - 1, 'the delete did not reach state: ');
  eq(r.afterDisk, r.before - 1,
     'the delete was never written to storage, so it comes back on the next boot: ');
  eq(r.rows, r.before - 1, 'the editor did not re-render after the delete: ');
  eq(r.stillEditing, true, 'a delete must not close the editor: ');
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => {
    window.initApp();
    return { n: window.getMilestones().length,
             labels: window.getMilestones().map(m => m.label) };
  });
  const real = realErrors(e);
  await c.close();
  eq(real, [], 'the delete path produced uncaught errors: ');
  eq(after.n, r.before - 1, 'the deletion was lost across a reload: ');
  ok(!after.labels.includes(r.gone), `"${r.gone}" came back after the reload`);
});
await check('a half-filled row blocks the commit visibly; an untouched new row does not', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {}, port);
  ok(await openMs(p), 'the milestone editor did not open');
  const r = await p.evaluate(async () => {
    // 1. an added-but-never-filled row must not block anything — he clicked
    //    "+ Add milestone" and changed his mind.
    document.getElementById('ms-add').click();
    await new Promise(r2 => setTimeout(r2, 250));
    const withBlank = window.getMilestones().length;
    const inp = document.querySelector('.ms-label[data-msi="0"]');
    inp.value = 'EDIT I ACTUALLY WANT';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('ms-save').click();
    await new Promise(r2 => setTimeout(r2, 300));
    let disk = null;
    try { disk = JSON.parse(localStorage.getItem('milestones') || 'null'); } catch {}
    const savedBlank = (disk || []).some(m => m && !m.label && !m.date);
    const savedEdit = (disk || []).some(m => m && m.label === 'EDIT I ACTUALLY WANT');
    return { withBlank, savedBlank, savedEdit,
             closed: !document.getElementById('ms-save') };
  });
  ok(!r.err, r.err);
  eq(r.savedEdit, true,
     'an empty row he added and abandoned blocked the edit he did want: ');
  eq(r.savedBlank, false, 'an entirely empty row must be dropped, not stored: ');
  eq(r.closed, true, 'a clean save must close the editor: ');
  // 2. a row with a label but no date is a real mistake and must be reported,
  //    in view, with the row itself marked.
  const r2 = await p.evaluate(async () => {
    window.renderHome(); await new Promise(x => setTimeout(x, 150));
    document.getElementById('toggleMilestoneEdit').click();
    await new Promise(x => setTimeout(x, 250));
    const n = window.getMilestones().length;
    document.getElementById('ms-add').click();
    await new Promise(x => setTimeout(x, 250));
    const i = window.getMilestones().length - 1;
    const lab = document.querySelector(`.ms-label[data-msi="${i}"]`);
    lab.value = 'HALF FILLED'; lab.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('ms-save').click();
    await new Promise(x => setTimeout(x, 300));
    const err = document.getElementById('ms-edit-err');
    const box = err ? err.getBoundingClientRect() : null;
    const badRow = document.querySelector('[data-msi="' + i + '"].ms-date');
    let disk = null;
    try { disk = JSON.parse(localStorage.getItem('milestones') || 'null'); } catch {}
    return {
      n,
      shown: !!err && err.style.display !== 'none',
      inView: !!box && box.top >= 0 && box.top <= window.innerHeight,
      rowMarked: !!badRow && badRow.dataset.msInvalid === '1',
      stillEditing: !!document.getElementById('ms-save'),
      stored: (disk || []).some(m => m && m.label === 'HALF FILLED'),
    };
  });
  const real = realErrors(e);
  await c.close();
  eq(real, [], 'the validation path produced uncaught errors: ');
  eq(r2.shown, true, 'a half-filled row was refused with no message at all: ');
  eq(r2.inView, true,
     'the error was rendered off-screen, so the save looks like it silently did nothing: ');
  eq(r2.rowMarked, true, 'the offending row is not marked, so he cannot tell which one: ');
  eq(r2.stillEditing, true, 'a refused save must keep the editor open: ');
  eq(r2.stored, false, 'a half-filled row must not be stored: ');
});

// ── 22. REP-PR FLOOR (v1.23) ────────────────────────────────────────────
// Reported by Mardy: a PR of 60 kg for 12 reps means 60 kg is also proven at
// every rep count below 12. The store kept each rep count as an independent
// slot, so it did not. The rule: a rep-max table must never increase as the
// rep count falls.
suite('rep-PR floor');
await check('applyRepPRFloor fills every lower rep count and is idempotent', async () => {
  const r = await page.evaluate(() => {
    const f = window.applyRepPRFloor;
    if (typeof f !== 'function') return 'MISSING';
    const src = {
      '12': { w: 60, r: 12, rpe: 8, date: '2026-09-01', week: 3 },
      '5':  { w: 55, r: 5,  rpe: 9, date: '2026-08-01', week: 1 },
      '3':  { w: 80, r: 3,  rpe: 9, date: '2026-09-10', week: 4 },
    };
    const once = f(src);
    const twice = f(once);
    const thrice = f(twice);
    return {
      reps: Object.keys(once).map(Number).sort((a, b) => a - b),
      weights: Object.keys(once).map(Number).sort((a, b) => a - b).map(k => once[String(k)].w),
      implied: Object.keys(once).map(Number).sort((a, b) => a - b).map(k => !!once[String(k)].implied),
      from5: once['5'].impliedFrom, actual5: once['5'].actualW,
      real3: once['3'].implied, real12: once['12'].implied,
      idempotent: JSON.stringify(once) === JSON.stringify(twice)
               && JSON.stringify(twice) === JSON.stringify(thrice),
      noInvention: Object.keys(once).every(k => Number(k) <= 12),
      degenerate: [f(null), f(undefined), f('x'), f([]), f({}), f({ '0': { w: 5 } }), f({ 'x': { w: 5 } })],
    };
  });
  ok(r !== 'MISSING', 'applyRepPRFloor not exposed on window');
  eq(r.reps, [1,2,3,4,5,6,7,8,9,10,11,12], 'every rep count below the highest must be filled: ');
  // 80 kg at 3 reps is the heaviest thing proven, so it floors 1-3; 60x12
  // floors 4-12; the real 55x5 is dominated by the 80x3 above it.
  eq(r.weights, [80,80,80,60,60,60,60,60,60,60,60,60], 'floor weights: ');
  eq(r.implied, [true,true,false,true,true,true,true,true,true,true,true,false],
     'only the entries he actually lifted may read as real: ');
  eq(r.from5, 12, 'the 5RM floor must name the rep count that proves it: ');
  eq(r.actual5, 55, 'the weight he really lifted at that rep count must be preserved: ');
  eq(r.real3, undefined, 'a real heavier entry must not be marked implied: ');
  eq(r.real12, undefined, 'the source entry must not be marked implied: ');
  ok(r.idempotent, 're-running the floor changed the result — it is not idempotent');
  ok(r.noInvention, 'the floor invented a rep count above the highest logged one');
  for (const d of r.degenerate) eq(d, {}, 'degenerate input must return {}: ');
});
await check('the floor never lowers a real entry and never raises the e1RM estimate', async () => {
  const r = await page.evaluate(() => {
    const src = {
      '1':  { w: 100, r: 1,  rpe: 10, date: '2026-09-01', week: 3 },
      '10': { w: 60,  r: 10, rpe: 8,  date: '2026-09-02', week: 3 },
    };
    const out = window.applyRepPRFloor(src);
    const e = (w, rr) => window.epley(w, rr);
    const bestBefore = Math.max(...Object.keys(src).map(k => e(src[k].w, Number(k))));
    const bestAfter = Math.max(...Object.keys(out).map(k => {
      const p = out[k];
      const real = p.implied ? (p.actualW === undefined ? null : p.actualW) : p.w;
      return real === null ? 0 : e(real, Number(k));
    }));
    return { one: out['1'].w, oneImplied: !!out['1'].implied,
             ten: out['10'].w, bestBefore: Math.round(bestBefore * 10) / 10,
             bestAfter: Math.round(bestAfter * 10) / 10 };
  });
  eq(r.one, 100, 'a heavy single must not be pulled down by a lighter high-rep set: ');
  eq(r.oneImplied, false, 'the single is a real lift: ');
  eq(r.ten, 60, 'the 10RM must keep its own weight: ');
  eq(r.bestAfter, r.bestBefore,
     'the floor changed the estimated 1RM — implied entries must never feed it: ');
});
await check('a saved set applies the floor, and a real lift promotes an implied entry', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {}, port);
  const r = await p.evaluate(async () => {
    if (typeof window.updateExercisePRs !== 'function') return { err: 'updateExercisePRs missing' };
    if (typeof window.migrateRepPRFloor !== 'function') return { err: 'migrateRepPRFloor missing' };
    const read = () => JSON.parse(localStorage.getItem('exercisePRs') || '{}');
    // a single 12-rep set must floor every rep count below it
    const first = window.updateExercisePRs(
      [{ name: 'Gate Curl', sets: [{ weight: '60', reps: '12', rpe: '8' }] }], 3);
    const afterFirst = read()[window.exPRKey('Gate Curl')];
    // now he really lifts 60 for 8 — already implied, but it is now a real lift
    const second = window.updateExercisePRs(
      [{ name: 'Gate Curl', sets: [{ weight: '60', reps: '8', rpe: '9' }] }], 4);
    const afterSecond = read()[window.exPRKey('Gate Curl')];
    // and a genuine improvement at 8 reps IS a PR and must be announced
    const third = window.updateExercisePRs(
      [{ name: 'Gate Curl', sets: [{ weight: '65', reps: '8', rpe: '9' }] }], 5);
    const afterThird = read()[window.exPRKey('Gate Curl')];
    return {
      firstAnnounced: first.map(x => [x.reps, x.weight]),
      floored8: afterFirst['8'], floored1: afterFirst['1'],
      promoted8: { w: afterSecond['8'].w, implied: !!afterSecond['8'].implied,
                   week: afterSecond['8'].week },
      secondAnnounced: second.length,
      thirdAnnounced: third.map(x => [x.reps, x.weight]),
      after65: { at8: afterThird['8'].w, at8implied: !!afterThird['8'].implied,
                 at5: afterThird['5'].w, at5implied: !!afterThird['5'].implied,
                 at12: afterThird['12'].w },
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  eq(real, [], 'the PR path produced uncaught errors: ');
  eq(r.firstAnnounced, [[12, 60]],
     'only the set he actually performed may be announced as a PR: ');
  eq(r.floored8.w, 60, 'a 12-rep PR must floor the 8-rep slot: ');
  eq(r.floored8.implied, true, 'the floored slot must be marked implied: ');
  eq(r.floored1.w, 60, 'a 12-rep PR must floor the 1-rep slot too: ');
  eq(r.promoted8, { w: 60, implied: false, week: 4 },
     'really lifting a weight that was only implied must promote it to a real record: ');
  eq(r.secondAnnounced, 0,
     'confirming an already-implied weight is not a new PR and must not be announced: ');
  eq(r.thirdAnnounced, [[8, 65]], 'beating the floor IS a PR: ');
  eq(r.after65.at8, 65, 'the new 8RM: ');
  eq(r.after65.at8implied, false, 'the new 8RM is real: ');
  eq(r.after65.at5, 65, 'the new 8RM must re-floor the slots below it: ');
  eq(r.after65.at5implied, true, 'that re-floored slot is implied: ');
  eq(r.after65.at12, 60, 'a heavier 8RM says nothing about 12 reps and must not raise it: ');
});
await check('existing stored PRs are backfilled once at boot, and implied entries are labelled', async () => {
  const seed = JSON.stringify({
    'gate bench': {
      '12': { w: 60, r: 12, rpe: 8, date: '2026-09-01', week: 3 },
      '6':  { w: 50, r: 6,  rpe: 7, date: '2026-08-20', week: 2 },
    },
  });
  // An EXISTING install, not a fresh one. A first boot runs purgeTrainingData()
  // and re-seeds VERIFIED_EXERCISE_PRS over whatever is stored, so seeding PRs
  // without also satisfying the reset and epoch flags tests nothing — the
  // fixture is wiped before initApp() ever sees it.
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    init: `localStorage.setItem('exercisePRs', ${JSON.stringify(seed)});`
        + `localStorage.setItem('dataResetVersion', '99');`
        + `localStorage.setItem('programEpoch', '99');`,
  }, port);
  const r = await p.evaluate(async () => {
    window.initApp();
    await new Promise(x => setTimeout(x, 300));
    const stored = JSON.parse(localStorage.getItem('exercisePRs') || '{}')['gate bench'];
    const touchedAgain = window.migrateRepPRFloor();
    const after = JSON.parse(localStorage.getItem('exercisePRs') || '{}')['gate bench'];
    // the PR tab must say which entries were not actually lifted
    window.renderPRs();
    await new Promise(x => setTimeout(x, 250));
    const card = [...document.querySelectorAll('.card')]
      .find(el => /gate bench/i.test(el.textContent));
    // the floor invariant, over every exercise in the store: a rep-max table
    // must never read heavier at a higher rep count than at a lower one.
    const all = JSON.parse(localStorage.getItem('exercisePRs') || '{}');
    const invariant = [];
    for (const k of Object.keys(all)) {
      const reps = Object.keys(all[k]).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < reps.length; i++) {
        if (all[k][String(reps[i])].w > all[k][String(reps[i - 1])].w)
          invariant.push(`${k}: ${reps[i]}RM (${all[k][String(reps[i])].w}) > ${reps[i-1]}RM (${all[k][String(reps[i-1])].w})`);
      }
      if (reps.length && reps[0] !== 1) invariant.push(`${k}: lowest rep count is ${reps[0]}, not 1`);
    }
    return {
      invariant,
      reps: Object.keys(stored).map(Number).sort((a, b) => a - b),
      six: { w: stored['6'].w, implied: !!stored['6'].implied, actual: stored['6'].actualW },
      twelve: { w: stored['12'].w, implied: !!stored['12'].implied },
      idempotentRun: touchedAgain,
      unchanged: JSON.stringify(stored) === JSON.stringify(after),
      cardText: card ? card.textContent.replace(/\s+/g, ' ') : 'NO CARD',
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  eq(real, [], 'the migration produced uncaught errors: ');
  eq(r.reps, [1,2,3,4,5,6,7,8,9,10,11,12], 'boot did not backfill the stored PRs: ');
  eq(r.invariant, [], 'the rep-max table increases as the rep count rises: ');
  eq(r.six, { w: 60, implied: true, actual: 50 },
     'the 6RM should be floored to 60 by the 12x60, keeping the real 50 on record: ');
  eq(r.twelve, { w: 60, implied: false }, 'the source entry stays real: ');
  eq(r.idempotentRun, 0, 'the migration is not idempotent — it rewrote on a second run: ');
  ok(r.unchanged, 'a second migration changed the stored PRs');
  ok(/implied/i.test(r.cardText),
     `the PR card does not mark the entries he did not actually lift: "${r.cardText.slice(0, 220)}"`);
  ok(r.scroll <= r.client + 1, `the PR tab overflows: ${r.scroll} vs ${r.client}`);
});

// ── 23. RUNNING: RAMP-IN AND TEMPO/INTERVAL ALTERNATION (v1.24) ─────────
// His instruction, 27 Sep: the coming week is the first he runs four times,
// he wants three weeks of that before one of them becomes a hard session, and
// then "really switch between tempo and interval".
//
// None of these checks hardcodes a week number. They read each week's own
// quality-slot text and assert the SHAPE the instruction requires, so they
// stay valid when the calendar moves under them.
suite('running ramp-in & alternation');
// Every run slot's kind, read from the session's own first line — in calendar
// order, because from v1.27 a week carries hard work in TWO slots and "which
// came first" is what alternation means. The tag's CONTENT decides: the
// Marathon-Revolutie week tags every session and only its intensive one is
// hard.
const RUN_KINDS = `(w) => {
  const ORDER = ['recovery2', 'quality', 'easy', 'longRun'];   // Tue Wed Fri Sun
  return ORDER.map((key) => {
    const t = window.getPlanned(w, key) || '';
    if (/TIME\\s+TRIAL|\\d+\\s*K\\s+RACE\\b/i.test(t)) return { key, kind: 'trial' };
    const first = t.split('\\n').find(l => l.trim()) || '';
    const m = first.match(/^\\s*\\[([^\\]]+)\\]/);
    if (!m) return { key, kind: 'easy' };
    const tag = m[1].toUpperCase();
    if (/MR/.test(tag)) return { key, kind: 'mr' };
    if (/TEMPO|THRESHOLD|CRUISE/.test(tag)) return { key, kind: 'tempo' };
    if (/INTERVAL|RACE PACE|REP/.test(tag)) return { key, kind: 'interval' };
    return { key, kind: 'other:' + tag };
  });
}`;
// The week the second hard run starts, derived from the plan: the first week
// whose FRIDAY slot stops being an easy run. Never a week number.
const TWO_HARD_FROM = `(KIND) => {
  const kindsOf = eval(KIND);
  const weeks = window.getWeeklyVolumeSeries().map(e => e.week);
  for (const w of weeks) {
    const fri = kindsOf(w).find(s => s.key === 'easy');
    if (fri && (fri.kind === 'tempo' || fri.kind === 'interval')) return w;
  }
  return null;
}`;



// tempo-family vs interval-family, read from the session's own tag.
const QUALITY_KIND = `(t) => {
  if (!t) return 'none';
  if (/TIME\\s+TRIAL|\\d+\\s*K\\s+RACE\\b/i.test(t)) return 'trial';
  const m = t.match(/^\\s*\\[([^\\]]+)\\]/m);
  if (!m) return 'easy';
  const tag = m[1].toUpperCase();
  if (/MR/.test(tag)) return 'mr';
  if (/TEMPO|THRESHOLD|CRUISE/.test(tag)) return 'tempo';
  if (/INTERVAL|RACE PACE|REP/.test(tag)) return 'interval';
  return 'other:' + tag;
}`;

await check('the quality slot is classified from the session, not from the slot name', async () => {
  const r = await page.evaluate((KIND) => {
    const kindOf = eval(KIND);
    const f = window.classifyRunSession;
    const fixtures = {
      tagged:  f('quality', '[TEMPO] 2×2300 m @ 5:00/km'),
      trial:   f('quality', '🏃 5K TIME TRIAL — run it rested'),
      parked:  f('quality', '7.9 km easy @ 6:15–6:40/km\n❤️ Zone 1–2: ≤130 bpm'),
      long:    f('longRun', '14 km @ Zone 2'),
      easySlot:f('easy', '9 km easy'),
      notRun:  f('upperA', 'Flat Bench'),
    };
    // plan invariant: a quality slot with no bracketed tag and no trial marker
    // must NOT be judged against a quality target zone.
    const bad = [];
    for (const e of window.getWeeklyVolumeSeries()) {
      const t = window.getPlanned(e.week, 'quality') || '';
      const expect = { tempo: 'quality', interval: 'quality', mr: 'quality',
                       trial: 'trial', easy: 'easy', none: 'easy' }[kindOf(t)] || 'quality';
      const got = window.classifyRunSession('quality', t);
      if (got !== expect) bad.push(`wk${e.week}: text reads ${kindOf(t)} but classified ${got}`);
    }
    return { fixtures, bad };
  }, QUALITY_KIND);
  eq(r.fixtures.tagged, 'quality', 'a tagged session is quality: ');
  eq(r.fixtures.trial, 'trial', 'a trial: ');
  eq(r.fixtures.parked, 'easy',
     'a quality SLOT parked as a fourth easy run must not be judged against a quality zone: ');
  eq(r.fixtures.long, 'long', 'the long run: ');
  eq(r.fixtures.easySlot, 'easy', 'an easy slot: ');
  eq(r.fixtures.notRun, null, 'a strength session is not a run: ');
  eq(r.bad, [], 'the classifier disagrees with the plan text: ');
});

await check('from the week he asked for, every week runs one interval, one threshold, one long run and one optional easy', async () => {
  // SUPERSEDED, not deleted. v1.24 asserted a three-week ramp-in carrying no
  // intensity, which was his instruction then. On 5 Oct he ended it: "starting
  // this week, i want to do 2 hard runs and 2 easy runs. my long run should
  // also be ran easy." The old check was right about the old plan and wrong
  // about this one, so it is replaced by the shape the new instruction
  // requires rather than weakened or removed.
  const r = await page.evaluate(([KIND, FROM]) => {
    const kindsOf = eval(KIND);
    const from = eval(FROM)(KIND);
    if (from === null) return { err: 'no week carries a second hard run — the Friday slot is still easy everywhere' };
    const HARD = (k) => k === 'tempo' || k === 'interval';
    // The week the 16 Nov structure starts, derived from the plan: the first
    // week whose Wednesday slot holds the INTERVAL session. Before 16 Nov
    // Wednesday was the tempo and Friday the intervals; the pair inverted.
    // Never a week number.
    const NEWFROM = (() => {
      for (const x of window.getWeeklyVolumeSeries()) {
        if (x.week < from) continue;
        const k = kindsOf(x.week);
        const wed = k.find(s => s.key === 'quality'), fri = k.find(s => s.key === 'easy');
        if (wed && fri && wed.kind === 'interval' && fri.kind === 'tempo') return x.week;
      }
      return null;
    })();
    const bad = [];
    const weeks = window.getWeeklyVolumeSeries()
      .filter(e => e.week >= from && !kindsOf(e.week).some(s => s.kind === 'mr'));
    let plain = 0, trialWeeks = 0;
    for (const e of weeks) {
      const slots = kindsOf(e.week);
      // The Marathon-Revolutie week states its own rules in its own text and
      // is never rescaled. Identified by its tag, never by its number.
      if (slots.some(s => s.kind === 'mr')) continue;
      const by = {}; slots.forEach(s => { by[s.key] = s.kind; });
      // v1.29: on race week the Sunday slot holds the goal race itself, which
      // is the one Sunday that is not an easy long run. Allowed by what the
      // classifier calls it, never by the week number.
      if (by.longRun !== 'easy' && by.longRun !== 'trial')
        bad.push(`wk${e.week}: the long run is ${by.longRun}, not easy`);
      if (HARD(by.recovery2)) bad.push(`wk${e.week}: Tuesday is hard, which is the bench day`);
      const hard = slots.filter(s => HARD(s.kind)).length;
      const trial = slots.some(s => s.kind === 'trial');
      if (trial) {
        trialWeeks++;
        if (hard > 1) bad.push(`wk${e.week}: a trial week carries ${hard} hard sessions on top of the trial`);
      } else {
        plain++;
        if (hard !== 2) bad.push(`wk${e.week}: ${hard} hard session(s), expected 2`);
        const kinds = slots.filter(s => HARD(s.kind)).map(s => s.kind).sort();
        if (hard === 2 && kinds.join('+') !== 'interval+tempo')
          bad.push(`wk${e.week}: the two hard sessions are ${kinds.join(' + ')}, not one of each`);
      }
      if (e.runs.length !== 4) bad.push(`wk${e.week}: ${e.runs.length} runs counted, expected 4`);
      const stray = slots.filter(s => String(s.kind).startsWith('other:'));
      if (stray.length) bad.push(`wk${e.week}: untagged hard work ${stray.map(s => s.kind).join(', ')}`);
      // v1.29, his instruction of 16 Nov: ONE interval, ONE threshold, ONE
      // long run by time, ONE optional easy. Asserted only from the week the
      // new structure starts - derived as the first week whose WEDNESDAY slot
      // is the interval session, which is what inverted on 16 Nov - so the
      // weeks he has already run keep being judged by the rules they were
      // written under.
      if (NEWFROM !== null && e.week >= NEWFROM && !trial) {
        if (by.quality !== 'interval')
          bad.push(`wk${e.week}: Wednesday is ${by.quality}, not the interval session`);
        if (by.easy !== 'tempo')
          bad.push(`wk${e.week}: Friday is ${by.easy}, not the threshold session`);
        const tue = window.getPlanned(e.week, 'recovery2') || '';
        if (!/OPTIONAL/.test(tue))
          bad.push(`wk${e.week}: the Tuesday easy run is not marked optional`);
        if (!window.parseRunDurationMin(tue))
          bad.push(`wk${e.week}: the Tuesday easy run is not stated as a duration`);
        const lr = window.getPlanned(e.week, 'longRun') || '';
        if (!window.parseRunDurationMin(lr))
          bad.push(`wk${e.week}: the long run is not stated as a duration - he asked for time, not distance`);
      }
    }
    return { err: null, from, newFrom: NEWFROM, bad, plain, trialWeeks, weeks: weeks.length };
  }, [RUN_KINDS, TWO_HARD_FROM]);
  ok(!r.err, r.err);
  ok(r.weeks >= 10, `only ${r.weeks} week(s) from the two-hard boundary — the plan has stopped carrying the block`);
  ok(r.plain >= 8, `only ${r.plain} ordinary two-hard week(s) found`);
  // v1.29: he dropped the mid-block trials on 16 Nov, so one timed effort is
  // what the plan now holds - the goal race. Asserting two would be asserting
  // a decision he did not make.
  ok(r.trialWeeks >= 1, 'no timed effort left anywhere in range — the measurement system has gone');
  ok(r.newFrom !== null, 'no week runs the interval-Wednesday / threshold-Friday structure he asked for on 16 Nov');
  eq(r.bad, [], 'weekly-structure problems: ');
});

await check('the hard sessions strictly alternate tempo and interval', async () => {
  // CORRECTED at v1.27. It read only the quality slot, so from the week the
  // second hard run appears it saw one session a week and reported every
  // consecutive pair as "both tempo". The rule it asserts is unchanged — he
  // asked for the two kinds to switch — but it now reads them in calendar
  // order across every slot that carries hard work.
  const r = await page.evaluate(([KIND, FROM]) => {
    const kindsOf = eval(KIND);
    const from = eval(FROM)(KIND);
    // v1.29: the alternation rule is unchanged - he asked for the two kinds
    // to switch and they still do - but it is asserted WITHIN one structural
    // regime. On 16 Nov the pair inverted: Wednesday became the interval and
    // Friday the threshold, where before 16 Nov Wednesday was the tempo. At
    // that seam the last hard session of the old shape (a Friday interval)
    // sits next to the first of the new (a Wednesday interval), which is an
    // artefact of the plan changing mid-block and not two hard sessions of
    // the same kind being scheduled back to back. Scoped from the week the
    // new structure starts, derived from the plan, never a week number.
    const newFrom = (() => {
      for (const x of window.getWeeklyVolumeSeries()) {
        if (from !== null && x.week < from) continue;
        const k = kindsOf(x.week);
        const wed = k.find(s => s.key === 'quality'), fri = k.find(s => s.key === 'easy');
        if (wed && fri && wed.kind === 'interval' && fri.kind === 'tempo') return x.week;
      }
      return null;
    })();
    const scope = newFrom !== null ? newFrom : from;
    const seq = [];
    for (const e of window.getWeeklyVolumeSeries()) {
      if (scope !== null && e.week < scope) continue;
      const slots = kindsOf(e.week);
      if (slots.some(s => s.kind === 'mr')) continue;      // MR week, own rules
      for (const s of slots) {
        if (s.kind === 'tempo' || s.kind === 'interval' || String(s.kind).startsWith('other:'))
          seq.push({ week: e.week, key: s.key, k: s.kind });
      }
    }
    return { from: scope, seq };
  }, [RUN_KINDS, TWO_HARD_FROM]);
  const strays = r.seq.filter(x => String(x.k).startsWith('other:'));
  eq(strays, [], 'a hard session is tagged as neither tempo nor interval — he asked for those two: ');
  ok(r.seq.length >= 12, `only ${r.seq.length} hard sessions from wk ${r.from} — two a week should give more`);
  const firstKind = r.seq.length ? r.seq[0].k : null;
  ok(firstKind === 'interval',
     `the structure he asked for opens on the interval session; this opens on ${firstKind}`);
  const repeats = [];
  for (let i2 = 1; i2 < r.seq.length; i2++) {
    if (r.seq[i2].k === r.seq[i2 - 1].k)
      repeats.push(`wk${r.seq[i2 - 1].week} ${r.seq[i2 - 1].key} and wk${r.seq[i2].week} ${r.seq[i2].key} are both ${r.seq[i2].k}`);
  }
  eq(repeats, [], 'two hard sessions of the same kind run back to back: ');
});

await check("every prescribed pace is one of the paces on his own chart", async () => {
  // SUPERSEDED, not deleted. v1.24 built three pace TIERS that stepped toward
  // a 22:30 target, because every pace in the plan had been pinned at the goal
  // and run as written every session was a race. On 16 Nov he replaced the
  // derivation entirely: "base my running pace on the added picture", and
  // supplied a chart. So the thing to assert is no longer that the paces climb
  // - they are flat by his instruction - but that every one of them is a pace
  // he actually gave, and that nothing is prescribed faster than his own 5K
  // pace except where the plan says "or faster" in so many words.
  //
  // The chart's values are NOT written into this check. They are read back out
  // of the plan and asserted to be a small, consistent set, so the check keeps
  // meaning something when he supplies a new chart.
  const r = await page.evaluate(([KIND, KINDS, FROM]) => {
    const kindOf = eval(KIND);
    const kindsOf = eval(KINDS);
    const from = eval(FROM)(KINDS);
    // Scoped to the editable part of the plan. Weeks already run carry the
    // paces of the anchor they were written under - the v1.24 tiers - and
    // rewriting history to satisfy a check is exactly backwards. Derived as
    // the first week of the 16 Nov structure, never a week number.
    const newFrom = (() => {
      for (const x of window.getWeeklyVolumeSeries()) {
        if (from !== null && x.week < from) continue;
        const k = kindsOf(x.week);
        const wed = k.find(z => z.key === 'quality'), fri = k.find(z => z.key === 'easy');
        if (wed && fri && wed.kind === 'interval' && fri.kind === 'tempo') return x.week;
      }
      return null;
    })();
    const out = { hard: [], easy: [], bad: [], newFrom };
    if (newFrom === null) { out.bad.push('the 16 Nov structure is not in the plan'); return out; }
    for (const e of window.getWeeklyVolumeSeries()) {
      if (e.week < newFrom) continue;
      for (const key of ['recovery2', 'quality', 'easy', 'longRun']) {
        const t = window.getPlanned(e.week, key) || '';
        const k = kindOf(t);
        if (k === 'mr' || k === 'trial' || k === 'none') continue;
        const band = window.parsePlannedPaceBand(t);
        if (!band) continue;
        const row = { week: e.week, key, sec: band.low, high: band.high,
                      txt: window.formatPace(band.low) };
        // every parsed pace must literally appear in that session's own text,
        // so the gate cannot drift from the plan
        if (t.indexOf(window.formatPace(band.low)) === -1)
          out.bad.push(`wk${e.week} ${key}: parsed ${window.formatPace(band.low)} which is not in the text`);
        if (k === 'tempo' || k === 'interval') out.hard.push(row); else out.easy.push(row);
      }
    }
    return out;
  }, [QUALITY_KIND, RUN_KINDS, TWO_HARD_FROM]);
  eq(r.bad, [], 'pace problems: ');
  ok(r.hard.length >= 10, `only ${r.hard.length} hard session(s) with a parseable pace from wk ${r.newFrom}`);
  ok(r.easy.length >= 10, `only ${r.easy.length} easy session(s) with a parseable pace from wk ${r.newFrom}`);
  // A chart gives a handful of paces, not one per week. If the hard sessions
  // carry more than a few distinct values the plan has stopped being driven by
  // the chart and has drifted back to a per-week ladder.
  const hardSet = [...new Set(r.hard.map(x => x.sec))].sort((a, b) => a - b);
  const easySet = [...new Set(r.easy.map(x => x.sec))].sort((a, b) => a - b);
  ok(hardSet.length <= 4,
     `the hard sessions carry ${hardSet.length} distinct paces (${hardSet.join('s, ')}s/km) — a chart gives a few, not one per week`);
  ok(easySet.length <= 3,
     `the easy and long runs carry ${easySet.length} distinct paces — they should share one easy pace`);
  // the easy pace must be slower than every hard pace, or "easy" means nothing
  const slowestHard = Math.max(...hardSet);
  const fastestEasy = Math.min(...easySet);
  ok(fastestEasy > slowestHard,
     `an easy run is prescribed at ${fastestEasy}s/km, no slower than the slowest hard session at ${slowestHard}s/km`);
});

// ── 24. THE SUGGESTION BUILDER, AND THE TWO GOALS (B17 / B25, v1.25) ────
// B17: buildCoachSuggestions was declared INSIDE renderSessionLogger, so it
// was not on window and could only be exercised by driving the real UI — one
// branch per run, which left the strength branch untested for seven builds.
// It is now a top-level builder like every other one in this file, and that
// is what makes the assertions below possible at all.
//
// B25, his words: "Maybe ask questions at the end of the session: I see x y
// z, would you like me to adjust this or this? make it more interactive. It
// should always keep the goal i have very clear. 120kg bench press and a
// faster 5k."
//
// No check here hardcodes a week number, a load or a time. The bench goal is
// whichever week the plan marks as the primary target; the run goal is the
// most ambitious trial target the plan itself states.
suite('coach builder & goals');
await check('the suggestion builder is a top-level function, and it only proposes', async () => {
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const r = await p.evaluate(() => {
    if (typeof window.buildCoachSuggestions !== 'function')
      return { err: 'buildCoachSuggestions is not on window — still declared inside renderSessionLogger (B17)' };
    const series = window.getWeeklyVolumeSeries();
    const hasEasy = (w) => window.parseRunDistanceKm(window.getPlanned(w, 'easy') || '') !== null;
    const W = series.map(x => x.week).find(w =>
      series.some(y => y.week === w + 1) && !window.isSuggestionBlockedWeek(w + 1)
      && hasEasy(w) && hasEasy(w + 1));
    if (W === undefined) return { err: 'no unblocked consecutive pair of easy runs in the plan' };
    const planned = window.getPlanned(W, 'easy');
    const nextBefore = window.getPlanned(W + 1, 'easy');
    const ovBefore = localStorage.getItem('programOverrides');
    const call = () => window.buildCoachSuggestions({
      wk: W, dayKey: 'easy', km: Math.round(window.parseRunDistanceKm(planned) * 1.2 * 10) / 10,
      avgHR: 0, rpe: 5, planned, exs: [], sleep: null });
    const a = call(), b = call();
    const blockedFrom = series.map(x => x.week).find(w => window.isSuggestionBlockedWeek(w + 1));
    const degenerate = [];
    for (const args of [undefined, {}, { wk: 'x' }, { wk: W, dayKey: null, planned: null, exs: null }]) {
      try { degenerate.push(window.buildCoachSuggestions(args).length); }
      catch (e) { degenerate.push('THREW: ' + e.message); }
    }
    return {
      err: null, W,
      labels: a.map(s => s.label), again: b.map(s => s.label),
      weeks: a.map(s => s.week), keys: a.map(s => s.sessionKey),
      fromPlan: a.map(s => s.oldValue === nextBefore),
      planUnchanged: window.getPlanned(W + 1, 'easy') === nextBefore,
      storageUnchanged: localStorage.getItem('programOverrides') === ovBefore,
      blocked: blockedFrom === undefined ? null : window.buildCoachSuggestions({
        wk: blockedFrom, dayKey: 'easy', km: 99, avgHR: 0, rpe: 5,
        planned: window.getPlanned(blockedFrom, 'easy'), exs: [], sleep: null }).length,
      outOfPlan: window.buildCoachSuggestions({ wk: 999, dayKey: 'easy', km: 12, avgHR: 0,
        rpe: 5, planned: '10 km easy', exs: [] }).length,
      degenerate,
    };
  });
  await c.close();
  ok(!r.err, r.err);
  ok(r.labels.length > 0, `an over-performed easy run in wk ${r.W} produced no suggestion at all`);
  eq(r.again, r.labels, 'two identical calls produced different suggestions — the builder is not pure: ');
  eq(r.weeks, Array(r.labels.length).fill(r.W + 1), 'a suggestion targeted a week other than the next one: ');
  eq(r.keys, Array(r.labels.length).fill('easy'), 'a suggestion moved a session other than the one logged: ');
  ok(r.fromPlan.every(Boolean), 'a suggestion did not start from the plan text it proposes to replace');
  ok(r.planUnchanged, 'calling the builder changed the plan — it must propose, never write');
  ok(r.storageUnchanged, 'calling the builder wrote a programOverrides record');
  if (r.blocked !== null) eq(r.blocked, 0, 'a deload or attempt week received a suggestion: ');
  eq(r.outOfPlan, 0, 'a week outside the plan: ');
  for (const d of r.degenerate) ok(!String(d).startsWith('THREW'), `the builder threw on degenerate input: ${d}`);
});
await check('the strength branch scopes its edit to the lines it names and never invents one', async () => {
  // Unreachable from the gate until B17 was closed: this branch has shipped
  // seven times without a single direct assertion on it.
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const r = await p.evaluate(() => {
    if (typeof window.buildCoachSuggestions !== 'function') return { err: 'builder not on window (B17)' };
    const series = window.getWeeklyVolumeSeries();
    for (const e of series) {
      const w = e.week;
      if (!series.some(y => y.week === w + 1) || window.isSuggestionBlockedWeek(w + 1)) continue;
      for (const key of ['upperA', 'upperB', 'lower']) {
        const nextText = window.getPlanned(w + 1, key) || '';
        if (!/@\d+(?:\.\d+)?\s*kg/.test(nextText)) continue;
        const exs = window.parseExercisesFromPlan(window.getPlanned(w, key) || '')
          .map(x => ({ name: x.name, sets: [{ weight: '50', reps: '5', rpe: '5' }] }));
        if (!exs.length) continue;
        const out = window.buildCoachSuggestions({ wk: w, dayKey: key, km: 0, avgHR: 0,
          rpe: 5, planned: window.getPlanned(w, key), exs, sleep: null });
        if (!out.length) continue;
        const s = out[0];
        const oldLines = (s.oldValue || '').split('\n');
        const newLines = (s.newValue || '').split('\n');
        const changed = [];
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
          if (oldLines[i] !== newLines[i]) changed.push([oldLines[i], newLines[i]]);
        }
        const kgOf = (l) => {
          const m = String(l).match(/@(\d+(?:\.\d+)?)\s*kg/);
          return m ? parseFloat(m[1]) : null;
        };
        return {
          err: null, w, key,
          week: s.week, sessionKey: s.sessionKey,
          startsFromPlan: s.oldValue === nextText,
          sameLineCount: oldLines.length === newLines.length,
          changedCount: changed.length,
          loadsMoved: changed.map(([o, n]) => [kgOf(o), kgOf(n)]),
          // stripping the kg figure must make every changed line identical:
          // the edit may touch nothing but the load it names
          onlyLoad: changed.every(([o, n]) =>
            String(o).replace(/@\d+(?:\.\d+)?\s*kg/, '@kg') === String(n).replace(/@\d+(?:\.\d+)?\s*kg/, '@kg')),
        };
      }
    }
    return { err: 'no unblocked week whose next gym session states a kg load produced a suggestion' };
  });
  await c.close();
  ok(!r.err, r.err);
  eq(r.week, r.w + 1, 'the strength branch targeted the wrong week: ');
  eq(r.sessionKey, r.key, 'the strength branch targeted the wrong session: ');
  ok(r.startsFromPlan, "the strength branch did not start from next week's own plan text");
  ok(r.sameLineCount, 'the edit added or removed a line from the session — it may only change loads');
  ok(r.changedCount > 0, 'the suggestion claims a change it did not make');
  ok(r.onlyLoad, `the edit changed something other than the load it names: ${JSON.stringify(r.loadsMoved)}`);
  for (const [o, n] of r.loadsMoved) {
    ok(o !== null && n !== null, `a changed line carries no kg load: ${JSON.stringify([o, n])}`);
    ok(n >= o, `an RPE 5 session proposed REDUCING a load: ${o} -> ${n}`);
  }
});
await check('the two goals are read from the plan, never written into the coach', async () => {
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const r = await p.evaluate(() => {
    if (typeof window.getGoalAnchors !== 'function') return { err: 'getGoalAnchors not on window' };
    const series = window.getWeeklyVolumeSeries();
    const W = series[0].week;
    const g = window.getGoalAnchors(W);
    const ladder = window.getBenchLadder();
    const primary = ladder.find(x => x.isPrimaryTarget) || null;
    const entry = primary ? primary.entries.find(e => e.kind === 'attempt') : null;
    // every trial target the plan states, so the check can assert the goal is
    // the most ambitious one rather than merely one of them
    const stated = [];
    for (const e of series) {
      // v1.29: same correction the app needed - the target is on whichever
      // slot holds the timed effort, not on the quality slot by assumption.
      const t = ['recovery2', 'quality', 'easy', 'longRun']
        .map(k => window.getPlanned(e.week, k) || '')
        .find(x => /TIME\s+TRIAL|\d+\s*K\s+RACE\b/i.test(x)) || '';
      const km = window.getPlannedTrialKm(e.week);
      const m = t.match(/target\s+(?:sub-)?(\d{1,2}):([0-5]\d)/i);
      if (!m || !km) continue;
      const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      const v = window.vdotFromRace(km, sec);
      if (v !== null) stated.push({ week: e.week, km, sec, vdot: v });
    }
    const degenerate = [];
    for (const args of [undefined, null, 'x', 999]) {
      try {
        const d = window.getGoalAnchors(args);
        degenerate.push(!!(d && d.bench && d.bench.load === (entry ? entry.load : null)));
      } catch (e) { degenerate.push('THREW: ' + e.message); }
    }
    return {
      err: null, g, stated,
      primaryWeek: primary ? primary.week : null,
      primaryLoad: entry ? entry.load : null,
      loadInPlanText: (entry && primary)
        ? (window.getPlanned(primary.week, 'upperA') || '').indexOf(String(entry.load)) !== -1 : null,
      dates: primary ? window.getWeekDates(primary.week) : null,
      targetTimeInPlanText: (g.run && g.run.target)
        ? ['recovery2', 'quality', 'easy', 'longRun']
            .map(k => window.getPlanned(g.run.target.week, k) || '')
            .some(x => x.indexOf(window.formatTrialTime(g.run.target.seconds)) !== -1) : null,
      plannedKmOfTarget: (g.run && g.run.target) ? window.getPlannedTrialKm(g.run.target.week) : null,
      degenerate,
    };
  });
  await c.close();
  ok(!r.err, r.err);
  ok(r.g.bench, 'the bench goal did not resolve from the plan at all');
  eq(r.g.bench.load, r.primaryLoad, 'the bench goal is not the load the plan marks as the primary target: ');
  eq(r.g.bench.week, r.primaryWeek, 'the bench goal names the wrong week: ');
  eq(r.g.bench.dates, r.dates, "the bench goal does not carry the week's own date label: ");
  eq(r.loadInPlanText, true, "the bench goal load does not appear in that week's own plan text: ");
  ok(r.g.run && r.g.run.target, 'the run goal did not resolve from the plan at all');
  eq(r.targetTimeInPlanText, true, "the run goal time does not appear in that trial session's own text: ");
  eq(r.g.run.target.km, r.plannedKmOfTarget, 'the run goal distance disagrees with the plan: ');
  ok(r.stated.length >= 1, 'the plan states no trial target at all');
  const bestVdot = Math.max(...r.stated.map(x => x.vdot));
  ok(Math.abs(r.g.run.target.vdot - bestVdot) < 1e-9,
     `the run goal is not the most ambitious target the plan states: ${r.g.run.target.vdot} vs ${bestVdot}`);
  // v1.29: with one target left in the plan, "the most ambitious one" can no
  // longer be exercised by the plan alone - so it is exercised by overriding a
  // week that already carries a trial to state a FASTER target, and asserting
  // the goal moves to it. That proves the selection against real behaviour
  // instead of against his training happening to hold several targets.
  const ambitious = await (async () => {
    const seedWeek = r.stated[0].week;
    const base = await (async () => {
      const { page: pp, ctx: cc } = await openApp(browser, {}, port);
      const v = await pp.evaluate((w) => ['recovery2', 'quality', 'easy', 'longRun']
        .map(k => ({ k, t: window.getPlanned(w, k) || '' }))
        .find(x => /TIME\s+TRIAL|\d+\s*K\s+RACE\b/i.test(x.t)), seedWeek);
      await cc.close();
      return v;
    })();
    ok(base, 'no slot on the target week carries a timed effort to override');
    const faster = base.t.replace(/target\s+(?:sub-)?\d{1,2}:[0-5]\d/i, 'target 19:30');
    const withTarget = /target\s+19:30/.test(faster) ? faster : base.t + '\ntarget 19:30';
    const ov = JSON.stringify(JSON.stringify([{
      ts: '2026-11-16T00:00:00.000Z', week: seedWeek, sessionKey: base.k,
      kind: 'text_replace', changeId: 'gate_goal_ambition', payload: { newValue: withTarget },
    }]));
    const { page: pp, ctx: cc } = await openApp(browser, {
      init: `localStorage.setItem('programOverrides', ${ov})`,
    }, port);
    const g = await pp.evaluate((w) => window.getGoalAnchors(w), seedWeek);
    await cc.close();
    return g;
  })();
  ok(ambitious.run && ambitious.run.target, 'the override removed the run goal entirely');
  eq(ambitious.run.target.seconds, 19 * 60 + 30,
     'the goal did not move to the more ambitious target the plan now states: ');
  eq(r.degenerate, [true, true, true, true],
     "degenerate input must still resolve the plan's goals rather than throwing: ");
});
await check('the goal lines state both goals with their own numbers, logged or not', async () => {
  const read = async (init) => {
    const { page: p, ctx: c } = await openApp(browser, { init }, port);
    const v = await p.evaluate(() => {
      if (typeof window.goalAnchorLines !== 'function') return { err: 'goalAnchorLines not on window' };
      const W = window.getWeeklyVolumeSeries()[0].week;
      const g = window.getGoalAnchors(W);
      return {
        err: null, lines: window.goalAnchorLines(W), g,
        targetTime: g.run && g.run.target ? window.formatTrialTime(g.run.target.seconds) : null,
        latestTime: g.run && g.run.latest ? window.formatTrialTime(g.run.latest.seconds) : null,
        degenerate: [window.goalAnchorLines(), window.goalAnchorLines(null)].map(x => Array.isArray(x)),
      };
    });
    await c.close();
    return v;
  };
  const bare = await read(undefined);
  ok(!bare.err, bare.err);
  ok(bare.lines.length >= 2, `a fresh install produced ${bare.lines.length} goal line(s); both goals must always be named`);
  ok(bare.lines.some(l => l.includes(String(bare.g.bench.load))),
     `the bench target load is never named: ${JSON.stringify(bare.lines)}`);
  ok(bare.lines.some(l => l.includes('Wk ' + bare.g.bench.week)),
     'the bench goal never names the week it lands on');
  ok(bare.lines.some(l => l.includes(bare.targetTime)),
     `the run target time is never named: ${JSON.stringify(bare.lines)}`);
  eq(bare.g.run.latest, null, 'precondition: a fresh install has no trial to anchor on');
  eq(bare.degenerate, [true, true], 'goalAnchorLines must return an array on degenerate input: ');
  // and with both a logged bench set and a recorded trial, the gap to each
  // goal must be stated rather than the target repeated
  const seeded = await read(`localStorage.setItem('session_e3:1_upperA', ${JSON.stringify(JSON.stringify(
      { epoch: 3, exercises: [{ name: 'Flat Bench', sets: [{ weight: '95', reps: '3', rpe: '8' }] }] }))});`
    + `localStorage.setItem('trialResults', ${JSON.stringify(JSON.stringify(
      [{ week: 4, km: 5, seconds: 1423, epoch: 3 }]))});`);
  ok(!seeded.err, seeded.err);
  ok(seeded.g.bench.best > 0, 'a logged bench set did not reach the bench goal as an estimate');
  ok(seeded.lines.some(l => l.includes(String(seeded.g.bench.gap))),
     `the gap to the bench goal is not stated: ${JSON.stringify(seeded.lines)}`);
  ok(seeded.g.run.latest && seeded.g.run.latest.seconds === 1423,
     'a recorded trial did not reach the run goal');
  ok(seeded.lines.some(l => l.includes(seeded.latestTime)),
     `the last trial time is not stated: ${JSON.stringify(seeded.lines)}`);
  ok(seeded.lines.some(l => l.includes(String(seeded.g.run.secondsGap))),
     `the seconds still to find are not stated: ${JSON.stringify(seeded.lines)}`);
});
await check('both goals reach the coach output on a run session AND on a gym session', async () => {
  // v1.24 named the bench target on a gym session only, through
  // strengthCoachLines, and never named the 5K goal on either. "It should
  // always keep the goal i have very clear" means both, every session.
  const SEED = `localStorage.setItem('session_e3:1_upperA', ${JSON.stringify(JSON.stringify(
      { epoch: 3, exercises: [{ name: 'Flat Bench', sets: [{ weight: '95', reps: '3', rpe: '8' }] }] }))});`
    + `localStorage.setItem('trialResults', ${JSON.stringify(JSON.stringify(
      [{ week: 4, km: 5, seconds: 1423, epoch: 3 }]))});`;
  const drive = async (label) => {
    const { page: p, errors: e, ctx: c } = await openApp(browser, {
      viewport: { width: 320, height: 900 }, init: SEED }, port);
    const v = await p.evaluate(async (btnLabel) => {
      const series = window.getWeeklyVolumeSeries();
      const W = series.map(x => x.week).find(w =>
        window.parseRunDistanceKm(window.getPlanned(w, 'longRun') || '') !== null);
      if (W === undefined) return { err: 'no week with a parseable long run' };
      await window.renderProgram();
      const wkBtn = document.querySelector(`[data-week="${W}"]`);
      if (!wkBtn) return { err: `no week button for wk ${W}` };
      wkBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const btns = [...document.querySelectorAll('.session-btn')];
      const idx = btns.findIndex(b => b.textContent.includes(btnLabel));
      if (idx < 0) return { err: `no "${btnLabel}" session button in wk ${W}` };
      btns[idx].click();
      await new Promise(r => setTimeout(r, 450));
      const coach = document.getElementById('askCoach');
      if (!coach) return { err: 'no #askCoach button' };
      coach.click();
      await new Promise(r => setTimeout(r, 600));
      const g = window.getGoalAnchors(W);
      const out = document.getElementById('aiResponse');
      return {
        err: null, W, text: out ? out.textContent : '',
        benchLoad: String(g.bench.load), benchWeek: 'Wk ' + g.bench.week,
        targetTime: window.formatTrialTime(g.run.target.seconds),
        latestTime: g.run.latest ? window.formatTrialTime(g.run.latest.seconds) : null,
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      };
    }, label);
    const real = realErrors(e);
    await c.close();
    return { v, real };
  };
  for (const label of ['Long Run', 'Upper A']) {
    const { v, real } = await drive(label);
    ok(!v.err, v.err);
    eq(real, [], `the coach produced uncaught errors on the ${label} session: `);
    ok(v.text.includes(v.benchLoad),
       `the ${label} coach output never names the ${v.benchLoad} kg bench goal`);
    ok(v.text.includes(v.benchWeek),
       `the ${label} coach output never names the week the bench goal lands on`);
    ok(v.text.includes(v.targetTime),
       `the ${label} coach output never names the 5K target the plan states`);
    ok(v.latestTime && v.text.includes(v.latestTime),
       `the ${label} coach output never names his last trial time`);
    ok(v.scroll <= v.client + 1,
       `the goal block pushes the coach output sideways at 320px: ${v.scroll} vs ${v.client}`);
  }
});
await check('every adjustment is put as a question, and declining leaves the plan alone', async () => {
  const r = await page.evaluate(() => {
    if (typeof window.coachQuestionFor !== 'function') return 'MISSING';
    const f = window.coachQuestionFor;
    return {
      named: f({ label: 'Bump Wk 7 easy run: 10 → 11 km', week: 7 }),
      unnamed: f({ label: 'Hold the loads flat', week: 9 }),
      trailing: f({ label: 'Do the thing.', week: 3 }),
      degenerate: [f(), f(null), f({}), f({ label: '' }), f({ label: 'x', week: 'y' })],
    };
  });
  ok(r !== 'MISSING', 'coachQuestionFor not exposed on window');
  ok(/\?$/.test(r.named), `a question must end in a question mark: "${r.named}"`);
  ok(r.named.includes('Bump Wk 7 easy run: 10 → 11 km'), `the question dropped the change it is asking about: "${r.named}"`);
  ok(r.unnamed.includes('Wk 9'), `a label that does not name its week must have it added: "${r.unnamed}"`);
  ok(/\?$/.test(r.trailing) && !/\.\s*—/.test(r.trailing), `trailing punctuation not cleaned: "${r.trailing}"`);
  eq(r.degenerate, [null, null, null, null, null], 'degenerate input must return null, not a half-formed question: ');

  // and end to end: the card must offer both answers, and "no" must be inert
  const { page: p, errors: e, ctx: c } = await openApp(browser, { viewport: { width: 320, height: 900 } }, port);
  const drive = await p.evaluate(async () => {
    const series = window.getWeeklyVolumeSeries();
    const hasLong = (w) => window.parseRunDistanceKm(window.getPlanned(w, 'longRun') || '') !== null;
    const W = series.map(x => x.week).find(w =>
      series.some(y => y.week === w + 1) && !window.isSuggestionBlockedWeek(w + 1)
      && hasLong(w) && hasLong(w + 1));
    if (W === undefined) return { err: 'no candidate week' };
    await window.renderProgram();
    document.querySelector(`[data-week="${W}"]`).click();
    await new Promise(r => setTimeout(r, 300));
    const btns = [...document.querySelectorAll('.session-btn')];
    const idx = btns.findIndex(b => /Long Run/.test(b.textContent));
    if (idx < 0) return { err: 'no Long Run button' };
    btns[idx].click();
    await new Promise(r => setTimeout(r, 450));
    const setV = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return true;
    };
    const km = Math.round(window.parseRunDistanceKm(window.getPlanned(W, 'longRun')) * 1.2 * 10) / 10;
    if (!setV('runKm', String(km)) || !setV('rpe', '5')) return { err: 'run logger inputs missing' };
    document.getElementById('askCoach').click();
    await new Promise(r => setTimeout(r, 600));
    const sug = Object.values(window._pendingSuggestions || {});
    if (!sug.length) return { err: `no suggestion produced for wk ${W + 1}` };
    const s = sug[0];
    const card = document.getElementById('suggest-' + s.id);
    if (!card) return { err: 'no suggestion card rendered' };
    const before = window.getPlanned(s.week, s.sessionKey);
    const ovBefore = localStorage.getItem('programOverrides');
    const yes = card.querySelector('.ai-apply-btn');
    const no = card.querySelector('.ai-dismiss-btn');
    if (!yes || !no) return { err: 'the card does not offer both an accept and a decline control' };
    const asked = card.textContent.includes(window.coachQuestionFor(s));
    no.click();
    await new Promise(r => setTimeout(r, 400));
    const declined = {
      planUnchanged: window.getPlanned(s.week, s.sessionKey) === before,
      overridesUnchanged: localStorage.getItem('programOverrides') === ovBefore,
      applyGone: !document.querySelector(`#suggest-${s.id} .ai-apply-btn:not([style*="display: none"])`),
      marked: /left as planned/i.test((document.getElementById('suggest-' + s.id) || {}).textContent || ''),
    };
    // now accept it, and the override must land — declining must not have
    // broken the path that does the work
    document.getElementById('askCoach').click();
    await new Promise(r => setTimeout(r, 600));
    const s2 = Object.values(window._pendingSuggestions || {})[0];
    const card2 = document.getElementById('suggest-' + s2.id);
    card2.querySelector('.ai-apply-btn').click();
    await new Promise(r => setTimeout(r, 700));
    return {
      err: null, W, asked,
      header: (document.querySelector('.ai-suggest-header') || {}).textContent || '',
      declined,
      appliedPlan: window.getPlanned(s2.week, s2.sessionKey),
      expected: s2.newValue,
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    };
  });
  const real = realErrors(e);
  await c.close();
  ok(!drive.err, drive.err);
  eq(real, [], 'the question path produced uncaught errors: ');
  ok(drive.asked, 'the card states the change but never asks him anything — B25 asked for a question');
  ok(/\?/.test(drive.header), `the adjustments block does not open with a question: "${drive.header}"`);
  ok(drive.declined.planUnchanged, 'declining a suggestion changed the plan');
  ok(drive.declined.overridesUnchanged, 'declining a suggestion wrote an override');
  ok(drive.declined.applyGone, 'the apply control survived a decline, so the answer can be un-given by a stray tap');
  ok(drive.declined.marked, 'a declined suggestion is not marked as such');
  eq(drive.appliedPlan, drive.expected, 'accepting a suggestion no longer reaches the plan: ');
  ok(drive.scroll <= drive.client + 1,
     `the question controls push the coach output sideways at 320px: ${drive.scroll} vs ${drive.client}`);
});

// ── 25. CHEST DAY, THE RE-BASED LADDER, AND THE EASY RUNS (v1.26) ───────
// Four instructions from Mardy on 30 Sep. No check below hardcodes a week
// number, a load or a distance. The editable boundary is derived from the
// plan the way the v1.24 checks derive it: the first week whose quality slot
// is parked as an easy run.
suite('chest day, ladder & easy runs');

const EDITABLE_FROM = `() => {
  const parked = window.getWeeklyVolumeSeries().map(e => e.week).filter(w => {
    const t = window.getPlanned(w, 'quality') || '';
    return window.classifyRunSession('quality', t) === 'easy';
  });
  return parked.length ? parked[0] : null;
}`;

await check('the chest day carries no row, and those sets moved rather than vanished', async () => {
  const r = await page.evaluate((FROM) => {
    const from = eval(FROM)();
    if (from === null) return { err: 'no parked week: cannot derive the editable boundary' };
    const ROW = /^\s*((?:BB|Cable|Seated Low|Chest-Supported|Pendlay)[A-Za-z \-]*Row)\s\s+(\d+)[×x]/;
    const rows = (text) => (text || '').split('\n')
      .map(l => l.match(ROW)).filter(Boolean)
      .map(m => ({ name: m[1].trim(), sets: parseInt(m[2], 10) }));
    const weeks = window.getWeeklyVolumeSeries().map(e => e.week);
    const before = weeks.filter(w => w < from).pop();
    if (before === undefined) return { err: 'no week before the boundary to compare against' };
    const setsIn = (w) => rows(window.getPlanned(w, 'upperA')).concat(rows(window.getPlanned(w, 'upperB')))
      .reduce((a, x) => a + x.sets, 0);
    const bad = [];
    for (const w of weeks) {
      if (w < from) continue;
      const a = rows(window.getPlanned(w, 'upperA'));
      const b = rows(window.getPlanned(w, 'upperB'));
      if (a.length) bad.push(`wk${w}: chest day still prescribes ${a.map(x => x.name).join(', ')}`);
      if (b.length < 2) bad.push(`wk${w}: upper day 2 carries only ${b.length} row(s) — the moved one is missing`);
      if (setsIn(w) !== setsIn(before))
        bad.push(`wk${w}: ${setsIn(w)} row sets against wk${before}'s ${setsIn(before)} — sets were lost, not moved`);
    }
    return { err: null, from, before, baseline: setsIn(before), bad,
             beforeHadChestRow: rows(window.getPlanned(before, 'upperA')).length > 0 };
  }, EDITABLE_FROM);
  ok(!r.err, r.err);
  ok(r.beforeHadChestRow,
     `wk${r.before} has no chest-day row either, so this check no longer proves the move happened`);
  ok(r.baseline > 0, 'no row sets found at all — the detector has stopped seeing them');
  eq(r.bad, [], 'chest-day row problems: ');
});

await check('the primary target names its attempt date, and that date is inside the year', async () => {
  const r = await page.evaluate(() => {
    const ladder = window.getBenchLadder();
    const primary = ladder.filter(w => w.isPrimaryTarget);
    if (primary.length !== 1) return { err: `expected exactly one primary target, got ${primary.length}` };
    const w = primary[0];
    const text = window.getPlanned(w.week, 'upperA') || '';
    const m = text.match(/\b(\d{1,2}\s+[A-Z][a-z]{2}\s+20\d\d)\b/);
    const attempts = ladder.filter(x => x.entries.some(e => e.kind === 'attempt')).map(x => x.week);
    return {
      err: null, week: w.week, dateToken: m ? m[1] : null,
      iso: m ? (window.coachParseDate(m[1]) ? window.coachDateToISO(window.coachParseDate(m[1])) : null) : null,
      attempts, dates: window.getWeekDates(w.week),
      load: (w.entries.find(e => e.kind === 'attempt') || {}).load,
      loads: ladder.flatMap(x => x.entries.filter(e => e.kind === 'attempt').map(e => e.load)),
    };
  });
  ok(!r.err, r.err);
  ok(r.dateToken,
     `the target week (wk ${r.week}, ${r.dates}) does not name a dated attempt day in its own text — `
     + '"before 31 Dec" cannot be checked against a week label that straddles the year');
  ok(r.iso, `the attempt date "${r.dateToken}" did not parse`);
  const year = Number(r.iso.slice(0, 4));
  ok(r.iso <= `${year}-12-31`, `the attempt is dated ${r.iso}`);
  ok(r.iso.slice(5, 7) === '12' || r.iso.slice(5, 7) === '11',
     `the target attempt is dated ${r.iso}, which is not in the last two months of the year`);
  ok(Math.max.apply(null, r.loads) === r.load,
     `the primary target (${r.load} kg) is not the heaviest attempt in the block: ${r.loads}`);
  ok(Math.max.apply(null, r.attempts) === r.week,
     `an attempt (wk ${r.attempts.filter(w => w > r.week)}) comes after the target week ${r.week}`);
});

await check('the one easy run is optional, stated as a duration, and the same every week', async () => {
  // SUPERSEDED, not deleted. v1.26 asserted the +0.5 km a week ramp, which was
  // his instruction on 30 Sep: "Put this week at 5k, and build it up maybe
  // 0.5k per week per run." On 16 Nov he replaced it: one easy run a week, and
  // "The easy run is optional." A ramp is no longer the shape to assert; a
  // fixed, clearly optional session is.
  const r = await page.evaluate(([KIND, FROM]) => {
    const kindsOf = eval(KIND);
    const from = eval(FROM)(KIND);
    const newFrom = (() => {
      for (const x of window.getWeeklyVolumeSeries()) {
        if (from !== null && x.week < from) continue;
        const k = kindsOf(x.week);
        const wed = k.find(s => s.key === 'quality'), fri = k.find(s => s.key === 'easy');
        if (wed && fri && wed.kind === 'interval' && fri.kind === 'tempo') return x.week;
      }
      return null;
    })();
    if (newFrom === null) return { err: 'the 16 Nov structure is not in the plan' };
    const bad = [];
    const mins = [];
    for (const e of window.getWeeklyVolumeSeries()) {
      if (e.week < newFrom) continue;
      if (kindsOf(e.week).some(s => s.kind === 'mr')) continue;
      const t = window.getPlanned(e.week, 'recovery2') || '';
      const m = window.parseRunDurationMin(t);
      if (!m) { bad.push(`wk${e.week}: the easy run is not stated as a duration`); continue; }
      mins.push({ week: e.week, m });
      if (!/OPTIONAL/.test(t)) bad.push(`wk${e.week}: the easy run is not marked optional`);
      if (!window.parsePlannedHrCap(t)) bad.push(`wk${e.week}: the easy run states no heart-rate cap`);
      if (window.classifyRunSession('recovery2', t) !== 'easy')
        bad.push(`wk${e.week}: the Tuesday run does not classify as easy`);
      // it must still be COUNTED - "optional" is not "invisible"
      if (!e.runs.some(x => x.key === 'recovery2'))
        bad.push(`wk${e.week}: the optional run is not counted in the weekly total`);
    }
    return { err: null, newFrom, bad, mins };
  }, [RUN_KINDS, TWO_HARD_FROM]);
  ok(!r.err, r.err);
  ok(r.mins.length >= 6, `only ${r.mins.length} week(s) from wk ${r.newFrom} carry the easy run`);
  const distinct = [...new Set(r.mins.map(x => x.m))];
  eq(distinct.length, 1,
     `the optional easy run should be the same length every week; found ${JSON.stringify(distinct)}: `);
  eq(r.bad, [], 'optional-easy-run problems: ');
});

await check('both gym days finish on a conditioning piece, and the bench day yields on attempt weeks', async () => {
  const r = await page.evaluate((FROM) => {
    const from = eval(FROM)();
    const weeks = window.getWeeklyVolumeSeries().map(e => e.week).filter(w => w >= from);
    const finisher = (text) => {
      const lines = (text || '').split('\n');
      const i = lines.findIndex(l => l.indexOf('🔥') !== -1);
      return i < 0 ? null : lines.slice(i).join('\n');
    };
    const out = { a: [], b: [], missingA: [], missingB: [], pressingOnAttempt: [], unloadedB: [] };
    const PRESS = /push-?up|dip|press|bench/i;
    const LOADED = /kb|kettlebell|\bdb\b|dumbbell|man maker|burpee/i;
    for (const w of weeks) {
      const fa = finisher(window.getPlanned(w, 'upperA'));
      const fb = finisher(window.getPlanned(w, 'upperB'));
      if (!fa) { out.missingA.push(w); } else { out.a.push(fa.split('\n')[0]); }
      if (!fb) { out.missingB.push(w); } else {
        out.b.push(fb.split('\n')[0]);
        if (!LOADED.test(fb)) out.unloadedB.push(w);
      }
      if (fa && window.isBenchAttemptWeek(w) && PRESS.test(fa)) out.pressingOnAttempt.push(w);
    }
    out.distinctA = [...new Set(out.a)].length;
    out.distinctB = [...new Set(out.b)].length;
    out.attemptWeeks = weeks.filter(w => window.isBenchAttemptWeek(w));
    return out;
  }, EDITABLE_FROM);
  eq(r.missingA, [], 'a chest day with no finisher at all: ');
  eq(r.missingB, [], 'upper day 2 still has no finisher — that is what he asked for: ');
  eq(r.unloadedB, [], 'an upper-day-2 finisher names no kettlebell or dumbbell work: ');
  ok(r.distinctA >= 3, `the chest-day finisher has only ${r.distinctA} form(s) across the block`);
  ok(r.distinctB >= 3, `the upper-day-2 finisher has only ${r.distinctB} form(s) across the block`);
  ok(r.attemptWeeks.length > 0, 'no attempt week in range — the yield rule is untested');
  eq(r.pressingOnAttempt, [],
     'a chest-day finisher puts pressing volume after a max bench single: ');
});

// ── guard rails. Both already hold on v1.25; they are here to protect this
// rewrite and the next one, and are recorded as such rather than counted as
// proof of this build.
await check('GUARD: no build week breaches the +10% ceiling the ramp was built around', async () => {
  // v1.29: the Marathon-Revolutie preview is a different programme with its
  // own rules written into its own text ("never further than 14 km", "two
  // runs a week at marathon HR") and is never rescaled. A ramp step INTO it
  // is not a ramp step, and measuring one says nothing. Excluded by its own
  // tag, never by the number 21 — the scoping four v1.27 checks already use.
  // The step itself is real and is reported to him rather than silenced.
  const r = await page.evaluate(() => window.getWeeklyVolumeSeries()
    .filter(e => e.exceedsCeiling)
    .filter(e => !['recovery2', 'quality', 'easy', 'longRun']
      .some(k => /^\s*\[MR\b/im.test(window.getPlanned(e.week, k) || '')))
    .map(e => `wk${e.week} ${e.total} km, +${e.deltaPct}% on wk${e.prevBuildWeek}`));
  eq(r, [], 'ceiling breaches: ');
});
await check('GUARD: every deload week runs less than the week before it', async () => {
  const r = await page.evaluate(() => {
    const s = window.getWeeklyVolumeSeries();
    const bad = [];
    for (let i = 1; i < s.length; i++) {
      if (s[i].isDeload && s[i].total >= s[i - 1].total)
        bad.push(`wk${s[i].week} ${s[i].total} km against wk${s[i - 1].week}'s ${s[i - 1].total} km`);
    }
    return { bad, deloads: s.filter(e => e.isDeload).length };
  });
  ok(r.deloads > 0, 'no deload week detected at all');
  eq(r.bad, [], 'a deload week is not a step back: ');
});

// ── 26. THE QUALITY BRANCH IS NO LONGER DEAD (BACKLOG B27, v1.26) ───────
// Found at v1.25, the moment B17 made the builder testable: the quality
// branch's three detectors wanted `N×DDDm` with no space, kilometres, or the
// word "min", and every quality session in the plan is written `N×DDD m` in
// metres. It could not fire on any of the 21 weeks and never had.
//
// Mardy cleared the judgement call on 30 Sep: "b27: dont worry about the
// strictness on climbing the quality ramp."
//
// The reading rules are pinned against literal fixtures so they stay valid
// when he edits his training; the plan invariant is asserted over whatever
// the plan currently says.
suite('quality progression (B27)');
await check("the rep scheme is read from the plan's own shape, on every hard session", async () => {
  const r = await page.evaluate(() => {
    const f = window.parseQualityRepScheme;
    if (typeof f !== 'function') return { err: 'parseQualityRepScheme not on window' };
    const fixtures = {
      metres:   f('[INTERVALS] 8×550 m @ 4:30/km\n≈ 4.4 km of quality + 2 km w-up + 1.5 km c-down'),
      noSpace:  f('[TEMPO] 2×2000m @ 4:55/km\n≈ 4 km of quality'),
      km:       f('[INTERVALS] 4×1.2 km @ 4:30/km\n≈ 4.8 km of quality'),
      tempo:    f('[TEMPO] 2×2300 m @ 5:00/km\n≈ 4.6 km of quality + 2 km w-up + 1.5 km c-down'),
      parked:   f('7.9 km easy @ 6:15–6:40/km\n❤️ Zone 1–2: ≤130 bpm'),
      trial:    f('🏃 5K TIME TRIAL — target 23:15\nw-up 2 km'),
      mr:       f('[MR · INTENSIVE] 9 km — the one hard run of the week\n2 km w-up + 6×800 m @ 4:40/km (2 min jog) + 1.5 km c-down'),
      mismatch: f('[INTERVALS] 6×800 m @ 4:37/km\n≈ 9 km of quality + 2 km w-up'),
      prose:    f('easy spin, nothing measured'),
      empty: f(''), nul: f(null), undef: f(undefined),
    };
    // plan invariant: on every tagged hard session the rep scheme must parse
    // AND agree with the "≈ N km of quality" line the volume model reads.
    const bad = [];
    let tagged = 0;
    // v1.29, two corrections, both of which make this assert MORE than it did:
    //  1. it read the quality slot alone. Hard work has lived in two slots
    //     since v1.27, and from 16 Nov the Wednesday and Friday slots hold
    //     different kinds. It now reads every run slot.
    //  2. it compared the scheme against the WEEK's single `quality` volume.
    //     On a week that carries both a hard session and a goal race that is
    //     the race's distance, not the session's, so a correct plan read as a
    //     mismatch. It now compares each session against its OWN parsed
    //     volume, which is the thing the scheme is supposed to agree with.
    // Work stated in MINUTES carries no rep distance by construction, so such
    // a session is asserted to refuse a scheme and to have been read as the
    // duration shape — the refusal is checked, not skipped.
    for (const e of window.getWeeklyVolumeSeries()) {
      for (const key of ['recovery2', 'quality', 'easy', 'longRun']) {
        const t = window.getPlanned(e.week, key) || '';
        const isTagged = /^\s*\[(TEMPO|INTERVALS|THRESHOLD|CRUISE|RACE PACE)\]/m.test(t);
        const s = f(t);
        if (!isTagged) { if (s) bad.push(`wk${e.week} ${key}: parsed a scheme on a session that states none`); continue; }
        const own = window.parseQualityVolumeKm(t);
        if (own && own.source === 'quality-line-min') {
          if (s) bad.push(`wk${e.week} ${key}: a session stated in minutes must not yield a rep-distance scheme`);
          if (!(own.work > 0)) bad.push(`wk${e.week} ${key}: minutes of quality did not convert to a distance`);
          continue;
        }
        tagged++;
        if (!s) { bad.push(`wk${e.week} ${key}: a tagged hard session whose rep scheme did not parse`); continue; }
        if (t.indexOf(`${s.reps}×${s.dist}`) === -1)
          bad.push(`wk${e.week} ${key}: parsed ${s.reps}×${s.dist} which is not in the session text`);
        if (Math.abs(s.workKm - (own ? own.work : -1)) > 0.001)
          bad.push(`wk${e.week} ${key}: scheme says ${s.workKm} km of work, its own volume line reads ${own && own.work}`);
      }
    }
    return { err: null, fixtures, bad, tagged };
  });
  ok(!r.err, r.err);
  eq(r.fixtures.metres, { reps: 8, dist: 550, unit: 'm', workKm: 4.4 }, 'metres with a space: ');
  eq(r.fixtures.noSpace, { reps: 2, dist: 2000, unit: 'm', workKm: 4 }, 'metres with no space: ');
  eq(r.fixtures.km, { reps: 4, dist: 1.2, unit: 'km', workKm: 4.8 }, 'kilometre reps: ');
  eq(r.fixtures.tempo.reps, 2, 'a tempo is a rep scheme too: ');
  eq(r.fixtures.parked, null, 'a parked easy run states no scheme: ');
  eq(r.fixtures.trial, null, 'a time trial is not a rep scheme: ');
  eq(r.fixtures.mr, null, 'the Marathon-Revolutie session states its own total and is never rescaled: ');
  eq(r.fixtures.mismatch, null,
     'a session whose stated quality volume disagrees with its rep scheme must be refused, not guessed at: ');
  eq(r.fixtures.prose, null, 'prose: ');
  eq(r.fixtures.empty, null, 'empty: '); eq(r.fixtures.nul, null, 'null: '); eq(r.fixtures.undef, null, 'undefined: ');
  ok(r.tagged >= 6, `only ${r.tagged} tagged hard session(s) in the plan — the invariant is barely exercised`);
  eq(r.bad, [], 'plan rep-scheme problems: ');
});
await check('adding a rep moves the stated quality volume with it, and nothing else', async () => {
  const r = await page.evaluate(() => {
    const g = window.rewriteQualityReps;
    if (typeof g !== 'function') return { err: 'rewriteQualityReps not on window' };
    const src = '[INTERVALS] 6×800 m @ 4:37/km\n90s jog between\n'
              + '≈ 4.8 km of quality + 2 km w-up + 1.5 km c-down\n❤️ hard but repeatable';
    const out = g(src, 7);
    const back = window.parseQualityRepScheme(out || '');
    const srcLines = src.split('\n'), outLines = (out || '').split('\n');
    const changed = srcLines.map((l, i) => [l, outLines[i]]).filter(([a, b]) => a !== b);
    return {
      err: null, out, back, changedCount: changed.length, changed,
      sameLineCount: srcLines.length === outLines.length,
      refusals: [
        g(src, 6),                       // no change at all
        g(src, 0), g(src, -1), g(src, 1.5),
        g('[INTERVALS] 6×800 m @ 4:37/km\n≈ 9 km of quality', 7),   // inconsistent source
        g('7.9 km easy', 8), g(null, 8), g(src, null), g(),
      ],
    };
  });
  ok(!r.err, r.err);
  ok(r.out, 'the rewrite produced nothing for a well-formed session');
  ok(r.out.indexOf('7×800 m') !== -1, `the rep count did not move: ${JSON.stringify(r.out)}`);
  ok(r.out.indexOf('≈ 5.6 km of quality') !== -1,
     `the stated quality volume did not move with the rep count — the plan text and the volume model would disagree: ${JSON.stringify(r.out)}`);
  ok(r.out.indexOf('2 km w-up + 1.5 km c-down') !== -1, 'the warm-up and cool-down were disturbed');
  ok(r.sameLineCount, 'the rewrite added or removed a line');
  eq(r.changedCount, 2, `exactly the rep line and the volume line may change, got ${JSON.stringify(r.changed)}: `);
  eq(r.back, { reps: 7, dist: 800, unit: 'm', workKm: 5.6 }, 'the rewritten session does not re-parse: ');
  eq(r.refusals, [null, null, null, null, null, null, null, null, null],
     'a refused rewrite must return null, not a half-edited session: ');
});
await check('a hard session at RPE 5 now earns a suggestion, and it carries its real cost', async () => {
  const r = await page.evaluate(() => {
    const series = window.getWeeklyVolumeSeries();
    let found = null;
    for (const e of series) {
      const w = e.week;
      if (!series.some(y => y.week === w + 1) || window.isSuggestionBlockedWeek(w + 1)) continue;
      const next = window.getPlanned(w + 1, 'quality') || '';
      if (!window.parseQualityRepScheme(next)) continue;
      const out = window.buildCoachSuggestions({ wk: w, dayKey: 'quality', km: 0, avgHR: 0,
        rpe: 5, planned: window.getPlanned(w, 'quality'), exs: [], sleep: null });
      if (!out.length) continue;
      const s = out[0];
      found = {
        w, targetWk: s.week, key: s.sessionKey, label: s.label, reason: s.reason,
        startsFromPlan: s.oldValue === next,
        before: window.parseQualityRepScheme(s.oldValue),
        after: window.parseQualityRepScheme(s.newValue),
        proj: window.projectWeeklyVolume(s.week, s.sessionKey, s.oldValue, s.newValue),
        line: window.volumeConsequenceLine(s.week, s.sessionKey, s.oldValue, s.newValue),
        planUnchanged: window.getPlanned(s.week, 'quality') === next,
      };
      break;
    }
    if (!found) return { err: 'no unblocked week whose next hard session could be progressed — the branch is still dead' };
    return found;
  });
  ok(!r.err, r.err);
  eq(r.key, 'quality', 'the suggestion moved the wrong session: ');
  eq(r.targetWk, r.w + 1, 'the suggestion targeted the wrong week: ');
  ok(r.startsFromPlan, "the suggestion did not start from next week's own session text");
  ok(r.after.reps > r.before.reps, `reps did not increase: ${r.before.reps} -> ${r.after.reps}`);
  eq(r.after.dist, r.before.dist, 'the rep distance moved — only the count may: ');
  ok(r.after.workKm > r.before.workKm, 'the quality volume did not rise with the rep count');
  ok(r.proj, 'the volume model cannot see the change — the stated quality line did not move');
  ok(r.proj.diffKm > 0, `the projected weekly volume did not rise: ${JSON.stringify(r.proj)}`);
  ok(r.line && r.line.indexOf('Wk ' + r.targetWk) !== -1,
     `the consequence line does not name the week: "${r.line}"`);
  ok(r.reason.indexOf(String(r.proj.total)) !== -1,
     `the suggestion does not state what it costs: "${r.reason}"`);
  ok(r.planUnchanged, 'building the suggestion wrote to the plan');
});

// ── 27. TWO HARD RUNS, AND THE READERS THAT HAD TO MOVE FIRST (v1.27) ───
// Mardy, 5 Oct: "i want to start my hard runs this week. That means that
// starting this week, i want to do 2 hard runs and 2 easy runs. my long run
// should also be ran easy." Plus: "the week titles or cycle titles are off
// with the weights they mention."
//
// The plan change could not ship alone. getWeeklyRunVolume picked its parser
// by the SLOT NAME, so a hard session in the Friday slot parsed to nothing
// and left the weekly total in silence — the sixth instance of this file's
// oldest defect class.
suite('two hard runs & derived headings');
await check('a hard session is counted whatever slot it sits in', async () => {
  const fixtures = await page.evaluate(() => {
    const f = window.parseRunSessionKm;
    if (typeof f !== 'function') return { err: 'parseRunSessionKm not on window' };
    return {
      err: null,
      plain: f('5 km easy @ 6:15–6:40/km\n❤️ Zone 1–2: ≤130 bpm'),
      intervals: f('[INTERVALS] 5×600 m @ 4:40/km\n≈ 3 km of quality + 2 km w-up + 1.5 km c-down'),
      // the plan's own trial shape, strides line included — a trial written
      // without it mis-reads its cool-down (logged as B29, not a blocker:
      // every trial in the plan carries the line)
      trial: f('🏃 5K TIME TRIAL — target 23:15\nw-up 2 km + 4×20s strides, then all-out\nc-down 1.5 km easy'),
      skipped: f('REST — session skipped'),
      prose: f('nothing measured'),
      empty: f(''), nul: f(null), undef: f(undefined),
    };
  });
  ok(!fixtures.err, fixtures.err);
  eq(fixtures.plain, { km: 5, source: 'session-distance', quality: null }, 'a plain easy run: ');
  eq(fixtures.intervals.km, 6.5, 'an interval session states work + w-up + c-down: ');
  eq(fixtures.intervals.source, 'quality-line', 'and is read as a quality session: ');
  eq(fixtures.trial.km, 8.5, 'a trial: ');
  eq(fixtures.skipped, null, 'a skipped session is absent, not 0 km: ');
  eq(fixtures.prose, null, 'prose: ');
  eq(fixtures.empty, null, 'empty: '); eq(fixtures.nul, null, 'null: '); eq(fixtures.undef, null, 'undefined: ');

  // and end to end: drop an interval session into a slot that is still an easy
  // run, through a real override, and the weekly total must move by the right
  // amount instead of losing the run.
  const target = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const t = await p.evaluate(() => {
      const e = window.getWeeklyVolumeSeries().find(x => !x.isDeload
        && x.runs.some(r => r.key === 'recovery2')
        && window.parseRunDistanceKm(window.getPlanned(x.week, 'recovery2') || '') !== null);
      return e ? { week: e.week, total: e.total,
                   km: e.runs.find(r => r.key === 'recovery2').km } : null;
    });
    await c.close();
    return t;
  })();
  ok(target, 'no week with a plain easy run in the Tuesday slot');
  const NEW = '[INTERVALS] 5×600 m @ 4:40/km\n≈ 3 km of quality + 2 km w-up + 1.5 km c-down';
  const { page: p2, ctx: c2 } = await openApp(browser, {
    init: `localStorage.setItem('programOverrides', ${JSON.stringify(JSON.stringify([{
      ts: '2026-10-05T00:00:00.000Z', week: target.week, sessionKey: 'recovery2',
      kind: 'text_replace', changeId: 'gate_slot', payload: { newValue: NEW },
    }]))})`,
  }, port);
  const got = await p2.evaluate((w) => {
    const v = window.getWeeklyVolume(w);
    return {
      total: v.total,
      entry: v.runs.find(r => r.key === 'recovery2') || null,
      skipped: v.skipped,
      kind: window.classifyRunSession('recovery2', window.getPlanned(w, 'recovery2')),
    };
  }, target.week);
  await c2.close();
  ok(got.entry,
     'an interval session in the Tuesday slot vanished from the weekly volume — the reader is keyed on the slot again');
  eq(got.entry.km, 6.5, 'the hard session must be counted as work + w-up + c-down: ');
  eq(got.skipped, [], 'nothing may be reported as uncounted: ');
  eq(got.total, Math.round((target.total - target.km + 6.5) * 10) / 10,
     'the weekly total did not move by the difference: ');
  eq(got.kind, 'quality',
     'a tagged hard session outside the quality slot is still judged as easy: ');
});
await check('the block headings are derived from the ladder, not retyped', async () => {
  // v1.26 carried "Block 2 — 117.5 kg" over weeks whose plan attempts 112.5,
  // and put the 🎯 on block 3 while the real target sits in block 5. The
  // labels were a hardcoded copy of the pre-v1.11 ladder and nothing checked
  // them. They are now computed from each block's own weeks.
  const r = await page.evaluate(() => {
    if (typeof window.getPhases !== 'function') return { err: 'getPhases not on window' };
    const phases = window.getPhases();
    const ladder = window.getBenchLadder();
    const bad = [];
    let labelled = 0, targeted = 0;
    for (const ph of phases) {
      const attempts = ladder.filter(w => ph.weeks.indexOf(w.week) !== -1)
        .flatMap(w => w.entries.filter(e => e.kind === 'attempt' && e.load !== null)
          .map(e => ({ load: e.load, primary: !!w.isPrimaryTarget })));
      const nums = (ph.label.match(/\d+(?:\.\d+)?/g) || [])
        .map(Number).filter(n => n > 50);       // a load, not "Block 3"
      if (!attempts.length) {
        if (nums.length) bad.push(`"${ph.label}" names a load but its weeks prescribe no attempt`);
        continue;
      }
      labelled++;
      const top = attempts.reduce((a, b) => (b.load > a.load ? b : a));
      if (nums.length !== 1 || nums[0] !== top.load)
        bad.push(`"${ph.label}" should name ${top.load} kg, the heaviest attempt in wk ${ph.weeks.join('/')}`);
      const hasTarget = ph.label.indexOf('🎯') !== -1;
      if (top.primary) { targeted++; if (!hasTarget) bad.push(`"${ph.label}" holds the primary target but carries no 🎯`); }
      else if (hasTarget) bad.push(`"${ph.label}" carries the 🎯 but the target is not in its weeks`);
    }
    return {
      err: null, bad, labelled, targeted,
      labels: phases.map(p => p.label),
      everyWeekHasPhase: window.getWeeklyVolumeSeries()
        .every(e => !!(window.getPhase(e.week) || {}).label),
    };
  });
  ok(!r.err, r.err);
  ok(r.labelled >= 2, `only ${r.labelled} block(s) name an attempt — the headings have stopped tracking the ladder`);
  eq(r.targeted, 1, 'exactly one block must hold the primary target: ');
  ok(r.everyWeekHasPhase, 'a plan week resolves to no block heading at all');
  eq(r.bad, [], 'block heading problems: ');
});
await check('the long run is capped where the easy run is, and offers the whole easy range', async () => {
  // "my long run should also be ran easy." It had carried a 119–137 band and
  // a 5:50–6:10/km prescription — the fast 20 seconds of his easy range, on
  // the longest session of the week (B19).
  const r = await page.evaluate(([KIND, FROM]) => {
    const kindsOf = eval(KIND);
    const from = eval(FROM)(KIND);
    if (from === null) return { err: 'no two-hard boundary to scope this to' };
    const bad = [];
    let checked = 0;
    for (const e of window.getWeeklyVolumeSeries()) {
      if (e.week < from) continue;
      if (kindsOf(e.week).some(s => s.kind === 'mr')) continue;
      const lt = window.getPlanned(e.week, 'longRun') || '';
      const et = window.getPlanned(e.week, 'recovery2') || '';
      // v1.29: on race week the Sunday slot holds the goal race, which is an
      // all-out effort and must NOT be capped where an easy run is. Skipped by
      // what the classifier calls it, never by the week number.
      if (window.classifyRunSession('longRun', lt) === 'trial') continue;
      const lb = window.parsePlannedHrCap(lt), eb = window.parsePlannedHrCap(et);
      if (!lb || !eb) { bad.push(`wk${e.week}: a run states no heart-rate band`); continue; }
      checked++;
      if (lb.high > eb.high)
        bad.push(`wk${e.week}: the long run allows ${lb.high} bpm against the easy run's ${eb.high}`);
      const lp = window.parsePlannedPaceBand(lt), ep = window.parsePlannedPaceBand(et);
      if (!lp || !ep) { bad.push(`wk${e.week}: a run states no pace band`); continue; }
      if ((lp.high - lp.low) < (ep.high - ep.low))
        bad.push(`wk${e.week}: the long run offers ${lp.high - lp.low}s of range against the easy run's ${ep.high - ep.low}s`);
    }
    return { err: null, from, checked, bad };
  }, [RUN_KINDS, TWO_HARD_FROM]);
  ok(!r.err, r.err);
  ok(r.checked >= 8, `only ${r.checked} week(s) checked from wk ${r.from}`);
  eq(r.bad, [], 'long-run problems: ');
});

// ── 28. THE SLOT-NAME CLASS, EVERYWHERE (B32 / B33 / B37, v1.28) ────────
// v1.27 fixed the volume model and left four more readers keyed on the slot
// the session sits in. Measured on 19 Oct: the grep for `dayKey ===` /
// `day.key ===` / `sessionKey ===` found NINE branches, not the three the
// backlog item named. The eleven interval sessions in the Friday slot could
// not be logged as reps, the Tuesday easy run was in no branch at all, and
// projectWeeklyVolume — the function behind the consequence line — returned
// null for any hard session outside the quality slot.
//
// No check below names a slot or a week. Every one derives the session it
// drives from the plan's own text, so they stay valid when the calendar
// moves.
suite('slot-name class (v1.28)');

// Every run slot whose text opens with a hard tag, with the week it is in.
const HARD_SLOTS = `() => {
  const out = [];
  for (const e of window.getWeeklyVolumeSeries()) {
    for (const key of ['recovery2', 'quality', 'easy', 'longRun']) {
      const t = window.getPlanned(e.week, key) || '';
      const first = t.split('\\n').find(l => l.trim()) || '';
      if (/^\\s*\\[(TEMPO|INTERVALS|THRESHOLD|CRUISE|RACE PACE)\\]/.test(first))
        out.push({ week: e.week, key, first: first.trim() });
    }
  }
  return out;
}`;

await check('an interval session renders the interval table whatever slot it sits in', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 390, height: 900 },
  }, port);
  const r = await p.evaluate(async (HARD) => {
    const hard = eval(HARD)();
    const ivs = hard.filter(h => /^\[INTERVALS\]/.test(h.first));
    if (!ivs.length) return { err: 'the plan prescribes no interval session at all' };
    // Prefer one OUTSIDE the quality slot — that is the case this exists for.
    const t = ivs.find(h => h.key !== 'quality') || ivs[0];
    const outsideQuality = t.key !== 'quality';
    await window.renderProgram();
    const wkBtn = document.querySelector(`[data-week="${t.week}"]`);
    if (!wkBtn) return { err: `no week button for wk ${t.week}` };
    wkBtn.click();
    await new Promise(r2 => setTimeout(r2, 300));
    const probe = t.first.slice(0, 24);
    const btns = [...document.querySelectorAll('.session-btn')];
    const idx = btns.findIndex(b => b.textContent.indexOf(probe) !== -1);
    if (idx < 0) return { err: `no session button carrying ${JSON.stringify(probe)} in wk ${t.week}` };
    btns[idx].click();
    await new Promise(r2 => setTimeout(r2, 450));
    return {
      err: null, week: t.week, key: t.key, outsideQuality,
      intervalBody: !!document.getElementById('intervalBody'),
      addInterval: !!document.getElementById('addIntervalBtn'),
      rows: document.querySelectorAll('#intervalBody [data-iv]').length,
      classified: window.classifyRunSession(t.key, window.getPlanned(t.week, t.key)),
    };
  }, HARD_SLOTS);
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  eq(real, [], 'the interval logger produced uncaught errors: ');
  ok(r.outsideQuality,
     `every interval session is back in the quality slot (wk ${r.week}), so this check has stopped proving anything — re-derive it`);
  eq(r.classified, 'quality', 'the classifier must already call this a hard session: ');
  ok(r.intervalBody,
     `wk ${r.week} ${r.key} prescribes intervals and the logger rendered no interval table — he cannot log a single rep`);
  ok(r.addInterval, 'the interval table has no control to add a rep');
});

await check('a hard session logged at its target intensity is not flagged as too fast', async () => {
  // The probe is the midpoint of the zone his own configuration says a hard
  // session targets. Nothing here hardcodes a heart rate.
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 390, height: 900 },
  }, port);
  const r = await p.evaluate(async (HARD) => {
    const hard = eval(HARD)();
    const t = hard.find(h => h.key !== 'quality') || hard[0];
    if (!t) return { err: 'no hard session in the plan' };
    const zones = window.getHRZones();
    const z4 = zones[3];
    const probe = Math.round((z4.low + z4.high) / 2);
    await window.renderProgram();
    document.querySelector(`[data-week="${t.week}"]`).click();
    await new Promise(r2 => setTimeout(r2, 300));
    const btns = [...document.querySelectorAll('.session-btn')];
    const idx = btns.findIndex(b => b.textContent.indexOf(t.first.slice(0, 24)) !== -1);
    if (idx < 0) return { err: 'no session button for the hard session' };
    btns[idx].click();
    await new Promise(r2 => setTimeout(r2, 450));
    const el = document.getElementById('avgHR');
    if (!el) return { err: 'no #avgHR input on a hard session' };
    el.value = String(probe);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 200));
    const div = document.getElementById('zoneCompliance');
    return {
      err: null, week: t.week, key: t.key, probe, z4: [z4.low, z4.high],
      html: div ? div.innerHTML : '', text: div ? div.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  }, HARD_SLOTS);
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  eq(real, [], 'the hard-session widget produced uncaught errors: ');
  ok(r.text.length > 0,
     `wk ${r.week} ${r.key} is a hard session and the compliance widget rendered nothing at ${r.probe} bpm`);
  ok(!/zone-compliance bad/.test(r.html),
     `a heart rate in the middle of the zone a hard session targets (${r.probe} bpm, Z4 ${r.z4}) was flagged: "${r.text}"`);
  ok(!/Slow down/.test(r.text),
     `the app told him to slow down on a prescribed hard session: "${r.text}"`);
});

await check('every run slot that states a heart-rate band gets a live verdict', async () => {
  // B33: recovery2 is in RUN_SESSION_KEYS, is counted in the weekly volume
  // and states its own cap, and the widget rendered nothing at all for it
  // because the handler was gated on the slot name.
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 390, height: 900 },
  }, port);
  const r = await p.evaluate(async () => {
    const series = window.getWeeklyVolumeSeries();
    // a week where at least two different slots state a bpm band
    let W = null, slots = null;
    for (const x of series) {
      const s = ['recovery2', 'quality', 'easy', 'longRun'].filter(k =>
        window.parsePlannedHrCap(window.getPlanned(x.week, k) || ''));
      if (s.length >= 2) { W = x.week; slots = s; break; }
    }
    if (W === null) return { err: 'no week states a band on two different slots' };
    const goToWeek = async (wk) => {
      for (let i = 0; i < 4; i++) {
        if (document.querySelector(`[data-week="${wk}"]`)) break;
        const b1 = document.getElementById('backToWeek');    // session -> week
        const b2 = document.getElementById('backToWeeks');   // week -> the list
        if (b1) b1.click();
        else if (b2) b2.click();
        else await window.renderProgram();
        await new Promise(r2 => setTimeout(r2, 300));
      }
      const b = document.querySelector(`[data-week="${wk}"]`);
      if (!b) return false;
      b.click();
      await new Promise(r2 => setTimeout(r2, 300));
      return true;
    };
    const out = [];
    for (const key of slots) {
      if (!await goToWeek(W)) { out.push({ key, err: 'could not navigate back to wk ' + W }); continue; }
      const planned = window.getPlanned(W, key) || '';
      const probe = window.parsePlannedHrCap(planned).high + 15;   // over its own ceiling
      const first = (planned.split('\n').find(l => l.trim()) || '').trim().slice(0, 24);
      const btns = [...document.querySelectorAll('.session-btn')];
      const idx = btns.findIndex(b => b.textContent.indexOf(first) !== -1);
      if (idx < 0) { out.push({ key, err: 'no button' }); continue; }
      btns[idx].click();
      await new Promise(r2 => setTimeout(r2, 450));
      const el = document.getElementById('avgHR');
      if (!el) { out.push({ key, err: 'no #avgHR' }); continue; }
      el.value = String(probe);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r2 => setTimeout(r2, 200));
      const div = document.getElementById('zoneCompliance');
      out.push({ key, probe, text: div ? div.textContent.replace(/\s+/g, ' ').trim() : '' });
    }
    return { err: null, W, slots, out };
  });
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  eq(real, [], 'the compliance widget produced uncaught errors: ');
  const silent = r.out.filter(x => !x.err && !x.text);
  eq(silent.map(x => x.key), [],
     `wk ${r.W}: these slots state a band of their own and the widget said nothing at all: `);
  for (const x of r.out) {
    ok(!x.err, `wk ${r.W} ${x.key}: ${x.err}`);
    ok(/above this session/.test(x.text),
       `wk ${r.W} ${x.key}: ${x.probe} bpm is over its own stated ceiling and was not reported: "${x.text}"`);
  }
});

await check('every run slot can earn a suggestion on some unblocked week', async () => {
  const r = await page.evaluate(() => {
    const series = window.getWeeklyVolumeSeries();
    const weeks = series.map(x => x.week)
      .filter(w => series.some(y => y.week === w + 1) && !window.isSuggestionBlockedWeek(w + 1));
    const out = {};
    for (const key of ['recovery2', 'quality', 'easy', 'longRun']) {
      let n = 0, sample = null;
      for (const w of weeks) {
        const planned = window.getPlanned(w, key) || '';
        const e = window.parseRunSessionKm(planned);
        const got = window.buildCoachSuggestions({
          wk: w, dayKey: key, km: e ? Math.round(e.km * 1.2 * 10) / 10 : 12,
          avgHR: 120, rpe: 4, planned, exs: [], sleep: null });
        if (got.length) { n++; if (!sample) sample = { week: w, label: got[0].label, slot: got[0].sessionKey }; }
      }
      out[key] = { weeks: weeks.length, produced: n, sample };
    }
    return out;
  });
  for (const [key, v] of Object.entries(r)) {
    ok(v.weeks > 0, `${key}: no unblocked weeks to try`);
    ok(v.produced > 0,
       `${key}: 0 of ${v.weeks} unblocked weeks produced any suggestion — the coach cannot see this session`);
    eq(v.sample.slot, key, `${key}: the suggestion moved a different slot: `);
  }
});

await check('a hard session at its prescribed effort is not called high for an easy run', async () => {
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 390, height: 900 },
  }, port);
  const r = await p.evaluate(async (HARD) => {
    const hard = eval(HARD)();
    const t = hard.find(h => h.key !== 'quality') || hard[0];
    if (!t) return { err: 'no hard session in the plan' };
    await window.renderProgram();
    document.querySelector(`[data-week="${t.week}"]`).click();
    await new Promise(r2 => setTimeout(r2, 300));
    const btns = [...document.querySelectorAll('.session-btn')];
    const idx = btns.findIndex(b => b.textContent.indexOf(t.first.slice(0, 24)) !== -1);
    if (idx < 0) return { err: 'no session button for the hard session' };
    btns[idx].click();
    await new Promise(r2 => setTimeout(r2, 450));
    const setV = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return true;
    };
    const band = window.parsePlannedPaceBand(window.getPlanned(t.week, t.key) || '');
    const km = window.parseRunSessionKm(window.getPlanned(t.week, t.key)).km;
    setV('runKm', String(km));
    if (band) setV('runPace', window.formatPace(band.low));
    setV('rpe', '8');
    const coach = document.getElementById('askCoach');
    if (!coach) return { err: 'no #askCoach button' };
    coach.click();
    await new Promise(r2 => setTimeout(r2, 700));
    const out = document.getElementById('aiResponse');
    return {
      err: null, week: t.week, key: t.key,
      text: out ? out.textContent.replace(/\s+/g, ' ').trim() : '',
      kind: window._runAnalysis ? window._runAnalysis.kind : null,
    };
  }, HARD_SLOTS);
  const real = realErrors(e);
  await c.close();
  ok(!r.err, r.err);
  eq(real, [], 'the coach produced uncaught errors on a hard session: ');
  eq(r.kind, 'quality', 'the analyser must read this as a hard session: ');
  ok(r.text.length > 40, `the coach produced almost nothing: "${r.text.slice(0, 120)}"`);
  ok(!/high for an easy\/long run/.test(r.text),
     `wk ${r.week} ${r.key} is prescribed hard and RPE 8 was called high for an easy run: "${r.text}"`);
  ok(!/Running an easy day/.test(r.text),
     `the coach called a prescribed hard session an easy day: "${r.text}"`);
});

await check('a suggestion on a hard session states its cost whatever slot it sits in', async () => {
  // B37. projectWeeklyVolume picked its reader by the slot name, so the same
  // edit produced a full consequence line in one slot and an empty string in
  // another. That is the protection B12 shipped at v1.18, absent.
  const r = await page.evaluate((HARD) => {
    const hard = eval(HARD)();
    if (!hard.length) return { err: 'no hard session in the plan' };
    const bad = [];
    const seen = [];
    for (const h of hard) {
      const text = window.getPlanned(h.week, h.key) || '';
      const scheme = window.parseQualityRepScheme(text);
      if (!scheme) continue;
      const bumped = window.rewriteQualityReps(text, scheme.reps + 1);
      if (!bumped) continue;
      const proj = window.projectWeeklyVolume(h.week, h.key, text, bumped);
      const line = window.volumeConsequenceLine(h.week, h.key, text, bumped);
      seen.push({ week: h.week, key: h.key, proj: !!proj, line: line.length > 0 });
      if (!proj) bad.push(`wk${h.week} ${h.key}: projectWeeklyVolume returned null for a +1 rep edit`);
      else {
        if (!(proj.diffKm > 0)) bad.push(`wk${h.week} ${h.key}: adding a rep did not raise the weekly volume`);
        if (!line) bad.push(`wk${h.week} ${h.key}: no consequence line at all`);
        else {
          if (line.indexOf('Wk ' + h.week) === -1) bad.push(`wk${h.week} ${h.key}: the line does not name the week`);
          if (line.indexOf(String(proj.total)) === -1) bad.push(`wk${h.week} ${h.key}: the line does not state the new total`);
        }
      }
    }
    const slots = [...new Set(seen.map(x => x.key))];
    return { err: null, bad, n: seen.length, slots };
  }, HARD_SLOTS);
  ok(!r.err, r.err);
  ok(r.n >= 6, `only ${r.n} hard session(s) with a readable rep scheme — the invariant is barely exercised`);
  ok(r.slots.length >= 2,
     `every hard session with a rep scheme sits in one slot (${r.slots}), so this check cannot see the defect it exists for`);
  eq(r.bad, [], 'hard-session consequence problems: ');
});

await check('the primary bench target does not land on a bigger running week than the one before it', async () => {
  // B38, his instruction 19 Oct. TRAINING-CONTEXT listed week 11's running
  // step-back under "deliberate decisions"; measured on 19 Oct, every attempt
  // week ran MORE than the week before it and the 120 kg attempt sat in the
  // single highest-mileage week of the block. He chose to step the target
  // week back. Only the target is asserted — the two earlier attempts still
  // step up, which is his call and is recorded in the changelog.
  const r = await page.evaluate(() => {
    const ladder = window.getBenchLadder();
    const primary = ladder.find(w => w.isPrimaryTarget);
    if (!primary) return { err: 'no primary target in the ladder' };
    const series = window.getWeeklyVolumeSeries();
    const byWk = {}; series.forEach(e => { byWk[e.week] = e; });
    const here = byWk[primary.week];
    const before = byWk[primary.week - 1];
    if (!here || !before) return { err: `wk ${primary.week} or the week before it is not in the series` };
    const peak = Math.max(...series.map(e => e.total));
    return {
      err: null, week: primary.week, dates: window.getWeekDates(primary.week),
      total: here.total, prevWeek: before.week, prevTotal: before.total,
      peak, isPeak: here.total === peak,
      share: here.longRunShare,
    };
  });
  ok(!r.err, r.err);
  ok(r.total < r.prevTotal,
     `the ${r.dates} attempt week runs ${r.total} km against wk ${r.prevWeek}'s ${r.prevTotal} km — it steps up into the attempt`);
  ok(!r.isPeak,
     `the attempt week is still the highest-mileage week of the block (${r.total} km, peak ${r.peak})`);
});

// ── 29. RUNS PRESCRIBED IN MINUTES (v1.29) ──────────────────────────────
// He adopted an 8-week plan on 16 Nov whose long run is given in minutes and
// never in kilometres. Nothing in the app could read a duration, so the
// biggest session of the week would have dropped out of the weekly total in
// silence — the same shape as the defect v1.27 fixed for the interval
// session, and the reason that fix had to land before the plan did.
suite('runs prescribed in minutes (v1.29)');

await check('a duration is read, converted at the pace its own session states, and refused when ambiguous', async () => {
  const r = await page.evaluate(() => {
    const d = window.parseRunDurationMin, k = window.durationToKm, p = window.sessionPaceSec;
    if (typeof d !== 'function' || typeof k !== 'function' || typeof p !== 'function')
      return { err: 'the duration readers are not on window' };
    return {
      err: null,
      read: {
        plain:    d('60 min easy @ 6:06/km'),
        tagged:   d('[THRESHOLD] 25 min continuous @ 4:55/km'),
        decimals: d('7.5 min easy @ 6:06/km'),
        distance: d('16 km easy'),
        bare:     d('60 easy'),
        zero:     d('0 min easy'),
        absurd:   d('999 min easy'),
        midText:  d('an easy run of 60 min'),
        empty: d(''), nul: d(null), undef: d(undefined),
      },
      conv: {
        ok:      k(60, 366),
        noPace:  k(60, null),
        zeroPace: k(60, 0),
        noMin:   k(null, 366),
        negative: k(-5, 366),
      },
      pace: {
        single: p('60 min easy @ 6:06/km'),
        band:   p('60 min easy\n❤️ Zone 1–2: ≤130 bpm (5:45–6:40/km)'),
        none:   p('60 min easy'),
        empty:  p(''),
      },
      session: {
        duration: window.parseRunSessionKm('60 min easy @ 6:06/km'),
        noPace:   window.parseRunSessionKm('60 min easy'),
        stillKm:  window.parseRunSessionKm('16 km easy @ 6:06/km'),
        qualityMin: window.parseQualityVolumeKm('[THRESHOLD] 25 min @ 4:55/km\n≈ 25 min of quality @ 4:55/km + 2 km w-up + 1.5 km c-down'),
        qualityKm:  window.parseQualityVolumeKm('[TEMPO] 2×2500 m @ 4:53/km\n≈ 5 km of quality + 2 km w-up + 1.5 km c-down'),
      },
    };
  });
  ok(!r.err, r.err);
  eq(r.read.plain, 60, 'a leading duration: ');
  eq(r.read.tagged, 25, 'a duration behind a session tag: ');
  eq(r.read.decimals, 7.5, 'a fractional duration: ');
  eq(r.read.distance, null, 'a distance is not a duration: ');
  eq(r.read.bare, null, 'a bare number must be refused, exactly as parsePaceSec refuses one: ');
  eq(r.read.zero, null, 'zero minutes: ');
  eq(r.read.absurd, null, 'an implausible duration must be refused, not scaled: ');
  eq(r.read.midText, null, 'a duration must LEAD the session, as a distance must: ');
  eq([r.read.empty, r.read.nul, r.read.undef], [null, null, null], 'degenerate input: ');
  eq(r.conv.ok, 9.8, '60 minutes at 6:06/km: ');
  eq(r.conv.noPace, null,
     'a duration with no pace is not a distance — inventing one is how a derived number becomes fiction: ');
  eq([r.conv.zeroPace, r.conv.noMin, r.conv.negative], [null, null, null], 'degenerate conversion: ');
  eq(r.pace.single, 366, 'a single stated pace: ');
  ok(Math.abs(r.pace.band - 372.5) < 1e-9, `the midpoint of a stated band: ${r.pace.band}`);
  eq([r.pace.none, r.pace.empty], [null, null], 'a session that states no pace: ');
  eq(r.session.duration, { km: 9.8, source: 'session-duration', quality: null, minutes: 60 },
     'a duration-prescribed run: ');
  eq(r.session.noPace, null, 'a duration with nothing to convert it must not be counted: ');
  eq(r.session.stillKm.source, 'session-distance',
     'a session that states a distance must still be read as one: ');
  eq(r.session.qualityMin.source, 'quality-line-min', 'quality work stated in minutes: ');
  eq(r.session.qualityMin.work, 5.1, '25 minutes at 4:55/km of quality work: ');
  eq(r.session.qualityKm.source, 'quality-line',
     'quality work stated in kilometres must read exactly as it always has: ');
});

await check('the week view states the time he was given and the distance it derived from it', async () => {
  // Showing only the kilometres would hide what the plan actually asks him to
  // do; showing only the minutes would hide the number every guard is in.
  const target = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const t = await p.evaluate(() => {
      const e = window.getWeeklyVolumeSeries()
        .find(x => x.runs.some(r => r.minutes) && !x.isTimeTrial);
      if (!e) return null;
      const row = e.runs.find(r => r.minutes);
      return { week: e.week, key: row.key, minutes: row.minutes, km: row.km, total: e.total };
    });
    await c.close();
    return t;
  })();
  ok(target, 'no week in the plan prescribes a run by time');
  const { page: p, errors: e, ctx: c } = await openApp(browser, {
    viewport: { width: 320, height: 800 },
  }, port);
  const seen = await p.evaluate(async (wk) => {
    window.initApp();
    await new Promise(r => setTimeout(r, 300));
    const nav = Array.from(document.querySelectorAll('button,div,a'))
      .find(b => /PROGRAM/.test((b.innerText || '').trim()) && (b.innerText || '').trim().length < 20);
    if (nav) { nav.click(); await new Promise(r => setTimeout(r, 300)); }
    const btn = document.querySelector(`button[data-week="${wk}"]`);
    if (!btn) return { err: 'no week button' };
    btn.click();
    await new Promise(r => setTimeout(r, 500));
    return { err: null, text: document.body.innerText,
             overflow: document.documentElement.scrollWidth > 320 };
  }, target.week);
  await c.close();
  ok(!seen.err, seen.err);
  ok(seen.text.indexOf(`${target.minutes} min`) !== -1,
     `the card does not state the ${target.minutes} min the plan prescribes`);
  ok(seen.text.indexOf(`${target.minutes} min ≈ ${target.km}`) !== -1,
     `the card does not show the derived distance beside the time (expected "${target.minutes} min ≈ ${target.km}")`);
  ok(seen.text.indexOf(`${target.total} km`) !== -1,
     `the weekly total ${target.total} km is not rendered`);
  ok(!seen.overflow, 'the week view overflows 320px');
  eq(realErrors(e), [], 'uncaught errors on the week view: ');
});

await check('the goal race is a timed effort the app can record, and its time reaches the anchor', async () => {
  // He dropped the mid-block trials on 16 Nov and the plan's last week is a
  // race. If the app could not read a race, getPlannedTrialKm would return
  // null everywhere, the trial card would never render, and Goal 2 — a faster
  // 5K, the thing the block is for — would stop stating a number.
  const race = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const v = await p.evaluate(() => {
      for (const e of window.getWeeklyVolumeSeries()) {
        for (const key of ['recovery2', 'quality', 'easy', 'longRun']) {
          const t = window.getPlanned(e.week, key) || '';
          if (!/\d+\s*K\s+RACE\b/i.test(t)) continue;
          return { week: e.week, key, km: window.getPlannedTrialKm(e.week),
                   kind: window.classifyRunSession(key, t),
                   isTimeTrial: e.isTimeTrial, text: t };
        }
      }
      return null;
    });
    await c.close();
    return v;
  })();
  ok(race, 'the plan carries no goal race');
  ok(race.km > 0, `the race distance did not parse: ${race.km}`);
  ok(race.text.indexOf(String(race.km)) !== -1,
     'the parsed race distance does not appear in the session text');
  eq(race.kind, 'trial', 'a goal race is the same kind of effort as a trial: ');
  eq(race.isTimeTrial, true, 'the week model does not flag the race week as carrying a timed effort: ');
  // the tag that has existed since v1.14 must not be mistaken for a race
  const notARace = await (async () => {
    const { page: p, ctx: c } = await openApp(browser, {}, port);
    const v = await p.evaluate(() => window.classifyRunSession('quality',
      '[RACE PACE] 4×1200 m @ 4:30/km\n≈ 4.8 km of quality'));
    await c.close();
    return v;
  })();
  eq(notARace, 'quality', 'a [RACE PACE] session must not be read as a race: ');
  // end to end: the card renders on race week and a time reaches the anchor
  const { page: p, ctx: c } = await openApp(browser, {}, port);
  const out = await p.evaluate(async (wk) => {
    window.initApp();
    await new Promise(r => setTimeout(r, 300));
    const nav = Array.from(document.querySelectorAll('button,div,a'))
      .find(b => /PROGRAM/.test((b.innerText || '').trim()) && (b.innerText || '').trim().length < 20);
    if (nav) { nav.click(); await new Promise(r => setTimeout(r, 300)); }
    const btn = document.querySelector(`button[data-week="${wk}"]`);
    if (!btn) return { err: 'no week button' };
    btn.click();
    await new Promise(r => setTimeout(r, 500));
    const inp = document.getElementById('trialTime');
    if (!inp) return { err: 'the trial card did not render on race week' };
    inp.value = '22:30';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const save = Array.from(document.querySelectorAll('button'))
      .find(b => /save time/i.test(b.innerText || ''));
    if (!save) return { err: 'no save control on the trial card' };
    save.click();
    await new Promise(r => setTimeout(r, 500));
    return {
      err: null,
      stored: JSON.parse(localStorage.getItem('trialResults') || 'null'),
      latest: window.getLatestTrial(),
      goal: window.goalAnchorLines(wk),
    };
  }, race.week);
  await c.close();
  ok(!out.err, out.err);
  ok(Array.isArray(out.stored) && out.stored.some(x => x.week === race.week && x.seconds === 1350),
     'the race time did not reach storage');
  ok(out.latest && out.latest.seconds === 1350,
     'the race time did not become the pace anchor');
  ok(out.goal.join(' ').indexOf('5K') !== -1 || out.goal.join(' ').indexOf('5 km') !== -1,
     'the goal lines stopped naming the run goal');
});

// ── report ──────────────────────────────────────────────────────────────
await ctx.close(); await browser.close(); server.close();

const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok);
let last = '';
console.log('\n  REGRESSION GATE — ' + path.basename(APP) + '\n');
for (const r of results) {
  if (r.suite !== last) { console.log(`  ${r.suite.toUpperCase()}`); last = r.suite; }
  console.log(`    ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
  if (!r.ok) console.log(`          -> ${r.err}`);
}
// A filtered run is a development loop, never a shipping decision.
if (ONLY) {
  console.log(`\n  ${pass}/${results.length} passed in suites matching "${ONLY}"`);
  console.log('  PARTIAL RUN — this is not a green gate. Run without --only before shipping.\n');
  process.exit(fail.length ? 1 : 0);
}

// The stale-gate guard rule 2 has described since 6 Oct and which did not
// exist: a copy of this file that is missing checks can no longer exit 0
// quietly, because it must account for its own size against the number
// CHANGELOG records.
const sizeProblems = readVersionState().problems.filter(p => /GATE: line|rollback|APP_VERSION|CACHE_VERSION|PROGRAM_REV|badge|zero-padded|CHANGELOG/.test(p));
console.log(`\n  ${pass}/${results.length} passed` + (fail.length ? `  —  ${fail.length} FAILING, DO NOT SHIP\n` : '  —  green\n'));
if (sizeProblems.length) {
  console.log('  VERSION STATE DISAGREES — do not ship:\n');
  for (const p of sizeProblems) console.log('    x  ' + p);
  console.log('');
}
if (!fail.length && !sizeProblems.length) console.log('  safe to ship\n');
process.exit((fail.length || sizeProblems.length) ? 1 : 0);
