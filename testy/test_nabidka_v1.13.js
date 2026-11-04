// test_nabidka_v1.13.js – „📄 Udělat nabídku“ v detailu poptávky v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.13.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_nabidka_v1.13.js
// Volitelně i celá cesta do Offer Studia: OFFER_STUDIO=/cesta/k/Mercedes-Offer-Studio (spustí kopii na 127.0.0.1:8774
// v dočasné složce, FotoLab/Word se nespouští) – klepnutí na tlačítko pak musí otevřít předvyplněnou nabídku.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.36.html', OUT = process.env.SCREEN_DIR, OS_DIR = process.env.OFFER_STUDIO;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-nabidka-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const PRODEJCE = 'stanislav.prodejce@suw.example.cz';
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const P = (jmeno, telefon, email, zajem = 'GLC 300 e, nejlépe skladem') => ({kanal:'telefon', jmeno, telefon, email, zajem, stav:'nova', dalsiKontakt:'2030-01-01',
  vytvoreno: 1761000000000, upraveno: 1761000000000, prodejce: PRODEJCE, historie:{h:{t:1761000000000, kdo:PRODEJCE, text:'Založeno'}}});
const POPT = {
  '-Noba_1': P('Jana Nováková', '+420 777 123 456', 'jana.novakova@example.cz'),
  '-Ntel_2': P('Pavel Havel', '602 111 222', ''),
  '-Nzvl_3': P('Tom "Bob" O\'Neil & syn', '', 'bob@example.cz', 'Chce <b>tučně</b> a #hash & ?otazník\n2. řádek'),
  '-Nnic_4': P('', '', '', '')
};

// Offer Studio v dočasné kopii (bez Tk, Playwrightu a Wordu – ty se v tomto testu nepoužijí)
function spustOfferStudio(){
  const kopie = fs.mkdtempSync(path.join(os.tmpdir(), 'offer-studio-'));
  for (const f of fs.readdirSync(OS_DIR)) if (/\.(py|png)$/.test(f)) fs.copyFileSync(path.join(OS_DIR, f), path.join(kopie, f));
  const kod = `import sys,types
for n in ('playwright','playwright.sync_api','tkinter','tkinter.ttk','tkinter.messagebox','tkinter.filedialog'):
    m=types.ModuleType(n); m.__getattr__=lambda x: type(x,(),{}); sys.modules[n]=m
sys.path.insert(0,'.'); import app, uvicorn; uvicorn.run(app.app,host='127.0.0.1',port=8774,log_level='warning')`;
  const proc = spawn('python3', ['-c', kod], {cwd: kopie, stdio: 'inherit'});
  return {proc, kopie};
}
const cekej = async url => { for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 250)); } return false; };

