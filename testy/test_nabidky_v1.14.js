// test_nabidky_v1.14.js – nabídky z Offer Studia v Poptávkách v1.14, v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.14.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_nabidky_v1.14.js
// S OFFER_STUDIO=/cesta/k/Mercedes-Offer-Studio (v1.5.0+) projde celou cestu: Offer Studio se přihlásí do emulátoru,
// vytvoří nabídku (Word/PDF nahrazené) a zapíše ji k poptávce; Poptávky ji pak ukážou.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.14.html', OUT = process.env.SCREEN_DIR, OS_DIR = process.env.OFFER_STUDIO;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');

let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-nabidky-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'stranka.html');

const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const JA = 'stanislav.prodejce@suw.example.cz', HESLO = 'heslo123';
const {userAgent, ...IPHONE} = devices['iPhone 13'];
const ted = Date.now();

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
const cekej = async url => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 250)); } return false; };

const P = (jmeno, stav, extra = {}) => ({kanal:'telefon', jmeno, telefon:'777 123 456', email:'zakaznik@example.cz', zajem:'GLS', stav, dalsiKontakt: stav === 'prodano' ? null : '2030-01-01',
  vytvoreno: ted - 86400000, upraveno: ted - 86400000, prodejce: JA, historie:{h:{t: ted - 86400000, kdo: JA, text:'Založeno'}}, ...extra});   // od v1.24 vidí prodejce jen poptávky se svým e-mailem v poli prodejce
const NAB = (model, cena, interni, t = ted - 3600000) => ({model, cena_sdph: cena, cena_vuz_sdph: cena, sleva_sdph: 60500, sleva_pct: 4.5, doplnky_sdph: 0, soubor: 'x.pdf', zdroj: 'offerstudio', t, kdo: JA, ...(interni ? {interni} : {})});
const POPT = {
  s_nab: P('Jana Nováková', 'nabidka', {nabidky: {k1: NAB('GLS 450 d 4MATIC', 1274000, {zisk: 82000, skutecny_zisk: 62000, obchodni_marze: 7.5, skutecna_marze: 5.9, korekce: 20000, nestandardni: false, negativni: false})}}),
  nizka:  P('Petr Nízký', 'jednani', {nabidky: {k1: NAB('GLC 300 e', 1500000, {zisk: 20000, skutecny_zisk: 20000, obchodni_marze: 2.0, skutecna_marze: 2.0, korekce: 0, nestandardni: true, negativni: false})}}),
  dve:    P('Dvě Nabídky', 'nabidka', {nabidky: {stara: NAB('C 220 d', 1100000, null, ted - 9e6), nova: NAB('E 220 d', 1600000, null, ted - 1000)}}),
  bez:    P('Bez Nabídky', 'nova'),
  prod:   P('Prodaný Sziskem', 'prodano', {historie: {h: {t: ted - 1000, kdo: JA, text: 'Stav → Prodáno'}}, nabidky: {k: NAB('A 200', 900000, {zisk: 50000, skutecny_zisk: 45000, obchodni_marze: 6, skutecna_marze: 5, korekce: 5000, nestandardni: false, negativni: false})}}),
  prod2:  P('Prodaný Bez Nabídky', 'prodano', {historie: {h: {t: ted - 2000, kdo: JA, text: 'Stav → Prodáno'}}})
};

