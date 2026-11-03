// test_vlastnik_v1.25.js – vlastník poptávky a filtr podle prodejce pro vedoucího (v1.25) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.25.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vlastnik_v1.25.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.25.html';
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-vlastnik-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const VED = 'vedouci.lucie@suw.example.cz', MIR = 'miroslav.sykora@suw.example.cz', MAR = 'martin.esterka@suw.example.cz', HESLO = 'heslo123', DEN = 86400000, ted = Date.now();
const {userAgent, ...IPHONE} = devices['iPhone 13'];
const iso = off => { const d = new Date(ted + off * DEN); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
const P = (jmeno, prodejce, stav) => { const x = {kanal:'telefon', jmeno, telefon:'777123456', zajem:'GLC', stav, dalsiKontakt: iso(0),
  vytvoreno: ted - 3 * DEN, upraveno: ted - 3 * DEN, historie:{h0:{t: ted - 3 * DEN, kdo: prodejce || 'x', text:'Založeno (📞 Telefon)'}}}; if (prodejce) x.prodejce = prodejce; return x; };
const POPT = { m1: P('Ivana Mirová', MIR, 'nova'), m2: P('Petr Mirský', MIR, 'nabidka'), r1: P('Karel Martinů', MAR, 'nova'), v1: {...P('Eva Vedoucí', VED, 'nova'), dalsiKontakt: iso(-1), historie: {h0: {t: ted - 6 * DEN, kdo: VED, text: 'Založeno (📞 Telefon)'}, h1: {t: ted - 3 * DEN, kdo: VED, text: 'Volala jsem, chce nabídku na GLC'}, h2: {t: ted - 1 * DEN, kdo: VED, text: '📄 Nabídka připravena: GLC 300 · 1 500 000 Kč'}, h3: {t: ted - 1 * DEN + 1000, kdo: VED, text: 'Stav → Nabídka odeslána'}}}, bez: P('Stará Poptávka', null, 'nova') };
(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const reg = e => fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email:e, password:HESLO, returnSecureToken:true})}).then(r => r.json());
  const uv = await reg(VED), um = await reg(MIR), ur = await reg(MAR);
  await admin('', 'PUT', {uzivatele:{[uv.localId]:{schvalen:true, email:VED, vedouci:true}, [um.localId]:{schvalen:true, email:MIR}, [ur.localId]:{schvalen:true, email:MAR}}, poptavky: POPT});
  const br = await chromium.launch();
  const otevri = async (mail, karet, opts = {viewport:{width:1440,height:900}}) => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    await p.goto(STRANKA);
    await p.fill('#l-mail', mail); await p.fill('#l-pass', HESLO); await p.click('button:has-text("Přihlásit")');
    await p.waitForFunction(n => document.querySelectorAll('#seznam .card').length >= n, karet); await p.waitForTimeout(500);
    return p;
  };
  const jmena = async (p, sel) => (await p.locator(sel + ' .card .name').allTextContents()).map(x => x.trim()).sort();
  console.log('== vedoucí, PC');
  const v = await otevri(VED, 1);
  await T('výchozí je „Moje“: vedoucí vidí jen svou poptávku a v „Dnes zavolat“ taky', async () => {
    const e = await jmena(v, '#seznam'), d = await jmena(v, '.dnes'), sel = await v.locator('.fprodejce').inputValue();
    return (JSON.stringify(e) === JSON.stringify(['Eva Vedoucí']) && JSON.stringify(d) === JSON.stringify(e) && sel === '@moje') || [e, d, sel]; });
  await T('v1.26: „Poslední zápis“ je poslední skutečná poznámka, ne automatický řádek o nabídce nebo stavu', async () => {
    const c = await v.locator('#seznam .card', {hasText: 'Eva Vedoucí'}).textContent();
    return (c.includes('💬 Volala jsem, chce nabídku na GLC') && !c.includes('Nabídka připravena') && !c.includes('Stav → Nabídka odeslána')) || c; });
  await T('v1.26: karta v „Dnes zavolat“ je krátká – poznámka a prošlý termín (⚠), bez nabídky a vozu', async () => {
    const c = await v.locator('.dnes .card', {hasText: 'Eva Vedoucí'}).textContent();
    return (c.includes('💬 Volala jsem') && c.includes('⚠') && !c.includes('📄') && !c.includes('🚗')) || c; });
  await v.selectOption('.fprodejce', ''); await v.waitForTimeout(400);
  await T('vedoucí vidí po přepnutí na „Všichni“ všech 5 poptávek a prodejce u cizích (u vlastních (v1.26) ne)', async () => {
    const t = await v.locator('#seznam').textContent();
    return (t.includes('👤 Miroslav Sykora') && t.includes('👤 Martin Esterka') && !t.includes('👤 Vedouci Lucie') && t.includes('👤 (bez prodejce)') && (await v.locator('#seznam .card').count()) === 5) || t.slice(0, 300); });
  await T('filtr prodejce: Moje, Všichni a ostatní, u každého počet otevřených', async () => {
    const o = (await v.locator('.fprodejce option').allTextContents()).map(x => x.trim());
    return (o.length === 5 && o[1].includes('Všichni prodejci') && o.some(x => x.includes('Miroslav Sykora – 2 otevřených')) && o.some(x => x.includes('Martin Esterka – 1 otevřených')) && o[0].includes('Moje – 1 otevřených')) || o; });
  await T('filtr Miroslav: v evidenci i v „Dnes zavolat“ jen jeho dvě poptávky', async () => {
    await v.selectOption('.fprodejce', MIR); await v.waitForTimeout(400);
    const e = await jmena(v, '#seznam'), d = await jmena(v, '.dnes');
    return (JSON.stringify(e) === JSON.stringify(['Ivana Mirová', 'Petr Mirský']) && JSON.stringify(d) === JSON.stringify(e)) || [e, d]; });
  await T('výběr přežije obnovení stránky', async () => {
    await v.reload(); await v.fill('#l-mail', VED).catch(() => {}); await v.waitForTimeout(600);
    if (await v.isVisible('#l-mail')) { await v.fill('#l-mail', VED); await v.fill('#l-pass', HESLO); await v.click('button:has-text("Přihlásit")'); }
    await v.waitForSelector('#seznam .card'); await v.waitForTimeout(500);
    return (await v.locator('.fprodejce').inputValue()) === MIR && (await v.locator('#seznam .card').count()) === 2 || await v.locator('.fprodejce').inputValue(); });
  await T('zpět na „Všichni prodejci“ ukáže vše', async () => { await v.selectOption('.fprodejce', ''); await v.waitForTimeout(400); return (await v.locator('#seznam .card').count()) === 5; });
  await T('„Všichni“ přežije obnovení stránky (volba se pamatuje i tehdy, když není výchozí)', async () => {
    await v.reload(); await v.waitForTimeout(600);
    if (await v.isVisible('#l-mail')) { await v.fill('#l-mail', VED); await v.fill('#l-pass', HESLO); await v.click('button:has-text("Přihlásit")'); }
    await v.waitForSelector('#seznam .card'); await v.waitForTimeout(500);
    return (await v.locator('.fprodejce').inputValue()) === '' && (await v.locator('#seznam .card').count()) === 5; });
  await T('poptávka bez prodejce jde vyfiltrovat zvlášť', async () => { await v.selectOption('.fprodejce', ''); const o = await v.locator('.fprodejce option').evaluateAll(x => x.map(y => y.value)); return o.includes(''); });
  await T('detail na PC ukáže prodejce', async () => { await v.locator('#seznam .card', {hasText:'Karel Martinů'}).click(); await v.waitForTimeout(500); const t = await v.locator('#view').textContent(); return t.includes('👤 Martin Esterka') || t.slice(0, 300); });
  await T('vedoucí: žádné chyby stránky', async () => v.chyby.length === 0 || v.chyby);
  console.log('== prodejce, PC');
  const m = await otevri(MIR, 2);
  await T('prodejce vidí jen své dvě, bez filtru a bez řádku s vlastníkem', async () => {
    const t = await m.locator('#view').textContent();
    return ((await m.locator('#seznam .card').count()) === 2 && (await m.locator('.fprodejce').count()) === 0 && !t.includes('👤') && !t.includes('Martin Esterka')) || t.slice(0, 200); });
  console.log('== vedoucí, iPhone');
  const i = await otevri(VED, 1, IPHONE);
  await T('mobil: karta ukáže prodejce a filtr funguje', async () => {
    await i.selectOption('.fprodejce', ''); await i.waitForTimeout(400);
    const t = await i.locator('#seznam').textContent();
    await i.selectOption('.fprodejce', MAR); await i.waitForTimeout(400);
    return (t.includes('👤 Miroslav Sykora') && (await i.locator('#seznam .card').count()) === 1) || t.slice(0, 200); });
  await T('mobil: detail ukáže prodejce', async () => { await i.locator('#seznam .card').first().click(); await i.waitForTimeout(500); const t = await i.locator('#view').textContent(); return t.includes('👤 Martin Esterka') || t.slice(0, 200); });
  await T('mobil: žádné chyby stránky', async () => i.chyby.length === 0 || i.chyby);
  await br.close(); console.log(`\n${ok} / ${celkem}`); process.exit(ok === celkem ? 0 : 1);
})();
