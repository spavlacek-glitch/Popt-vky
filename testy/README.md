# Testy Poptávek

Testy běží **jen proti lokálním emulátorům Firebase** (projekt `demo-poptavky`) s fiktivními daty. Produkce se nepoužívá: test si vytvoří dočasnou kopii appky s demo konfigurací a skutečný soubor nemění.

## `test_v1.2.js` – známý zákazník u nové poptávky
Ověřuje `poptavky_v1.2.html`:
- scénáře převzaté z experimentu v0.5 (repo Fenclotéka): Vybrat, „Je to nový zákazník“, žádné duplicity bez výběru,
- zachování chování v1.1: tvar poptávky, úpravy, stav, poznámky, parser e-mailu,
- start s prázdnou evidencí zákazníků,
- výpadek `/zakaznici`,
- escapování,
- PC a rozměr iPhonu.

Potřeba: Node 20+, Java 11+, Playwright s Chromiem, `firebase@10.12.2` (kvůli souborům SDK) a `firebase-tools`.

```bash
cd testy
npx firebase emulators:start --only database,auth --project demo-poptavky
```
Nastavení emulátorů (databáze 9000, Auth 9099) je v `testy/firebase.json`. Pravidla si test nahraje sám z `firebase/database.rules.json`.

V druhém okně, z kořene repa:
```bash
FIREBASE10=/cesta/k/node_modules/firebase node testy/test_v1.2.js
```
Výsledek 2026-10-28: **40 / 40** pro v1.2 i v1.3.

Jinou verzi appky otestuješ takto:
```bash
SOUBOR=poptavky_v1.3.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_v1.2.js
```

## `test_vzhled.js` – rozložení přehledu
Naplní emulátor 14 fiktivními poptávkami a otevře přehled na PC 1440, 1280 a 1024 a na iPhonu 13 a SE.
- Zkontroluje dva sloupce na PC a jeden na mobilu.
- Zkontroluje oddělený panel „Dnes zavolat“ a nízkou hlavičku na mobilu.
- Ověří, že zůstaly všechny ovládací prvky, a vyzkouší hledání a filtry.
- Ověří, že formulář a detail mají dál úzký sloupec.
- V detailu zkontroluje „← Přehled“. Na mobilu je modré plovoucí tlačítko dole vlevo s rezervou pro bezpečnou oblast iPhonu a při psaní se schová. Ověří ho při posouvání dlouhého detailu nahoře, uprostřed i dole a zkontroluje, že celý obsah jde odrolovat nad něj. Na PC zůstává nahoře.
- Zkontroluje sbalenou historii v detailu: výchozí stav, nadpis s počtem a poslední událostí, klepací plochu, rozbalení ve stejném pořadí a opětovné sbalení. Ověří, že po zápisu poznámky zůstane rozbalená a že původní záznamy ve Firebase se nezměnily.
- Snímky uloží do `SCREEN_DIR`.

```bash
SOUBOR=poptavky_v1.3.html SCREEN_DIR=/kam/snimky FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vzhled.js
```
Výsledek 2026-10-28: **84 / 84**. Pro `poptavky_v1.7.html` (2026-10-29): **84 / 84**, přehled na iPhonu 13 a SE se od v1.6 liší jen číslem verze v hlavičce.

## `test_tipy_v1.8.js` – komu zavolat, když dnes nikomu (v1.8)
Na PC 1440 a iPhonu 13 ověří:
- 3 tipy při prázdném „Dnes zavolat“: dvakrát „Dlouho ticho“ (nejdelší první), pak nejbližší kontakt,
- poznámka v historii se počítá jako zápis, 13 dní ještě není ticho, prodané a ztracené se nikdy neukážou,
- bez dlouhého ticha doplní tipy nejbližší kontakty,
- tipy zmizí, jakmile je někdo na řadě dnes, a bez otevřených poptávek zůstane jen hecovací věta,
- klepnutí otevře detail a nic se nezapíše do databáze.

```bash
SOUBOR=poptavky_v1.8.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_tipy_v1.8.js
```
Výsledek 2026-10-29: **16 / 16**. Regrese proti v1.8: `test_vzhled.js` 84/84, `test_v1.2.js` 40/40, `test_odkaz_v1.6.js` 11/11, `test_kontakt_v1.4.js` 17/17, `test_detail_v1.5.js` 40/40.

