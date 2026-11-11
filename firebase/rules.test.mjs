// Testy pravidel Realtime Database – běží jen proti lokálnímu emulátoru, nikdy proti produkci.
// Všechna data jsou fiktivní (example.cz, smyšlená jména a VIN).
import { test, before, after, beforeEach, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, push, update, get, remove, serverTimestamp, query, orderByChild, equalTo } from 'firebase/database';

const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':');
const rules = file => readFileSync(new URL(file, import.meta.url), 'utf8');

const SCHVALENY = 'uid-prodejce';   // je v /uzivatele se schvalen: true
const NESCHVALENY = 'uid-cizi';     // má účet ve Firebase Auth, ale není schválen
const VYPNUTY = 'uid-byvaly';       // v /uzivatele, ale schvalen: false
const VEDOUCI = 'uid-vedouci';      // schvalen + vedouci: true (vidí vše, zadává dohody)
const SYKORA = 'uid-sykora';        // druhý prodejce (v1.24): vidí jen své poptávky
const mail = uid => uid + '@example.cz';   // e-mail v přihlašovacím tokenu testů

/* Fiktivní zákazník ve schváleném tvaru */
const zakaznik = (uid, extra = {}) => ({
  jmeno: 'Jan', prijmeni: 'Testovací', firma: 'Testovací s.r.o.', ico: '12345678',
  telefon: '+420 777 000 111', email: 'jan.testovaci@example.cz',
  zdroj: 'dfe', vytvoreno: serverTimestamp(), upraveno: serverTimestamp(), upravil: uid,
  klice: { 'ph:777000111': true, 'em:jan,testovaci@example,cz': true, 'id:12345678': true },
  vozidla: { 'vin:WDD0000000T000001': { model: 'GLC 220 d 4MATIC', trida: 'GLC', vin: 'WDD0000000T000001', auftrag: 'T0001', predano: '2022-05-21' } },
  ...extra
});

/* Fiktivní poptávka přesně ve tvaru, jaký zapisuje poptavky_v1.html */
const poptavka = email => ({
  kanal: 'telefon', jmeno: 'Eva Zkušební', telefon: '777 000 222', email: 'eva@example.cz',
  zajem: 'GLE 300 d, do konce roku', dalsiKontakt: '2026-10-29', upraveno: serverTimestamp(),
  stav: 'nova', vytvoreno: serverTimestamp(), prodejce: email,
  historie: { h1: { t: serverTimestamp(), kdo: email, text: 'Založeno (📞 Telefon)' } }
});

