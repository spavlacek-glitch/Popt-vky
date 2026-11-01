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

## `test_gdpr_v1.9.js` – souhlas GDPR (v1.9)
Na PC 1280 a iPhonu 13 rozebere odkaz `sms:`:
- číslo příjemce a text s odkazem na formulář MB na samostatném řádku,
- e-mail se nenabízí (rozhodnutí uživatele), bez telefonu nic,
- poloha řádku na PC,
- žádný zápis do databáze a žádná systémová okna.

```bash
SOUBOR=poptavky_v1.9.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_gdpr_v1.9.js
```
Výsledek 2026-10-29: **9 / 9**. `test_detail_v1.5.js` od v1.9 porovnává detail na PC s v1.4 bez řádku „Souhlas GDPR“; s v1.8 i v1.9 **40 / 40**. Test „otočení na šířku“ občas selže na čekání 200 ms (stejně u v1.6–v1.9), druhé spuštění projde. Regrese proti v1.9: `test_vzhled.js` 84/84, `test_v1.2.js` 40/40, `test_odkaz_v1.6.js` 11/11, `test_kontakt_v1.4.js` 17/17, `test_tipy_v1.8.js` 16/16.

## `test_aktualizace_v1.10.js` – aktualizace za chodu (v1.10)
Appka běží z malého lokálního HTTP serveru (jako z raw.githack.com). Test za běhu přepisuje `poptavky.html` a nabízí smyšlenou v1.11. Na PC 1280 a iPhonu 13 ověří:
- aktuální verze a v1.9 v `poptavky.html` → žádná lišta (číselné porovnání 1.10 > 1.9),
- novější verze po návratu do popředí → lišta pod hlavičkou, obsah ani „Dnes zavolat“ nezakryje, při posouvání zůstává, sama nic nepřepne,
- „Později“ lištu schová a tatáž verze se už nenabídne; „Aktualizovat“ v detailu → v1.11 se stejnou poptávkou,
- povinná verze (`MINIMALNI`): při psaní nové poptávky nic nepřepne, po návratu na přehled do 5 s přepne, na přihlášení přepne hned,
- nedostupná `poptavky.html` → appka běží dál bez chyb; nic se nezapíše do databáze.

```bash
SOUBOR=poptavky_v1.10.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_aktualizace_v1.10.js
```
Výsledek 2026-10-30: **23 / 23**. Regrese proti v1.10: `test_vzhled.js` 84/84, `test_v1.2.js` 40/40, `test_odkaz_v1.6.js` 11/11, `test_kontakt_v1.4.js` 17/17, `test_tipy_v1.8.js` 16/16, `test_gdpr_v1.9.js` 9/9, `test_detail_v1.5.js` 40/40.

## `test_vydelek_v1.11.js` – tento měsíc prodáno (v1.11)
Na PC 1440, iPhonu 13 a iPhonu SE ověří:
- na mobilu jen jeden krátký řádek „🎉 3 auta tento měsíc ›“ (nanejvýš 40 px), klepnutí rozbalí a další sbalí,
- počítají se jen moje poptávky (Danielovy ne), tento měsíc podle záznamu „Stav → Prodáno“ (bez něj podle času úpravy), minulý měsíc ne,
- bez provize výzva k zadání a žádná částka; „8 000“ + Enter → jen do `localStorage`, ≈ 24 000 Kč a výhled ≈ 21 300 Kč (4 otevřené × 4/6 × 8 000),
- schování a ukázání částek (na mobilu sbalení a rozbalení), po obnovení stránky schované nebo sbalené,
- „✏️ provize“: rozepsaná částka přežije živou změnu v databázi, „Zrušit“ a nesmysl provizi nezmění,
- pod 5 uzavřených výhled nevymýšlí, nula prodaných → povzbudivá věta, přepnutí na Prodáno se hned započítá,
- poloha (PC vpravo vedle nadpisu, mobil pod ním), nic nepřetéká, výdělek nic nezapíše do databáze.

```bash
SOUBOR=poptavky_v1.11.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vydelek_v1.11.js
```
Výsledek 2026-11-01: **35 / 35**. `test_aktualizace_v1.10.js` teď odvodí čísla verzí ze `SOUBOR`, a tak funguje i pro v1.11 (smyšlená v1.12): **23 / 23**. Regrese proti v1.11: `test_vzhled.js` 84/84, `test_v1.2.js` 40/40, `test_odkaz_v1.6.js` 11/11, `test_kontakt_v1.4.js` 17/17, `test_tipy_v1.8.js` 16/16, `test_gdpr_v1.9.js` 9/9, `test_detail_v1.5.js` 40/40.

## `test_manifest_v1.12.js` – manifest appky na ploše (v1.12)
Appka běží z lokálního HTTP serveru ve složce `/spavlacek-glitch/Popt-vky/main/` jako na raw.githack.com. Manifest přečte sám prohlížeč (Chromium, `Page.getAppManifest`) a test ověří:
- manifest se najde a přečte bez chyb,
- `start_url` = stálá adresa `poptavky.html`, `scope` = celá složka, takže do ní patří i budoucí verze,
- `display: standalone`, název a barvy, jen relativní cesty,
- `poptavky.html` odkazuje na stejný manifest.

