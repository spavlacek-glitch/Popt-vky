// test_v1.2.js – ověření Poptávek v1.2 (známý zákazník) proti LOKÁLNÍM emulátorům Firebase, nikdy proti produkci.
// Testuje skutečný soubor appky (výchozí poptavky_v1.2.html, jiný přes SOUBOR=poptavky_v1.3.html); do dočasné kopie
// se jen podstrčí demo konfigurace a přesměrování na emulátory.
// Scénáře A–I a N0–N7 převzaty z experimentu v0.5 (repo Fenclotéka), V1–V8 hlídají začlenění do v1.1.
// Spuštění (Node 20+, Java 11+, Playwright s Chromiem, balíček firebase@10.12.2):
//   emulátor databáze 127.0.0.1:9000 a Auth 127.0.0.1:9099, pak
//   FIREBASE10=/cesta/k/node_modules/firebase node testy/test_v1.2.js
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10;
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');   // nasazená pravidla

// Dočasná kopie v1.2: jen konfigurace a přesměrování na emulátory, zbytek beze změny
const SOUBOR = process.env.SOUBOR || 'poptavky_v1.2.html';
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
if (!html.includes(INIT)) throw new Error(`V ${SOUBOR} chybí řádek inicializace Firebase`);
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-test-'));
fs.writeFileSync(path.join(TMP, 'poptavky_v1.2_emulator.html'), html);
const STRANKA = 'file://' + path.join(TMP, 'poptavky_v1.2_emulator.html');

