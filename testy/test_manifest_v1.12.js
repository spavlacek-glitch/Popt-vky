// test_manifest_v1.12.js – manifest appky na ploše (v1.12). Appka běží z lokálního HTTP serveru (jako z raw.githack.com)
// a manifest přečte sám prohlížeč (Chromium, Page.getAppManifest). Firebase jen v LOKÁLNÍCH emulátorech, nikdy produkce.
// Skutečné chování iPhonu (lišta prohlížeče po přepnutí verze) se tu nasimulovat nedá – ověřit na zařízení.
//   SOUBOR=poptavky_v1.12.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_manifest_v1.12.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.39.html';

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);

// Server jako raw.githack.com: /<repo>/main/… (appka neběží v kořeni webu)
const SLOZKA = '/spavlacek-glitch/Popt-vky/main/';
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x').pathname;
  if (!u.startsWith(SLOZKA)) { s.writeHead(404); return s.end(); }
  const soubor = u.slice(SLOZKA.length);
  if (soubor === SOUBOR) { s.writeHead(200, {'content-type':'text/html; charset=utf-8'}); return s.end(html); }
  if (soubor === 'manifest.json') { s.writeHead(200, {'content-type':'application/json; charset=utf-8'}); return s.end(fs.readFileSync(path.join(ROOT, 'manifest.json'))); }
  s.writeHead(404); s.end();
});

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${srv.address().port}${SLOZKA}`;
  const br = await chromium.launch(), ctx = await br.newContext();
  await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
  const p = await ctx.newPage(); p.chyby = []; p.on('pageerror', e => p.chyby.push(e.message));
  await p.goto(BASE + SOUBOR); await p.waitForSelector('#l-mail, #app:not(.hidden)');
  const cdp = await ctx.newCDPSession(p);
  const m = await cdp.send('Page.getAppManifest');
  const data = JSON.parse(m.data || '{}'), url = x => new URL(x, m.url).href;

  console.log('== manifest z ' + SOUBOR);
  await T('prohlížeč manifest najde a přečte bez chyb', async () => (m.url === BASE + 'manifest.json' && m.errors.length === 0 && !!m.data) || {url: m.url, errors: m.errors});
  await T('ikona startuje ze stálé adresy poptavky.html (vždy nejnovější verze)', async () => url(data.start_url) === BASE + 'poptavky.html' || url(data.start_url));
  await T('k appce patří celá složka – tahle verze, stálá adresa i budoucí verze (aktualizace bez lišty prohlížeče)', async () => {
    const rozsah = url(data.scope);
    const vse = [SOUBOR, 'poptavky.html', 'poptavky_v1.13.html', 'poptavky_v2.0.html'].map(f => BASE + f);
    return (rozsah === BASE && vse.every(x => x.startsWith(rozsah))) || {rozsah}; });
  await T('režim „standalone“ (bez lišty prohlížeče), název Poptávky, barvy jako appka', async () =>
    (data.display === 'standalone' && data.name === 'Poptávky' && data.short_name === 'Poptávky' && data.theme_color === '#111111' && data.background_color === '#f3f4f6') || data);
  await T('manifest odkazuje jen relativně – funguje z main i z testovací větve', async () =>
    (!/^https?:|^\//.test(data.start_url) && !/^https?:|^\//.test(data.scope)) || data);

  console.log('== stálá adresa poptavky.html');
  const stala = fs.readFileSync(path.join(ROOT, 'poptavky.html'), 'utf8');
  await T('poptavky.html odkazuje na stejný manifest a přesměruje na verzi ve stejné složce', async () => {
    const akt = /const AKTUALNI = '([^']+)'/.exec(stala)[1];
    return (/<link rel="manifest" href="manifest.json">/.test(stala) && /^poptavky_v\d+\.\d+\.html$/.test(akt) && fs.existsSync(path.join(ROOT, akt))) || akt; });
  await T('stránka appky bez chyb', async () => p.chyby.length === 0 || p.chyby);

  await br.close(); srv.close();
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
