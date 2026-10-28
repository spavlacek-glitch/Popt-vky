// test_vcard_v0.1.js – ověření experimentu „Uložit do kontaktů“ (vCard 3.0). Jen smyšlená data, žádná síť ani Firebase.
// Spuštění (Node 20+, Playwright s Chromiem, balíček ical.js jako nezávislý čtenář vCard):
//   ICALJS=/cesta/k/node_modules/ical.js node test_vcard_v0.1.js
// S parametrem --zapsat vytvoří hotový soubor Jan_Testovaci.vcf ze stejné funkce jako stránka.
const fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');

const DIR = __dirname, STRANKA = path.join(DIR, 'kontakt_v0.1.html');
const html = fs.readFileSync(STRANKA, 'utf8');
const blok = html.slice(html.indexOf('/* ===== Smyšlený zákazník'), html.indexOf('/* ===== Konec bloku vCard'));
const { ZAKAZNIK, vytvorVCard, nazevSouboru, telefonCZ } = new Function(blok + ';return {ZAKAZNIK, vytvorVCard, nazevSouboru, telefonCZ};')();

let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }

// Nezávislé čtení vCard knihovnou ical.js
async function nactiICAL(vcf){
  const ICAL = (await import(path.join(process.env.ICALJS, 'dist', 'ical.js'))).default;
  const c = new ICAL.Component(ICAL.parse(vcf));
  const v = n => c.getFirstPropertyValue(n);
  return {fn: v('fn'), n: v('n'), tel: v('tel'), email: v('email'), note: v('note'), verze: v('version')};
}
const bajty = s => Buffer.byteLength(s, 'utf8');

