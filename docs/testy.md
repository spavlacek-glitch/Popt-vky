# Testy

Část dokumentace projektu Poptávky; hlavní soubor je `../CLAUDE.md`.

## Testy
- `testy/test_v1.2.js`: celé chování od v1.2 v lokálních emulátorech Firebase (databáze + Auth), jen fiktivní data. Jiný soubor appky se testuje přes `SOUBOR=poptavky_v1.3.html`. Návod je v `testy/README.md`.
- `testy/test_vzhled.js`: snímky a rozložení přehledu na PC (1440, 1280, 1024) a iPhonu (13, SE).
- `testy/test_kontakt_v1.4.js`: export kontaktu na smyšlených poptávkách. Kontroluje diakritiku, označení, chybějící údaje, dlouhý text a to, že se nic nezapíše do databáze. Každý soubor přečte i nezávislá knihovna ical.js.
- ~~`testy/test_detail_v1.5.js`~~ (porovnání PC detailu s v1.4) smazán při úklidu 2026-11-03: v1.4 už v repu není a pravidlo skončilo ve v1.17.
- `testy/test_odkaz_v1.6.js`: odkaz z kontaktu – export → odkaz ze souboru → `poptavky.html` → přihlášení → detail na iPhonu i PC, smazaná a poškozená poptávka, obnovení stránky, druhý odkaz v otevřené appce, žádný zápis do databáze.
- `testy/test_tipy_v1.8.js`: tipy při prázdném „Dnes zavolat“ – pořadí, 14denní hranice, poznámka v historii, prodané a ztracené nikdy, zmizení tipů, žádný zápis do databáze; PC i iPhone.
- `testy/test_gdpr_v1.9.js`: SMS „Souhlas GDPR“ na PC i iPhonu – číslo příjemce, text s odkazem na formulář MB, žádný e-mail, bez telefonu nic, žádný zápis do databáze.
- `testy/test_aktualizace_v1.10.js`: aktualizace za chodu přes lokální HTTP server se smyšlenou v1.11 – lišta, „Později“, přepnutí s otevřeným detailem, povinná verze (ne při psaní, hned na přehledu a na přihlášení), nedostupná `poptavky.html`; PC i iPhone.
- `testy/test_vydelek_v1.11.js`: „Tento měsíc prodáno“ a výhled na PC, iPhonu 13 a SE – krátký řádek na mobilu, jen moje poptávky, měsíc podle záznamu „Stav → Prodáno“, zadání a změna provize, schování částek, méně než 5 uzavřených, nula prodaných, přepnutí na Prodáno, žádný zápis do databáze. `test_aktualizace_v1.10.js` od v1.11 funguje pro libovolnou verzi (`SOUBOR`).
- `testy/test_manifest_v1.12.js`: manifest přečtený prohlížečem (Chromium) přes lokální HTTP server ve složce jako na raw.githack.com – start ze stálé adresy, rozsah celé složky, standalone, relativní cesty, odkaz z `poptavky.html`. Chování iPhonu ověřit na zařízení.
- `testy/test_nabidka_v1.13.js`: „📄 Udělat nabídku“ na PC 1280 a 1024 – odkaz na `127.0.0.1:8774/nova` s ID, jménem, telefonem, e-mailem a „Co chce“, zvláštní znaky, umístění, na iPhonu 13 a SE není, žádný zápis do databáze. S `OFFER_STUDIO=<složka>` spustí kopii Offer Studia a ověří i předvyplněnou nabídku a oslovení v e-mailu.
- `testy/test_nabidky_v1.14.js`: nabídky z Offer Studia na PC 1280 (řádek nabídky, schovaný zisk, varování podle příznaku, víc nabídek, hlavička „Zisk z prodaných aut“) a jejich absence na iPhonu, žádný zápis. S `OFFER_STUDIO=<složka>` celá cesta proti emulátorům: přihlášení Offer Studia (špatné heslo, heslo se neuloží), zápis nabídky a historie, přepsání bez nového řádku, „Nabídka upravena“ při změně ceny, zobrazení v Poptávkách, smazaná poptávka bez osiřelých dat, odhlášení.
- `testy/test_ekonomika_v1.15.js`: ekonomika na přehledu na PC 1440 a 1280 (záhlaví, řádek s nabídkou a posledním zápisem, schovaný zisk a 👁, součet, řazení, rozbalená ekonomika s ceníkem, korekcemi a historií, odkaz do Offer Studia, hledání podle modelu, „Dnes zavolat“ vlevo s nabídkou, klepnutí otevře detail, bez posunu do stran) a na iPhonu 13 (nabídka a poslední zápis, bez zisku), žádný zápis.
- `testy/test_vuz_v1.16.js`: vůz u poptávky na PC 1440 a iPhonu 13 – karta, detail, hledání podle Auftragu, úprava a smazání vozu v DB, žádné chyby.
- `testy/test_detail_pc_v1.17.js`: detail na PC 1440, 1100 a 1920 ve dvou sloupcích a mobilní detail beze změny.
- `testy/test_zpet_kalkulace_v1.18.js`: Zpět a Vpřed prohlížeče (PC i iPhone), úprava a návrat, kalkulace v detailu, schovaný a odkrytý zisk, od v1.19 i výrazný přilepený pruh a Esc.
- `testy/test_dohody_v1.20.js`: dohody, role vedoucího a prodejce, Hotovo bez času, Můj týden, Porada, Zpět prohlížeče, iPhone.
- `firebase/rules.test.mjs` od v1.24: 133 testů (jen své poptávky, cizí nabídky a zisk, vedoucí vše, dohody, Hotovo). Spuštění v tomto prostředí: `firebase emulators:exec` s odpojenými proxy proměnnými (`env -u HTTPS_PROXY -u https_proxy -u JAVA_TOOL_OPTIONS`) a s `host: 127.0.0.1` v konfiguraci emulátoru; jar emulátoru se stáhne přes curl do `~/.cache/firebase/emulators/`.
- `testy/test_vlastnik_v1.25.js`: vlastník poptávky a filtr prodejce pro vedoucího (PC, iPhone), prodejce nic z toho nevidí, filtr přežije obnovení stránky (emulátory).
- `testy/test_verze.js`: číslo verze v kódu sedí s názvem souboru, `poptavky.html` ukazuje na nejnovější existující verzi (bez prohlížeče, `node testy/test_verze.js`).
- `testy/test_panel_v1.22.js`: panel „Další akce“ na iPhonu – zavření posunutím dolů, krátké potáhnutí, klepnutí na pozadí (bez Firebase, s atrapou SDK).
- `testy/test_hlasky_v1.21.js`: hlášky v „Dnes zavolat“ (plné skupiny, bez duplicit, věta od uživatele, žádný sráživý tón).
- `firebase/rules.test.mjs`: pravidla databáze (133 testů, od v1.14 i `nabidky`, od v1.24 i více prodejců).

