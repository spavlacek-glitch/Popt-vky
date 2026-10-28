// test_vzhled.js – zobrazení přehledu Poptávek na PC a iPhonu v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
// Udělá snímky a změří rozložení přehledu. Spuštění jako test_v1.2.js:
//   SOUBOR=poptavky_v1.3.html SCREEN_DIR=/kam/snimky FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vzhled.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.3.html', OUT = process.env.SCREEN_DIR || os.tmpdir();
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
if (!html.includes(INIT)) throw new Error('Chybí řádek inicializace Firebase');
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-vzhled-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const den = off => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const {userAgent, ...IPHONE} = devices['iPhone 13'];   // velikost a dotyk iPhonu; UA vynechán (Auth SDK by s ním načítal skript Googlu)

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
const M = (popis, h) => console.log('  •', popis, '→', h);

// Fiktivní poptávky: 2 prošlé, 3 dnes, 6 budoucích, 2 prodané, 1 ztracená
const POPT = [
  ['Pavel Testovací','777 111 001','GLC 300 e 4MATIC, chce leasing na 4 roky', 'nabidka', -3],
  ['Novák Stavby s.r.o.','731 000 111','2× Sprinter 317 CDI skříň', 'jednani', -1],
  ['Eva Mailová','','A 250 e Limousine', 'nova', 0, 'eva.mailova@example.cz'],
  ['Tomáš Černý','775 888 999','GLE 450 d, protiúčtem GLE 400 d', 'nova', 0],
  ['Marie Dlouhojmenná-Přespříliš','608 222 333','EQA 250+ pro manželku, řešit wallbox a předání do konce měsíce', 'nabidka', 0],
  ['Jan Novák','777 444 333','C 200 kombi', 'nova', 1], ['Jana Nováková','602 111 222','CLA Shooting Brake', 'jednani', 2],
  ['Karel Souběžný','721 100 200','EQE SUV', 'nabidka', 3], ['Firma ABC a.s.','720 111 222','Fleet 5× Vito Tourer', 'jednani', 5],
  ['Lenka Offline','731 222 444','GLA 200', 'nova', 7], ['Ota Zavřel','731 555 666','B 180', 'nova', 14],
  ['Petr Prodaný','720 999 111','E 220 d', 'prodano', null], ['Hana Hotová','720 999 222','GLB 200', 'prodano', null],
  ['Zdeněk Ztracený','720 999 333','S 450 – šel jinam', 'ztraceno', null]
];

// Očekávané rozložení od v1.3
async function kontrolyV13(p, nazev, sirka, {hl, dz, ev}){
  const pc = sirka >= 960;
  await T(`${nazev}: ${pc ? 'dva sloupce – vlevo „Dnes zavolat“, vpravo evidence' : 'jeden sloupec – „Dnes zavolat“ nad evidencí'}`, async () =>
    (pc ? dz.x < ev.x - 300 && Math.abs(dz.y - ev.y) < 30 : Math.abs(dz.x - ev.x) < 20 && ev.y > dz.y) || {dz, ev});
  await T(`${nazev}: dnešní úkoly vizuálně oddělené (vlastní podbarvený panel)`, async () => p.evaluate(() => {
    const d = document.querySelector('section.dnes'), bg = getComputedStyle(d).backgroundColor;
    return d.contains([...document.querySelectorAll('h2')].find(h => h.textContent.includes('Dnes zavolat'))) && bg !== getComputedStyle(document.body).backgroundColor
      && !document.querySelector('section.evidence').contains(d) || bg; }));
  await T(`${nazev}: hlavička na jednom řádku, ${pc ? 's e-mailem' : 'bez e-mailu, nízká'}, Odhlásit celé na obrazovce`, async () => {
    const odh = await p.locator('header button:has-text("Odhlásit")').boundingBox(), h1 = await p.locator('header h1').boundingBox();
    const who = await p.locator('#who').isVisible();
    return (odh.x + odh.width <= sirka && h1.height < 30 && who === pc && (pc || hl.height <= 50)) || {hl: hl.height, h1: h1.height, odh, who}; });
  await T(`${nazev}: zůstaly všechny ovládací prvky (+ Nová poptávka, hledání, 4 filtry, export, hecovací věta)`, async () =>
    (await p.locator('#fab').isVisible() && await p.locator('#hledat').isVisible() && await p.locator('.evidence .chips .chip').count() === 4
      && await p.locator('button:has-text("Export do Excelu")').count() === 1 && await p.locator('.dnes .hec').count() >= 1) || 'chybí prvek');
  await T(`${nazev}: hledání a filtry dál fungují`, async () => {
    await p.fill('#hledat', 'sprinter'); const n1 = await p.locator('#seznam .card').count();
    await p.fill('#hledat', ''); await p.click('.chip:has-text("Prodáno")'); const n2 = await p.locator('#seznam .card').count();
    await p.click('.chip:has-text("Otevřené")');
    return (n1 === 1 && n2 === 2) || {n1, n2}; });
  await T(`${nazev}: formulář a detail mají dál úzký sloupec (max. 720 px)`, async () => {
    await p.click('#fab'); const f = await p.locator('main#view').boundingBox();
    await p.click('#view button:has-text("Zpět")'); await p.locator('.dnes .card').first().click(); const d = await p.locator('main#view').boundingBox();
    await p.click('button:has-text("← Přehled")'); await p.waitForSelector('section.dnes');
    return (f.width <= 720 && d.width <= 720) || {f: f.width, d: d.width}; });
}

