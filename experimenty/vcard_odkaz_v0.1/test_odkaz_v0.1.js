// test_odkaz_v0.1.js – ověření experimentu „kontakt v iPhonu s odkazem na poptávku“. Jen smyšlená data, žádná síť ani Firebase.
// Spuštění (Node 20+, Playwright s Chromiem, ical.js jako nezávislý čtenář vCard):
//   ICALJS=/cesta/k/node_modules/ical.js node test_odkaz_v0.1.js [--zapsat]
// --zapsat vytvoří Jan_Testovaci_odkaz.vcf s odkazem na ukázkovou stránku na raw.githack.com (větev claude/experiment-vcard).
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');

const DIR = __dirname, KONTAKT = path.join(DIR, 'kontakt_odkaz_v0.1.html'), DEMO = path.join(DIR, 'poptavky_demo_v0.1.html');
const GITHACK = 'https://raw.githack.com/spavlacek-glitch/Popt-vky/claude/experiment-vcard/experimenty/vcard_odkaz_v0.1/poptavky_demo_v0.1.html';
const html = fs.readFileSync(KONTAKT, 'utf8');
const blok = html.slice(html.indexOf('/* ===== Smyšlený zákazník'), html.indexOf('/* ===== Konec bloku vCard'));
const { ZAKAZNIK, vytvorVCard, odkazNaPoptavku, nazevSouboru } = new Function(blok + ';return {ZAKAZNIK, vytvorVCard, odkazNaPoptavku, nazevSouboru};')();

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r).slice(0, 300)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
// Vlastní čtení podle RFC 2426: rozvinout zalomené řádky, rozdělit „skupina.VLASTNOST;parametry:hodnota“
function radky(vcf){
  return vcf.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean).map(r => {
    const i = r.indexOf(':'), hlava = r.slice(0, i).split(';')[0], tecka = hlava.indexOf('.');
    return {skupina: tecka > 0 ? hlava.slice(0, tecka) : '', jmeno: tecka > 0 ? hlava.slice(tecka + 1) : hlava, hodnota: r.slice(i + 1)};
  });
}