## `test_kontakt_v1.4.js` – „📱 Uložit do kontaktů“
Exportuje kontakty ze smyšlených poptávek a každý stažený soubor `.vcf` přečte dvakrát: vlastním dekodérem podle vCard 3.0 a nezávisle knihovnou ical.js.
- **Údaje kontaktu:**
  - diakritika ve jméně i v označení („Jan Novák · SUV“, „Žofie Šťastná-Řeháková · Auto pro dceru“),
  - firma,
  - chybějící telefon, e-mail, „Co chce“ i jméno,
  - převod +420, zahraniční číslo, označení jen z mezer.
- **Text a escapování:** dlouhý víceřádkový text z e-mailu a escapování HTML a uvozovek.
- **Chování v detailu:** označení přežije živé překreslení detailu a export nic nezapíše do databáze.
- **iPhone 13:** rozměr a velikost tlačítka a schování plovoucího „← Přehled“ při psaní.

```bash
ICALJS=/cesta/k/node_modules/ical.js FIREBASE10=/cesta/k/node_modules/firebase node testy/test_kontakt_v1.4.js
```
Výsledek 2026-10-28: **17 / 17**. Regrese v1.4: `test_v1.2.js` 40/40, `test_vzhled.js` 84/84.

Pozn.: headless Chromium na jedné stránce vynechá 11. stažení souboru (ověřeno 15 stahováními za sebou). Test proto v polovině otevře čerstvou stránku. Poptávek se to netýká.

## `test_detail_v1.5.js` – detail poptávky na mobilu (v1.5)
- **PC 1280 a 1024:** vykreslený detail všech testovacích poptávek je ve v1.5 znak po znaku stejný jako ve v1.4.
- **iPhone 13 a SE:**
  - karta zákazníka a odkazy Zavolat / Napsat,
  - zkrácené „Co chce“,
  - nic nepřetéká z karty, ani výběr data,
  - zápis poznámky, rychlé volby termínu i vlastní datum,
  - stavy včetně „Nabídka odeslána“ (+3 dny) a Prodáno,
  - historie,
  - chybějící telefon nebo e-mail.
- **Plovoucí tlačítka a panel „Další akce“:** poloha tlačítek a jejich schování při psaní, panel (export kontaktu, úprava, smazání s „Ponechat“ / „Smazat“), přepnutí detailu při otočení telefonu, žádná systémová okna.

```bash
ICALJS=/cesta/k/node_modules/ical.js FIREBASE10=/cesta/k/node_modules/firebase node testy/test_detail_v1.5.js
```
Výsledek 2026-10-28: **40 / 40**. Regrese proti v1.5: `test_v1.2.js` 40/40, `test_vzhled.js` 84/84, `test_kontakt_v1.4.js` 17/17. Upravené testy prošly i proti v1.4.

## `test_odkaz_v1.6.js` – odkaz z kontaktu v iPhonu (v1.6)
Testuje celý řetězec přes skutečnou appku a stálou adresu `poptavky.html`:
- Export kontaktu obsahuje odkaz „Poptávky“ s ID poptávky. Je zalomený podle normy a čte ho i ical.js.
- Odkaz v čerstvém prohlížeči (jako Safari z Kontaktů) projde přesměrováním a přihlášením a otevře detail: mobilní na iPhonu 13, počítačový na PC. Obnovení stránky detail znovu neotevře.
- **Hraniční případy:**
  - smazaná poptávka a poškozený odkaz → přehled s hláškou,
  - start bez odkazu → normální přehled,
  - druhý odkaz v otevřené appce → další poptávka,
  - nic se nezapíše do databáze.

```bash
ICALJS=/cesta/k/node_modules/ical.js FIREBASE10=/cesta/k/node_modules/firebase node testy/test_odkaz_v1.6.js
```
Výsledek 2026-10-28: **11 / 11**. Regrese proti v1.6: `test_detail_v1.5.js` 40/40 (`SOUBOR=poptavky_v1.6.html`), `test_v1.2.js` 40/40, `test_vzhled.js` 84/84, `test_kontakt_v1.4.js` 17/17.