// „← Přehled“ v detailu: na mobilu plovoucí dole vlevo, na PC nahoře; nesmí trvale zakrýt ovládací prvky
async function kontrolyDetail(p, nazev, sirka, jmeno){
  const mobil = sirka <= 600, vyska = p.viewportSize().height;
  await p.locator('.dnes .card', {hasText:'Pavel Testovací'}).click(); await p.waitForSelector('button:has-text("← Přehled")');
  const tl = p.locator('button:has-text("← Přehled")');
  const prekryte = () => p.evaluate(() => {          // ovládací prvky v detailu, které tlačítko právě překrývá
    const z = document.querySelector('.zpet button').getBoundingClientRect();
    return [...document.querySelectorAll('#view button, #view a, #view input, #view textarea, #view .chip')]
      .filter(e => !e.closest('.zpet')).filter(e => { const r = e.getBoundingClientRect();
        return r.width && r.left < z.right && r.right > z.left && r.top < z.bottom && r.bottom > z.top; })
      .map(e => (e.textContent || e.placeholder || e.type).trim().slice(0, 30));
  });
  const r = await tl.boundingBox(), pos = await tl.evaluate(e => getComputedStyle(e.parentElement).position);
  await T(`${nazev}: „← Přehled“ ${mobil ? 'plovoucí dole vlevo, menší, s odstupem od spodního okraje' : 'zůstává nahoře v detailu'}`, async () =>
    (mobil ? pos === 'fixed' && r.x <= 20 && vyska - (r.y + r.height) >= 16 && r.height <= 44 && r.width <= 130
           : pos !== 'fixed' && r.y < 120) || {r, pos, vyska});
  if (mobil) {
    M(`${nazev}: odstup tlačítka od spodního okraje`, Math.round(vyska - (r.y + r.height)) + ' px');
    M(`${nazev}: při otevření detailu tlačítko překrývá`, JSON.stringify(await prekryte()));
    await p.screenshot({path: path.join(OUT, `${jmeno}_${nazev.replace(/\s/g, '')}_detail.png`)});
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await T(`${nazev}: po dorolování dolů tlačítko nezakrývá nic (Upravit údaje, Smazat, …)`, async () => {
      const x = await prekryte(); return x.length === 0 || x; });
    await p.screenshot({path: path.join(OUT, `${jmeno}_${nazev.replace(/\s/g, '')}_detail_dole.png`)});
    await T(`${nazev}: při psaní poznámky se tlačítko schová a po dopsání vrátí`, async () => {
      await p.focus('#d-pozn'); const pri = await tl.isVisible();
      await p.evaluate(() => document.activeElement.blur()); const po = await tl.isVisible();
      await p.focus('input[type=date]'); const datum = await tl.isVisible(); await p.evaluate(() => document.activeElement.blur());
      return (!pri && po && !datum) || {pri, po, datum}; });
  } else await p.screenshot({path: path.join(OUT, `${jmeno}_${nazev.replace(/\s/g, '')}_detail.png`)});
  await T(`${nazev}: „← Přehled“ vrátí na přehled; formulář nové poptávky tlačítko nemá`, async () => {
    await tl.click(); const doma = await p.locator('section.dnes').isVisible();
    await p.click('#fab'); const veFormulari = await p.locator('.zpet').count();
    await p.click('#view button:has-text("Zpět")');
    return (doma && veFormulari === 0) || {doma, veFormulari}; });
}