const admin = (cesta, method = 'GET', body) => fetch(`${EMU}/${cesta}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const pravidla = body => fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body});
const NOVY = '#zakaznici button:has-text("Je to nový zákazník")';
const {userAgent, ...IPHONE} = devices['iPhone 13'];   // velikost a dotyk iPhonu; UA vynechán (Auth SDK by s ním načítal skript Googlu)
const zitra = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

const ZAKAZNICI = [   // smyšlení zákazníci z experimentu v0.2
  {key:'z1', jmeno:'Jan', prijmeni:'Novák', telefon:'+420 777 123 456', email:'jan.novak@example.cz'},
  {key:'z2', jmeno:'Jana', prijmeni:'Nováková', telefon:'602 111 222', email:'jana.novakova@example.cz'},
  {key:'z3', jmeno:'Jan', prijmeni:'Novák', firma:'Novák Stavby s.r.o.', telefon:'00420 731 000 111', email:'info@novak-stavby.example.cz'},
  {key:'z4', jmeno:'Petra', prijmeni:'Dvořáková', telefon:'(+420) 608-222-333', email:'petra.dvorakova@example.cz'},
  {key:'z5', jmeno:'Tomáš', prijmeni:'Černý', telefon:'775 888 999'}
];

(async () => {
  await pravidla(PRAVIDLA);
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({email:'prodejce@suw.example.cz', password:'heslo123', returnSecureToken:true})}).then(r => r.json());
  const reset = () => admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:'prodejce@suw.example.cz'}}});
  await reset();

  const br = await chromium.launch();
  const otevri = async (opts = {viewport:{width:1280, height:900}}) => {
    const ctx = await br.newContext(opts);
    await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
    const p = await ctx.newPage(); p.chyby = []; p.cizi = [];
    p.on('pageerror', e => p.chyby.push(e.message));
    p.on('dialog', d => { p.chyby.push('dialog: ' + d.message()); d.accept(); });
    p.on('request', q => { const x = q.url(); if (!/^(file:|https:\/\/www\.gstatic\.com\/firebasejs\/|https?:\/\/127\.0\.0\.1:(9000|9099)|wss?:\/\/127\.0\.0\.1:9000)/.test(x)) p.cizi.push(x); });
    await p.goto(STRANKA);
    await p.waitForSelector('#app:not(.hidden), #l-mail:visible');
    if (!(await p.locator('#app:not(.hidden)').count())) {
      await p.fill('#l-mail', 'prodejce@suw.example.cz'); await p.fill('#l-pass', 'heslo123'); await p.click('button:has-text("Přihlásit")');
    }
    await p.waitForSelector('h2:has-text("Dnes zavolat")');
    return p;
  };
  const doFormulare = async p => {
    if (await p.locator('button:has-text("← Přehled")').count()) await p.click('button:has-text("← Přehled")');
    else if (await p.locator('#view button:has-text("Zpět")').count()) await p.click('#view button:has-text("Zpět")');
    await p.click('#fab');
  };
  const uloz = async (p, pole, vyberText, akce) => {
    await doFormulare(p);
    if (pole.kanal) await p.click(`#kanaly label:has-text("${pole.kanal}")`);
    if (pole.jmeno) await p.fill('#f-jmeno', pole.jmeno);
    if (pole.tel) await p.fill('#f-tel', pole.tel);
    if (pole.mail) await p.fill('#f-mail', pole.mail);
    await p.fill('#f-zajem', pole.zajem);
    if (pole.pozn) await p.fill('#f-pozn', pole.pozn);
    if (vyberText) await p.locator('#zakaznici .zak', {hasText: vyberText}).locator('button:has-text("Vybrat")').click();
    if (akce) await akce(p);
    await p.evaluate(() => { window.posledniVysledek = null; });
    await p.click('#view button:has-text("Uložit")');
    await p.waitForFunction(() => window.posledniVysledek, null, {timeout: 5000});
    await p.waitForSelector('button:has-text("Upravit údaje")');          // jako ve v1.1: po uložení detail poptávky
    return p.evaluate(() => window.posledniVysledek);
  };
  const pocet = async () => Object.keys(await admin('zakaznici') || {}).length;
  const zak = k => admin('zakaznici/' + k);
  const detail = p => p.innerText('#view');

  console.log('== Příprava: 5 smyšlených zákazníků zapsaných přes nasazená pravidla jako „DFE“');
  let p = await otevri();
  await T('zápis 5 zákazníků projde nasazenými pravidly', async () => {
    await p.evaluate(async SEED => {
      const upd = {};
      for (const c of SEED) { const {key, ...z} = c;
        upd['zakaznici/' + key] = {...z, zdroj:'dfe', vytvoreno:TS(), upraveno:TS(), upravil:user.uid, klice:klicePro(c.telefon, c.email)}; }
      await db.ref().update(upd);
    }, ZAKAZNICI);
    return await pocet() === 5 || await pocet(); });
  await p.waitForFunction(() => ZAKAZNICI.length === 5);

  console.log('== Nový zákazník a další poptávky téhož zákazníka (v0.5: A–C)');
  let pavel, idA;
  await T('A: nový zákazník (jméno + telefon) → založen a poptávka propojena, detail ukáže zákazníka', async () => {
    const r = await uloz(p, {jmeno:'Pavel Testovací', tel:'999 888 777', zajem:'GLC 300 e', pozn:'Přišel s manželkou'}); pavel = r.zakaznik; idA = r.id;
    const z = await zak(pavel), pp = await admin('poptavky/' + r.id);
    return (r.jak === 'novy' && z.jmeno === 'Pavel' && z.prijmeni === 'Testovací' && z.zdroj === 'poptavka' && z.klice['ph:999888777'] && z.upravil === u.localId
      && pp.zakaznik === pavel && await pocet() === 6 && (await detail(p)).includes('Zákazník: Pavel Testovací')) || {r, z}; });
  await T('V1: poptávka má tvar v1.1 – stav nová, další kontakt zítra, prodejce, historie se založením a poznámkou', async () => {
    const pp = await admin('poptavky/' + idA), h = Object.values(pp.historie).map(x => x.text);
    return (pp.stav === 'nova' && pp.dalsiKontakt === zitra() && pp.prodejce === 'prodejce@suw.example.cz' && pp.kanal === 'showroom'
      && typeof pp.vytvoreno === 'number' && typeof pp.upraveno === 'number' && h.includes('Založeno (🏢 Showroom)') && h.includes('Přišel s manželkou')) || pp; });
  await T('B: druhá poptávka, stejný telefon jinak napsaný, BEZ Vybrat → bez zákazníka, žádný duplikát, detail vysvětlí', async () => {
    const r = await uloz(p, {jmeno:'Pavel Testovací', tel:'+420 999-888-777', zajem:'EQE SUV'});
    const pp = await admin('poptavky/' + r.id);
    return (r.jak === 'neovereno' && r.zakaznik === null && !pp.zakaznik && await pocet() === 6 && (await detail(p)).includes('možná shoda, kterou jsi nevybral')) || r; });
  await T('C: třetí poptávka s klepnutím na Vybrat → přiřazena Pavlovi, telefon doplněn, stále 6 zákazníků', async () => {
    const r = await uloz(p, {tel:'999888777', zajem:'Servisní smlouva'}, 'Pavel Testovací');
    const pp = await admin('poptavky/' + r.id);
    return (r.jak === 'vybrany' && r.zakaznik === pavel && pp.jmeno === 'Pavel Testovací' && await pocet() === 6) || r; });

  console.log('== Existující zákazník z „DFE“ (v0.5: D–E2)');
  await T('D: Jan Novák → 3 možnosti, výběr firmy Novák Stavby → poptávka u z3', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', zajem:'Nový Sprinter'}, 'Novák Stavby', async p => {
      if (await p.locator('#zakaznici .zak').count() !== 1) throw new Error('po výběru má zůstat jen vybraná karta'); });
    return (r.jak === 'vybrany' && r.zakaznik === 'z3' && await pocet() === 6 && (await detail(p)).includes('Zákazník: Jan Novák (Novák Stavby s.r.o.)')) || r; });
  await T('E: poptávka s telefonem 731 000 111 BEZ Vybrat → bez zákazníka, žádný duplikát', async () => {
    const r = await uloz(p, {jmeno:'Novák', tel:'731 000 111', zajem:'Vito Tourer'});
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 6) || r; });
  await T('E1: stejné jméno „Jan Novák“, nový telefon, BEZ volby → bez zákazníka, nový se nezaložil', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', tel:'777 444 333', zajem:'Jiný Jan Novák – GLA'});
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 6) || r; });

  console.log('== Jen e-mail (v0.5: F–G2)');
  let eva;
  await T('F: nový zákazník jen s e-mailem → založen', async () => {
    const r = await uloz(p, {kanal:'E-mail', jmeno:'Eva Mailová', mail:'eva.mailova@example.cz', zajem:'A 250 e'}); eva = r.zakaznik;
    const z = await zak(eva);
    return (r.jak === 'novy' && z.klice['em:eva,mailova@example,cz'] && await pocet() === 7) || {r, z}; });
  await T('G: stejný e-mail velkými písmeny BEZ Vybrat → bez zákazníka, žádný duplikát', async () => {
    const r = await uloz(p, {kanal:'E-mail', jmeno:'Eva Mailová', mail:'Eva.Mailova@Example.cz', zajem:'CLA'});
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 7) || r; });
  await T('G1: e-mail existuje, ale jiné jméno (vyhledávání ho neukáže) → bez zákazníka, žádný duplikát', async () => {
    const r = await uloz(p, {kanal:'E-mail', jmeno:'Petr Jiný', mail:'eva.mailova@example.cz', zajem:'Manžel Evy?'});
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 7) || r; });
  await T('G2: detail po uložení vysvětlí, proč se zákazník nepřiřadil', async () =>
    (await detail(p)).includes('Uloženo bez zákazníka – v evidenci je možná shoda, kterou jsi nevybral.') || await detail(p));

  console.log('== Hranice (v0.5: H, I)');
  await T('H: bez jména → poptávka uložena bez zákazníka, bez vysvětlující hlášky (jako ve v1.1)', async () => {
    const r = await uloz(p, {tel:'777 555 444', zajem:'Volal, jméno neřekl'});
    return (r.jak === 'bez' && await pocet() === 7 && !(await detail(p)).includes('Uloženo bez zákazníka')) || r; });
  await T('I: telefon s poznámkou „(manžel)“ → poptávka uložena, zákazník nevznikne', async () => {
    const r = await uloz(p, {jmeno:'Karel Poznámka', tel:'777 000 999 (manžel)', zajem:'GLE'});
    return (r.jak === 'bez' && (await admin('poptavky/' + r.id)).telefon === '777 000 999 (manžel)' && await pocet() === 7) || r; });

  console.log('== „Je to nový zákazník“ (v0.5: N0–N7)');
  const z1Pred = JSON.stringify(await zak('z1')), z3Pred = JSON.stringify(await zak('z3')), z5Pred = JSON.stringify(await zak('z5'));
  await T('N0: volba se ukáže jen u možné shody (Jan Novák: 3 karty + volba; neznámé jméno: nic)', async () => {
    await doFormulare(p); await p.fill('#f-jmeno', 'Jan Novák');
    const karty = await p.locator('#zakaznici .zak').count(), tl = await p.locator(NOVY).count();
    await p.fill('#f-jmeno', 'Zdeněk Neznámý');
    const prazdno = (await p.innerText('#zakaznici')).trim() === '';
    return (karty === 3 && tl === 1 && prazdno) || {karty, tl, prazdno}; });
  let janNovy;
  await T('N1: SKUTEČNĚ NOVÝ Jan Novák + „Je to nový zákazník“ → založen, poptávka jeho, z1 a z3 beze změny', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', tel:'777 444 333', zajem:'Třetí Jan Novák – C 200'}, null, async p => {
      await p.click(NOVY);
      if (!(await p.innerText('#zakaznici')).includes('Nový zákazník – při uložení se založí')) throw new Error('chybí potvrzení volby'); });
    janNovy = r.zakaznik; const z = await zak(janNovy);
    return (r.jak === 'novyPotvrzeny' && z.jmeno === 'Jan' && z.prijmeni === 'Novák' && z.klice['ph:777444333'] && await pocet() === 8
      && JSON.stringify(await zak('z1')) === z1Pred && JSON.stringify(await zak('z3')) === z3Pred && (await detail(p)).includes('Zákazník: Jan Novák')) || {r, z}; });
  await T('N2: EXISTUJÍCÍ zákazník správně vybrán – 4 možnosti + volba nový, Vybrat u Novák Stavby → z3, žádný nový', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', zajem:'Pracovní dodávka eVito'}, 'Novák Stavby', async p => {
      if (await p.locator(NOVY).count()) throw new Error('volba „nový“ zůstala vidět po výběru'); });
    return (r.jak === 'vybrany' && r.zakaznik === 'z3' && await pocet() === 8) || r; });
  await T('N2b: nově založeného Jana Nováka lze příště vybrat (karta s 777 444 333) → přiřazena jemu', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', zajem:'Zkušební jízda C 200'}, '777 444 333');
    return (r.jak === 'vybrany' && r.zakaznik === janNovy && await pocet() === 8) || r; });
  await T('N3: „Je to nový zákazník“ a pak Zrušit → bez zákazníka, nic nezaloženo', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', tel:'777 222 111', zajem:'Rozmyslel jsem se'}, null, async p => {
      await p.click(NOVY); await p.click('button:has-text("Zrušit – ukázat podobné")');
      if (await p.locator('#zakaznici .zak').count() !== 4) throw new Error('po zrušení se neukázali podobní'); });
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 8) || r; });
  await T('N4: volba „nový“, pak telefon jiné zákaznice (nová možná shoda) → volba zrušena, bez zákazníka', async () => {
    const r = await uloz(p, {jmeno:'Jana Nováková', zajem:'Jiná Jana?'}, null, async p => {
      await p.click(NOVY); await p.fill('#f-tel', '608 222 333');
      const t = await p.innerText('#zakaznici');
      if (!t.includes('Petra Dvořáková') || !(await p.locator(NOVY).count())) throw new Error('nová shoda se neukázala: ' + t); });
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 8) || r; });
  await T('N5: volba „nový“, ale e-mail patří zákaznici, kterou nabídka neukázala → bez zákazníka a vysvětlení', async () => {
    const r = await uloz(p, {jmeno:'Jan Novák', mail:'eva.mailova@example.cz', zajem:'Skrytá shoda e-mailu'}, null, async p => p.click(NOVY));
    return (r.jak === 'neovereno' && r.zakaznik === null && await pocet() === 8 && (await detail(p)).includes('kterého jsi v nabídce neviděl')) || r; });
  let marie;
  await T('N6: sdílený telefon – Marie Černá s telefonem Tomáše Černého, volba „nový“ → založena, Tomáš beze změny', async () => {
    const r = await uloz(p, {jmeno:'Marie Černá', tel:'775 888 999', zajem:'Manželka, chce A-Class'}, null, async p => {
      if (!(await p.innerText('#zakaznici')).includes('shoda telefonu')) throw new Error('Tomáš se neukázal');
      await p.click(NOVY); });
    marie = r.zakaznik;
    return (r.jak === 'novyPotvrzeny' && (await zak(marie)).prijmeni === 'Černá' && await pocet() === 9 && JSON.stringify(await zak('z5')) === z5Pred) || r; });
  await T('N7: volba „nový“ bez jména → poptávka uložena, zákazník nevznikne, detail vysvětlí', async () => {
    const r = await uloz(p, {tel:'602 111 222', zajem:'Neřekl jméno'}, null, async p => p.click(NOVY));
    return (r.jak === 'bez' && await pocet() === 9 && (await detail(p)).includes('Zákazník se nezaložil')) || r; });

  console.log('== Začlenění do v1.1 (V2–V5)');
  await T('V2: úprava údajů poptávky se zákazníkem → zákazník zůstane, ve formuláři úprav není panel zákazníků', async () => {
    await p.click('button:has-text("← Přehled")'); await p.fill('#hledat', 'GLC 300 e'); await p.locator('#seznam .card', {hasText:'GLC 300 e'}).click();
    await p.click('button:has-text("Upravit údaje")');
    const panel = await p.locator('#zakaznici').count();
    await p.fill('#f-zajem', 'GLC 300 e – upraveno'); await p.click('#view button:has-text("Uložit")'); await p.waitForSelector('button:has-text("Upravit údaje")');
    const pp = await admin('poptavky/' + idA);
    return (panel === 0 && pp.zakaznik === pavel && pp.zajem === 'GLC 300 e – upraveno') || {panel, pp}; });
  await T('V3: změna stavu a poznámka v detailu fungují jako ve v1.1 (stav, další kontakt +3 dny, historie)', async () => {
    await p.click('.chip:has-text("Nabídka odeslána")'); await p.fill('#d-pozn', 'Poslal jsem nabídku'); await p.click('button:has-text("Zapsat")');
    await p.waitForFunction(() => document.body.innerText.includes('Poslal jsem nabídku'));
    const pp = await admin('poptavky/' + idA), h = Object.values(pp.historie).map(x => x.text);
    return (pp.stav === 'nabidka' && h.some(t => t.startsWith('Stav → Nabídka odeslána')) && h.includes('Poslal jsem nabídku')) || pp; });
  await T('V4: parser e-mailu vyplní pole a hned ukáže známého zákazníka', async () => {
    await doFormulare(p); await p.click('#kanaly label:has-text("E-mail")');
    await p.fill('#f-paste', 'Od: Petra Dvořáková <petra.dvorakova@example.cz>\nDobrý den, mám zájem o EQB. Tel. 608 222 333');
    await p.click('button:has-text("Vytáhnout údaje")');
    const t = await p.innerText('#zakaznici');
    return ((await p.inputValue('#f-jmeno')) === 'Petra Dvořáková' && t.includes('Petra Dvořáková') && t.includes('shoda telefonu')) || t; });
  await T('V5: obsah z databáze se escapuje (jméno zákazníka s HTML)', async () => {
    await admin('zakaznici/zx', 'PUT', {jmeno:'<img src=x onerror=alert(1)>', prijmeni:'Hacker', zdroj:'dfe', vytvoreno:1, upraveno:1, upravil:u.localId, klice:{'ph:720000001':true}, telefon:'720 000 001'});
    await p.waitForFunction(() => ZAKAZNICI.length === 10);
    await p.fill('#f-tel', '720 000 001');
    const h = await p.innerHTML('#zakaznici');
    await admin('zakaznici/zx', 'DELETE');
    return (h.includes('&lt;img') && !(await p.locator('#zakaznici img').count())) || h; });
  await p.context().close();

  console.log('== Opětovné načtení (nové okno, data jen z emulátoru)');
  const vse = await admin('');
  await T('každá poptávka se zákazníkem ukazuje na existující záznam', async () =>
    Object.values(vse.poptavky).filter(x => x.zakaznik).every(x => vse.zakaznici[x.zakaznik]) || 'osiřelý odkaz');
  await T('počty: 9 zákazníků, 19 poptávek, Pavel 2, z3 2, Eva 1, nový Jan Novák 2, Marie 1, bez zákazníka 11', async () => {
    const po = Object.values(vse.poptavky), n = k => po.filter(x => x.zakaznik === k).length;
    const r = [Object.keys(vse.zakaznici).length, po.length, n(pavel), n('z3'), n(eva), n(janNovy), n(marie), po.filter(x => !x.zakaznik).length];
    return JSON.stringify(r) === '[9,19,2,2,1,2,1,11]' || r; });
  for (const [nazev, opts] of [['PC', undefined], ['iPhone 13', IPHONE]]) {
    p = await otevri(opts);
    await p.waitForFunction(() => ZAKAZNICI.length === 9);
    await T(`${nazev}: „Jan Novák“ ukáže 4 možnosti, Novák Stavby s 2 poptávkami, a volbu „Je to nový zákazník“`, async () => {
      await p.click('#fab'); await p.fill('#f-jmeno', 'Jan Novák');
      const n = await p.locator('#zakaznici .zak').count(), t = await p.locator('#zakaznici .zak', {hasText:'Novák Stavby'}).innerText();
      return (n === 4 && t.includes('Poptávek: 2') && t.includes('Nový Sprinter') && !t.includes('Vito Tourer') && await p.locator(NOVY).count() === 1) || {n, t}; });
    await T(`${nazev}: telefon 999 888 777 najde Pavla se 2 přiřazenými poptávkami`, async () => {
      await p.fill('#f-jmeno', ''); await p.fill('#f-tel', '999 888 777');
      const t = await p.innerText('#zakaznici'); return (t.includes('Pavel Testovací') && t.includes('Poptávek: 2') && !t.includes('EQE SUV')) || t; });
    await T(`${nazev}: „Dnes zavolat“ a seznam fungují jako ve v1.1 (filtr Otevřené: všech 19)`, async () => {
      await p.click('#view button:has-text("Zpět")');
      return ((await p.innerText('#view')).includes('Poptávky') && await p.locator('#seznam .card').count() === 19) || await p.locator('#seznam .card').count(); });
    await T(`${nazev}: žádné chyby, žádné požadavky mimo emulátory, nic se neposouvá do stran`, async () =>
      (p.chyby.length === 0 && p.cizi.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)) || [p.chyby, p.cizi]);
    if (nazev === 'iPhone 13' && process.env.SCREEN_DIR) {
      await p.click('#fab'); await p.fill('#f-jmeno', 'Jan Novák');
      await p.screenshot({path: path.join(process.env.SCREEN_DIR, 'v1.2_iphone.png'), fullPage:true});
    }
    await p.context().close();
  }

  console.log('== Start s prázdnou evidencí zákazníků (rozhodnutí 1a) a výpadek /zakaznici');
  await reset(); p = await otevri();
  await T('V6: prázdná /zakaznici → žádný panel, první poptávka založí zákazníka', async () => {
    await doFormulare(p); await p.fill('#f-jmeno', 'Alois První'); await p.fill('#f-tel', '720 333 444');
    const panel = (await p.innerText('#zakaznici')).trim();
    await p.click('#view button:has-text("Zpět")');
    const r = await uloz(p, {jmeno:'Alois První', tel:'720 333 444', zajem:'GLB'});
    return (panel === '' && r.jak === 'novy' && await pocet() === 1) || {panel, r}; });
  await T('V7: starší poptávka bez pole zakaznik (z v1.1) se zobrazí a upraví beze změny', async () => {
    await admin('poptavky/stara', 'PUT', {kanal:'telefon', jmeno:'Starý Zápis', telefon:'720 999 888', zajem:'Z v1.1', stav:'nova', dalsiKontakt:zitra(), vytvoreno:1, upraveno:1, prodejce:'prodejce@suw.example.cz', historie:{h1:{t:1, kdo:'prodejce@suw.example.cz', text:'Založeno (📞 Telefon)'}}});
    await p.click('button:has-text("← Přehled")'); await p.locator('#seznam .card', {hasText:'Starý Zápis'}).click();
    const d = await detail(p);
    await p.click('button:has-text("Upravit údaje")'); await p.fill('#f-zajem', 'Z v1.1 – upraveno'); await p.click('#view button:has-text("Uložit")');
    await p.waitForSelector('button:has-text("Upravit údaje")');
    const pp = await admin('poptavky/stara');
    return (d.includes('Starý Zápis') && !d.includes('Zákazník:') && pp.zajem === 'Z v1.1 – upraveno' && !('zakaznik' in pp)) || {d, pp}; });
  await p.context().close();
  await pravidla(PRAVIDLA.replace(/("zakaznici"\s*:\s*\{\s*"\.read"\s*:\s*)"[^"]*"/, '$1false'));   // jen v emulátoru: /zakaznici nečitelné
  p = await otevri();
  await T('V8: /zakaznici nejde číst → poptávka se uloží bez zákazníka jako ve v1.1, žádná chyba', async () => {
    const r = await uloz(p, {jmeno:'Bez Přístupu', tel:'720 444 555', zajem:'EQA'});
    return (r.jak === 'bez' && (await admin('poptavky/' + r.id)).jmeno === 'Bez Přístupu' && p.chyby.length === 0) || {r, ch: p.chyby}; });
  await p.context().close();
  await pravidla(PRAVIDLA);

  await br.close();
  fs.rmSync(TMP, {recursive:true, force:true});
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
