// test_kontakt_v1.4.js – „📱 Uložit do kontaktů“ v detailu poptávky (v1.4) v LOKÁLNÍCH emulátorech Firebase, jen smyšlená data.
// Každý stažený soubor .vcf se kontroluje vlastním dekodérem podle vCard 3.0 (RFC 2426) a nezávisle knihovnou ical.js.
// Spuštění: emulátory jako u test_v1.2.js (cd testy && npx firebase emulators:start --only database,auth --project demo-poptavky), pak
//   ICALJS=/cesta/k/node_modules/ical.js FIREBASE10=/cesta/k/node_modules/firebase node testy/test_kontakt_v1.4.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.4.html';
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
if (!html.includes(INIT)) throw new Error('Chybí řádek inicializace Firebase');
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-kontakt-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const {userAgent, ...IPHONE} = devices['iPhone 13'];

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

// Čtení vCard: vlastní dekodér podle RFC 2426 (rozvinout řádky, pak \\ \; \, \n) a nezávisle ical.js
function rfc(vcf){
  const vlast = {};
  for (const r of vcf.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean)) {
    const i = r.indexOf(':'), klic = r.slice(0, i).split(';')[0], hod = r.slice(i + 1);
    vlast[klic] = klic === 'N' ? hod.split(/(?<!\\);/).map(dek) : dek(hod);
  }
  return vlast;
}
const dek = s => s.replace(/\\([\\;,nN])/g, (_, c) => c === 'n' || c === 'N' ? '\n' : c);
let ICAL;
const ical = vcf => { const c = new ICAL.Component(ICAL.parse(vcf)); const v = n => c.getFirstPropertyValue(n); return {fn: v('fn'), n: v('n'), tel: v('tel'), email: v('email'), note: v('note')}; };

const DLOUHY = ('Od: Jan Novák <jan.novak@example.cz>\nDobrý den, sháníme služební vůz; ideálně GLE 450 d, případně GLC.\n'
  + 'Rozpočet do 2 mil. Kč, leasing na 4 roky, nájezd 30 000 km/rok – přednostně černá obsidián, tažné zařízení, zimní kola.\n').repeat(8);
const POPT = {
  k1: {jmeno:'Jan Novák', telefon:'777 123 456', email:'jan.novak@example.cz', zajem:'Shání Mercedes-Benz GLE, rozpočet do 2 mil. Kč; chce leasing.\nVolat po 16. hodině.'},
  k3: {jmeno:'Žofie Šťastná-Řeháková', telefon:'', email:'zofie@example.cz', zajem:'Auto pro dceru – A 200, bílá.'},
  k4: {jmeno:'Ďurďa Ťuková', telefon:'+420 602-111-222', email:'', zajem:''},
  k5: {jmeno:'', telefon:'00420 731 000 111', email:'', zajem:'Volal, jméno neřekl. Chce Vito.'},
  k6: {jmeno:'Novák Stavby s.r.o.', telefon:'731 000 111', email:'info@novak-stavby.example.cz', zajem:'2× Sprinter 317 CDI skříň'},
  k7: {jmeno:'Hans Müller', telefon:'+49 30 1234567', email:'hans@example.de', zajem:'EQS SUV'},
  k9: {jmeno:'Jan Novák', telefon:'777 123 456', email:'', zajem: DLOUHY},
  kx: {jmeno:'Petr "Pepa" <b>Nový</b>', telefon:'720 111 222', email:'', zajem:'Test escapování <script>'}
};