(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:'stanislav.prodejce@suw.example.cz', password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  const poptavky = {};
  POPT.forEach(([jmeno, telefon, zajem, stav, off, email], i) => {
    poptavky['p' + String(i).padStart(2, '0')] = {kanal: email ? 'email' : ['showroom','telefon'][i % 2], jmeno, telefon, email: email || '', zajem, stav,
      dalsiKontakt: off === null ? null : den(off), vytvoreno: Date.now() - i * 86400000, upraveno: Date.now(), prodejce:'stanislav.prodejce@suw.example.cz',
      historie:{h:{t:Date.now(), kdo:'stanislav.prodejce@suw.example.cz', text:'Založeno'}}};
  });
  for (let k = 1; k <= 8; k++)   // delší historie u první poptávky, aby se detail na mobilu posouval
    poptavky.p00.historie['h' + k] = {t:Date.now() - k * 3600000, kdo:'stanislav.prodejce@suw.example.cz', text:`Volal jsem (${k}), chce ještě srovnat s leasingem a poslat kalkulaci na e-mail.`};
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:'stanislav.prodejce@suw.example.cz'}}, poptavky});

  const br = await chromium.launch();
  const otevri = async opts => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message));
    await p.goto(STRANKA);
    await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
    if (!(await p.locator('#app:not(.hidden)').count())) {
      await p.fill('#l-mail', 'stanislav.prodejce@suw.example.cz'); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")');
    }
    await p.waitForSelector('h2:has-text("Dnes zavolat")'); await p.waitForFunction(() => document.querySelectorAll('#seznam .card').length === 11);
    return p;
  };
  const box = (p, sel) => p.locator(sel).first().boundingBox();
  const jmeno = SOUBOR.replace('.html', '');

  for (const [nazev, opts] of [['PC 1440', {viewport:{width:1440, height:900}}], ['PC 1280', {viewport:{width:1280, height:800}}], ['notebook 1024', {viewport:{width:1024, height:700}}], ['iPhone 13', IPHONE], ['iPhone SE', {...IPHONE, viewport:{width:320, height:568}}]]) {
    console.log(`== ${nazev}`);
    const p = await otevri(opts);
    const hl = await box(p, 'header'), dz = await box(p, 'h2:has-text("Dnes zavolat")'), ev = await box(p, 'h2:has-text("Poptávky")'), hledat = await box(p, '#hledat');
    M('výška hlavičky', Math.round(hl.height) + ' px');
    M('„Dnes zavolat“ x/y', `${Math.round(dz.x)} / ${Math.round(dz.y)}`); M('„Poptávky“ x/y', `${Math.round(ev.x)} / ${Math.round(ev.y)}`);
    M('šířka vyhledávání', Math.round(hledat.width) + ' px');
    M('karet viditelných bez posouvání', await p.evaluate(() => [...document.querySelectorAll('.card')].filter(c => c.getBoundingClientRect().bottom <= innerHeight).length));
    await p.screenshot({path: path.join(OUT, `${jmeno}_${nazev.replace(/\s/g, '')}.png`)});
    if (SOUBOR !== 'poptavky_v1.2.html') { await kontrolyV13(p, nazev, opts.viewport.width, {hl, dz, ev}); await kontrolyDetail(p, nazev, opts.viewport.width, jmeno); }
    await T(`${nazev}: žádné chyby, nic se neposouvá do stran`, async () =>
      (p.chyby.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || p.chyby);
    await p.context().close();
  }
  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
