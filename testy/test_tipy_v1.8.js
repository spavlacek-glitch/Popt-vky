// test_tipy_v1.8.js – „Komu zavolat, když dnes nikomu“ v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.8.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_tipy_v1.8.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.8.html', OUT = process.env.SCREEN_DIR;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-tipy-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const den = off => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const DEN = 86400000, PRODEJCE = 'stanislav.prodejce@suw.example.cz';
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

// Nikdo dnes na řadě. Ticho: Ticháček 30 dní, Mlčenlivá 20 dní (poslední zápis jen v historii), Nedávná 13 dní (ještě ne).
// Prodaný a ztracený s dlouhým tichem se nesmí objevit. Nejbližší kontakty: Zítřek (zítra), Pozítří (+2).
const poptavka = (jmeno, stav, dalsi, upravenoPred, historiePred) => ({kanal:'telefon', jmeno, telefon:'777 000 000', email:'', zajem:'Testovací ' + jmeno,
  stav, dalsiKontakt: dalsi, vytvoreno: Date.now() - 60 * DEN, upraveno: Date.now() - upravenoPred * DEN, prodejce: PRODEJCE,
  historie:{h:{t: Date.now() - (historiePred ?? upravenoPred) * DEN, kdo: PRODEJCE, text:'Založeno'}}});
const ZAKLAD = {
  t1: poptavka('Ticháček', 'nabidka', den(9), 30),
  t2: poptavka('Mlčenlivá', 'jednani', den(20), 40, 20),
  t3: poptavka('Nedávná', 'nova', den(5), 13),
  z1: poptavka('Zítřek', 'nova', den(1), 1),
  z2: poptavka('Pozítří', 'jednani', den(2), 1),
  p1: poptavka('Prodaný Dávno', 'prodano', null, 90),
  p2: poptavka('Ztracený Dávno', 'ztraceno', null, 90)
};

(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:PRODEJCE, password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:PRODEJCE}}, poptavky: ZAKLAD});

  const br = await chromium.launch();
  const otevri = async opts => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message));
    await p.goto(STRANKA);
    await p.fill('#l-mail', PRODEJCE); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")');
    await p.waitForSelector('h2:has-text("Dnes zavolat")'); await p.waitForFunction(() => document.querySelectorAll('#seznam .card').length > 0);
    return p;
  };
  const tipy = p => p.evaluate(() => [...document.querySelectorAll('.dnes .tipy .card .name')].map(e => e.textContent));
  const duvody = p => p.evaluate(() => [...document.querySelectorAll('.dnes .tip-duvod')].map(e => e.textContent));

  for (const [nazev, opts] of [['PC 1440', {viewport:{width:1440, height:900}}], ['iPhone 13', IPHONE]]) {
    console.log(`== ${nazev}`);
    await admin('poptavky', 'PUT', ZAKLAD);
    const p = await otevri(opts);
    await T(`${nazev}: prázdné „Dnes zavolat“ ukáže 3 tipy – 2× dlouho ticho (nejdelší první), pak nejbližší kontakt`, async () => {
      const t = await tipy(p), d = await duvody(p);
      return (JSON.stringify(t) === JSON.stringify(['Ticháček', 'Mlčenlivá', 'Zítřek']) && /30 dní/.test(d[0]) && /20 dní/.test(d[1]) && /zítra/.test(d[2])
        && await p.locator('.dnes .hec, .dnes .empty').count() === 1 && (await p.innerText('.dnes h2')).includes('(0)')) || {t, d}; });
    await T(`${nazev}: poznámka v historii se počítá jako zápis (Mlčenlivá 20, ne 40 dní); 13 dní ještě není ticho; prodané a ztracené nikdy`, async () => {
      const t = await tipy(p); return (!t.includes('Nedávná') && !t.some(x => /Dávno/.test(x))) || t; });
    if (OUT) await p.screenshot({path: path.join(OUT, `tipy_${nazev.replace(/\s/g, '')}.png`)});
    await T(`${nazev}: klepnutí na tip otevře detail té poptávky`, async () => {
      await p.locator('.dnes .tipy .card', {hasText:'Ticháček'}).click(); await p.waitForSelector('button:has-text("← Přehled")');
      const txt = await p.innerText('#view'); await p.click('button:has-text("← Přehled")'); await p.waitForSelector('section.dnes');
      return txt.includes('Ticháček') && txt.includes('Testovací Ticháček') || txt.slice(0, 200); });
    await T(`${nazev}: bez dlouhého ticha doplní tipy nejbližší kontakty (zítra, +2, +5)`, async () => {
      for (const k of ['t1', 't2']) await admin(`poptavky/${k}/stav`, 'PUT', 'prodano');
      await p.waitForFunction(() => !document.querySelector('.dnes .tipy')?.textContent.includes('Ticháček'));
      const t = await tipy(p), d = await duvody(p);
      return (JSON.stringify(t) === JSON.stringify(['Zítřek', 'Pozítří', 'Nedávná']) && d.every(x => x.startsWith('⏭'))) || {t, d}; });
    await T(`${nazev}: jakmile je někdo na řadě dnes, tipy zmizí`, async () => {
      await admin('poptavky/z1/dalsiKontakt', 'PUT', den(0));
      await p.waitForFunction(() => document.querySelector('.dnes h2').textContent.includes('(1)'));
      return await p.locator('.dnes .tipy').count() === 0 || 'tipy zůstaly'; });
    await T(`${nazev}: žádná otevřená poptávka → žádné tipy, jen hecovací věta`, async () => {
      await admin('poptavky', 'PUT', {p1: ZAKLAD.p1});
      await p.waitForFunction(() => document.querySelectorAll('.dnes .card').length === 0);
      return (await p.locator('.dnes .tipy').count() === 0 && await p.locator('.dnes .empty').count() === 1) || 'chybí věta nebo zbyly tipy'; });
    await T(`${nazev}: tipy nic nezapsaly do databáze`, async () => {
      await admin('poptavky', 'PUT', ZAKLAD); const pred = JSON.stringify(await admin('poptavky'));
      await p.waitForFunction(() => document.querySelectorAll('.dnes .tipy .card').length === 3);
      await p.locator('.dnes .tipy .card').first().click(); await p.click('button:has-text("← Přehled")'); await p.waitForTimeout(500);
      const po = JSON.stringify(await admin('poptavky'));
      return (pred === po && Object.keys(JSON.parse(po)).length === Object.keys(ZAKLAD).length) || 'změna v databázi'; });
    await T(`${nazev}: žádné chyby, nic se neposouvá do stran`, async () =>
      (p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || p.chyby);
    await p.context().close();
  }
  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
