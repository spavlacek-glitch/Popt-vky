// test_odkaz_v1.6.js – odkaz „Poptávky“ v kontaktu iPhonu otevře rovnou detail poptávky (v1.6). LOKÁLNÍ emulátory, jen smyšlená data.
// Celý řetězec: export kontaktu → odkaz ze souboru .vcf → poptavky.html (stálá adresa) → přihlášení → detail.
// Spuštění: emulátory jako u test_v1.2.js, pak
//   ICALJS=/cesta/k/node_modules/ical.js FIREBASE10=/cesta/k/node_modules/firebase node testy/test_odkaz_v1.6.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.6.html';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-odkaz-'));
// Kopie appky přesměrovaná na emulátory a beze změny stálá adresa poptavky.html (přesměrování na aktuální verzi)
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
if (!html.includes(INIT)) throw new Error('Chybí řádek inicializace Firebase');
fs.writeFileSync(path.join(TMP, SOUBOR), html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`));
fs.copyFileSync(path.join(ROOT, 'poptavky.html'), path.join(TMP, 'poptavky.html'));
const STALA = 'file://' + path.join(TMP, 'poptavky.html'), APP = 'file://' + path.join(TMP, SOUBOR);
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r).slice(0, 400)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
const radky = vcf => vcf.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean).map(r => { const i = r.indexOf(':'), h = r.slice(0, i).split(';')[0], t = h.indexOf('.');
  return {skupina: t > 0 ? h.slice(0, t) : '', jmeno: t > 0 ? h.slice(t + 1) : h, hodnota: r.slice(i + 1)}; });

const H = text => ({t: 1761000000000, kdo:'prodejce@suw.example.cz', text});
const POPT = {
  '-ODemoK7x2Pq1': {kanal:'showroom', jmeno:'Jan Testovací', telefon:'777 123 456', email:'jan@example.com', zajem:'Shání Mercedes-Benz GLE, rozpočet do 2 mil. Kč, chce leasing.', stav:'nabidka', dalsiKontakt:null, historie:{a: H('Založeno')}},
  '-ODemoK7x2Pq2': {kanal:'telefon', jmeno:'Žofie Šťastná', telefon:'602 111 222', email:'', zajem:'A 200 pro dceru', stav:'nova', dalsiKontakt:null, historie:{a: H('Založeno')}}
};

(async () => {
  const ICAL = (await import(path.join(process.env.ICALJS, 'dist', 'ical.js'))).default;
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body: fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8')});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:'prodejce@suw.example.cz', password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  const poptavky = {};
  for (const [id, p] of Object.entries(POPT)) poptavky[id] = {...p, vytvoreno: 1761000000000, upraveno: 1761000000000, prodejce:'prodejce@suw.example.cz'};
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true}}, poptavky});
  const pred = JSON.stringify(await admin(''));

  const br = await chromium.launch();
  const kontext = async opts => {
    const ctx = await br.newContext({...opts, acceptDownloads: true});
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = []; p.cizi = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    p.on('request', q => { if (!/^(file:|blob:|https:\/\/www\.gstatic\.com\/firebasejs\/|https?:\/\/127\.0\.0\.1:(9000|9099)|wss?:\/\/127\.0\.0\.1:9000)/.test(q.url())) p.cizi.push(q.url()); });
    return p;
  };
  const prihlas = async p => {   // přihlášení, pokud je potřeba (v Safari z odkazu poprvé ano)
    await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
    if (!(await p.locator('#app:not(.hidden)').count())) { await p.fill('#l-mail', 'prodejce@suw.example.cz'); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")'); }
  };
  const nacteno = p => p.waitForFunction(() => typeof dataNactena !== 'undefined' && dataNactena);

  for (const [nazev, opts, mobil] of [['iPhone 13', IPHONE, true], ['PC', {viewport: {width: 1280, height: 900}}, false]]) {
    console.log(`== ${nazev}`);
    const p = await kontext(opts);
    await p.goto(APP); await prihlas(p); await nacteno(p);
    let odkaz;
    await T(`${nazev}: kontakt z poptávky obsahuje odkaz „Poptávky“ na stálou adresu poptavky.html s ID poptávky`, async () => {
      await p.evaluate(() => renderDetail('-ODemoK7x2Pq1')); await p.waitForSelector('button:has-text("← Přehled")');
      if (mobil) await p.click('.md-vic');
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Uložit do kontaktů")')]);
      const vcf = fs.readFileSync(await dl.path(), 'utf8'), r = radky(vcf);
      const url = r.find(x => x.jmeno === 'URL'), st = r.find(x => x.jmeno === 'X-ABLabel'); odkaz = url && url.hodnota;
      const ic = new ICAL.Component(ICAL.parse(vcf));
      return (odkaz === STALA + '#poptavka=-ODemoK7x2Pq1' && url.skupina === 'item1' && st.hodnota === 'Poptávky' && st.skupina === 'item1'
        && ic.getFirstPropertyValue('url') === odkaz && ic.getFirstPropertyValue('fn') === 'Jan Testovací' && vcf.split('\r\n').every(x => Buffer.byteLength(x) <= 75)) || {odkaz, url, st}; });
    if (mobil) await p.keyboard.press('Escape');
    await p.context().close();

    await T(`${nazev}: odkaz v čerstvém prohlížeči (Safari z Kontaktů) → přesměrování na ${SOUBOR} → přihlášení → detail poptávky`, async () => {
      const q = await kontext(opts); await q.goto(odkaz); await prihlas(q); await nacteno(q);
      await q.waitForSelector(mobil ? '.md-karta' : 'button:has-text("Upravit údaje")');
      const t = await q.innerText('#view'), adresa = q.url();
      const vysl = t.includes('Jan Testovací') && t.includes('GLE') && (mobil ? await q.locator('.md-karta').count() === 3 : await q.locator('.md-karta').count() === 0)
        && adresa.endsWith(SOUBOR) && q.chyby.length === 0 && q.cizi.length === 0;
      await q.reload(); await nacteno(q); await q.waitForSelector('h2:has-text("Dnes zavolat")');   // obnovení stránky už detail znovu neotevře
      const poObnoveni = await q.locator('section.dnes').isVisible();
      await q.context().close();
      return (vysl && poObnoveni) || {t: t.slice(0, 120), adresa, poObnoveni, ch: q.chyby}; });
  }

  console.log('== Hraniční případy (iPhone 13)');
  const p = await kontext(IPHONE);
  await T('smazaná poptávka → přehled s hláškou „Poptávku z kontaktu jsem nenašel – možná byla smazaná.“', async () => {
    await p.goto(STALA + '#poptavka=-OSmazana000'); await prihlas(p); await nacteno(p); await p.waitForSelector('section.dnes');
    const t = await p.innerText('#view');
    return (t.includes('Poptávku z kontaktu jsem nenašel') && !p.url().includes('#')) || t.slice(0, 200); });
  await T('hláška zmizí při dalším překreslení přehledu', async () => {
    await p.evaluate(() => renderHome());
    return !(await p.innerText('#view')).includes('nenašel') || 'zůstala'; });
  await T('poškozený odkaz (%E0%A4%A) → přehled s hláškou, žádná chyba stránky', async () => {
    await p.goto(STALA + '#poptavka=%E0%A4%A'); await nacteno(p); await p.waitForSelector('section.dnes');
    return ((await p.innerText('#view')).includes('nenašel') && p.chyby.length === 0) || p.chyby; });
  await T('bez odkazu se Poptávky otevřou normálně na přehledu (stálá adresa i přímo verze)', async () => {
    await p.goto(STALA); await nacteno(p); await p.waitForSelector('section.dnes'); const a1 = p.url().endsWith(SOUBOR) && !(await p.innerText('#view')).includes('nenašel');
    await p.goto(APP); await nacteno(p); await p.waitForSelector('section.dnes'); const a2 = !(await p.innerText('#view')).includes('nenašel');
    return (a1 && a2) || {a1, a2}; });
  await T('druhý odkaz v už otevřených Poptávkách (změna adresy) otevře další poptávku', async () => {
    await p.evaluate(() => { location.hash = '#poptavka=-ODemoK7x2Pq2'; });
    await p.waitForFunction(() => document.querySelector('#view').innerText.includes('Žofie Šťastná') && document.querySelector('.md-karta'));
    return !p.url().includes('#') || p.url(); });
  await T('odkazy nic nezapsaly do databáze', async () => JSON.stringify(await admin('')) === pred || 'databáze se změnila');
  await T('žádné chyby stránky, systémová okna ani požadavky mimo emulátory', async () => (p.chyby.length === 0 && p.cizi.length === 0) || {ch: p.chyby, cizi: p.cizi});
  await p.context().close();

  await br.close();
  fs.rmSync(TMP, {recursive: true, force: true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