(async () => {
  const VCF = vytvorVCard(ZAKAZNIK);
  if (process.argv.includes('--zapsat')) fs.writeFileSync(path.join(DIR, nazevSouboru(ZAKAZNIK)), VCF, 'utf8');
  console.log('== Formát vCard 3.0 (RFC 2426)\n' + VCF.replace(/\r\n/g, '⏎\n'));

  await T('začíná BEGIN:VCARD / VERSION:3.0 a končí END:VCARD', async () =>
    (VCF.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n') && VCF.endsWith('END:VCARD\r\n')) || VCF.slice(0, 40));
  await T('všechny řádky končí CRLF, žádné samotné LF', async () => !/[^\r]\n/.test(VCF) || 'samotné LF');
  await T('žádný řádek nemá víc než 75 bajtů (UTF-8)', async () => VCF.split('\r\n').every(r => bajty(r) <= 75) || VCF.split('\r\n').map(bajty));
  await T('soubor je platné UTF-8 a české znaky se nezměnily', async () => {
    const zpet = Buffer.from(VCF, 'utf8').toString('utf8');
    return (zpet === VCF && ['Testovací', 'Shání', 'rozpočet', 'Kč'].every(s => zpet.includes(s))) || 'diakritika'; });
  await T('název souboru bez diakritiky: Jan_Testovaci.vcf', async () => nazevSouboru(ZAKAZNIK) === 'Jan_Testovaci.vcf' || nazevSouboru(ZAKAZNIK));

  console.log('== Nezávislé čtení knihovnou ical.js');
  const p = await nactiICAL(VCF);
  await T('jméno: FN „Jan Testovací“, N příjmení „Testovací“ a jméno „Jan“', async () =>
    (p.fn === 'Jan Testovací' && p.n[0] === 'Testovací' && p.n[1] === 'Jan') || p);
  await T('telefon: +420 777 123 456', async () => p.tel === '+420 777 123 456' || p.tel);
  await T('e-mail: jan@example.com', async () => p.email === 'jan@example.com' || p.email);
  await T('poznámka přesně jako zadaná (čárky, háčky, čárky nad písmeny)', async () => p.note === ZAKAZNIK.poznamka || p.note);

  console.log('== Hraniční údaje (escapování a zalamování)');
  const tezky = {jmeno: 'Žofie', prijmeni: 'Šťastná-Řeháková', telefon: '+420 602-111-222', email: 'zofie@example.com',
    poznamka: 'Středník; čárka, zpětné \\ lomítko\nnový řádek – a dlouhý text: Příliš žluťoučký kůň úpěl ďábelské ódy, '.repeat(3)};
  const V2 = vytvorVCard(tezky), p2 = await nactiICAL(V2);
  // Dekodér podle RFC 2426 (vCard 3.0): rozvinout zalomené řádky, pak \\ → \, \; → ;, \, → ,, \n → nový řádek
  const poznamkaRFC2426 = vcf => vcf.replace(/\r\n[ \t]/g, '').split('\r\n').find(r => r.startsWith('NOTE:')).slice(5)
    .replace(/\\([\\;,nN])/g, (_, c) => c === 'n' || c === 'N' ? '\n' : c);
  await T('středník, čárka, zpětné lomítko a nový řádek v poznámce projdou beze změny (dekodér podle vCard 3.0)', async () =>
    poznamkaRFC2426(V2) === tezky.poznamka || poznamkaRFC2426(V2));
  await T('ical.js: čárka, zpětné lomítko a nový řádek beze změny (středník ical.js podle vCard 4.0 nedekóduje – známá odchylka knihovny)', async () =>
    p2.note.replace(/\\;/g, ';') === tezky.poznamka || p2.note);
  await T('dlouhá poznámka je zalomená po max. 75 bajtech a nikde není rozdělený znak', async () =>
    (V2.split('\r\n').every(r => bajty(r) <= 75) && !V2.includes('�') && V2.split('\r\n').length > 10) || V2.split('\r\n').map(bajty));
  await T('jména s diakritikou a pomlčkou, telefon 602-111-222 → +420 602 111 222', async () =>
    (p2.n[0] === 'Šťastná-Řeháková' && p2.n[1] === 'Žofie' && p2.tel === '+420 602 111 222') || p2);
  await T('telefon: 00420… i 9 číslic převede na +420, jiný tvar nechá beze změny', async () =>
    (telefonCZ('00420777123456') === '+420 777 123 456' && telefonCZ('777123456') === '+420 777 123 456' && telefonCZ('+49 30 1234567') === '+49 30 1234567') || 'telefon');

  console.log('== Hotový soubor Jan_Testovaci.vcf (záložní cesta „odkaz“)');
  await T('soubor v repu je bajt po bajtu stejný jako generovaný', async () =>
    fs.readFileSync(path.join(DIR, 'Jan_Testovaci.vcf'), 'utf8') === VCF || 'liší se – spusť s --zapsat');

  console.log('== Stránka v prohlížeči (PC a rozměr iPhonu)');
  const b = await chromium.launch();
  const {userAgent, ...IPHONE} = devices['iPhone 13'];
  for (const [nazev, opts] of [['PC', {viewport: {width: 1280, height: 800}}], ['iPhone 13', IPHONE]]) {
    const ctx = await b.newContext({...opts, acceptDownloads: true}), s = await ctx.newPage(), cizi = [], chyby = [];
    s.on('request', q => { if (!q.url().startsWith('file:') && !q.url().startsWith('blob:')) cizi.push(q.url()); });
    s.on('pageerror', e => chyby.push(e.message));
    await s.goto('file://' + STRANKA);
    await T(`${nazev}: tlačítko „Uložit do kontaktů“ stáhne Jan_Testovaci.vcf se stejným obsahem`, async () => {
      const [dl] = await Promise.all([s.waitForEvent('download'), s.click('button:has-text("Uložit do kontaktů")')]);
      const obsah = fs.readFileSync(await dl.path(), 'utf8');
      return (dl.suggestedFilename() === 'Jan_Testovaci.vcf' && obsah === VCF) || {jmeno: dl.suggestedFilename(), shoda: obsah === VCF}; });
    await T(`${nazev}: stránka ukazuje údaje s diakritikou a obsah vCard pro kontrolu`, async () => {
      const t = await s.innerText('#udaje'); const pre = await s.textContent('#obsah');
      return (t.includes('Jan Testovací') && t.includes('+420 777 123 456') && t.includes('rozpočet do 2 mil. Kč') && pre === VCF) || t; });
    await T(`${nazev}: žádné chyby, žádné požadavky mimo stránku, nic se neposouvá do stran`, async () =>
      (chyby.length === 0 && cizi.length === 0 && await s.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) || {chyby, cizi});
    if (process.env.SCREEN_DIR) await s.screenshot({path: path.join(process.env.SCREEN_DIR, `vcard_${nazev.replace(/\s/g, '')}.png`), fullPage: true});
    await ctx.close();
  }
  await b.close();
  console.log(`\nCELKEM ${ok} / ${celkem}`);
  process.exit(ok === celkem ? 0 : 1);
})();
