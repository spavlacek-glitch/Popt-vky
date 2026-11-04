// test_zpet_kalkulace_v1.18.js (od v1.19 s pruhem a Esc) – tlačítko Zpět prohlížeče a kalkulace v detailu (v1.18) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.17.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vuz_v1.16.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.36.html';
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-zpet-'));
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
  
  const NAB={model:'GLS 450 d 4MATIC',cena_sdph:2899545,cena_vuz_sdph:2899545,sleva_sdph:322000,sleva_pct:10,doplnky_sdph:0,soubor:'x.pdf',zdroj:'offerstudio',t:ted,kdo:JA,interni:{zisk:90000,skutecny_zisk:80000,obchodni_marze:5,skutecna_marze:4,korekce:10000,nestandardni:false,negativni:false}};
  await admin('poptavky/a_sklad/nabidky/k','PUT',NAB);
  for (const [nazev, opts] of [['PC 1440', {viewport:{width:1440,height:900}}], ['iPhone 13', IPHONE]]) {
    console.log('==', nazev);
    const mobil = nazev.startsWith('iPhone');
    const p = await otevri(opts);
    const vDetailu = () => p.evaluate(() => view);
    if (!mobil) await T('v1.19: pruh „← Všechny poptávky“ je výrazný, modrý a zůstane nahoře při posouvání', async () => {
      await p.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await p.waitForTimeout(300);
      const b = p.locator('.zpet-pc'), bg = await b.evaluate(e => getComputedStyle(e).backgroundColor), fs = await b.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
      await p.evaluate(() => { document.body.style.minHeight = '3000px'; window.scrollTo(0, 400); }); await p.waitForTimeout(200);
      const y = (await p.locator('.pc-lista').boundingBox()).y, n = await b.count(); await p.evaluate(() => window.scrollTo(0, 0));
      await p.goBack(); await p.waitForTimeout(300);
      return (bg === 'rgb(0, 120, 214)' && fs >= 16 && y > 40 && y < 80 && n === 1) || [bg, fs, y]; });
    if (!mobil) await T('v1.19: Esc vrátí na přehled; při psaní do pole nic', async () => {
      await p.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await p.waitForTimeout(300);
      await p.click('#d-pozn'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); const a = await vDetailu();
      await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      return (a === 'detail' && (await vDetailu()) === 'home') || [a, await vDetailu()]; });
    await T('klepnutí otevře detail', async () => { await p.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await p.waitForTimeout(300); return (await vDetailu()) === 'detail'; });
    await T('tlačítko Zpět prohlížeče vrátí na přehled', async () => { await p.goBack(); await p.waitForTimeout(400); return (await vDetailu()) === 'home' && (await p.locator('#seznam .card').count()) >= 3 || await vDetailu(); });
    await T('Vpřed otevře zase detail', async () => { await p.goForward(); await p.waitForTimeout(400); return (await vDetailu()) === 'detail'; });
    await T('tlačítko „Zpět na přehled“ na stránce vrátí a zásobník je čistý (jedno Zpět už nevrací detail)', async () => {
      await p.click(mobil ? '.zpet button' : '.zpet-pc'); await p.waitForTimeout(500);
      const home = await vDetailu(); const url1 = p.url();
      return home === 'home' || home; });
    await T('detail → Upravit údaje → Zpět prohlížeče vrátí do detailu', async () => {
      await p.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await p.waitForTimeout(300);
      await p.evaluate(() => renderForm(curId)); await p.waitForTimeout(200);
      const f = await vDetailu(); await p.goBack(); await p.waitForTimeout(400);
      return (f === 'form' && (await vDetailu()) === 'detail') || [f, await vDetailu()]; });
    await T('detail → Upravit → Uložit → detail; jedno Zpět prohlížeče pak vede na přehled', async () => {
      await p.evaluate(() => renderForm(curId)); await p.waitForTimeout(200);
      await p.click('button:has-text("Uložit")'); await p.waitForTimeout(700);
      const d = await vDetailu(); await p.goBack(); await p.waitForTimeout(500);
      return (d === 'detail' && (await vDetailu()) === 'home') || [d, await vDetailu()]; });
    await p.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await p.waitForTimeout(300);
    if (!mobil) {
      await T('kalkulace: ceníková, sleva Kč a %, celkem – vždy vidět (v1.27: „Cena vozu“ jen s doplňkovým prodejem, jinak by byla totéž co celkem)', async () => {
        const t = (await p.locator('.nabidky .nab').first().textContent()).replace(/\s+/g, ' ');
        return (t.includes('Ceníková cena') && t.includes('3 221 545') && t.includes('− 322') && t.includes('10 %') && !t.includes('Cena vozu') && t.includes('Celkem s DPH') && t.includes('2 899 545') && t.includes('Zisk •••') && !t.includes('90 000')) || t; });
      await T('odkazy v detailu: „Otevřít v Offer Studiu“ vede na /draft/<id konceptu> a (v1.29) „Otevřít PDF“ na /draft/<id>/pdf', async () => {
        const os = await p.locator('.nab .kod a:has-text("Offer Studiu")').getAttribute('href'), pdf = await p.locator('.nab .kod a:has-text("Otevřít PDF")').getAttribute('href');
        return (os === 'http://127.0.0.1:8774/draft/k' && pdf === 'http://127.0.0.1:8774/draft/k/pdf') || [os, pdf]; });
      await T('klepnutí na zisk ho ukáže (celá kalkulace zůstane)', async () => { await p.locator('.nab small').click(); await p.waitForTimeout(300);
        const t = (await p.locator('.nabidky .nab').first().textContent()).replace(/\s+/g, ' '); return (t.includes('80 000') && t.includes('Celkem s DPH')) || t; });
    }
    await T('bez chyb ve stránce', async () => p.chyby.length === 0 || p.chyby);
  }
  await br.close(); console.log(`\n${ok} / ${celkem}`); process.exit(ok === celkem ? 0 : 1);
})();
