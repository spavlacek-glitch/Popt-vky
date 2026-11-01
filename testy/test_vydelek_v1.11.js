// test_vydelek_v1.11.js – „🎉 Tento měsíc prodáno … ≈ … Kč“ a výhled v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.11.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vydelek_v1.11.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.11.html', OUT = process.env.SCREEN_DIR;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-vydelek-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const JA = 'stanislav.prodejce@suw.example.cz', DANIEL = 'daniel.kolega@suw.example.cz', DEN = 86400000;
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const ted = Date.now(), zacatekMesice = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
const loniMesic = zacatekMesice - 10 * DEN;     // určitě minulý měsíc
const P = (jmeno, stav, prodejce = JA, prodanoT, upraveno = ted - 30 * DEN) => {
  const historie = {h0:{t: ted - 60 * DEN, kdo: prodejce, text:'Založeno'}};
  if (prodanoT) historie.h1 = {t: prodanoT, kdo: prodejce, text:'Stav → Prodáno'};
  return {kanal:'telefon', jmeno, telefon:'777 000 000', email:'', zajem:'Testovací', stav, dalsiKontakt: ['nova','nabidka','jednani'].includes(stav) ? '2030-01-01' : null,
    vytvoreno: ted - 60 * DEN, upraveno, prodejce, historie};
};
// Moje: prodané 4 (3 tento měsíc – jedno bez záznamu v historii, podle času úpravy), ztracené 2, otevřené 4. Danielovy se nepočítají.
const ZAKLAD = {
  s1: P('Prodaný Dnes', 'prodano', JA, ted - 1000), s2: P('Prodaný Taky', 'prodano', JA, zacatekMesice + 1000),
  s3: P('Prodaný Minule', 'prodano', JA, loniMesic), s5: P('Prodaný Bez Historie', 'prodano', JA, null, ted - 2000),
  s9: P('Danielův Prodej', 'prodano', DANIEL, ted - 1000),
  z1: P('Ztracený Jedna', 'ztraceno'), z2: P('Ztracený Dva', 'ztraceno'),
  o1: P('Otevřený Jedna', 'nova'), o2: P('Otevřený Dva', 'nabidka'), o3: P('Otevřený Tři', 'jednani'), o4: P('Otevřený Čtyři', 'nova'),
  o9: P('Danielův Otevřený', 'nova', DANIEL)
};
const norm = t => t.replace(/\s+/g, ' ').trim();