(async () => {
  ICAL = (await import(path.join(process.env.ICALJS, 'dist', 'ical.js'))).default;
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body: fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8')});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:'prodejce@suw.example.cz', password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  const poptavky = {};
  for (const [id, p] of Object.entries(POPT)) poptavky[id] = {kanal:'telefon', stav:'nova', dalsiKontakt:null, vytvoreno:1, upraveno:1, prodejce:'prodejce@suw.example.cz',
    historie:{h:{t:1, kdo:'prodejce@suw.example.cz', text:'Založeno'}}, ...p};
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true}}, poptavky});

  const br = await chromium.launch();
  const otevri = async opts => {
    const ctx = await br.newContext({...opts, acceptDownloads: true});
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = []; p.cizi = [];
    p.on('pageerror', e => p.chyby.push(e.message)); p.on('dialog', d => { p.chyby.push('dialog ' + d.message()); d.accept(); });
    p.on('request', q => { if (!/^(file:|blob:|https:\/\/www\.gstatic\.com\/firebasejs\/|https?:\/\/127\.0\.0\.1:(9000|9099)|wss?:\/\/127\.0\.0\.1:9000)/.test(q.url())) p.cizi.push(q.url()); });
    await p.goto('file://' + path.join(TMP, 'stranka.html'));
    await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
    if (!(await p.locator('#app:not(.hidden)').count())) { await p.fill('#l-mail', 'prodejce@suw.example.cz'); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")'); }
    await p.waitForSelector('h2:has-text("Dnes zavolat")'); await p.waitForFunction(() => Object.keys(data).length === 8);
    return p;
  };
  const detail = async (p, id) => { await p.evaluate(id => renderDetail(id), id); await p.waitForSelector('#d-oznaceni'); };
  const export_ = async (p, id, znacka) => {
    await detail(p, id);
    if (znacka !== undefined) await p.fill('#d-oznaceni', znacka);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Uložit do kontaktů")')]);
    const vcf = fs.readFileSync(await dl.path(), 'utf8');
    return {vcf, soubor: dl.suggestedFilename(), r: rfc(vcf), i: ical(vcf)};
  };
  const pred = JSON.stringify(await admin(''));
  let p = await otevri({viewport:{width:1280, height:900}});

  console.log('== Jméno, telefon, e-mail, poznámka');
  await T('K1: běžná poptávka bez označení – jméno, telefon +420, e-mail a celé „Co chce“ (čárka, středník, nový řádek)', async () => {
    await p.click('.card:has-text("Jan Novák") >> nth=0'); await p.waitForSelector('#d-oznaceni');   // cesta jako prodejce
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Uložit do kontaktů")')]);
    const vcf = fs.readFileSync(await dl.path(), 'utf8'), r = rfc(vcf), i = ical(vcf);
    const zajem = (await admin('poptavky/' + (await p.evaluate(() => curId)))).zajem;
    return (r.FN === 'Jan Novák' && r.N[0] === 'Novák' && r.N[1] === 'Jan' && r.TEL === '+420 777 123 456' && r.EMAIL === 'jan.novak@example.cz'
      && r.NOTE === zajem && i.fn === 'Jan Novák' && i.tel === '+420 777 123 456' && dl.suggestedFilename().endsWith('.vcf')) || {r, i}; });
  await T('K1b: ical.js přečte stejné jméno, telefon, e-mail a poznámku (kromě středníku – známá odchylka knihovny)', async () => {
    const x = await export_(p, 'k1');
    return (x.i.n[0] === 'Novák' && x.i.email === 'jan.novak@example.cz' && x.i.note.replace(/\\;/g, ';') === POPT.k1.zajem) || x.i; });
  await T('K2: označení „SUV“ → „Jan Novák · SUV“ (FN i příjmení v N, aby to iPhone ukázal), poznámka beze změny', async () => {
    const x = await export_(p, 'k1', 'SUV');
    return (x.r.FN === 'Jan Novák · SUV' && x.r.N[0] === 'Novák · SUV' && x.r.N[1] === 'Jan' && x.r.NOTE === POPT.k1.zajem && x.soubor === 'jan_novak_suv.vcf') || {r: x.r, s: x.soubor}; });
  await T('K3: diakritika ve jméně i označení, bez telefonu → žádný řádek TEL', async () => {
    const x = await export_(p, 'k3', 'Auto pro dceru');
    return (x.r.FN === 'Žofie Šťastná-Řeháková · Auto pro dceru' && x.r.N[0] === 'Šťastná-Řeháková · Auto pro dceru' && x.r.N[1] === 'Žofie'
      && !x.vcf.includes('TEL') && x.r.EMAIL === 'zofie@example.cz' && x.r.NOTE === POPT.k3.zajem && x.soubor === 'zofie_stastna_rehakova_auto_pro_dceru.vcf') || x.r; });
  await T('K4: bez e-mailu a bez „Co chce“ → žádný EMAIL ani prázdná poznámka, telefon 602-111-222 → +420 602 111 222', async () => {
    const x = await export_(p, 'k4');
    return (!x.vcf.includes('EMAIL') && !x.vcf.includes('NOTE') && x.r.TEL === '+420 602 111 222' && x.r.FN === 'Ďurďa Ťuková') || x.vcf; });
  await T('K5: bez jména → kontakt se jmenuje podle telefonu (00420… → +420), poznámka zůstane', async () => {
    const x = await export_(p, 'k5');
    return (x.r.FN === '+420 731 000 111' && x.r.N[0] === '+420 731 000 111' && x.r.N[1] === '' && x.r.NOTE === POPT.k5.zajem) || x.r; });
  await T('K6: firma s označením „Sprinter pro firmu“ → „Novák Stavby s.r.o. · Sprinter pro firmu“', async () => {
    const x = await export_(p, 'k6', 'Sprinter pro firmu');
    return (x.r.FN === 'Novák Stavby s.r.o. · Sprinter pro firmu' && (x.r.N[1] + ' ' + x.r.N[0]) === 'Novák Stavby s.r.o. · Sprinter pro firmu') || x.r; });
  await T('K7: zahraniční telefon zůstane beze změny', async () => (await export_(p, 'k7')).r.TEL === '+49 30 1234567' || 'telefon');
  await T('K8: označení jen z mezer → jako bez označení', async () => { const x = await export_(p, 'k1', '   '); return (x.r.FN === 'Jan Novák' && x.r.N[0] === 'Novák') || x.r; });

  // Headless Chromium na jedné stránce vynechá 11. stažení souboru (ověřeno: 10× ok, 11. ne, 12. zase ok).
  // Je to omezení testovacího prohlížeče, ne Poptávek – proto čerstvá stránka po první sadě exportů.
  const chybyPC = [...p.chyby, ...p.cizi]; await p.context().close(); p = await otevri({viewport:{width:1280, height:900}});
  console.log('== Dlouhý text, escapování, formát');
  await T('K9: dlouhý víceřádkový text z e-mailu (2 000+ znaků) → celý v poznámce, řádky max. 75 bajtů, CRLF', async () => {
    const x = await export_(p, 'k9', 'GLE');
    return (x.r.NOTE === DLOUHY && x.vcf.split('\r\n').every(r => Buffer.byteLength(r) <= 75) && !/[^\r]\n/.test(x.vcf) && x.i.note.replace(/\\;/g, ';') === DLOUHY) || x.r.NOTE.length; });
  await T('K10: uvozovky a HTML ve jméně → v kontaktu doslovně, na stránce se nic nevykoná', async () => {
    const x = await export_(p, 'kx', '<i>VIP</i>');
    return (x.r.FN === 'Petr "Pepa" <b>Nový</b> · <i>VIP</i>' && await p.locator('#view b, #view i').count() === 0
      && await p.inputValue('#d-oznaceni') === '<i>VIP</i>' && p.chyby.length === 0) || {fn: x.r.FN, ch: p.chyby}; });

  console.log('== Chování v detailu');
  await T('K11: rozepsané označení přežije živé překreslení detailu (změna v databázi)', async () => {
    await detail(p, 'k7'); await p.fill('#d-oznaceni', 'EQS'); await p.evaluate(() => document.activeElement.blur());
    await admin('poptavky/k7/upraveno', 'PUT', 2); await p.waitForTimeout(500);
    const hodnota = await p.inputValue('#d-oznaceni');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Uložit do kontaktů")')]);
    return (hodnota === 'EQS' && rfc(fs.readFileSync(await dl.path(), 'utf8')).FN === 'Hans Müller · EQS') || hodnota; });
  await T('K12: po návratu na přehled a u jiné poptávky je pole označení prázdné', async () => {
    await p.click('button:has-text("← Přehled")'); await detail(p, 'k7'); const a1 = await p.inputValue('#d-oznaceni');
    await detail(p, 'k6'); const a2 = await p.inputValue('#d-oznaceni');
    return (a1 === '' && a2 === '') || {a1, a2}; });
  await T('K13: export nic nezapsal do databáze (poptávky ani zákazníci beze změny, kromě testovací změny z K11)', async () => {
    const po = await admin(''); po.poptavky.k7.upraveno = 1;
    return JSON.stringify(po) === pred || 'databáze se změnila'; });
  await T('K14: žádné chyby stránky a žádné požadavky mimo emulátory', async () => (chybyPC.length === 0 && p.chyby.length === 0 && p.cizi.length === 0) || {chybyPC, ch: p.chyby, cizi: p.cizi});
  await p.context().close();

  console.log('== iPhone');
  p = await otevri(IPHONE);
  await T('iPhone 13: pole a tlačítko v detailu, tlačítko aspoň 44 px, export funguje, nic se neposouvá do stran', async () => {
    await p.click('.card:has-text("Jan Novák") >> nth=0'); await p.waitForSelector('#d-oznaceni');
    const tl = await p.locator('button:has-text("Uložit do kontaktů")').boundingBox(), pole = await p.locator('#d-oznaceni').boundingBox();
    await p.fill('#d-oznaceni', 'GLE');
    if (process.env.SCREEN_DIR) await p.screenshot({path: path.join(process.env.SCREEN_DIR, 'v1.4_kontakt_iPhone13.png')});
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Uložit do kontaktů")')]);
    const fn = rfc(fs.readFileSync(await dl.path(), 'utf8')).FN;
    return (tl.height >= 44 && tl.x + tl.width <= 390 && pole.width >= 150 && fn === 'Jan Novák · GLE'
      && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || {tl, pole, fn}; });
  await T('iPhone 13: při psaní označení se plovoucí „← Přehled“ schová (nezakryje pole)', async () => {
    await p.focus('#d-oznaceni'); const vid = await p.locator('.zpet').isVisible(); await p.evaluate(() => document.activeElement.blur());
    return !vid || 'viditelné'; });
  await p.context().close();

  await br.close();
  fs.rmSync(TMP, {recursive: true, force: true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