(async () => {
  const ICAL = (await import(path.join(process.env.ICALJS, 'dist', 'ical.js'))).default;
  const ODKAZ = odkazNaPoptavku(GITHACK, ZAKAZNIK.poptavka), VCF = vytvorVCard(ZAKAZNIK, ODKAZ);
  if (process.argv.includes('--zapsat')) fs.writeFileSync(path.join(DIR, 'Jan_Testovaci_odkaz.vcf'), VCF, 'utf8');
  console.log('== Soubor vCard s odkazem\n' + VCF.replace(/\r\n/g, '⏎\n'));

  await T('řádky CRLF, žádný delší než 75 bajtů (i dlouhý odkaz je zalomený podle normy)', async () =>
    (!/[^\r]\n/.test(VCF) && VCF.split('\r\n').every(r => Buffer.byteLength(r) <= 75)) || VCF.split('\r\n').map(r => Buffer.byteLength(r)));
  const r = radky(VCF), url = r.find(x => x.jmeno === 'URL'), stitek = r.find(x => x.jmeno === 'X-ABLabel');
  await T('po rozvinutí je odkaz celý a přesný, ve skupině item1 s popiskem „Poptávky“', async () =>
    (url.hodnota === ODKAZ && url.skupina === 'item1' && stitek.skupina === 'item1' && stitek.hodnota === 'Poptávky') || {url, stitek});
  await T('odkaz nese jen ID poptávky – žádné jméno, telefon ani e-mail', async () =>
    (!/Jan|777|example|Testov/i.test(ODKAZ.split('#')[1]) && ODKAZ.endsWith('#poptavka=-ODemoK7x2Pq1')) || ODKAZ);
  await T('ical.js přečte odkaz ze skupiny item1 a ostatní údaje beze změny', async () => {
    const c = new ICAL.Component(ICAL.parse(VCF)), u = c.getFirstProperty('url');
    return (u.getFirstValue() === ODKAZ && c.getFirstPropertyValue('fn') === 'Jan Testovací' && c.getFirstPropertyValue('tel') === '+420 777 123 456'
      && c.getFirstPropertyValue('note') === ZAKAZNIK.poznamka && c.getFirstPropertyValue('x-ablabel') === 'Poptávky') || {u: u && u.getFirstValue()}; });
  await T('bez odkazu je vCard stejný jako v ověřeném experimentu vcard_v0.1', async () => {
    const stary = fs.readFileSync(path.join(DIR, '..', 'vcard_v0.1', 'Jan_Testovaci.vcf'), 'utf8');
    return vytvorVCard(ZAKAZNIK, null) === stary || 'liší se'; });
  await T('ID se zvláštními znaky se v odkazu zakóduje (bezpečné pro adresu)', async () =>
    odkazNaPoptavku(GITHACK, '-OAb_c 1/#') === GITHACK + '#poptavka=-OAb_c%201%2F%23' || odkazNaPoptavku(GITHACK, '-OAb_c 1/#'));
  await T('hotový soubor Jan_Testovaci_odkaz.vcf v repu je bajt po bajtu stejný', async () =>
    fs.readFileSync(path.join(DIR, 'Jan_Testovaci_odkaz.vcf'), 'utf8') === VCF || 'liší se – spusť s --zapsat');

  console.log('== Celý řetězec v prohlížeči (PC a iPhone 13)');
  const b = await chromium.launch();
  const {userAgent, ...IPHONE} = devices['iPhone 13'];
  for (const [nazev, opts] of [['PC', {viewport: {width: 1280, height: 800}}], ['iPhone 13', IPHONE]]) {
    const ctx = await b.newContext({...opts, acceptDownloads: true}), p = await ctx.newPage(), cizi = [], chyby = [];
    p.on('request', q => { if (!/^(file:|blob:)/.test(q.url())) cizi.push(q.url()); });
    p.on('pageerror', e => chyby.push(e.message));
    await p.goto('file://' + KONTAKT);
    let odkazZeSouboru;
    await T(`${nazev}: „Uložit do kontaktů“ stáhne vCard s odkazem na ukázkové Poptávky`, async () => {
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Uložit do kontaktů")')]);
      const obsah = fs.readFileSync(await dl.path(), 'utf8');
      odkazZeSouboru = radky(obsah).find(x => x.jmeno === 'URL').hodnota;
      return (dl.suggestedFilename() === 'Jan_Testovaci_odkaz.vcf' && odkazZeSouboru === 'file://' + DEMO + '#poptavka=-ODemoK7x2Pq1'
        && obsah === vytvorVCard(ZAKAZNIK, odkazZeSouboru)) || {jmeno: dl.suggestedFilename(), odkazZeSouboru}; });
    await T(`${nazev}: odkaz ze staženého souboru otevře rovnou detail poptávky Jan Testovací`, async () => {
      await p.goto(odkazZeSouboru);
      const t = await p.innerText('#view');
      return (t.includes('Otevřeno z kontaktu') && t.includes('Jan Testovací') && t.includes('GLE') && t.includes('Nabídka odeslána')
        && await p.getAttribute('.zavolat', 'href') === 'tel:777123456') || t; });
    await T(`${nazev}: „← Přehled“ ukáže seznam, klepnutí na jinou poptávku otevře její detail`, async () => {
      await p.click('text=← Přehled'); await p.waitForSelector('.seznam a'); const n = await p.locator('.seznam a').count();
      await p.click('.seznam a:has-text("Žofie Šťastná")'); await p.waitForSelector('text=Otevřeno z kontaktu'); const t = await p.innerText('#view');
      return (n === 3 && t.includes('Žofie Šťastná') && t.includes('A 200')) || {n, t}; });
    await T(`${nazev}: neexistující poptávka (smazaná) → srozumitelná hláška a přehled; poškozený odkaz → přehled`, async () => {
      await p.goto('file://' + DEMO + '#poptavka=neexistuje'); const t1 = await p.innerText('#view');
      await p.goto('file://' + DEMO + '#poptavka=%E0%A4%A'); const t2 = await p.innerText('#view');
      return (t1.includes('nenašel') && t1.includes('Jan Testovací') && !t2.includes('Otevřeno z kontaktu') && await p.locator('.seznam a').count() === 3) || {t1, t2}; });
    await T(`${nazev}: žádné chyby, žádné požadavky mimo stránku, nic se neposouvá do stran`, async () =>
      (chyby.length === 0 && cizi.length === 0 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || {chyby, cizi});
    if (process.env.SCREEN_DIR) {
      await p.goto('file://' + DEMO + '#poptavka=-ODemoK7x2Pq1'); await p.screenshot({path: path.join(process.env.SCREEN_DIR, `odkaz_detail_${nazev.replace(/\s/g, '')}.png`)});
      await p.goto('file://' + KONTAKT); await p.screenshot({path: path.join(process.env.SCREEN_DIR, `odkaz_kontakt_${nazev.replace(/\s/g, '')}.png`), fullPage: true});
    }
    await ctx.close();
  }
  await b.close();
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
