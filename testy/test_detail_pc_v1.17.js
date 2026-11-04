// test_detail_pc_v1.17.js – detail poptávky na PC ve dvou sloupcích (v1.17) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.17.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vuz_v1.16.js
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-detailpc-'));
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
  
  const NAB={model:'GLS 450 d 4MATIC',cena_sdph:2899545,cena_vuz_sdph:2899545,sleva_sdph:322000,sleva_pct:10,doplnky_sdph:0,soubor:'x.pdf',zdroj:'offerstudio',t:ted,kdo:JA};
  await admin('poptavky/a_sklad/nabidky/k','PUT',NAB);
  for (const w of [1440, 1100, 1920]) {
    console.log('== PC', w);
    const p = await otevri({viewport:{width:w,height:900}});
    await p.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await p.waitForSelector('.pc-detail');
    await T('dva sloupce: vpravo stav a zápis, vlevo zákazník a poptávka', async () => {
      const l = await p.locator('.pc-lev').boundingBox(), r = await p.locator('.pc-prav').boundingBox();
      return (r.x > l.x + l.width - 1 && Math.abs(r.y - l.y) < 4 && l.width > 450 && r.width > 350) || [l, r]; });
    await T('široký obsah (víc než 720 px)', async () => (await p.locator('.pc-detail').boundingBox()).width > 900);
    await T('vůz, nabídka, Co chce v levém sloupci; stav, zápis a historie v pravém', async () => {
      const l = await p.locator('.pc-lev').textContent(), r = await p.locator('.pc-prav').textContent();
      return (l.includes('Skladový · 05-576-12345') && l.includes('GLS 450 d') && l.includes('GLC skladem') && r.includes('Stav') && r.includes('Zapsat') && r.includes('Historie kontaktů')) || [l, r]; });
    await T('historie je rozbalená, jde sbalit a po zápisu zůstane sbalená', async () => {
      const otv = () => p.evaluate(() => document.querySelector('.pc-prav details').open);
      const a = await otv(); await p.click('.pc-prav summary'); const b = await otv();
      await p.fill('#d-pozn', 'Zkouška zápisu'); await p.click('button:has-text("Zapsat")'); await p.waitForTimeout(500);
      return (a === true && b === false && (await otv()) === false) || [a, b, await otv()]; });
    await T('bez posunu do stran', async () => !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
    await T('Upravit údaje a Smazat dole', async () => (await p.locator('.pc-konec').textContent()).includes('Upravit údaje'));
    await T('bez chyb ve stránce', async () => p.chyby.length === 0 || p.chyby);
  }
  const m = await otevri(IPHONE);
  await m.locator('#seznam .card',{hasText:'Jana Skladová'}).click(); await m.waitForTimeout(400);
  await T('iPhone: mobilní detail beze změny (bez .pc-detail)', async () => (await m.locator('.pc-detail').count()) === 0 && (await m.locator('.md-karta').count()) > 0);
  await br.close(); console.log(`\n${ok} / ${celkem}`); process.exit(ok === celkem ? 0 : 1);
})();