(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:PRODEJCE, password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:PRODEJCE}}, poptavky: POPT});
  const pred = JSON.stringify(await admin('poptavky'));

  const br = await chromium.launch();
  const otevri = async opts => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    await p.goto(STRANKA);
    await p.fill('#l-mail', PRODEJCE); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")');
    await p.waitForFunction(() => document.querySelectorAll('#seznam .card').length === 4);
    return p;
  };
  const detail = async (p, id) => { await p.evaluate(id => renderDetail(id), id); await p.waitForSelector('#view .zpet-pc, .zpet button'); };

  for (const vp of [{width:1280, height:900}, {width:1024, height:700}]) {
    const nazev = 'PC ' + vp.width;
    console.log(`== ${nazev}`);
    const p = await otevri({viewport: vp});
    const odkaz = async id => { await detail(p, id); const el = p.locator('#view .nabidka a');
      return {n: await el.count(), href: await el.getAttribute('href'), target: await el.getAttribute('target'), txt: (await el.textContent()).trim()}; };

    await T(`${nazev}: každá poptávka má „📄 Udělat nabídku“ s odkazem na Offer Studio 127.0.0.1:8774/nova`, async () => {
      const r = [];
      for (const id of Object.keys(POPT)) { const o = await odkaz(id); if (!(o.n === 1 && o.href.startsWith('http://127.0.0.1:8774/nova?') && o.target === 'offerstudio' && o.txt === '📄 Udělat nabídku')) r.push([id, o]); }
      return r.length === 0 || r; });
    await T(`${nazev}: odkaz nese ID poptávky, jméno, telefon, e-mail a „Co chce“`, async () => {
      const q = new URL((await odkaz('-Noba_1')).href).searchParams;
      return (q.get('poptavka') === '-Noba_1' && q.get('jmeno') === 'Jana Nováková' && q.get('telefon') === '+420 777 123 456'
        && q.get('email') === 'jana.novakova@example.cz' && q.get('zajem') === 'GLC 300 e, nejlépe skladem') || Object.fromEntries(q); });
    await T(`${nazev}: uvozovky, &, #, ? a < > ve jméně i textu projdou beze změny a bez vložení HTML`, async () => {
      const q = new URL((await odkaz('-Nzvl_3')).href).searchParams;
      return (q.get('jmeno') === POPT['-Nzvl_3'].jmeno && q.get('zajem') === POPT['-Nzvl_3'].zajem && q.get('telefon') === ''
        && await p.locator('#view b').count() === 0) || Object.fromEntries(q); });
    await T(`${nazev}: prázdná poptávka → prázdné parametry, žádné „undefined“`, async () => {
      const h = (await odkaz('-Nnic_4')).href; return !h.includes('undefined') || h; });
    await T(`${nazev}: řádek je pod „Uložit do kontaktů“ / GDPR a nad „Co chce“`, async () => {
      await detail(p, '-Noba_1');
      const g = await p.locator('.gdpr').boundingBox(), n = await p.locator('.nabidka').boundingBox(), c = await p.locator('.pc-nadpis:has-text("Poptávka")').boundingBox();
      return (n.y >= g.y + g.height - 1 && n.y + n.height <= c.y + 1) || {g, n, c}; });
    if (OUT) { await detail(p, '-Noba_1'); await p.screenshot({path: path.join(OUT, `nabidka_PC${vp.width}.png`)}); }
    await T(`${nazev}: nic se nezapsalo do databáze, žádné chyby, žádný vodorovný posuv`, async () =>
      (JSON.stringify(await admin('poptavky')) === pred && p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || p.chyby);
    await p.context().close();
  }

  for (const [nazev, opts] of [['iPhone 13', IPHONE], ['iPhone SE', {...IPHONE, viewport: {width: 320, height: 568}}]]) {
    console.log(`== ${nazev}`);
    const p = await otevri(opts);
    await T(`${nazev}: na mobilu se „Udělat nabídku“ nenabízí (Offer Studio běží jen na PC), ani v „Další akce“`, async () => {
      await detail(p, '-Noba_1'); await p.click('.md-vic'); await p.waitForSelector('#md-panel:not(.hidden)');
      const n = await p.locator('text=Udělat nabídku').count(); await p.keyboard.press('Escape');
      return (n === 0 && await p.locator('.nabidka').count() === 0) || n; });
    await T(`${nazev}: nic se nezapsalo, žádné chyby`, async () => (JSON.stringify(await admin('poptavky')) === pred && p.chyby.length === 0) || p.chyby);
    await p.context().close();
  }

  if (OS_DIR) {
    console.log('== Poptávky → Offer Studio (lokální kopie na 127.0.0.1:8774)');
    const {proc, kopie} = spustOfferStudio();
    try {
      await T('Offer Studio naběhlo na pevném portu 8774', async () => await cekej('http://127.0.0.1:8774/') || 'neběží');
      const p = await otevri({viewport:{width:1280, height:900}});
      await detail(p, '-Noba_1');
      const [nova] = await Promise.all([p.context().waitForEvent('page'), p.click('#view .nabidka a')]);
      await nova.waitForLoadState();
      await T('klepnutí otevře v novém okně předvyplněnou nabídku (zákazník, telefon, e-mail, ID poptávky, „Co chce“ v poznámce)', async () => {
        const v = n => nova.inputValue(`[name=${n}]`);
        const r = {c: await v('customer'), t: await v('customer_phone'), e: await v('customer_email'), id: await v('poptavka_id'), n: await v('notes')};
        return (r.c === 'Jana Nováková' && r.t === '+420 777 123 456' && r.e === 'jana.novakova@example.cz' && r.id === '-Noba_1'
          && r.n === 'Poptávka: GLC 300 e, nejlépe skladem' && (await nova.textContent('body')).includes('Nabídka k poptávce z Poptávek')) || r; });
      await T('e-mail v Offer Studiu osloví „vážená paní Nováková“', async () => {
        await nova.click('#emailnahled summary'); await nova.waitForFunction(() => document.querySelector('#nahledtelo').textContent.length > 50);
        const t = await nova.textContent('#nahledtelo'); return t.startsWith('Dobrý den, vážená paní Nováková,') || t.slice(0, 80); });
      if (OUT) await nova.screenshot({path: path.join(OUT, 'nabidka_offerstudio.png')});
      await T('Poptávky zůstaly beze změny', async () => JSON.stringify(await admin('poptavky')) === pred || 'změna');
      await p.context().close();
    } finally { proc.kill(); fs.rmSync(kopie, {recursive:true, force:true}); }
  }

  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
