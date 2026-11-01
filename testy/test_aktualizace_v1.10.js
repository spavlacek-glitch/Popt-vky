// test_aktualizace_v1.10.js – aktualizace za chodu v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
// Appka běží z malého lokálního HTTP serveru (jako z raw.githack.com), aby mohla číst poptavky.html.
//   SOUBOR=poptavky_v1.10.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_aktualizace_v1.10.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.10.html', OUT = process.env.SCREEN_DIR;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
if (!html.includes('const VERZE = [1, 10];')) throw new Error('Chybí VERZE');
// Smyšlená „budoucí“ verze v1.11 = stejná appka s jiným číslem
const V111 = html.replace('const VERZE = [1, 10];', 'const VERZE = [1, 11];').replace('<small>v1.10</small>', '<small>v1.11</small>');
const STALA = fs.readFileSync(path.join(ROOT, 'poptavky.html'), 'utf8');
if (!/const AKTUALNI = 'poptavky_v1\.10\.html';/.test(STALA) || !/const MINIMALNI = 'poptavky_v1\.10\.html';/.test(STALA)) throw new Error('poptavky.html neukazuje na v1.10');

// Lokální server: poptavky.html se dá za běhu přepsat (stala = obsah, null = 404)
let stala = STALA, pozadavky = 0;
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x').pathname.slice(1);
  if (u === 'poptavky.html') { pozadavky++; if (stala === null) { s.writeHead(404); return s.end(); } s.writeHead(200, {'content-type':'text/html; charset=utf-8'}); return s.end(stala); }
  const obsah = {[SOUBOR]: html, 'poptavky_v1.11.html': V111}[u];
  if (!obsah) { s.writeHead(404); return s.end(); }
  s.writeHead(200, {'content-type':'text/html; charset=utf-8'}); s.end(obsah);
});
const nastav = (akt, min = 'poptavky_v1.10.html') => { stala = STALA.replace(/AKTUALNI = '[^']+'/, `AKTUALNI = '${akt}'`).replace(/MINIMALNI = '[^']+'/, `MINIMALNI = '${min}'`); };

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const PRODEJCE = 'stanislav.prodejce@suw.example.cz';
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const P = (jmeno, dalsi) => ({kanal:'telefon', jmeno, telefon:'777 000 000', email:'', zajem:'Testovací ' + jmeno, stav:'nova', dalsiKontakt: dalsi,
  vytvoreno: Date.now(), upraveno: Date.now(), prodejce: PRODEJCE, historie:{h:{t: Date.now(), kdo: PRODEJCE, text:'Založeno'}}});

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${srv.address().port}/`, APP = BASE + SOUBOR;
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:PRODEJCE, password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:PRODEJCE}}, poptavky:{p1: P('Jan Aktualizační', '2030-01-01'), p2: P('Eva Dnešní', '2000-01-01')}});
  const pred = JSON.stringify(await admin('poptavky'));

  const br = await chromium.launch();
  const kontext = async opts => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    return ctx;
  };
  const prihlas = async p => {
    await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
    if (!(await p.locator('#app:not(.hidden)').count())) { await p.fill('#l-mail', PRODEJCE); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")'); }
    await p.waitForFunction(() => document.querySelectorAll('#seznam .card').length === 2);
  };
  const otevri = async (ctx, url = APP) => { const p = await ctx.newPage(); p.chyby = []; p.on('pageerror', e => p.chyby.push(e.message));
    p.on('dialog', d => { p.chyby.push('dialog'); d.dismiss(); }); await p.goto(url); await prihlas(p); return p; };
  const lista = p => p.locator('#nova-verze:not(.hidden)');
  const verzeStranky = p => p.locator('header h1 small').innerText();

  for (const [nazev, opts] of [['PC 1280', {viewport:{width:1280, height:800}}], ['iPhone 13', IPHONE]]) {
    console.log(`== ${nazev}`);
    const mobil = nazev.startsWith('iPhone'), ctx = await kontext(opts);

    nastav('poptavky_v1.10.html'); pozadavky = 0;
    const p = await otevri(ctx);
    await T(`${nazev}: aktuální verze → žádná lišta (poptavky.html přečtená při spuštění)`, async () => {
      await p.waitForTimeout(800); return (pozadavky >= 1 && await lista(p).count() === 0) || {pozadavky}; });
    await T(`${nazev}: v1.9 v poptavky.html není „novější“ než v1.10 → žádná lišta`, async () => {
      nastav('poptavky_v1.9.html'); await p.evaluate(() => zkontrolujVerzi()); await p.waitForTimeout(300);
      return await lista(p).count() === 0 || 'lišta'; });

    nastav('poptavky_v1.11.html');
    await T(`${nazev}: po návratu do popředí najde v1.11 → lišta „Aktualizovat“ a „Později“, obsah začíná pod ní`, async () => {
      await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await lista(p).waitFor();
      const t = await lista(p).innerText(), l = await lista(p).boundingBox(), h = await p.locator('header').boundingBox(), prvni = await p.locator('#view > *').first().boundingBox();
      return (t.includes('v1.11') && t.includes('Aktualizovat') && t.includes('Později') && Math.abs(l.y - (h.y + h.height)) < 2 && prvni.y >= l.y + l.height - 1
        && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || {t, l, h, prvni}; });
    if (OUT) await p.screenshot({path: path.join(OUT, `aktualizace_${nazev.replace(/\s/g, '')}.png`)});
    await T(`${nazev}: lišta zůstává vidět i při posouvání a sama nic nepřepne`, async () => {
      await p.evaluate(() => scrollTo(0, 400)); await p.waitForTimeout(5500);
      const l = await lista(p).boundingBox(), h = await p.locator('header').boundingBox();
      await p.evaluate(() => scrollTo(0, 0));
      return (l && l.y >= h.y + h.height - 2 && l.y < 140 && (await verzeStranky(p)) === 'v1.10') || {l, h}; });
    await T(`${nazev}: „Později“ lištu schová a obsah se vrátí nahoru; při další kontrole se už tatáž verze nenabízí`, async () => {
      await lista(p).locator('button:has-text("Později")').click();
      const zmizela = await lista(p).count() === 0, odsazeni = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lista').trim());
      await p.evaluate(() => zkontrolujVerzi()); await p.waitForTimeout(300);
      return (zmizela && odsazeni === '0px' && await lista(p).count() === 0) || {zmizela, odsazeni}; });
    await T(`${nazev}: „Aktualizovat“ v detailu → v1.11 s otevřeným detailem téže poptávky`, async () => {
      await p.reload(); await prihlas(p); await lista(p).waitFor();
      await p.locator('#seznam .card', {hasText:'Jan Aktualizační'}).click(); await p.waitForSelector('#view button:has-text("← Přehled")');
      await lista(p).locator('button:has-text("Aktualizovat")').click();
      await p.waitForURL(/poptavky_v1\.11\.html/); await prihlas(p).catch(() => {});
      await p.waitForSelector(mobil ? '.md-karta' : '#view button:has-text("Upravit údaje")');
      return ((await verzeStranky(p)) === 'v1.11' && (await p.innerText('#view')).includes('Jan Aktualizační') && !p.url().includes('#')) || p.url(); });
    await T(`${nazev}: v nejnovější verzi už se lišta neukáže`, async () => {
      await p.evaluate(() => zkontrolujVerzi()); await p.waitForTimeout(300); return await lista(p).count() === 0 || 'lišta'; });
    await p.close();

    // Povinná aktualizace (MINIMALNI vyšší než tahle verze): nikdy uprostřed psaní, jinak hned na přehledu
    nastav('poptavky_v1.10.html');
    const q = await otevri(ctx);
    await q.click('#fab'); await q.fill('#f-jmeno', 'Rozepsaná poptávka');
    nastav('poptavky_v1.11.html', 'poptavky_v1.11.html');
    await T(`${nazev}: povinná verze při psaní nové poptávky → lišta bez „Později“, nic se nepřepne`, async () => {
      await q.evaluate(() => zkontrolujVerzi()); await lista(q).waitFor(); await q.waitForTimeout(6000);
      const t = await lista(q).innerText();
      return (t.includes('dosloužila') && !t.includes('Později') && q.url().endsWith(SOUBOR) && await q.inputValue('#f-jmeno') === 'Rozepsaná poptávka'
        && await q.locator('#nova-verze.nutna').count() === 1) || {t, url: q.url()}; });
    await T(`${nazev}: po návratu na přehled se do 5 s přepne na v1.11 sama`, async () => {
      await q.fill('#f-jmeno', ''); await q.click('#view button:has-text("Zpět")');
      await q.waitForURL(/poptavky_v1\.11\.html/, {timeout: 8000}); await prihlas(q);
      return (await verzeStranky(q)) === 'v1.11' || 'nepřepnuto'; });
    await q.close();

    // Bez připojení / poptavky.html nedostupná: nic se nestane
    stala = null;
    const r = await otevri(ctx);
    await T(`${nazev}: když poptavky.html nejde načíst, appka běží dál bez lišty a bez chyb`, async () => {
      await r.waitForTimeout(800); return (await lista(r).count() === 0 && r.chyby.length === 0) || r.chyby; });
    await r.close();

    // Povinná verze na přihlašovací obrazovce: přepne hned (nic se neztratí)
    nastav('poptavky_v1.11.html', 'poptavky_v1.11.html');
    const ctx2 = await kontext(opts), s = await ctx2.newPage();
    await T(`${nazev}: povinná verze na přihlášení → rovnou v1.11`, async () => {
      await s.goto(APP); await s.waitForURL(/poptavky_v1\.11\.html/, {timeout: 8000}); return true; });
    await ctx2.close(); await ctx.close();
  }
  await T('nic se nezapsalo do databáze', async () => JSON.stringify(await admin('poptavky')) === pred || 'změna v databázi');
  await br.close(); srv.close();
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
