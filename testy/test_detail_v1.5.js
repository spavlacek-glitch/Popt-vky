// test_detail_v1.5.js – nový detail poptávky na mobilu (v1.5) a nezměněný detail na PC, v LOKÁLNÍCH emulátorech, jen smyšlená data.
// Spuštění: emulátory jako u test_v1.2.js (cd testy && npx firebase emulators:start --only database,auth --project demo-poptavky), pak
//   ICALJS=/cesta/k/node_modules/ical.js FIREBASE10=/cesta/k/node_modules/firebase node testy/test_detail_v1.5.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-detail-'));
function priprav(soubor){   // kopie appky přesměrovaná na emulátory, nic jiného se nemění
  let html = fs.readFileSync(path.join(ROOT, soubor), 'utf8');
  const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
  html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
  const INIT = 'const auth = firebase.auth(), db = firebase.database();';
  if (!html.includes(INIT)) throw new Error('Chybí řádek inicializace Firebase v ' + soubor);
  fs.writeFileSync(path.join(TMP, soubor), html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`));
  return 'file://' + path.join(TMP, soubor);
}
const V14 = priprav('poptavky_v1.4.html'), V15 = priprav(process.env.SOUBOR || 'poptavky_v1.5.html');   // SOUBOR=poptavky_v1.6.html pro novější verzi
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const den = off => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r).slice(0, 400)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const DLOUHY = 'GLE 450 d 4MATIC, ideálně obsidiánově černá, tažné zařízení a zimní kola.\nRozpočet do 2 mil. Kč, operativní leasing na 4 roky, nájezd 30 000 km/rok.\nNa protiúčet GLC 220 d z roku 2019.\nVolat raději po 16. hodině.';
const H = (t, text) => ({t, kdo:'prodejce@suw.example.cz', text});
const POPT = {
  p1: {kanal:'showroom', jmeno:'Jan Novák', telefon:'777 123 456', email:'jan.novak@example.cz', zajem: DLOUHY, stav:'nabidka', dalsiKontakt: den(0),
       historie:{a: H(1000, 'Založeno (🏢 Showroom)'), b: H(2000, 'Stav → Nabídka odeslána'), c: H(3000, 'Volal jsem, chce srovnat s BMW X5.')}},
  p2: {kanal:'telefon', jmeno:'Žofie Šťastná', telefon:'602 111 222', email:'', zajem:'A 200 pro dceru', stav:'nova', dalsiKontakt: den(-2), historie:{a: H(1000, 'Založeno (📞 Telefon)')}},
  p3: {kanal:'email', jmeno:'Petr Mailový', telefon:'', email:'petr@example.cz', zajem:'EQE SUV', stav:'jednani', dalsiKontakt: den(5), historie:{a: H(1000, 'Založeno (✉️ E-mail)')}},
  p4: {kanal:'showroom', jmeno:'Karel Smazat', telefon:'720 000 001', email:'', zajem:'Testovací ke smazání', stav:'nova', dalsiKontakt: den(1), historie:{a: H(1000, 'Založeno')}}
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

  const br = await chromium.launch();
  const otevri = async (url, opts) => {
    const ctx = await br.newContext({...opts, acceptDownloads: true});
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = []; p.cizi = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    p.on('request', q => { if (!/^(file:|blob:|https:\/\/www\.gstatic\.com\/firebasejs\/|https?:\/\/127\.0\.0\.1:(9000|9099)|wss?:\/\/127\.0\.0\.1:9000)/.test(q.url())) p.cizi.push(q.url()); });
    await p.goto(url);
    await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
    if (!(await p.locator('#app:not(.hidden)').count())) { await p.fill('#l-mail', 'prodejce@suw.example.cz'); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")'); }
    await p.waitForSelector('h2:has-text("Dnes zavolat")'); await p.waitForFunction(n => Object.keys(data).length === n, Object.keys(POPT).length);
    return p;
  };
  const detail = async (p, id) => { await p.evaluate(id => renderDetail(id), id); await p.waitForSelector('button:has-text("← Přehled")'); };
  const db1 = id => admin('poptavky/' + id);

  console.log('== PC: detail se nezměnil (porovnání s v1.4)');
  for (const [nazev, vp] of [['PC 1280', {width:1280, height:900}], ['notebook 1024', {width:1024, height:700}]]) {
    const a = await otevri(V14, {viewport: vp}), b = await otevri(V15, {viewport: vp});
    await T(`${nazev}: vykreslený detail všech 4 poptávek je v v1.5 stejný jako v v1.4`, async () => {
      const rozdily = [];
      for (const id of Object.keys(POPT)) { await detail(a, id); await detail(b, id);
        if (await a.innerHTML('#view') !== await b.innerHTML('#view')) rozdily.push(id); }
      return (rozdily.length === 0 && await b.locator('.md-vic, .md-karta').count() === 0) || rozdily; });
    await a.context().close(); await b.context().close();
  }

  for (const [nazev, opts] of [['iPhone 13', IPHONE], ['iPhone SE', {...IPHONE, viewport: {width: 320, height: 568}}]]) {
    console.log(`== ${nazev}: nový detail`);
    await admin('poptavky', 'PUT', poptavky);
    const p = await otevri(V15, opts), vyska = opts.viewport.height, sirka = opts.viewport.width;
    await detail(p, 'p1');
    await T(`${nazev}: nahoře stav „Nabídka odeslána“, termín „Zavolat dnes“, jméno, „Co chce“ a Zavolat/Napsat na první obrazovce`, async () => {
      const t = await p.innerText('.md-karta >> nth=0'), vol = await p.locator('a.md-akce.hlavni').boundingBox();
      return (t.includes('Nabídka odeslána') && t.includes('Zavolat dnes') && t.includes('Jan Novák') && t.includes('GLE 450 d')
        && await p.getAttribute('a.md-akce.hlavni', 'href') === 'tel:777123456' && await p.getAttribute('a.md-akce:not(.hlavni)', 'href') === 'mailto:jan.novak@example.cz'
        && vol.y + vol.height <= vyska && vol.height >= 44) || {t, vol}; });
    await T(`${nazev}: dlouhé „Co chce“ zkrácené na 4 řádky, „Zobrazit celý text“ ho rozbalí a zase sbalí`, async () => {
      const h1 = (await p.locator('.md-cochce').boundingBox()).height; await p.click('.md-odkaz');
      const h2 = (await p.locator('.md-cochce').boundingBox()).height; const txt = await p.textContent('.md-odkaz'); await p.click('.md-odkaz');
      const h3 = (await p.locator('.md-cochce').boundingBox()).height;
      return (h2 > h1 && txt === 'Zobrazit méně' && Math.abs(h3 - h1) < 1) || {h1, h2, h3, txt}; });
    await T(`${nazev}: v „Po hovoru“ je stav celým názvem „Nabídka odeslána“ a nic nepřetéká z karty (ani výběr data)`, async () => {
      const seg = await p.locator('.md-seg button', {hasText: 'Nabídka odeslána'}).count();
      const pretece = await p.evaluate(() => [...document.querySelectorAll('.md-karta *')].filter(e => { const r = e.getBoundingClientRect(), k = e.closest('.md-karta').getBoundingClientRect();
        return r.width && (r.right > k.right + 0.5 || r.left < k.left - 0.5); }).map(e => e.className || e.tagName));
      return (seg === 1 && pretece.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || {seg, pretece}; });
    await T(`${nazev}: „Zapsat poznámku“ je bez textu neaktivní; zápis přidá záznam do historie ve Firebase`, async () => {
      const pred = await p.isDisabled('#md-zapsat'); await p.fill('#d-pozn', `Poznámka z ${nazev}: chce výkup GLC.`);
      const po = await p.isDisabled('#md-zapsat'); await p.click('#md-zapsat');
      await p.waitForFunction(t => Object.values(data.p1.historie).some(h => h.text === t), `Poznámka z ${nazev}: chce výkup GLC.`);
      const h = Object.values((await db1('p1')).historie).map(x => x.text);
      return (pred && !po && h.includes(`Poznámka z ${nazev}: chce výkup GLC.`) && h.length === 4 && await p.inputValue('#d-pozn') === '') || {pred, po, h}; });
    await T(`${nazev}: rychlé volby termínu zapíší datum (+3 dny, Zítra) a označí se; text ukáže den slovy`, async () => {
      await p.click('.md-chip:has-text("+3 dny")'); await p.waitForFunction(d => data.p1.dalsiKontakt === d, den(3));
      const on = await p.textContent('.md-chip.on'), datum = await p.textContent('.md-datum b');
      await p.click('.md-chip:has-text("Zítra")'); await p.waitForFunction(d => data.p1.dalsiKontakt === d, den(1));
      return ((await db1('p1')).dalsiKontakt === den(1) && on === '+3 dny' && /^\S+ \d+\. \d+\.$/.test(datum.trim()) && (await p.textContent('.md-datum b')).startsWith('zítra')) || {on, datum}; });
    await T(`${nazev}: „📅 Datum…“ nastaví vlastní datum`, async () => {
      await p.locator('.md-chip input[type=date]').fill(den(10)); await p.waitForFunction(d => data.p1.dalsiKontakt === d, den(10));
      return (await db1('p1')).dalsiKontakt === den(10) || 'nezapsáno'; });
    await T(`${nazev}: stavy – Jednáme, Nabídka odeslána (+3 dny), Prodáno (termín zrušen, „Uzavřeno“) se zapíší i do historie`, async () => {
      await p.click('.md-seg button:has-text("Jednáme")'); await p.waitForFunction(() => data.p1.stav === 'jednani');
      await p.click('.md-seg button:has-text("Nabídka odeslána")'); await p.waitForFunction(() => data.p1.stav === 'nabidka');
      const plus3 = (await db1('p1')).dalsiKontakt === den(3);
      await p.click('.md-uzavrit button:has-text("Prodáno")'); await p.waitForFunction(() => data.p1.stav === 'prodano');
      const x = await db1('p1'), h = Object.values(x.historie).map(y => y.text);
      return (plus3 && x.dalsiKontakt === undefined && h.includes('Stav → Jednáme') && h.some(t => t.startsWith('Stav → Nabídka odeslána (další kontakt')) && h.includes('Stav → Prodáno')
        && (await p.textContent('.md-termin')) === 'Uzavřeno' && await p.locator('.md-uzavrit .prodano.on').count() === 1) || {plus3, x}; });
    await T(`${nazev}: historie je sbalená s posledním záznamem, klepnutí ji rozbalí a po živé změně zůstane rozbalená`, async () => {
      const zavreno = !(await p.locator('details.historie').evaluate(d => d.open)), sum = await p.innerText('details.historie summary');
      await p.click('details.historie summary'); await admin('poptavky/p1/upraveno', 'PUT', 1761000000001); await p.waitForTimeout(400);
      const otevreno = await p.locator('details.historie').evaluate(d => d.open);
      await p.click('details.historie summary');
      return (zavreno && otevreno && sum.includes('Historie kontaktů (7 záznamů)') && sum.includes('Naposledy')) || {zavreno, otevreno, sum}; });
    await T(`${nazev}: prošlý termín červeně „⚠ Zavolat – prošlé …“, chybějící e-mail → jen Zavolat přes celou šířku`, async () => {
      await detail(p, 'p2');
      const t = await p.locator('.md-termin.pozde').textContent(), n = await p.locator('.md-akce').count(), w = (await p.locator('.md-akce').boundingBox()).width;
      return (t.startsWith('⚠ Zavolat – prošlé') && n === 1 && w > sirka - 80 && await p.locator('.md-datum b.pozde').count() === 1) || {t, n, w}; });
    await T(`${nazev}: chybějící telefon → jen Napsat; krátké „Co chce“ bez odkazu „Zobrazit celý text“`, async () => {
      await detail(p, 'p3');
      return (await p.locator('a.md-akce.hlavni').count() === 0 && await p.locator('a.md-akce').count() === 1 && await p.locator('.md-odkaz').count() === 0) || 'kontakty'; });

    console.log(`== ${nazev}: plovoucí tlačítka a panel „Další akce“`);
    await detail(p, 'p3');
    await T(`${nazev}: „← Přehled“ dole vlevo, „Další akce ⋯“ dole vpravo, obě aspoň 44 px a 16 px od okraje`, async () => {
      const z = await p.locator('.zpet button').boundingBox(), v = await p.locator('.md-vic').boundingBox();
      return (z.x <= 20 && v.x + v.width >= sirka - 20 && vyska - (v.y + v.height) >= 16 && vyska - (z.y + z.height) >= 16 && v.height >= 44 && z.x + z.width < v.x) || {z, v}; });
    await T(`${nazev}: po dorolování dolů nic nezakrývají a při psaní se obě schovají`, async () => {
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(100);
      const v = await p.locator('.md-vic').boundingBox(), z = await p.locator('.zpet button').boundingBox();
      const spodek = await p.evaluate(() => Math.max(...[...document.querySelectorAll('#view > section')].map(e => e.getBoundingClientRect().bottom)));
      await p.focus('#d-pozn'); const pri = [await p.locator('.md-vic').isVisible(), await p.locator('.zpet').isVisible()];
      await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(400);
      return (spodek <= Math.min(v.y, z.y) && !pri[0] && !pri[1] && await p.locator('.md-vic').isVisible()) || {spodek, v: v.y, z: z.y, pri}; });
    await T(`${nazev}: „Další akce“ otevře panel; klepnutí mimo ho zavře`, async () => {
      await p.click('.md-vic'); const ot = await p.locator('#md-panel').isVisible();
      const t = await p.innerText('#md-panel');
      await p.mouse.click(sirka / 2, 30); const zav = !(await p.locator('#md-panel').isVisible());
      return (ot && zav && t.includes('Uložit do kontaktů') && t.includes('Upravit údaje') && t.includes('Smazat poptávku')) || {ot, zav, t}; });
    await T(`${nazev}: panel se živým překreslením detailu nezavře`, async () => {
      await p.click('.md-vic'); await admin('poptavky/p3/upraveno', 'PUT', 1761000000002); await p.waitForTimeout(400);
      const ot = await p.locator('#md-panel').isVisible(); await p.keyboard.press('Escape');
      return (ot && !(await p.locator('#md-panel').isVisible())) || ot; });
    await T(`${nazev}: z panelu se stáhne kontakt s označením „Petr Mailový · EQE“ (vCard, e-mail, poznámka)`, async () => {
      await p.click('.md-vic'); await p.fill('#d-oznaceni', 'EQE');
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#md-panel button:has-text("Uložit do kontaktů")')]);
      const c = new ICAL.Component(ICAL.parse(fs.readFileSync(await dl.path(), 'utf8')));
      const r = [c.getFirstPropertyValue('fn'), c.getFirstPropertyValue('email'), c.getFirstPropertyValue('note'), c.getFirstPropertyValue('tel')];
      await p.keyboard.press('Escape');
      return JSON.stringify(r) === JSON.stringify(['Petr Mailový · EQE', 'petr@example.cz', 'EQE SUV', null]) || r; });
    await T(`${nazev}: „Upravit údaje“ zavře panel a otevře formulář úprav této poptávky`, async () => {
      await p.click('.md-vic'); await p.click('#md-panel button:has-text("Upravit údaje")');
      await p.waitForSelector('h2:has-text("Upravit poptávku")');
      const ok2 = (await p.inputValue('#f-jmeno')) === 'Petr Mailový' && !(await p.locator('#md-panel').isVisible());
      await p.click('#view button:has-text("Zpět")'); return ok2 || 'formulář'; });
    await T(`${nazev}: smazání – „Ponechat“ nic nesmaže, „Smazat“ smaže a vrátí na přehled (bez systémového okna)`, async () => {
      await detail(p, 'p4'); await p.click('.md-vic'); await p.click('#md-panel button:has-text("Smazat poptávku")');
      const dotaz = await p.locator('#md-potvrd').isVisible(); await p.click('#md-potvrd button:has-text("Ponechat")');
      const stale = (await db1('p4')) !== null && !(await p.locator('#md-potvrd').isVisible());
      await p.click('#md-panel button:has-text("Smazat poptávku")'); await p.click('#md-potvrd button:has-text("Smazat")');
      await p.waitForSelector('section.dnes');
      const pryc = (await db1('p4')) === null, panel = await p.locator('#md-panel').isVisible();
      return (dotaz && stale && pryc && !panel) || {dotaz, stale, pryc, panel}; });
    await T(`${nazev}: otočení na šířku (nad 600 px) přepne na detail z PC a zpět`, async () => {
      await detail(p, 'p2'); await p.setViewportSize({width: 844, height: 390}); await p.waitForTimeout(200);
      const pc = await p.locator('.md-karta').count() === 0 && await p.locator('#view button:has-text("Upravit údaje")').isVisible();
      await p.setViewportSize(opts.viewport); await p.waitForTimeout(200);
      return (pc && await p.locator('.md-karta').count() === 3) || pc; });
    await T(`${nazev}: žádné chyby stránky, žádná systémová okna, žádné požadavky mimo emulátory`, async () => (p.chyby.length === 0 && p.cizi.length === 0) || {ch: p.chyby, cizi: p.cizi});
    if (process.env.SCREEN_DIR) {
      await detail(p, 'p2'); await p.screenshot({path: path.join(process.env.SCREEN_DIR, `v1.5_${nazev.replace(/\s/g, '')}_detail.png`)});
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.screenshot({path: path.join(process.env.SCREEN_DIR, `v1.5_${nazev.replace(/\s/g, '')}_detail_dole.png`)});
      await p.click('.md-vic'); await p.screenshot({path: path.join(process.env.SCREEN_DIR, `v1.5_${nazev.replace(/\s/g, '')}_panel.png`)});
    }
    await p.context().close();
  }
  await br.close();
  fs.rmSync(TMP, {recursive: true, force: true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
