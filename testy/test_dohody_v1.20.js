// test_dohody_v1.20.js – dohody z porady, Můj týden a Porada (v1.20) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.20.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_dohody_v1.20.js
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-dohody-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const VED = 'vedouci.lucie@suw.example.cz', PRO = 'jana.prodejce@suw.example.cz', HESLO = 'heslo123', DEN = 86400000, ted = Date.now();
const {userAgent, ...IPHONE} = devices['iPhone 13'];
const iso = off => { const d = new Date(ted + off * DEN); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
const H = (txt, dny) => ({t: ted - dny * DEN, kdo: PRO, text: txt});
const P = (jmeno, prodejce, stav, extra = {}) => ({kanal:'telefon', jmeno, telefon:'777123456', zajem:'GLC', stav, dalsiKontakt: iso(2),
  vytvoreno: ted - 20 * DEN, upraveno: ted - 20 * DEN, prodejce, historie:{h0:{t: ted - 20 * DEN, kdo: prodejce, text:'Založeno (📞 Telefon)'}}, ...extra});
const POPT = {
  a_ticho: P('Ivana Tichá', PRO, 'nabidka', {historie:{h0:H('Založeno (📞 Telefon)', 20), h1:H('Volala jsem, chce čas na rozmyšlenou', 18), h2:H('Stav → Nabídka odeslána', 17)},
    nabidky:{k:{model:'GLB 350 4MATIC', cena_sdph:1689000, cena_vuz_sdph:1689000, sleva_sdph:0, sleva_pct:0, doplnky_sdph:0, soubor:'x.pdf', zdroj:'offerstudio', t: ted - 17 * DEN, kdo: PRO,
      interni:{zisk:20000, skutecny_zisk:20000, obchodni_marze:1.9, skutecna_marze:1.9, korekce:0, nestandardni:true, negativni:false}}}}),
  b_cerstva: P('Petr Čerstvý', PRO, 'jednani', {historie:{h0:H('Založeno (📞 Telefon)', 3), h1:H('Zkušební jízda domluvena', 1)}, vytvoreno: ted - 3 * DEN}),
  c_cizi: P('Karel Cizí', 'tomas.kriz@suw.example.cz', 'nova', {historie:{h0:H('Založeno (📞 Telefon)', 9)}, vytvoreno: ted - 9 * DEN})
};
(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const reg = e => fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email:e, password:HESLO, returnSecureToken:true})}).then(r => r.json());
  const uv = await reg(VED), up = await reg(PRO);
  await admin('', 'PUT', {uzivatele:{[uv.localId]:{schvalen:true, email:VED, vedouci:true}, [up.localId]:{schvalen:true, email:PRO}}, poptavky: POPT});
  const br = await chromium.launch();
  const otevri = async (mail, opts = {viewport:{width:1440,height:900}}, karet = 3) => {   // od v1.24 vidí prodejce jen své poptávky (2), vedoucí všechny (3)
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    if (mail === VED) await ctx.addInitScript(() => { try { localStorage.setItem('poptavky.filtrProdejce', ''); } catch (e) {} });   // od v1.25 má vedoucí výchozí „Moje“; test chce vidět všechny
    const p = await ctx.newPage(); p.chyby = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.dismiss(); });
    await p.goto(STRANKA);
    await p.fill('#l-mail', mail); await p.fill('#l-pass', HESLO); await p.click('button:has-text("Přihlásit")');
    await p.waitForFunction(n => document.querySelectorAll('#seznam .card').length >= n, karet); await p.waitForTimeout(400);
    return p;
  };
  console.log('== vedoucí, PC');
  const v = await otevri(VED);
  await T('vedoucí vidí „Porada“, „Můj týden“ také', async () => (await v.isVisible('#b-porada')) && (await v.isVisible('#b-tyden')));
  await T('detail: formulář dohody → uloží větu s termínem, zadal a stavem; zápis v historii; žádný čas „Hotovo“', async () => {
    await v.locator('#seznam .card', {hasText:'Ivana Tichá'}).click(); await v.waitForSelector('.dh-box');
    await v.click('.dh-box button:has-text("+ Dohoda")'); await v.fill('.dh-box form input', 'Zavolej mu a dej mu 1 % navíc.');
    await v.selectOption('.dh-box form [name=vyjde]', 'uzavřít jako ztracený'); await v.click('.dh-box button:has-text("Uložit dohodu")'); await v.waitForTimeout(600);
    const d = Object.values(await admin('poptavky/a_ticho/dohody') || {})[0], h = Object.values(await admin('poptavky/a_ticho/historie')).map(x => x.text);
    return (d && d.text === 'Zavolej mu a dej mu 1 % navíc.' && d.stav === 'otevrena' && d.zadal === VED && d.vyjde === 'uzavřít jako ztracený' && /^\d{4}-\d\d-\d\d$/.test(d.do) && !('hotovoT' in d) && h.some(x => x.startsWith('🤝 Dohoda:'))) || [d, h]; });
  await T('detail ukáže „Tip od šéfa“ i „když to nevyjde“', async () => { const t = await v.locator('.dh-box').textContent(); return (t.includes('Tip od šéfa') && t.includes('Zavolej mu a dej mu 1 % navíc.') && t.includes('uzavřít jako ztracený')) || t; });
  await v.click('.zpet-pc'); await v.waitForTimeout(400);
  await T('karta na přehledu ukáže 🤝 dohodu', async () => (await v.locator('#seznam .card', {hasText:'Ivana Tichá'}).textContent()).includes('🤝 Zavolej mu') || 'ne');
  console.log('== prodejce, PC');
  const pr = await otevri(PRO, undefined, 2);
  await T('prodejce (v1.24) nevidí cizí poptávku, vidí jen své dvě', async () => (await pr.locator('#seznam .card').count()) === 2 && !(await pr.locator('#seznam').textContent()).includes('Karel Cizí'));
  await T('v1.29: stav „Jednáme“ se nenabízí (detail PC), jen u poptávky, která ho už má', async () => {
    await pr.evaluate(() => renderDetail('a_ticho')); await pr.waitForTimeout(300); const a = (await pr.locator('#view .chips').first().textContent());
    await pr.evaluate(() => renderDetail('b_cerstva')); await pr.waitForTimeout(300); const b = (await pr.locator('#view .chips').first().textContent());
    await pr.evaluate(() => renderHome()); await pr.waitForTimeout(300);
    return (!a.includes('Jednáme') && a.includes('Nabídka odeslána') && b.includes('Jednáme')) || [a, b]; });
  await T('prodejce nevidí „Porada“, vidí „Můj týden“', async () => !(await pr.isVisible('#b-porada')) && (await pr.isVisible('#b-tyden')));
  await T('prodejce nevidí formulář nové dohody, ale vidí tip od šéfa a „Hotovo“', async () => {
    await pr.locator('#seznam .card', {hasText:'Ivana Tichá'}).click(); await pr.waitForSelector('.dh-box'); const t = await pr.locator('.dh-box').textContent();
    return (t.includes('Tip od šéfa') && t.includes('✓ Hotovo') && !t.includes('+ Další krok') && !t.includes('Potvrdit')) || t; });
  await T('„Hotovo“ nastaví stav a nezapíše čas', async () => {
    await pr.click('.dh-box button:has-text("✓ Hotovo")'); await pr.waitForTimeout(600);
    const d = Object.values(await admin('poptavky/a_ticho/dohody'))[0]; return (d.stav === 'hotovo' && !('hotovoT' in d) && !('hotovo' in d)) || d; });
  await T('Můj týden: jen moje obchody, ticho 14+ i nízká marže, ne cizí', async () => {
    await pr.reload(); await pr.waitForSelector('#b-tyden:not(.hidden)'); await pr.waitForTimeout(700);
    await pr.click('#b-tyden'); await pr.waitForTimeout(300);
    if (process.env.SCREEN_DIR) await pr.screenshot({path: path.join(process.env.SCREEN_DIR, 'tyden_v1.20.png'), fullPage: true}); const t = (await pr.locator('#view').textContent()).replace(/\s+/g, ' ');
    return (t.includes('Můj týden: co na mě šéf uvidí') && t.includes('Ivana Tichá') && t.includes('bez kontaktu 18 dní') && t.includes('nízká marže') && t.includes('Zapsat, co se děje') && !t.includes('Karel Cizí')) || t; });
  await T('Můj týden: důvod ticha se uloží a štítek zezelená', async () => {
    await pr.click('button:has-text("Zapsat, co se děje")'); await pr.fill('#view form input', 'na dovolené do 9. 11.'); await pr.click('#view form button'); await pr.waitForTimeout(600);
    const d = await admin('poptavky/a_ticho/duvodTicha'); const t = await pr.locator('#view').textContent(); return (d && d.text === 'na dovolené do 9. 11.' && t.includes('důvod: na dovolené do 9. 11.')) || [d, t.slice(0, 300)]; });
  await T('Zpět prohlížeče z Mého týdne vrátí na přehled', async () => { await pr.goBack(); await pr.waitForTimeout(400); return (await pr.evaluate(() => view)) === 'home'; });
  console.log('== vedoucí, Porada');
  await v.reload(); await v.waitForSelector('#b-porada:not(.hidden)'); await v.waitForTimeout(700);
  await v.click('#b-porada'); await v.waitForSelector('.po-tab');
  if (process.env.SCREEN_DIR) { await v.screenshot({path: path.join(process.env.SCREEN_DIR, 'porada_v1.20.png'), fullPage: true}); }
  await T('Porada: „prodejce hlásí hotovo“, karty prodejců bez pořadí (abecedně), tabulka s počtem kontaktů', async () => {
    const t = (await v.locator('#view').textContent()).replace(/\s+/g, ' ');
    return (t.includes('prodejce hlásí hotovo') && t.includes('Jana Prodejce') && t.includes('Tomas Kriz') && t.includes('kontaktů celkem 1 · za 14 dní 0') && t.indexOf('Jana Prodejce') < t.indexOf('Tomas Kriz')) || t.slice(0, 900); });
  await T('Porada: cizí obchod bez příznaků je skrytý, jen k probrání (ticho, nízká marže)', async () => { const t = await v.locator('.po-tab').textContent(); return (t.includes('Ivana Tichá') && !t.includes('Petr Čerstvý')) || t.slice(0, 300); });
  await T('Porada: zisk je schovaný, 👁 ho ukáže', async () => { const a = await v.locator('.po-tab').textContent(); await v.click('button:has-text("Ukázat zisk")'); const b = (await v.locator('.po-tab').textContent()).replace(/\u00a0/g, ' ');
    return (a.includes('•••') && b.includes('20 000') && b.includes('1,9 %')) || [a.slice(0, 200), b.slice(0, 200)]; });
  await T('Porada: Potvrdit ✓ nastaví „potvrzena“ a zapíše do historie', async () => {
    await v.click('.po-min button:has-text("Potvrdit")'); await v.waitForTimeout(600);
    const d = Object.values(await admin('poptavky/a_ticho/dohody'))[0], h = Object.values(await admin('poptavky/a_ticho/historie')).map(x => x.text);
    return (d.stav === 'potvrzena' && h.some(x => x.startsWith('🤝 Dohoda dotažena'))) || [d, h]; });
  await T('Porada: dohoda u obchodu bez dohody (formulář) a pak „Dopracovat“ s tipem, „Na další týden“ vytvoří novou', async () => {
    await v.click('.po-tab button:has-text("+ Dohoda")'); await v.fill('.po-tab form input', 'Pošli upravenou nabídku.'); await v.click('.po-tab button:has-text("Uložit dohodu")'); await v.waitForTimeout(600);
    await v.click('.po-min button:has-text("Dopracovat")'); await v.waitForTimeout(400); await v.fill('.po-min .tip input', 'Zavolej ve čtvrtek ráno'); await v.press('.po-min .tip input', 'Tab'); await v.waitForTimeout(500);
    let d = Object.values(await admin('poptavky/a_ticho/dohody')).find(x => x.text === 'Pošli upravenou nabídku.');
    if (!(d && d.stav === 'dopracovat' && d.tip === 'Zavolej ve čtvrtek ráno')) return d;
    await v.click('.po-min button:has-text("Na další týden")'); await v.waitForTimeout(600);
    const vse = Object.values(await admin('poptavky/a_ticho/dohody')).filter(x => x.text === 'Pošli upravenou nabídku.');
    return (vse.length === 2 && vse.some(x => x.stav === 'preneseno') && vse.some(x => x.stav === 'otevrena')) || vse; });
  await T('Porada nikde nepoužívá slovo „nesplněno“', async () => !(await v.locator('#view').textContent()).toLowerCase().includes('nesplněn'));
  await T('Zpět prohlížeče z Porady vrátí na přehled; z detailu otevřeného z Porady zpět do Porady', async () => {
    await v.click('.po-tab a'); await v.waitForTimeout(300); await v.goBack(); await v.waitForTimeout(400); const a = await v.evaluate(() => view);
    await v.goBack(); await v.waitForTimeout(400); const b = await v.evaluate(() => view); return (a === 'porada' && b === 'home') || [a, b]; });
  console.log('== iPhone');
  const m = await otevri(PRO, IPHONE, 2);
  await T('mobil: karta s dohodou a „Hotovo“ u dohody; detail s tipem od šéfa; bez chyb', async () => {
    const t = await m.locator('#seznam .card', {hasText:'Ivana Tichá'}).textContent(); await m.locator('#seznam .card', {hasText:'Ivana Tichá'}).click(); await m.waitForTimeout(400);
    const d = await m.locator('#view').textContent(); return (t.includes('🤝') && d.includes('Tip od šéfa') && m.chyby.length === 0) || [t.slice(0, 200), m.chyby]; });
  await br.close(); console.log(`\n${ok} / ${celkem}`); process.exit(ok === celkem ? 0 : 1);
})();
