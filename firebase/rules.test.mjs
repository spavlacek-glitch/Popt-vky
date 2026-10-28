// Testy pravidel Realtime Database – běží jen proti lokálnímu emulátoru, nikdy proti produkci.
// Všechna data jsou fiktivní (example.cz, smyšlená jména a VIN).
import { test, before, after, beforeEach, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, push, update, get, remove, serverTimestamp } from 'firebase/database';

const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':');
const rules = file => readFileSync(new URL(file, import.meta.url), 'utf8');

const SCHVALENY = 'uid-prodejce';   // je v /uzivatele se schvalen: true
const NESCHVALENY = 'uid-cizi';     // má účet ve Firebase Auth, ale není schválen
const VYPNUTY = 'uid-byvaly';       // v /uzivatele, ale schvalen: false

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
        [SCHVALENY]: { schvalen: true, email: 'prodejce@example.cz' },
        [VYPNUTY]: { schvalen: false, email: 'byvaly@example.cz' }
      });
      await set(ref(d, 'poptavky/p1'), { ...poptavka('prodejce@example.cz'), vytvoreno: 1, upraveno: 1, historie: { h1: { t: 1, kdo: 'x', text: 'Založeno' } } });
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
    const email = 'prodejce@example.cz';
    test('čte celý seznam poptávek (jako ref.on("value"))', () => assertSucceeds(get(ref(db(SCHVALENY), 'poptavky'))));
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
