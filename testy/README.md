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
- V detailu zkontroluje „← Přehled“. Na mobilu je v pevné neprůhledné spodní liště s rezervou pro bezpečnou oblast iPhonu a při psaní se schová. Ověří ji při posouvání dlouhého detailu nahoře, uprostřed i dole a zkontroluje, že celý obsah jde odrolovat nad lištu. Na PC zůstává nahoře.
- Snímky uloží do `SCREEN_DIR`.

```bash
SOUBOR=poptavky_v1.3.html SCREEN_DIR=/kam/snimky FIREBASE10=/cesta/k/node_modules/firebase node testy/test_vzhled.js
```
Výsledek 2026-10-28: **59 / 59**.