function spustOfferStudio(port){
  const kopie = fs.mkdtempSync(path.join(os.tmpdir(), 'offer-studio-'));
  for (const f of fs.readdirSync(OS_DIR)) if (/\.(py|png)$/.test(f)) fs.copyFileSync(path.join(OS_DIR, f), path.join(kopie, f));
  const kod = `import sys,types,io,time
for n in ('playwright','playwright.sync_api','tkinter','tkinter.ttk','tkinter.messagebox','tkinter.filedialog'):
    m=types.ModuleType(n); m.__getattr__=lambda x: type(x,(),{}); sys.modules[n]=m
sys.path.insert(0,'.'); import app, uvicorn
from PIL import Image
def jpg(i):
    b=io.BytesIO(); Image.new('RGB',(40,30),(30*i%255,90,140)).save(b,'JPEG'); return b.getvalue()
app.load_photos=lambda url,progress: {a:jpg(i) for i,a in enumerate(app.PHOTO_ORDER)}
def docx(path,*a,**k):
    open(path,'wb').write(b'docx'); open(str(path)[:-5]+'.pdf','wb').write(b'%PDF-1.4')
app.generate_docx=docx
uvicorn.run(app.app,host='127.0.0.1',port=${port},log_level='warning')`;
  const env = {...process.env, POPTAVKY_API_KEY: 'demo-key', POPTAVKY_AUTH_URL: `${AUTH}/identitytoolkit.googleapis.com`,
    POPTAVKY_TOKEN_URL: `${AUTH}/securetoken.googleapis.com`, POPTAVKY_DB_URL: EMU, POPTAVKY_DB_NS: NS};
  return {proc: spawn('python3', ['-c', kod], {cwd: kopie, env, stdio: ['ignore', 'inherit', 'inherit']}), kopie};
}
const DFE = `Cena celkem bez DPH: 1 100 000,00
Cena celkem včetně DPH: 1 331 000,00
Typ: 167.925-1 GLS 450 d 4MATIC 1 000 000,00
Barva: 197 Metalická černá obsidian 20 000,00
Čalounění: 235 Kůže béžová 10 000,00

Seznam příplatkových výbav
P31\tPaket AMG\t30 000,00
Z99\tTažné zařízení\t40 000,00
Příplatková výbava celkem: 100 000,00
Přehled DPH
`;

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
    await p.waitForFunction(() => dataNactena && Object.keys(data).length > 0); await p.waitForTimeout(300);
    return p;
  };
  const detail = async (p, id) => { await p.evaluate(id => renderDetail(id), id); await p.waitForSelector('#view .zpet-pc, .zpet button'); };
  const pred = JSON.stringify(await admin('poptavky'));

  console.log('== PC 1280: zobrazení nabídek');
  {
    const p = await otevri({viewport:{width:1280, height:900}});
    await detail(p, 's_nab');
    await T('detail: řádek nabídky s modelem, cenou, slevou a datem; zisk schovaný', async () => {
      const t = (await p.textContent('#view .nabidky')).replace(/\s/g, ' ');
      return (t.includes('📄 GLS 450 d 4MATIC · 1 274 000 Kč · sleva 4,5 %') && t.includes('Zisk ••• Kč') && !t.includes('62 000')) || t; });
    await T('klepnutí ukáže zisk (po korekcích) a marži, další klepnutí schová', async () => {
      await p.click('#view .nabidky'); const t = (await p.textContent('#view .nabidky')).replace(/\s/g, ' ');
      await p.click('#view .nabidky'); const t2 = (await p.textContent('#view .nabidky')).replace(/\s/g, ' ');
      return (t.includes('Zisk 62 000 Kč (před korekcemi 82 000 Kč) · marže 5,9 %') && t2.includes('Zisk ••• Kč')) || [t, t2]; });
    await T('nízká marže: varování podle příznaku z Offer Studia', async () => {
      await detail(p, 'nizka'); await p.click('#view .nabidky');
      const t = await p.textContent('#view .nabidky'); await p.click('#view .nabidky');
      return t.includes('⚠ nízká marže') || t; });
    await T('víc nabídek: nejnovější nahoře; bez nákupní marže žádný řádek zisku', async () => {
      await detail(p, 'dve'); const r = await p.$$eval('#view .nabidky .nab', l => l.map(x => x.textContent));
      return (r.length === 2 && r[0].includes('E 220 d') && r[1].includes('C 220 d') && !r.join('').includes('Zisk')) || r; });
    await T('poptávka bez nabídky: žádný blok nabídek', async () => { await detail(p, 'bez'); return await p.locator('#view .nabidky').count() === 0 || 'je tam'; });
    if (OUT) { await detail(p, 's_nab'); await p.click('#view .nabidky'); await p.screenshot({path: path.join(OUT, 'nabidky_v1.14_detail.png')}); await p.click('#view .nabidky'); }
    await p.evaluate(() => renderHome()); await p.waitForTimeout(300);
    await T('hlavička: „Zisk z prodaných aut“ schovaný, 1 z 2 aut s nabídkou', async () => {
      const t = (await p.textContent('.vydelek')).replace(/\s/g, ' ');
      return (t.includes('Zisk z prodaných aut: ≈ ••• Kč (1 z 2 aut s nabídkou)')) || t; });
    await T('klepnutí na hlavičku ukáže zisk 45 000 Kč i bez zadané provize', async () => {
      await p.click('.vydelek'); const t = (await p.textContent('.vydelek')).replace(/\s/g, ' ');
      return (t.includes('Zisk z prodaných aut: ≈ 45 000 Kč') && await p.locator('#provize').count() === 0) || t; });
    if (OUT) await p.screenshot({path: path.join(OUT, 'nabidky_v1.14_prehled.png')});
    await T('nic se nezapsalo, žádné chyby', async () => (JSON.stringify(await admin('poptavky')) === pred && p.chyby.length === 0) || p.chyby);
    await p.context().close();
  }

  console.log('== iPhone 13: zatím jen PC');
  {
    const p = await otevri(IPHONE);
    await detail(p, 's_nab');
    await T(SOUBOR >= 'poptavky_v1.15' ? 'mobilní detail: nabídka (model · cena) ano, zisk ne (od v1.15)' : 'mobilní detail nabídky ani zisk neukazuje', async () => {
      const t = await p.textContent('#view');
      return (SOUBOR >= 'poptavky_v1.15' ? (t.includes('GLS 450 d 4MATIC') && !t.includes('Zisk')) : (!t.includes('GLS 450 d') && !t.includes('Zisk'))) || 'nesedí'; });
    await p.evaluate(() => renderHome()); await p.click('.vydelek'); await p.waitForTimeout(200);
    await T('rozbalená hlavička na mobilu bez zisku z prodaných aut', async () => !(await p.textContent('.vydelek')).includes('Zisk z prodaných') || await p.textContent('.vydelek'));
    await T('žádné chyby', async () => p.chyby.length === 0 || p.chyby);
    await p.context().close();
  }

  if (OS_DIR) {
    console.log('== Offer Studio → Poptávky (lokální emulátory)');
    const PORT = 18776, OSU = `http://127.0.0.1:${PORT}`;
    const {proc, kopie} = spustOfferStudio(PORT);
    try {
      await T('Offer Studio naběhlo', async () => await cekej(OSU + '/') || 'neběží');
      const ctx = await br.newContext({viewport:{width:1280, height:900}}); const o = await ctx.newPage(); o.chyby = [];
      o.on('pageerror', e => o.chyby.push(e.message));
      // bez přihlášení: nabídka se vytvoří, do Poptávek se nezapíše a řekne proč
      await o.goto(OSU + '/nova?' + new URLSearchParams({poptavka: 'bez', jmeno: 'Bez Nabídky', email: 'zakaznik@example.cz'})); await o.waitForURL(/\/draft\//);
      await T('nepřihlášené Offer Studio: v „Co ještě chybí“ tip na přihlášení', async () => (await o.textContent('#checklist')).includes('není přihlášené k Poptávkám') || await o.textContent('#checklist'));
      await o.goto(OSU + '/nastaveni');
      await o.fill('#poptavky [name=email]', JA); await o.fill('#poptavky [name=heslo]', 'spatne'); await o.click('#poptavky button:has-text("Přihlásit")');
      await T('špatné heslo → srozumitelná hláška', async () => (await o.textContent('#poptavky')).includes('Špatný e-mail nebo heslo') || await o.textContent('#poptavky'));
      await o.fill('#poptavky [name=email]', JA); await o.fill('#poptavky [name=heslo]', HESLO); await o.click('#poptavky button:has-text("Přihlásit")');
      await T('přihlášení k Poptávkám a test spojení', async () => {
        const t = await o.textContent('#poptavky');
        return (t.includes('Přihlášeno jako ' + JA) && t.includes('tvých poptávek v Poptávkách: 6')) || t; });
      await T('heslo se nikam neuložilo, jen přihlašovací klíč', async () => {
        const u = JSON.parse(fs.readFileSync(path.join(kopie, 'data', 'poptavky_ucet.json'), 'utf8'));
        return (!JSON.stringify(u).includes(HESLO) && u.email === JA && !!u.refresh) || Object.keys(u); });
      // celá nabídka k poptávce „bez“
      await o.goto(OSU + '/nova?' + new URLSearchParams({poptavka: 'bez', jmeno: 'Bez Nabídky', email: 'zakaznik@example.cz'})); await o.waitForURL(/\/draft\//);
      const draft = o.url().split('/').pop().split('?')[0];
      await o.fill('[name=equipment]', DFE); await o.fill('[name=url]', 'https://www.mercedes-benz.cz/passengercars/buy/new-car/product.html/MBT');
      await o.fill('#slevaPct', '5'); await o.fill('[name=nakupni_marze]', '12'); await o.waitForTimeout(1200);
      await o.click('button:has-text("Načíst 9 fotografií")'); await o.waitForFunction(() => document.querySelectorAll('#photogallery img').length === 9);
      await o.check('[name=confirm_photos]'); await o.waitForFunction(() => !document.querySelector('#hlavni').disabled, null, {timeout: 8000});
      await o.click('#hlavni'); await o.waitForFunction(() => /Poptáv/.test(document.querySelector('#vysledek').textContent) && /Koncept e-mailu/.test(document.querySelector('#vysledek').textContent), null, {timeout: 15000});
      await T('po vytvoření nabídky: „Zapsáno do Poptávek (+ řádek do historie)“', async () => (await o.textContent('#vysledek')).includes('Zapsáno do Poptávek (+ řádek do historie)') || await o.textContent('#vysledek'));
      const n = await admin(`poptavky/bez/nabidky/${draft}`), h = Object.values(await admin('poptavky/bez/historie'));
      await T('ve Firebase: souhrn nabídky s interními údaji, prodejce a čas', async () =>
        (n && n.model === 'GLS 450 d 4MATIC' && n.cena_sdph === 1264450 && n.sleva_pct === 5 && n.kdo === JA && n.t > ted - 60000 && n.zdroj === 'offerstudio'
          && n.interni && n.interni.zisk === 77000 && n.interni.obchodni_marze === 7 && n.interni.nestandardni === false) || n);
      await T('do historie řádek „📄 Nabídka připravena: GLS 450 d 4MATIC · 1 264 450 Kč“, stav se nezměnil', async () =>
        (h.some(x => x.text === '📄 Nabídka připravena: GLS 450 d 4MATIC · 1 264 450 Kč' && x.kdo === JA) && (await admin('poptavky/bez/stav')) === 'nova') || h.map(x => x.text));
      await o.click('#hlavni'); await o.waitForFunction(() => /Zapsáno do Poptávek/.test(document.querySelector('#vysledek').textContent), null, {timeout: 15000});
      await T('nové PDF se stejnou cenou: nabídka přepsána, historie beze změny', async () =>
        (Object.keys(await admin('poptavky/bez/nabidky')).length === 1 && Object.values(await admin('poptavky/bez/historie')).length === h.length && !(await o.textContent('#vysledek')).includes('řádek do historie')) || 'změna');
      await o.fill('#slevaPct', '6'); await o.waitForTimeout(1500); await o.click('#hlavni');
      await o.waitForFunction(() => /řádek do historie/.test(document.querySelector('#vysledek').textContent), null, {timeout: 15000});
      await T('změna ceny: „📄 Nabídka upravena …“ v historii', async () => Object.values(await admin('poptavky/bez/historie')).some(x => x.text.startsWith('📄 Nabídka upravena: GLS 450 d 4MATIC · 1 251 140')) || Object.values(await admin('poptavky/bez/historie')).map(x => x.text));
      // Poptávky ukážou nabídku zapsanou Offer Studiem
      const p = await otevri({viewport:{width:1280, height:900}});
      await detail(p, 'bez');
      await T('Poptávky: v detailu nabídka z Offer Studia (živě z Firebase)', async () => (await p.textContent('#view .nabidky')).replace(/\s/g, ' ').includes('📄 GLS 450 d 4MATIC · 1 251 140 Kč · sleva 6 %') || await p.textContent('#view'));
      await p.context().close();
      // smazaná poptávka
      await admin('poptavky/bez', 'DELETE');
      await o.click('#hlavni'); await o.waitForFunction(() => /nezapsala/.test(document.querySelector('#vysledek').textContent), null, {timeout: 15000});
      await T('smazaná poptávka: nabídka se vytvoří, do Poptávek nic (žádná osiřelá data)', async () =>
        ((await o.textContent('#vysledek')).includes('už neexistuje') && (await admin('poptavky/bez')) === null) || await o.textContent('#vysledek'));
      await o.goto(OSU + '/nastaveni'); await o.click('#poptavky button:has-text("Odhlásit")');
      await T('odhlášení smaže přihlašovací klíč', async () => (!fs.existsSync(path.join(kopie, 'data', 'poptavky_ucet.json')) && (await o.textContent('#poptavky')).includes('Odhlášeno')) || 'zůstal');
      await T('Offer Studio bez chyb v prohlížeči', async () => o.chyby.length === 0 || o.chyby);
      await ctx.close();
    } finally { proc.kill(); fs.rmSync(kopie, {recursive: true, force: true}); }
  }

  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