- `testy/test_sipky_v1.31.js`: šipky Předchozí / Další a klávesy ← → v detailu (PC 1280 a iPhone 13) – pořadí podle přehledu, krajní poptávky, psaní do pole, poptávka mimo seznam, hledání; bez Firebase (SDK nahrazené atrapou, nepotřebuje emulátory).
- `testy/test_zalozky_v1.36.js`: záložky detailu na PC, Ekonomika (návrh B) a posuvník „Co když ustoupím?“ (dřív test_ekonomika_pripadu_v1.34.js a test_posuvnik_v1.33.js) na PC 1440 (cena, 🏆, ekvivalent, schovaný a odkrytý zisk, marže, varování, nulování, bez nabídky) a jeho absence na iPhonu 13; bez Firebase (atrapa SDK). `SCREEN_DIR=…` uloží snímek.
- `testy/test_onedrive_v1.43.js`: odkaz na PDF ve firemním OneDrivu (`odUrl` = adresa ověřená uživatelem, PC a iPhone, „..“ a cizí host se nevnutí); bez Firebase (atrapa SDK). `firebase/rules.test.mjs`: 138 testů (od v1.43 pole `onedrive`). Emulátor v tomto prostředí běžel: `cd firebase && npm install && env -u HTTPS_PROXY -u https_proxy -u JAVA_TOOL_OPTIONS npx firebase emulators:exec --only database --project demo-poptavky "node --test rules.test.mjs"` (package-lock.json po `npm install` nevracet do gitu).
