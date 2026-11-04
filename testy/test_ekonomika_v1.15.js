// test_ekonomika_v1.15.js – ekonomika na přehledu (v1.15) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.15.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_ekonomika_v1.15.js   (SCREEN_DIR=… pro snímky)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.40.html', OUT = process.env.SCREEN_DIR;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-eko-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const JA = 'stanislav.prodejce@suw.example.cz', HESLO = 'heslo123', DEN = 86400000, ted = Date.now();
const {userAgent, ...IPHONE} = devices['iPhone 13'];
const iso = off => { const d = new Date(ted + off * DEN); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const P = (jmeno, zajem, stav, kontakt, extra = {}) => ({kanal:'telefon', jmeno, telefon:'777 123 456', zajem, stav, dalsiKontakt: kontakt,
  vytvoreno: ted - 10 * DEN, upraveno: ted - 10 * DEN, prodejce: JA, historie:{h0:{t: ted - 10 * DEN, kdo: JA, text:'Založeno (📞 Telefon)'}}, ...extra});
const I = (zisk, korekce, om, sm, nest = false, neg = false) => ({zisk, skutecny_zisk: zisk - korekce, obchodni_marze: om, skutecna_marze: sm, korekce, nestandardni: nest, negativni: neg});
const N = (model, vuz, sleva, pct, dopl, interni, t) => ({model, cena_sdph: vuz + dopl, cena_vuz_sdph: vuz, sleva_sdph: sleva, sleva_pct: pct, doplnky_sdph: dopl, soubor: 'Nabidka_' + model.replace(/\W/g, '') + '.pdf', zdroj: 'offerstudio', t, kdo: JA, ...(interni ? {interni} : {})});
const POPT = {
  a_gls: P('Jana Nováková', 'GLS do konce roku, leasing', 'nabidka', iso(0), {
    historie: {h0: {t: ted - 10 * DEN, kdo: JA, text: 'Založeno (📞 Telefon)'}, h1: {t: ted - 6 * DEN, kdo: JA, text: '📄 Nabídka připravena: GLS 450 d 4MATIC · 1 274 000 Kč'},
      h2: {t: ted - 3 * DEN, kdo: JA, text: 'Volal jsem, chce ještě srovnat s leasingem'}},
    nabidky: {koncept_gls: N('GLS 450 d 4MATIC', 1270500, 60500, 4.5, 3500, I(82000, 20000, 7.5, 5.9), ted - 6 * DEN)}}),
  b_glc: P('Petr Nízký', 'GLC PHEV skladem', 'jednani', iso(2), {nabidky: {k: N('GLC 300 e 4MATIC', 1500000, 120000, 7.4, 0, I(20000, 0, 2, 1.6, true), ted - 2 * DEN)}}),
  c_bez: P('Bez Nabídky', 'Zatím jen info o CLA', 'nova', iso(1)),
  d_bezm: P('Bez Marže', 'C-Class kombi', 'nabidka', iso(5), {nabidky: {k: N('C 220 d', 1100000, 0, 0, 0, null, ted - DEN)}})
};

(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:JA, password:HESLO, returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:JA}}, poptavky: POPT});
  const pred = JSON.stringify(await admin('poptavky'));
  const br = await chromium.launch();
  const otevri = async opts => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    await p.goto(STRANKA);
    await p.fill('#l-mail', JA); await p.fill('#l-pass', HESLO); await p.click('button:has-text("Přihlásit")');
    await p.waitForFunction(() => document.querySelectorAll('#seznam .card').length === 4);
    return p;
  };
  const radek = (p, jm) => p.locator('#seznam .card', {hasText: jm});
  const txt = async l => (await l.textContent()).replace(/\s+/g, ' ');

  for (const sirka of [1440, 1280]) {
    console.log(`== PC ${sirka}`);
    const p = await otevri({viewport: {width: sirka, height: 900}});
    await T('záhlaví tabulky (v1.26): Zákazník · Řeší / vůz · Poslední zápis · Nabídka · Sleva · Zisk · Stav · Další kontakt', async () => {
      const t = await txt(p.locator('.tab-hlava')); return (await p.isVisible('.tab-hlava') && ['Zákazník', 'Řeší / vůz', 'Poslední zápis', 'Nabídka', 'Sleva', 'Zisk', 'Stav', 'Další kontakt'].every(x => t.includes(x))) || t; });
    await T('řádek: co chce + 💬 poslední zápis, nabídka model · cena · sleva, zisk schovaný, kontakt a stav', async () => {
      const t = await txt(radek(p, 'Jana Nováková'));
      return (t.includes('GLS do konce roku') && t.includes('💬 Volal jsem, chce ještě srovnat s leasingem · před 3 dny') && t.includes('📄 GLS 450 d 4MATIC · 1 274 000 Kč · sleva 4,5 %')
        && t.includes('••• Kč') && !t.includes('62 000') && t.includes('dnes')) || t; });
    await T('bez nabídky: „bez nabídky“, bez zisku', async () => { const t = await txt(radek(p, 'Bez Nabídky')); return (t.includes('bez nabídky') && !t.includes('•••')) || t; });
    await T('součet: 3 s nabídkou za 3 874 000 Kč, zisk schovaný (z 2 nabídek)', async () => {
      const t = await txt(p.locator('.tab-soucet')); return (t.includes('Celkem 4 poptávky · 3 s nabídkou za 3 874 000 Kč · zisk ••• Kč (z 2 nabídek)')) || t; });
    await T('👁 ukáže zisk u všech: 62 000 Kč · 5,9 %, nízká marže oranžově, součet ≈ 82 000 Kč', async () => {
      await p.click('.tab-hlava >> text=👁');
      const g = await txt(radek(p, 'Jana Nováková')), n = radek(p, 'Petr Nízký'), s = await txt(p.locator('.tab-soucet'));
      return (g.includes('62 000 Kč5,9 %') && (await n.locator('.zisk-sl .oranzova').count()) > 0 && s.includes('zisk ≈ 82 000 Kč')) || [g, s]; });
    await T('řazení podle zisku a podle ceny (klepnutí na záhlaví)', async () => {
      await p.click('.tab-hlava >> text=Zisk'); const z = await p.$$eval('#seznam .card .name', l => l.map(x => x.textContent));
      await p.click('.tab-hlava >> text=Nabídka'); const c = await p.$$eval('#seznam .card .name', l => l.map(x => x.textContent));
      await p.click('.tab-hlava >> text=Nabídka');
      return (z[0] === 'Jana Nováková' && z[1] === 'Petr Nízký' && c[0] === 'Petr Nízký' && c[1] === 'Jana Nováková' && c[3] === 'Bez Nabídky') || {z, c}; });
    await T('▸ rozbalí ekonomiku poptávky (ceník, sleva, doplňky, celkem, zisk, korekce, marže, historie) a neotevře detail', async () => {
      await radek(p, 'Jana Nováková').locator('.chev').click();
      const t = await txt(p.locator('.eko'));
      return (await p.locator('.tab-hlava').count() === 1 && t.includes('Ceníková cena1 331 000 Kč') && t.includes('Sleva− 60 500 Kč (4,5 %)') && t.includes('Cena vozu1 270 500 Kč')
        && t.includes('Doplňkový prodej+ 3 500 Kč') && t.includes('Celkem s DPH1 274 000 Kč') && t.includes('Zisk82 000 Kč') && t.includes('Korekce (dealer hradí)− 20 000 Kč')
        && t.includes('Skutečný zisk62 000 Kč') && t.includes('Obchodní marže7,5 %') && t.includes('Volal jsem, chce ještě srovnat')) || t; });
    await T('v ekonomice odkaz „Offer Studio“ na tuto nabídku a (v1.29) „Otevřít PDF“ na její poslední PDF', async () => {
      const os = await p.getAttribute('.eko a:has-text("Offer Studio")', 'href'), pdf = await p.getAttribute('.eko a:has-text("Otevřít PDF")', 'href');
      return (os === 'http://127.0.0.1:8774/draft/koncept_gls' && pdf === 'http://127.0.0.1:8774/draft/koncept_gls/pdf') || [os, pdf]; });
    await T('v1.29: „Cena vozu“ je v ekonomice, jen když je doplňkový prodej; „Co jsem s ním řešil“ je jeden řádek na záznam s krátkým datem', async () => {
      const r = await p.evaluate(() => [...document.querySelectorAll('.eko .hist div[title]')].map(d => ({v: d.getBoundingClientRect().height, d: d.querySelector('.d')?.textContent.trim()})));
      return (r.length >= 1 && r.every(x => x.v < 26 && /^\d{1,2}\. \d{1,2}\.$/.test(x.d))) || r; });
    await T('druhé ▸ ekonomiku sbalí', async () => { await radek(p, 'Jana Nováková').locator('.chev').click(); return await p.locator('.eko').count() === 0 || 'zůstala'; });
    await T('hledání najde poptávku podle modelu z nabídky', async () => {
      await p.fill('#hledat', 'GLS 450'); await p.waitForTimeout(200); const n = await p.$$eval('#seznam .card .name', l => l.map(x => x.textContent));
      await p.fill('#hledat', ''); await p.waitForTimeout(200); return (n.length === 1 && n[0] === 'Jana Nováková') || n; });
    await T('„Dnes zavolat“ zůstává vlevo; karta (v1.26) je krátká: poslední poznámka ano, nabídka a vůz ne', async () => {
      const d = await p.locator('.dnes').boundingBox(), e = await p.locator('.evidence').boundingBox(), t = await txt(p.locator('.dnes .card').first());
      return (d.x < e.x && !t.includes('📄') && !t.includes('🚗') && t.includes('💬 Volal jsem')) || t; });
    if (OUT) { await p.evaluate(() => { rozbalena = 'a_gls'; renderSeznam(); }); await p.screenshot({path: path.join(OUT, `eko_v1.15_PC${sirka}.png`)}); await p.evaluate(() => { rozbalena = null; renderSeznam(); }); }
    await T('klepnutí na řádek dál otevře detail', async () => { await radek(p, 'Bez Marže').locator('.name').click(); return (await p.isVisible('#view .zpet-pc, .zpet button')) || 'ne'; });
    await T('nic se nezapsalo, žádné chyby, nic se neposouvá do stran', async () =>
      (JSON.stringify(await admin('poptavky')) === pred && p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || p.chyby);
    await p.context().close();
  }

  console.log('== iPhone 13');
  {
    const p = await otevri(IPHONE);
    await T('karta: nabídka model · cena a 💬 poslední zápis; zisk ani ▸ ne', async () => {
      const k = radek(p, 'Jana Nováková'), t = await txt(k);
      return (t.includes('📄 GLS 450 d 4MATIC · 1 274 000 Kč') && t.includes('💬 Volal jsem') && !(await k.locator('.chev').isVisible()) && !t.includes('•••') && !(await p.isVisible('.tab-hlava'))) || t; });
    if (OUT) await p.screenshot({path: path.join(OUT, 'eko_v1.15_iPhone.png'), fullPage: true});
    await T('žádné chyby, nic se neposouvá do stran', async () => (p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || p.chyby);
    await p.context().close();
  }
  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