describe('Navrhovaná pravidla (database.rules.json)', () => {
  let env;
  const db = uid => uid ? env.authenticatedContext(uid, { email: uid + '@example.cz' }).database() : env.unauthenticatedContext().database();

  before(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-poptavky', database: { host, port: +port, rules: rules('./database.rules.json') } });
  });
  after(async () => { await env?.cleanup(); });
  beforeEach(async () => {
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx => {
      const d = ctx.database();
      await set(ref(d, 'uzivatele'), {
        [SCHVALENY]: { schvalen: true, email: mail(SCHVALENY) },
        [VEDOUCI]: { schvalen: true, vedouci: true, email: mail(VEDOUCI) },
        [SYKORA]: { schvalen: true, email: mail(SYKORA) },
        [VYPNUTY]: { schvalen: false, email: 'byvaly@example.cz' }
      });
      await set(ref(d, 'poptavky/p1'), { ...poptavka(mail(SCHVALENY)), vytvoreno: 1, upraveno: 1, historie: { h1: { t: 1, kdo: 'x', text: 'Založeno' } },
        dohody: { d1: { text: 'Zavolej mu a dej mu 1 % navíc.', do: '2026-11-09', zadal: mail(VEDOUCI), t: 1, stav: 'otevrena' } } });
      await set(ref(d, 'poptavky/p2'), { ...poptavka(mail(SYKORA)), jmeno: 'Karel Cizí', vytvoreno: 1, upraveno: 1, historie: { h1: { t: 1, kdo: 'x', text: 'Založeno' } },
        dohody: { d1: { text: 'Pošli nabídku.', do: '2026-11-09', zadal: mail(VEDOUCI), t: 1, stav: 'otevrena' } },
        nabidky: { n1: { model: 'GLC', cena_sdph: 1000000, t: 1, kdo: mail(SYKORA), zdroj: 'offerstudio', interni: { zisk: 50000, skutecny_zisk: 50000 } } } });
      await set(ref(d, 'zakaznici/k1'), { ...zakaznik(SCHVALENY), vytvoreno: 1, upraveno: 1 });
    });
  });

  describe('Nepřihlášený uživatel', () => {
    test('nečte poptávky', () => assertFails(get(ref(db(null), 'poptavky'))));
    test('nezapíše poptávku', () => assertFails(set(push(ref(db(null), 'poptavky')), poptavka('anon@example.cz'))));
    test('nečte zákazníky', () => assertFails(get(ref(db(null), 'zakaznici'))));
    test('nezapíše zákazníka', () => assertFails(set(ref(db(null), 'zakaznici/k2'), zakaznik('nikdo'))));
    test('nečte seznam uživatelů', () => assertFails(get(ref(db(null), 'uzivatele'))));
    test('nečte kořen databáze', () => assertFails(get(ref(db(null)))));
  });

  describe('Přihlášený, ale neschválený uživatel', () => {
    for (const [popis, uid] of [['bez záznamu v /uzivatele', NESCHVALENY], ['se schvalen: false', VYPNUTY]]) {
      test(`${popis}: nečte poptávky`, () => assertFails(get(ref(db(uid), 'poptavky'))));
      test(`${popis}: nezapíše poptávku`, () => assertFails(set(push(ref(db(uid), 'poptavky')), poptavka(uid + '@example.cz'))));
      test(`${popis}: nesmaže poptávku`, () => assertFails(remove(ref(db(uid), 'poptavky/p1'))));
      test(`${popis}: nečte zákazníky`, () => assertFails(get(ref(db(uid), 'zakaznici'))));
      test(`${popis}: nezapíše zákazníka`, () => assertFails(set(ref(db(uid), 'zakaznici/k2'), zakaznik(uid))));
    }
    test('nemůže se sám schválit', () => assertFails(set(ref(db(NESCHVALENY), `uzivatele/${NESCHVALENY}`), { schvalen: true })));
    test('vypnutý se nemůže znovu zapnout', () => assertFails(set(ref(db(VYPNUTY), `uzivatele/${VYPNUTY}/schvalen`), true)));
    test('čte jen svůj záznam v /uzivatele', () => assertSucceeds(get(ref(db(VYPNUTY), `uzivatele/${VYPNUTY}`))));
  });

  describe('Schválený uživatel – Poptávky v1.0 fungují beze změny', () => {
    const email = mail(SCHVALENY);
    test('čte své poptávky (dotaz podle prodejce, jako ref.on("value"))', () => assertSucceeds(get(query(ref(db(SCHVALENY), 'poptavky'), orderByChild('prodejce'), equalTo(email)))));
    test('založí novou poptávku i s historií', () => assertSucceeds(set(push(ref(db(SCHVALENY), 'poptavky')), poptavka(email))));
    test('upraví údaje poptávky', () => assertSucceeds(update(ref(db(SCHVALENY), 'poptavky/p1'), { jmeno: 'Eva Z.', dalsiKontakt: null, upraveno: serverTimestamp() })));
    test('změní stav na nabídku a nastaví kontakt', () => assertSucceeds(update(ref(db(SCHVALENY), 'poptavky/p1'), { stav: 'nabidka', dalsiKontakt: '2026-10-31', upraveno: serverTimestamp() })));
    test('změní stav na prodáno (kontakt null)', () => assertSucceeds(update(ref(db(SCHVALENY), 'poptavky/p1'), { stav: 'prodano', dalsiKontakt: null, upraveno: serverTimestamp() })));
    test('zapíše poznámku do historie', () => assertSucceeds(push(ref(db(SCHVALENY), 'poptavky/p1/historie'), { t: serverTimestamp(), kdo: email, text: 'Volal jsem' })));
    test('smaže poptávku', () => assertSucceeds(remove(ref(db(SCHVALENY), 'poptavky/p1'))));
    test('nemůže zapisovat mimo /poptavky a /zakaznici', () => assertFails(set(ref(db(SCHVALENY), 'jine/x'), 1)));
    test('nemůže přepsat kořen databáze', () => assertFails(set(ref(db(SCHVALENY)), { poptavky: null })));
    test('nemůže měnit schválení uživatelů', () => assertFails(set(ref(db(SCHVALENY), `uzivatele/${NESCHVALENY}`), { schvalen: true })));
    test('nečte záznamy ostatních uživatelů', () => assertFails(get(ref(db(SCHVALENY), `uzivatele/${VYPNUTY}`))));
  });

  describe('Schválený uživatel – /poptavky/{id}/nabidky z Offer Studia (v1.14)', () => {
    const email = SCHVALENY + '@example.cz';
    const nab = (extra = {}) => ({ model: 'GLS 450 d 4MATIC', cena_sdph: 1274000, cena_vuz_sdph: 1270500, sleva_sdph: 60500, sleva_pct: 4.5,
      doplnky_sdph: 3500, soubor: 'Nabidka.pdf', zdroj: 'offerstudio', t: serverTimestamp(), kdo: email,
      interni: { zisk: 82000, skutecny_zisk: 62000, obchodni_marze: 7.5, skutecna_marze: 5.9, korekce: 20000, nestandardni: false, negativni: false }, ...extra });
    const zapis = (data, id = 'p1') => set(ref(db(SCHVALENY), `poptavky/${id}/nabidky/koncept1`), data);
    test('zapíše souhrn nabídky k existující poptávce', () => assertSucceeds(zapis(nab())));
    test('zapíše nabídku bez interních údajů (bez nákupní marže)', () => { const n = nab(); delete n.interni; return assertSucceeds(zapis(n)); });
    test('přepíše nabídku novou verzí', async () => { await zapis(nab()); return assertSucceeds(zapis(nab({ cena_sdph: 1250000 }))); });
    test('zapíše řádek do historie', () => assertSucceeds(push(ref(db(SCHVALENY), 'poptavky/p1/historie'), { t: serverTimestamp(), kdo: email, text: '📄 Nabídka připravena: GLS · 1 274 000 Kč' })));
    test('k neexistující poptávce nevznikne osiřelá nabídka', () => assertFails(zapis(nab(), 'neexistuje')));
    test('nabídka za jiného prodejce (kdo ≠ přihlášený)', () => assertFails(zapis(nab({ kdo: 'jiny@example.cz' }))));
    test('chybí model nebo cena', () => { const n = nab(); delete n.cena_sdph; return assertFails(zapis(n)); });
    test('cena jako text', () => assertFails(zapis(nab({ cena_sdph: '1 274 000' }))));
    test('neznámé pole v nabídce', () => assertFails(zapis(nab({ poznamka: 'x' }))));
    test('onedrive (v1.43): cesta k PDF ve firemním OneDrivu se zapíše', () => assertSucceeds(zapis(nab({ onedrive: 'Poptávky/Karolína Cahelová GLB/Karolína_Cahelová_GLB_nabidka1_20261109_145603.pdf' }))));
    test('onedrive: nabídka bez pole dál projde (starší Offer Studio)', () => assertSucceeds(zapis(nab())));
    test('onedrive: cesta jako číslo', () => assertFails(zapis(nab({ onedrive: 123 }))));
    test('onedrive: příliš dlouhá cesta (201 znaků)', () => assertFails(zapis(nab({ onedrive: 'x'.repeat(201) }))));
    test('onedrive: cesta s „..“ se nezapíše', () => assertFails(zapis(nab({ onedrive: 'Poptávky/../../jine/a.pdf' }))));
    test('neznámé pole v interních údajích', () => assertFails(zapis(nab({ interni: { zisk: 1, nakupni_cena: 2 } }))));
    test('nepřihlášený nabídku nezapíše', () => assertFails(set(ref(db(null), 'poptavky/p1/nabidky/koncept1'), nab())));
    test('neschválený nabídku nezapíše', () => assertFails(set(ref(db(NESCHVALENY), 'poptavky/p1/nabidky/koncept1'), nab({ kdo: NESCHVALENY + '@example.cz' }))));
    test('Poptávky v1.13 dál upraví poptávku s nabídkou (update jiných polí)', async () => { await zapis(nab());
      return assertSucceeds(update(ref(db(SCHVALENY), 'poptavky/p1'), { stav: 'nabidka', dalsiKontakt: '2026-11-04', upraveno: serverTimestamp() })); });
    test('smaže poptávku i s nabídkou', async () => { await zapis(nab()); return assertSucceeds(remove(ref(db(SCHVALENY), 'poptavky/p1'))); });
  });

  describe('Více prodejců (v1.24): každý vidí a mění jen své, vedoucí vše', () => {
    const A = SCHVALENY, B = SYKORA;
    const moje = (uid, kdo = uid) => get(query(ref(db(uid), 'poptavky'), orderByChild('prodejce'), equalTo(mail(kdo))));
    describe('čtení', () => {
      test('prodejce přečte celý seznam jen dotazem na vlastní e-mail', async () => { const sn = await assertSucceeds(moje(A)); assert.deepEqual(Object.keys(sn.val() || {}), ['p1']); });
      test('prodejce nepřečte celý /poptavky bez dotazu', () => assertFails(get(ref(db(A), 'poptavky'))));
      test('prodejce nepřečte cizí poptávky dotazem na cizí e-mail', () => assertFails(moje(A, B)));
      test('prodejce nepřečte cizí poptávku přímo', () => assertFails(get(ref(db(A), 'poptavky/p2'))));
      test('prodejce nepřečte cizí nabídky ani zisk', () => assertFails(get(ref(db(A), 'poptavky/p2/nabidky/n1/interni'))));
      test('prodejce přečte svou poptávku přímo (Offer Studio čte stav)', () => assertSucceeds(get(ref(db(A), 'poptavky/p1/stav'))));
      test('prodejce přečte své nabídky i dohody', async () => { await assertSucceeds(get(ref(db(A), 'poptavky/p1/dohody'))); return assertSucceeds(get(ref(db(A), 'poptavky/p1/nabidky'))); });
      test('neschválený ani nepřihlášený nečte ani vlastní dotaz', async () => { await assertFails(moje(NESCHVALENY)); return assertFails(get(query(ref(db(null), 'poptavky'), orderByChild('prodejce'), equalTo('x@example.cz')))); });
      test('vedoucí přečte všechny poptávky', async () => { const sn = await assertSucceeds(get(ref(db(VEDOUCI), 'poptavky'))); assert.deepEqual(Object.keys(sn.val()).sort(), ['p1', 'p2']); });
      test('vedoucí přečte cizí nabídky i zisk a dotaz na cizího prodejce', async () => { await assertSucceeds(get(ref(db(VEDOUCI), 'poptavky/p2/nabidky/n1/interni'))); return assertSucceeds(moje(VEDOUCI, B)); });
      test('prodejci sdílejí /zakaznici (kvůli známému zákazníkovi)', () => assertSucceeds(get(ref(db(B), 'zakaznici'))));
    });
    describe('zápis prodejce', () => {
      test('založí vlastní poptávku s historií', () => assertSucceeds(set(push(ref(db(B), 'poptavky')), poptavka(mail(B)))));
      test('nezaloží poptávku na jméno jiného prodejce', () => assertFails(set(push(ref(db(B), 'poptavky')), poptavka(mail(A)))));
      test('nezaloží poptávku bez prodejce', () => { const x = poptavka(mail(B)); delete x.prodejce; return assertFails(set(push(ref(db(B), 'poptavky')), x)); });
      test('nezaloží poptávku s předvyplněnou dohodou', () => assertFails(set(push(ref(db(B), 'poptavky')), { ...poptavka(mail(B)), dohody: { d: { text: 'x', do: '2026-11-09', zadal: mail(B), t: 1, stav: 'potvrzena' } } })));
      test('založí poptávku i zákazníka jedním zápisem z kořene (jako Poptávky)', () => assertSucceeds(update(ref(db(B)), { 'poptavky/novy1': poptavka(mail(B)), 'zakaznici/k9': zakaznik(B) })));
      test('upraví svou poptávku, stav, kontakt, vůz', () => assertSucceeds(update(ref(db(A), 'poptavky/p1'), { stav: 'nabidka', dalsiKontakt: '2026-11-10', upraveno: serverTimestamp(), vuz: { puvod: 'sklad', id: '05-576-12345' } })));
      test('zapíše poznámku do historie a důvod ticha u své poptávky', async () => { await assertSucceeds(push(ref(db(A), 'poptavky/p1/historie'), { t: serverTimestamp(), kdo: mail(A), text: 'Volal jsem' })); return assertSucceeds(set(ref(db(A), 'poptavky/p1/duvodTicha'), { text: 'dovolená', kdo: mail(A) })); });
      test('smaže svou poptávku', () => assertSucceeds(remove(ref(db(A), 'poptavky/p1'))));
      test('nezmění cizí poptávku', () => assertFails(update(ref(db(A), 'poptavky/p2'), { stav: 'ztraceno' })));
      test('nezapíše do cizí historie ani důvodu ticha', async () => { await assertFails(push(ref(db(A), 'poptavky/p2/historie'), { t: serverTimestamp(), kdo: mail(A), text: 'x' })); return assertFails(set(ref(db(A), 'poptavky/p2/duvodTicha'), { text: 'x', kdo: mail(A) })); });
      test('nesmaže cizí poptávku', () => assertFails(remove(ref(db(A), 'poptavky/p2'))));
      test('nepřevede svou poptávku na jiného prodejce', () => assertFails(update(ref(db(A), 'poptavky/p1'), { prodejce: mail(B) })));
      test('nepřevezme cizí poptávku', () => assertFails(update(ref(db(A), 'poptavky/p2'), { prodejce: mail(A) })));
      test('nepřepíše celou poptávku najednou (set na existující)', () => assertFails(set(ref(db(A), 'poptavky/p1'), poptavka(mail(A)))));
      test('nabídka z Offer Studia jen k vlastní poptávce', async () => {
        const n = { model: 'GLC', cena_sdph: 1, t: serverTimestamp(), kdo: mail(A), zdroj: 'offerstudio' };
        await assertSucceeds(set(ref(db(A), 'poptavky/p1/nabidky/k'), n));
        return assertFails(set(ref(db(A), 'poptavky/p2/nabidky/k'), n));
      });
    });
    describe('dohody: zadává a potvrzuje jen vedoucí, prodejce jen klepne Hotovo', () => {
      test('prodejce klepne Hotovo u své dohody', () => assertSucceeds(update(ref(db(A), 'poptavky/p1/dohody/d1'), { stav: 'hotovo' })));
      test('prodejce klepne Hotovo znovu u vrácené dohody (dopracovat)', async () => {
        await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'poptavky/p1/dohody/d1'), { stav: 'dopracovat' }));
        return assertSucceeds(update(ref(db(A), 'poptavky/p1/dohody/d1'), { stav: 'hotovo' })); });
      test('prodejce dohodu nepotvrdí', () => assertFails(update(ref(db(A), 'poptavky/p1/dohody/d1'), { stav: 'potvrzena' })));
      test('prodejce nepřepíše text ani termín dohody', async () => { await assertFails(update(ref(db(A), 'poptavky/p1/dohody/d1'), { text: 'Dej mu 10 %.' })); return assertFails(update(ref(db(A), 'poptavky/p1/dohody/d1'), { do: '2030-01-01', stav: 'hotovo' })); });
      test('prodejce dohodu nesmaže ani nepřidá novou', async () => { await assertFails(remove(ref(db(A), 'poptavky/p1/dohody/d1'))); await assertFails(push(ref(db(A), 'poptavky/p1/dohody'), { text: 'x', do: '2026-11-09', zadal: mail(A), t: 1, stav: 'hotovo' })); return assertFails(remove(ref(db(A), 'poptavky/p1/dohody'))); });
      test('prodejce nepřepíše potvrzenou dohodu zpět na Hotovo', async () => {
        await env.withSecurityRulesDisabled(c => update(ref(c.database(), 'poptavky/p1/dohody/d1'), { stav: 'potvrzena' }));
        return assertFails(update(ref(db(A), 'poptavky/p1/dohody/d1'), { stav: 'hotovo' })); });
      test('prodejce neklepne Hotovo u cizí dohody', () => assertFails(update(ref(db(A), 'poptavky/p2/dohody/d1'), { stav: 'hotovo' })));
      test('vedoucí zadá dohodu k cizí poptávce a zapíše řádek do historie', async () => {
        await assertSucceeds(push(ref(db(VEDOUCI), 'poptavky/p2/dohody'), { text: 'Zavolej mu.', do: '2026-11-16', zadal: mail(VEDOUCI), t: serverTimestamp(), stav: 'otevrena' }));
        return assertSucceeds(push(ref(db(VEDOUCI), 'poptavky/p2/historie'), { t: serverTimestamp(), kdo: mail(VEDOUCI), text: '🤝 Dohoda: Zavolej mu.' })); });
      test('vedoucí potvrdí, vrátí s tipem a přenese dohodu', async () => {
        await assertSucceeds(update(ref(db(VEDOUCI), 'poptavky/p2/dohody/d1'), { stav: 'potvrzena' }));
        await assertSucceeds(update(ref(db(VEDOUCI), 'poptavky/p2/dohody/d1'), { stav: 'dopracovat' }));
        await assertSucceeds(set(ref(db(VEDOUCI), 'poptavky/p2/dohody/d1/tip'), 'Příště volej dřív.'));
        return assertSucceeds(update(ref(db(VEDOUCI), 'poptavky/p2/dohody/d1'), { stav: 'preneseno' })); });
      test('vedoucí změní cizí poptávku a smaže ji', async () => { await assertSucceeds(update(ref(db(VEDOUCI), 'poptavky/p2'), { stav: 'ztraceno' })); return assertSucceeds(remove(ref(db(VEDOUCI), 'poptavky/p2'))); });
      test('druhý prodejce (ne vedoucí) dohodu k cizí poptávce nezadá', () => assertFails(push(ref(db(B), 'poptavky/p1/dohody'), { text: 'x', do: '2026-11-09', zadal: mail(B), t: 1, stav: 'otevrena' })));
      test('prodejce se nemůže sám udělat vedoucím', () => assertFails(set(ref(db(A), `uzivatele/${A}/vedouci`), true)));
    });
  });

  describe('Schválený uživatel – /zakaznici: povolená pole', () => {
    test('zapíše zákazníka ve schváleném tvaru', () => assertSucceeds(set(ref(db(SCHVALENY), 'zakaznici/k2'), zakaznik(SCHVALENY))));
    test('zapíše minimálního zákazníka z poptávky', () => assertSucceeds(set(ref(db(SCHVALENY), 'zakaznici/k3'),
      { jmeno: 'Eva', telefon: '777 000 222', zdroj: 'poptavka', vytvoreno: serverTimestamp(), upraveno: serverTimestamp(), upravil: SCHVALENY })));
    test('přidá vozidlo existujícímu zákazníkovi', () => assertSucceeds(update(ref(db(SCHVALENY), 'zakaznici/k1'),
      { 'vozidla/vin:WDD0000000T000002': { model: 'V 300 d', trida: 'V', vin: 'WDD0000000T000002', predano: '2020-03-01' }, upraveno: serverTimestamp(), upravil: SCHVALENY })));
    test('čte zákazníky', () => assertSucceeds(get(ref(db(SCHVALENY), 'zakaznici'))));
    test('smaže zákazníka', () => assertSucceeds(remove(ref(db(SCHVALENY), 'zakaznici/k1'))));
  });

  describe('Schválený uživatel – /zakaznici: zakázaná a neplatná pole', () => {
    const zkus = extra => set(ref(db(SCHVALENY), 'zakaznici/k2'), zakaznik(SCHVALENY, extra));
    test('marže u zákazníka', () => assertFails(zkus({ marze: '45 000' })));
    test('Marže s diakritikou', () => assertFails(zkus({ 'Marže': '45 000' })));
    test('poznámka dealera', () => assertFails(zkus({ poznamkaDealera: 'interní' })));
    test('veřejná poznámka', () => assertFails(zkus({ poznamkaVerejna: 'text' })));
    test('adresa (zatím nerozhodnuto)', () => assertFails(zkus({ adresa: 'Testovací 1, Praha' })));
    test('DIČ', () => assertFails(zkus({ dic: 'CZ12345678' })));
    test('prodejce (zatím nerozhodnuto)', () => assertFails(zkus({ prodejce: 'někdo' })));
    test('marže schovaná ve vozidle', () => assertFails(zkus({ vozidla: { v1: { model: 'GLC', marze: '45 000' } } })));
    test('poznámka dealera ve vozidle', () => assertFails(zkus({ vozidla: { v1: { model: 'GLC', poznamkaDealera: 'x' } } })));
    test('marže dopsaná do existujícího zákazníka přes update', () => assertFails(update(ref(db(SCHVALENY), 'zakaznici/k1'), { marze: '1' })));
    test('marže zapsaná přímo do cesty', () => assertFails(set(ref(db(SCHVALENY), 'zakaznici/k1/marze'), '1')));
    test('chybí povinná pole (zdroj, časy, upravil)', () => assertFails(set(ref(db(SCHVALENY), 'zakaznici/k2'), { jmeno: 'Jan', telefon: '777000111' })));
    test('chybí jméno, příjmení i firma', () => assertFails(set(ref(db(SCHVALENY), 'zakaznici/k2'),
      { telefon: '777000111', zdroj: 'poptavka', vytvoreno: serverTimestamp(), upraveno: serverTimestamp(), upravil: SCHVALENY })));
    test('neznámý zdroj', () => assertFails(zkus({ zdroj: 'excel' })));
    test('upravil = cizí uid', () => assertFails(zkus({ upravil: NESCHVALENY })));
    test('čas v budoucnosti', () => assertFails(zkus({ upraveno: Date.now() + 86400000 })));
    test('neplatné IČO', () => assertFails(zkus({ ico: 'ABC' })));
    test('neplatný e-mail', () => assertFails(zkus({ email: 'nemá email' })));
    test('telefon s textem', () => assertFails(zkus({ telefon: 'volat odpoledne' })));
    test('neplatné datum předání', () => assertFails(zkus({ vozidla: { v1: { model: 'GLC', predano: '21.5.2022' } } })));
    test('neplatný VIN', () => assertFails(zkus({ vozidla: { v1: { model: 'GLC', vin: 'wdd 123' } } })));
    test('neplatný vyhledávací klíč', () => assertFails(zkus({ klice: { 'xx:123': true } })));
    test('příliš dlouhé jméno', () => assertFails(zkus({ jmeno: 'x'.repeat(101) })));
  });

  describe('Schválený uživatel – /zakaznici: nesprávná struktura klice a vozidla', () => {
    const zkus = extra => set(ref(db(SCHVALENY), 'zakaznici/k2'), zakaznik(SCHVALENY, extra));
    const prepis = (cesta, hodnota) => set(ref(db(SCHVALENY), 'zakaznici/k1/' + cesta), hodnota);
    for (const [popis, hodnota] of [['řetězec', 'marže 45 000'], ['číslo', 45000], ['boolean', true]]) {
      test(`klice jako ${popis} (nový zákazník)`, () => assertFails(zkus({ klice: hodnota })));
      test(`vozidla jako ${popis} (nový zákazník)`, () => assertFails(zkus({ vozidla: hodnota })));
      test(`klice jako ${popis} (přepsání u existujícího)`, () => assertFails(prepis('klice', hodnota)));
      test(`vozidla jako ${popis} (přepsání u existujícího)`, () => assertFails(prepis('vozidla', hodnota)));
      test(`jedno vozidlo jako ${popis}`, () => assertFails(zkus({ vozidla: { v1: hodnota } })));
    }
    test('klíč s objektem místo true', () => assertFails(zkus({ klice: { 'ph:777000111': { marze: '1' } } })));
    test('klíč s řetězcem místo true', () => assertFails(zkus({ klice: { 'ph:777000111': 'ano' } })));
    test('vozidla jako pole', () => assertFails(zkus({ vozidla: ['GLC', 'GLE'] })));
    test('vozidlo s polem uvnitř místo textu', () => assertFails(zkus({ vozidla: { v1: { model: { nazev: 'GLC' } } } })));
  });
});

describe('Současná produkční pravidla v1.0 (pro srovnání)', () => {
  let env;
  before(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-poptavky-v1', database: { host, port: +port, rules: rules('./database.rules.produkce-v1.json') } });
  });
  after(async () => { await env?.cleanup(); });

  test('nepřihlášený nečte poptávky', () => assertFails(get(ref(env.unauthenticatedContext().database(), 'poptavky'))));
  test('SLABINA: jakýkoli přihlášený účet čte všechny poptávky', () =>
    assertSucceeds(get(ref(env.authenticatedContext(NESCHVALENY).database(), 'poptavky'))));
  test('SLABINA: jakýkoli přihlášený účet zapíše do poptávky libovolné pole', () =>
    assertSucceeds(set(ref(env.authenticatedContext(NESCHVALENY).database(), 'poptavky/x'), { marze: '45 000' })));
  test('/zakaznici v současných pravidlech není povolen nikomu', () =>
    assertFails(get(ref(env.authenticatedContext(SCHVALENY).database(), 'zakaznici'))));
});
