// test_vuz_v1.16.js – vůz u poptávky (v1.16) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.16.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vuz_v1.16.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.40.html';
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-vuz-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const JA = 'stanislav.prodejce@suw.example.cz', HESLO = 'heslo123', DEN = 86400000, ted = Date.now();
const {userAgent, ...IPHONE} = devices['iPhone 13'];
const iso = off => { const d = new Date(ted + off * DEN); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
const P = (jmeno, zajem, extra = {}) => ({kanal:'telefon', jmeno, telefon:'777 123 456', zajem, stav:'nova', dalsiKontakt: iso(1),
  vytvoreno: ted - 3 * DEN, upraveno: ted - 3 * DEN, prodejce: JA, historie:{h0:{t: ted - 3 * DEN, kdo: JA, text:'Založeno (📞 Telefon)'}}, ...extra});
const POPT = {
  a_sklad: P('Jana Skladová', 'GLC skladem', {vuz: {puvod:'sklad', id:'05-576-12345', lokace:'Karlovy Vary'}}),
  b_vyroba: P('Petr Výrobní', 'EQE do výroby', {vuz: {puvod:'vyroba', id:'ABC123ONLINE'}}),
  c_bez: P('Bez Vozu', 'Jen se ptá')
};
(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:JA, password:HESLO, returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:JA}}, poptavky: POPT});
  const br = await chromium.launch();
  const otevri = async opts => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    await p.goto(STRANKA);
    await p.fill('#l-mail', JA); await p.fill('#l-pass', HESLO); await p.click('button:has-text("Přihlásit")');
    await p.waitForFunction(() => document.querySelectorAll('#seznam .card').length >= 3);
    return p;
  };
  const txt = async l => (await l.textContent()).replace(/\s+/g, ' ');
  for (const [nazev, opts] of [['PC 1440', {viewport:{width:1440,height:900}}], ['iPhone 13', IPHONE]]) {
    console.log('==', nazev);
    const p = await otevri(opts);
    await T('karta: skladový · auftrag · lokace', async () => { const t = await txt(p.locator('#seznam .card', {hasText:'Jana Skladová'})); return t.includes('🚗 Skladový · 05-576-12345 · Karlovy Vary') || t; });
    await T('karta: na zakázku · online kód (bez lokace)', async () => { const t = await txt(p.locator('#seznam .card', {hasText:'Petr Výrobní'})); return (t.includes('🚗 Na zakázku · ABC123ONLINE') && !t.includes('Karlovy')) || t; });
    await T('karta bez vozu: žádný řádek vozu', async () => !(await txt(p.locator('#seznam .card', {hasText:'Bez Vozu'}))).includes('🚗'));
    await T('hledání podle auftragu', async () => { await p.fill('#hledat', '576-123'); await p.waitForTimeout(200);
      const n = await p.locator('#seznam .card').count(); await p.fill('#hledat', ''); return n === 1 || n; });
    await T('detail ukáže vůz', async () => { await p.locator('#seznam .card', {hasText:'Jana Skladová'}).click(); await p.waitForSelector('#view');
      const t = await txt(p.locator('#view')); return t.includes('🚗 Skladový · 05-576-12345 · Karlovy Vary') || t.slice(0, 200); });
    await T('úprava: změna na do výroby smaže lokaci, uloží se do DB', async () => {
      await p.click('button:has-text("Upravit")').catch(async () => { await p.click('button:has-text("Další akce")'); await p.click('text=Upravit'); });
      await p.selectOption('#f-vuz-puvod', 'vyroba'); await p.fill('#f-vuz-id', 'ONLINEXYZ'); await p.click('button:has-text("Uložit")'); await p.waitForTimeout(600);
      const d = await admin('poptavky/a_sklad/vuz'); return (d && d.puvod === 'vyroba' && d.id === 'ONLINEXYZ' && !d.lokace) || d; });
    await T('vymazání vozu odstraní pole', async () => {
      await p.click('button:has-text("Upravit")').catch(async () => { await p.click('button:has-text("Další akce")'); await p.click('text=Upravit'); });
      await p.selectOption('#f-vuz-puvod', ''); await p.fill('#f-vuz-id', ''); await p.click('button:has-text("Uložit")'); await p.waitForTimeout(600);
      const d = await admin('poptavky/a_sklad/vuz'); return d === null || d; });
    await T('bez chyb ve stránce', async () => p.chyby.length === 0 || p.chyby);
    await admin('poptavky/a_sklad/vuz', 'PUT', POPT.a_sklad.vuz);
  }
  await br.close(); console.log(`\n${ok} / ${celkem}`); process.exit(ok === celkem ? 0 : 1);
})();