(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:JA, password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:JA}}, poptavky: ZAKLAD});

  const br = await chromium.launch();
  for (const [nazev, opts] of [['PC 1440', {viewport:{width:1440, height:900}}], ['iPhone 13', IPHONE], ['iPhone SE', {...IPHONE, viewport:{width:320, height:568}}]]) {
    console.log(`== ${nazev}`);
    await admin('poptavky', 'PUT', ZAKLAD);
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog'); d.dismiss(); });
    const prihlas = async () => {
      await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
      if (!(await p.locator('#app:not(.hidden)').count())) { await p.fill('#l-mail', JA); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")'); }
      await p.waitForSelector('.vydelek, .vydelek-uprava');
    };
    await p.goto(STRANKA); await prihlas();
    const text = async () => norm(await p.locator('.vydelek').innerText());
    const pred = JSON.stringify(await admin('poptavky'));

    const mobil = nazev.startsWith('iPhone');
    if (mobil) await T(`${nazev}: na mobilu jen jeden krátký řádek „🎉 3 auta tento měsíc ›“ – bez částek a výhledu`, async () => {
      const t = await text(), v = await p.locator('.vydelek').boundingBox();
      if (OUT) { await p.evaluate(() => document.querySelector('.vydelek').scrollIntoView({block: 'center'})); await p.screenshot({path: path.join(OUT, `vydelek_kratky_${nazev.replace(/\s/g, '')}.png`)}); }
      return (t === '🎉 3 auta tento měsíc ›' && v.height <= 40) || {t, v}; });
    await T(`${nazev}: bez provize – 3 auta tento měsíc (jen moje, i bez záznamu v historii), 4 rozjednané, výzva k zadání provize, žádná částka`, async () => {
      if (mobil) await p.click('.vydelek');           // mobil: první klepnutí rozbalí
      const t = await text();
      return (t.includes('Tento měsíc prodáno: 3 auta') && t.includes('Rozjednáno: 4 obchody') && t.includes('klepni a zadej provizi') && !/\d\s?Kč/.test(t)) || t; });
    await T(`${nazev}: klepnutí otevře zadání provize; „8 000“ + Enter uloží jen do zařízení a ukáže ≈ 24 000 Kč a výhled ≈ 21 300 Kč`, async () => {
      await p.click('.vydelek'); await p.waitForSelector('#provize');
      const fokus = await p.evaluate(() => document.activeElement.id);
      await p.fill('#provize', '8 000'); await p.press('#provize', 'Enter'); await p.waitForSelector('.vydelek');
      const t = await text(), ulozeno = await p.evaluate(() => localStorage.getItem('poptavky.provize'));
      // výhled = 4 otevřené × 4/6 úspěšnost × 8 000 = 21 333 → zaokrouhleno na stovky
      return (fokus === 'provize' && ulozeno === '8000' && t.includes('3 auta ≈ 24 000 Kč') && t.includes('výhled ≈ 21 300 Kč')) || {fokus, ulozeno, t}; });
    if (OUT) await p.screenshot({path: path.join(OUT, `vydelek_${nazev.replace(/\s/g, '')}.png`)});
    await T(`${nazev}: klepnutí ${mobil ? 'sbalí na krátký řádek bez částek' : 'částky schová (≈ ••• Kč)'} a další je zase ukáže`, async () => {
      await p.click('.vydelek'); const skryto = await text();
      await p.click('.vydelek'); const ukazano = await text();
      const ok1 = mobil ? skryto === '🎉 3 auta tento měsíc ›' : skryto.includes('3 auta ≈ ••• Kč') && skryto.includes('výhled ≈ ••• Kč');
      return (ok1 && !/\d\s?Kč/.test(skryto) && ukazano.includes('24 000 Kč')) || {skryto, ukazano}; });
    await T(`${nazev}: po obnovení stránky ${mobil ? 'zase jen krátký řádek' : 'jsou částky zase schované'} a provize zůstala`, async () => {
      await p.reload(); await prihlas(); const t = await text();
      const ok1 = mobil ? t === '🎉 3 auta tento měsíc ›' : t.includes('≈ ••• Kč') && !t.includes('klepni a zadej');
      if (mobil) { await p.click('.vydelek'); if (!(await text()).includes('24 000 Kč')) return 'provize se ztratila'; await p.click('.vydelek'); }
      return (ok1 && await p.locator('#provize').count() === 0) || t; });
    await T(`${nazev}: „✏️ provize“ – rozepsaná částka přežije živou změnu v databázi a zůstane v poli kurzor`, async () => {
      await p.click('.vydelek'); await p.click('.vydelek >> text=✏️ provize'); await p.waitForSelector('#provize');
      await p.fill('#provize', '9500');
      await admin('poptavky/o1/zajem', 'PUT', 'Změna z jiného zařízení'); await p.waitForTimeout(600);
      const v = await p.inputValue('#provize'), fokus = await p.evaluate(() => document.activeElement.id);
      await p.click('.vydelek-uprava button:has-text("Uložit")'); const t = await text();
      return (v === '9500' && fokus === 'provize' && t.includes('3 auta ≈ 28 500 Kč')) || {v, fokus, t}; });
    await T(`${nazev}: „Zrušit“ a prázdná nebo nesmyslná částka provizi nezmění`, async () => {
      await p.click('.vydelek >> text=✏️ provize'); await p.fill('#provize', 'abc'); await p.click('.vydelek-uprava button:has-text("Uložit")');
      const zustalo = await p.locator('#provize').count() === 1;
      await p.click('.vydelek-uprava button:has-text("Zrušit")');
      return (zustalo && await p.evaluate(() => localStorage.getItem('poptavky.provize')) === '9500') || zustalo; });
    await T(`${nazev}: výdělek do databáze nic nezapsal (jen naše testovací změna „Co chce“)`, async () => {
      const db = await admin('poptavky'), cekane = JSON.parse(pred); cekane.o1.zajem = 'Změna z jiného zařízení';
      return JSON.stringify(db) === JSON.stringify(cekane) || 'změna v databázi'; });
    await T(`${nazev}: pod 5 uzavřených obchodů appka výhled nevymýšlí`, async () => {
      for (const k of ['z1', 'z2', 's3']) await admin('poptavky/' + k, 'DELETE');
      await p.waitForFunction(() => document.querySelector('.vydelek').textContent.includes('spočítám'));
      return (await text()).includes('výhled spočítám po 5 uzavřených obchodech') || await text(); });
    await T(`${nazev}: tento měsíc nic → povzbudivá věta, žádná výčitka`, async () => {
      for (const k of ['s1', 's2', 's5']) await admin('poptavky/' + k, 'DELETE');
      await p.waitForFunction(() => document.querySelector('.vydelek').textContent.includes('0 aut'));
      return (await text()).includes('Tento měsíc zatím 0 aut – první kus se chystá') || await text(); });
    await T(`${nazev}: přepnutí poptávky na Prodáno se hned započítá`, async () => {
      await p.locator('#seznam .card', {hasText:'Otevřený Dva'}).click();
      if (nazev.startsWith('iPhone')) await p.click('.md-uzavrit .prodano'); else await p.click('#view .chip:has-text("Prodáno")');
      await p.click('button:has-text("← Přehled")'); await p.waitForSelector('.vydelek');
      const t = await text(); return (t.includes('Tento měsíc prodáno: 1 auto ≈ 9 500 Kč') && t.includes('Rozjednáno: 3 obchody')) || t; });
    await T(`${nazev}: rozložení – ${nazev.startsWith('PC') ? 'vpravo vedle nadpisu „Poptávky“' : 'pod nadpisem, nic nepřetéká'}; žádné chyby`, async () => {
      const h = await p.locator('h2:has-text("Poptávky")').boundingBox(), v = await p.locator('.vydelek').boundingBox();
      const vedle = nazev.startsWith('PC') ? v.x > h.x + h.width && Math.abs((v.y + v.height / 2) - (h.y + h.height / 2)) < 30 : v.y >= h.y;
      return (vedle && p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || {h, v, chyby: p.chyby}; });
    await ctx.close();
  }
  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