Skutečné chování iPhonu (lišta prohlížeče po přepnutí verze) se nasimulovat nedá, ověřit na zařízení.

```bash
SOUBOR=poptavky_v1.12.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_manifest_v1.12.js
```
Výsledek 2026-11-01: **7 / 7**. Kontrola testu: na v1.11 bez manifestu 3/7. Regrese proti v1.12: `test_vydelek_v1.11.js` 35/35, `test_aktualizace_v1.10.js` 23/23, `test_vzhled.js` 84/84, `test_v1.2.js` 40/40, `test_odkaz_v1.6.js` 11/11, `test_kontakt_v1.4.js` 17/17, `test_tipy_v1.8.js` 16/16, `test_gdpr_v1.9.js` 9/9, `test_detail_v1.5.js` 40/40.

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

## `test_nabidka_v1.13.js` – „📄 Udělat nabídku“ (v1.13)
Na PC 1280 a 1024 ověří odkaz do Offer Studia (`http://127.0.0.1:8774/nova`) u všech poptávek: ID poptávky, jméno, telefon, e-mail, „Co chce“, zvláštní znaky (uvozovky, &, #, ?, < >), prázdnou poptávku a umístění pod „Souhlas GDPR“. Na iPhonu 13 a SE se tlačítko nenabízí. Nic se nezapíše do databáze.

S proměnnou `OFFER_STUDIO` (složka s repem Mercedes-Offer-Studio v1.2.0+, Python s `fastapi uvicorn python-multipart python-docx requests`) test spustí kopii Offer Studia na portu 8774, klepne na tlačítko a zkontroluje předvyplněnou nabídku a oslovení v náhledu e-mailu.

```bash
OFFER_STUDIO=/cesta/k/Mercedes-Offer-Studio SOUBOR=poptavky_v1.13.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_nabidka_v1.13.js
```
Výsledek 2026-11-01: **20 / 20**. Regrese na v1.13 beze změn: test_v1.2 40/40, test_vzhled 84/84, test_kontakt_v1.4 17/17, test_detail_v1.5 40/40 (porovnání s v1.4 nově ignoruje i `.nabidka`), test_odkaz_v1.6 11/11, test_tipy_v1.8 16/16, test_gdpr_v1.9 9/9, test_aktualizace_v1.10 23/23, test_vydelek_v1.11 35/35, test_manifest_v1.12 7/7.

## `test_nabidky_v1.14.js` – nabídky z Offer Studia (v1.14)
Na PC 1280: řádek nabídky v detailu (model · cena · sleva · datum), zisk schovaný do klepnutí, varování „nízká marže“ podle příznaku z Offer Studia, víc nabídek (nejnovější nahoře), bez nabídky nic, v hlavičce „Zisk z prodaných aut“ (schovaný, „1 z 2 aut s nabídkou“, odkrytí i bez provize). Na iPhonu 13 nic. Žádný zápis do databáze.

S `OFFER_STUDIO` (repo Mercedes-Offer-Studio v1.5.0+) spustí Offer Studio napojené na emulátory a projde celou cestu: tip „není přihlášené“, špatné heslo, přihlášení a test spojení, heslo se neuloží, vytvoření nabídky → souhrn a řádek „📄 Nabídka připravena“ ve Firebase, stav beze změny, nové PDF bez nového řádku, změna ceny → „📄 Nabídka upravena“, zobrazení v Poptávkách, smazaná poptávka bez osiřelých dat, odhlášení.

```bash
OFFER_STUDIO=/cesta/k/Mercedes-Offer-Studio SOUBOR=poptavky_v1.14.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_nabidky_v1.14.js
```
Výsledek 2026-11-01: **25 / 25**. Pravidla `firebase/rules.test.mjs`: **95 / 95**. Regrese na v1.14 beze změn: test_v1.2 40/40, test_vzhled 84/84, test_kontakt_v1.4 17/17, test_detail_v1.5 40/40, test_odkaz_v1.6 11/11, test_tipy_v1.8 16/16, test_gdpr_v1.9 9/9, test_aktualizace_v1.10 23/23, test_vydelek_v1.11 35/35, test_manifest_v1.12 7/7, test_nabidka_v1.13 16/16.

## `test_ekonomika_v1.15.js` – ekonomika na přehledu (v1.15)
PC 1440 a 1280: tabulka (Zákazník | Co řeším · poslední zápis | Nabídka | Zisk | Stav · kontakt | ▸), schovaný zisk a 👁 pro celou stránku, součet, řazení podle ceny a zisku, rozbalená „Ekonomika poptávky“ (ceník, sleva, doplňky, celkem, zisk, korekce, marže, historie, odkaz do Offer Studia), hledání podle modelu z nabídky, „Dnes zavolat“ vlevo s nabídkou a posledním zápisem, bez posunu do stran. iPhone 13: nabídka a poslední zápis na kartě, zisk ani ▸ ne. Žádný zápis do databáze.

```bash
SOUBOR=poptavky_v1.15.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_ekonomika_v1.15.js
```
Výsledek 2026-11-01: **28 / 28**. Regrese na v1.15 beze změn (test_nabidky_v1.14 od v1.15 čeká na mobilu nabídku bez zisku).
