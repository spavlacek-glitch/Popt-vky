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
Výsledek 2026-10-28: **40 / 40**.
