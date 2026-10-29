// test_gdpr_v1.9.js – „Souhlas GDPR“ v detailu poptávky v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.9.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_gdpr_v1.9.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.9.html', OUT = process.env.SCREEN_DIR;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');
const FORMULAR = 'https://www.mercedes-benz.cz/passengercars/content-pool/marketing-pool/contact-forms/doc.html?d=2021-06-22&can=RetailWeb&cpid=doc_ms_7672&le=D-Outlet.9058&s=generic_landing_page';

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-gdpr-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const PRODEJCE = 'stanislav.prodejce@suw.example.cz';
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const P = (jmeno, telefon, email) => ({kanal:'telefon', jmeno, telefon, email, zajem:'GLC', stav:'nova', dalsiKontakt:'2030-01-01',
  vytvoreno: 1761000000000, upraveno: 1761000000000, prodejce: PRODEJCE, historie:{h:{t:1761000000000, kdo:PRODEJCE, text:'Založeno'}}});
const POPT = {
  oba: P('Jan Novák', '+420 777 123 456', 'jan.novak@example.cz'),
  tel: P('Jen Telefon', '602 111 222', ''),
  mail: P('Jen Mail', '', 'o\'brien+test@example.cz'),
  nic: P('Bez Kontaktu', '', '')
};

// Rozebere odkaz sms:/mailto: → {kam, predmet, text}
const rozeber = href => { const [kam, q] = href.split('?'); const par = new URLSearchParams(q.replace(/^&/, ''));
  return {kam, predmet: par.get('subject'), text: par.get('body')}; };

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
  const detail = async (p, id) => { await p.evaluate(id => renderDetail(id), id); await p.waitForSelector('#view button:has-text("← Přehled")'); };

  for (const [nazev, opts, sel] of [['PC 1280', {viewport:{width:1280, height:900}}, '#view .gdpr a'], ['iPhone 13', IPHONE, '#md-panel a.md-radek']]) {
    console.log(`== ${nazev}`);
    const p = await otevri(opts), mobil = nazev.startsWith('iPhone');
    const odkazy = async id => { await detail(p, id); if (mobil) { await p.click('.md-vic'); await p.waitForSelector('#md-panel:not(.hidden)'); }
      const r = await p.$$eval(sel, el => el.map(e => [e.textContent.trim(), e.getAttribute('href')]));
      if (mobil) await p.keyboard.press('Escape'); return r; };

    await T(`${nazev}: telefon i e-mail → SMS i e-mail s odkazem na formulář MB`, async () => {
      const o = await odkazy('oba'), sms = rozeber(o[0][1]), mail = rozeber(o[1][1]);
      return (o.length === 2 && /SMS/.test(o[0][0]) && /e-mailem/.test(o[1][0])
        && sms.kam === 'sms:+420777123456' && sms.text.includes('\n\n' + FORMULAR + '\n\n') && sms.text.startsWith('Dobrý den')
        && mail.kam === 'mailto:jan.novak@example.cz' && mail.text === sms.text && mail.predmet.includes('Souhlas')) || {o, sms, mail}; });
    if (OUT) { await detail(p, 'oba'); if (mobil) await p.click('.md-vic'); await p.screenshot({path: path.join(OUT, `gdpr_${nazev.replace(/\s/g, '')}.png`)}); if (mobil) await p.keyboard.press('Escape'); }
    await T(`${nazev}: jen telefon → jen SMS; jen e-mail → jen e-mail (adresa správně zakódovaná)`, async () => {
      const t = await odkazy('tel'), m = await odkazy('mail');
      return (t.length === 1 && rozeber(t[0][1]).kam === 'sms:602111222' && m.length === 1
        && decodeURIComponent(rozeber(m[0][1]).kam) === "mailto:o'brien+test@example.cz" && !m[0][1].includes("'")) || {t, m}; });
    await T(`${nazev}: bez telefonu i e-mailu se GDPR nenabízí`, async () => (await odkazy('nic')).length === 0 || 'zobrazeno');
    if (!mobil) await T(`${nazev}: řádek GDPR je pod „Uložit do kontaktů“ a nad „Co chce“`, async () => {
      await detail(p, 'oba');
      const k = await p.locator('button:has-text("Uložit do kontaktů")').boundingBox(), g = await p.locator('.gdpr').boundingBox(), c = await p.locator('label:has-text("Co chce")').boundingBox();
      return (g.y > k.y + k.height - 1 && g.y + g.height < c.y + 1) || {k, g, c}; });
    await T(`${nazev}: nic se nezapsalo do databáze, žádné chyby ani systémová okna`, async () =>
      (JSON.stringify(await admin('poptavky')) === pred && p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || p.chyby);
    await p.context().close();
  }
  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
