# Více prodejců a udržitelnost

Část dokumentace projektu Poptávky; hlavní soubor je `../CLAUDE.md`.

## Více prodejců (v1.24, 2026-11-03)
- **Přání uživatele:** připravit dva nové prodejce, Miroslava Sýkoru a Martina Esterku, ať appku testuje víc lidí. **Rozhodnutí:** každý jen své (poptávky, nabídky, zisk), jen role prodejce (vedoucí je jen uživatel), zákazníci společní.
- **Appka (v1.24):** po přihlášení si zjistí roli. Vedoucí načítá `/poptavky`, prodejce jen `orderByChild('prodejce').equalTo(e-mail)`. Když se roli nepodaří zjistit, bere se jako prodejce. `MINIMALNI` je `poptavky_v1.24.html`, starší verze se přepnou samy (prodejce by v nich dostal „permission_denied“).
- **Offer Studio v1.8.3 (2026-11-03):** adresa `/draft/<id>/pdf` otevře poslední PDF nabídky (jinak Word) v prohlížeči; jen cesta uložená v databázi Offer Studia, vydá se jen .pdf/.docx. Na PC nahradit `app.py`. README_V1_8_3.txt.
- **Offer Studio v1.8.2:** „Vyzkoušet spojení“ čte jen vlastní poptávky, zápis k cizí nebo smazané poptávce dá hlášku „už neexistuje (smazaná?) nebo není tvoje“. Každý prodejce má vlastní Offer Studio a přihlašuje se svým účtem.
- **Zřízení účtu (ručně v konzoli, pořadí je důležité):** záloha → sloučit PR → nasadit pravidla → Authentication „Add user“ → `uzivatele/{UID}` = `{schvalen: true, email}` → kolega se přihlásí. Podrobně `firebase/PRIDANI_PRODEJCE.md`. Účty a hesla zakládá jen uživatel.
- **Vlastník poptávky pro vedoucího (v1.25, nalezeno uživatelem po zprovoznění kolegů):** vedoucí vidí u každé poptávky „👤 Jméno prodejce“ (karta v přehledu a v „Dnes zavolat“, mobilní detail, detail na PC; jméno se skládá z e-mailu, tedy bez diakritiky) a v řádku filtrů je výběr „Všichni prodejci / jméno – N otevřených“. Filtr platí pro přehled, „Dnes zavolat“ i tipy a pamatuje se v zařízení (`localStorage` `poptavky.filtrProdejce`). **Výchozí je „Moje“ (rozhodnutí uživatele)**: vedoucí v „Dnes zavolat“ vidí jen své hovory, ostatní přepne ve výběru na „Všichni“ nebo na jméno. Prodejce nic z toho nevidí. Test `testy/test_vlastnik_v1.25.js` (16 kontrol).
- **Přehlednější přehled (v1.26, přání uživatele po zkoušce s kolegy; návrh z ChatGPT upravený podle pravidel appky):**
  - **PC od 1500 px:** řádek = Zákazník | Řeší / vůz | Poslední zápis | Nabídka | Sleva | Zisk | Stav | Další kontakt | ▸. **1200–1499 px:** bez sloupce Sleva (sleva je v textu nabídky), cena je vždy na vlastním řádku pod modelem, aby se neuřízla. Jména a „co chce“ se zalamují na dva řádky.
  - **„Poslední zápis“ je poslední skutečná poznámka** (ne automatické řádky „Založeno“, „Stav →“, „📄 Nabídka…“, „🤝“, „✓ Hotovo“ – `AUTO_ZAPIS`). Automatické zůstávají v historii v detailu.
  - **Vlastník poptávky (v1.25) se ukazuje jen u cizích poptávek**, u vlastních je zbytečný.
  - **Karty v „Dnes zavolat“ jsou krátké:** jméno a štítek, co chce, dohoda/tip od šéfa a poslední poznámka; nabídka, vůz a termín se neukazují, **termín jen když je prošlý (červeně, jako dřív)**.
  - Z návrhu se záměrně **nepřevzalo:** viditelný zisk a „očekávaný zisk/obrat“ (zisk zůstává schovaný do klepnutí, obrat = součet nabídek by vypadal jako předpověď), červené „Dnes (urgentní)“, ztráta vozu, dohody a ekonomiky v řádku.
  - **v1.27 (úpravy po zkoušce na skutečných datech):** výchozí řazení seznamu je **podle fáze**: Nová → Jednáme → Nabídka odeslána → Prodáno → Ztraceno, uvnitř otevřených podle dalšího kontaktu (prošlé a dnešní nahoře), uvnitř uzavřených podle poslední změny; **nadpisy skupin** („Nabídka odeslána · 6“), aby „Nabídka odeslána“ nezapadla ani při 20 poptávkách (řazení klepnutím na záhlaví Nabídka / Zisk / Další kontakt zůstává, ploché bez nadpisů). Filtr prodejce je krátký („👤 Moje (10)“, „👥 Všichni“, „Jméno (N)“) a stojí v řadě vedle Otevřené/Prodáno/Ztraceno/Vše. „Cena vozu“ se v ekonomice a v detailu ukazuje **jen když je doplňkový prodej** (jinak je totéž co „Celkem s DPH“). Dlouhý název souboru se zkrátí třemi tečkami (nepřetéká doprava).
  - **v1.28 (přání uživatele: „poptávky mi splývají“):** každá karta poptávky (přehled, „Dnes zavolat“, tipy; PC i mobil) má jemný modrošedý okraj a **barevný proužek vlevo podle stavu**, ve stejných barvách jako štítky stavu (Nová modrá, Jednáme fialová, Nabídka odeslána oranžová, Prodáno zelená, Ztraceno šedá); při najetí myší se okraj zmodrá. Třída `s-<stav>` na kartě. Jen vzhled.
  - **v1.29 (přání uživatele po zkoušce):**
    - **Stav „Jednáme“ se už nenabízí** (detail na PC i mobil: Nová, Nabídka odeslána, Prodáno, Ztraceno). Důvod: je nejasný a nic nespouští („zavolal jsem a on se podívá“ je pořád Nabídka odeslána). Poptávky, které ho už mají, ho dál ukazují a jde z nich přepnout; v řazení, Poradě a datech stav zůstává. Zpět ho vrátí jeden řádek (`zmenStav` seznamy).
    - **„📄 Otevřít PDF“** u poslední nabídky (rozbalená ekonomika) a u každé nabídky v detailu na PC → `http://127.0.0.1:8774/draft/<id konceptu>/pdf`. Otevře poslední PDF nabídky přímo v prohlížeči přes **Offer Studio v1.8.3** (jen PC, kde Offer Studio běží; web nemůže odkazovat na soubor na disku). Ukáže se jen u nabídky, která má `soubor`. Tlačítko na Offer Studio se zkrátilo na „📂 Offer Studio“.
    - **„Co jsem s ním řešil“** je jeden řádek na záznam (`3. 11. · text`, celé v tooltipu).
  - Mobil: stejné karty, jen kratší „Dnes zavolat“. Testy `test_ekonomika_v1.15.js` a `test_vlastnik_v1.25.js` (16 kontrol) upravené na nové rozložení.
- **Poptávka bez pole `prodejce`** (nejstarší) vidí jen vedoucí; předání jinému prodejci = změna pole `prodejce` v konzoli.
- Ověřeno: pravidla v emulátoru (133 testů, proti starým pravidlům 23 selže), UI testy dohod, odkazu, tipů, výdělku, ekonomiky, vozu, zpět/kalkulace, detailu PC, GDPR a celá cesta Offer Studia (25 kontrol) proti emulátorům. Na skutečné databázi zatím vyzkoušeno není.

## Udržitelnost (posouzení 2026-11-01)
- Podklady jsou v `POSOUZENI_Udrzitelnost.md`. **Rozhodnutí uživatele:** zatím nic neměnit, nejdřív testuje sám, nejvýš s jedním kolegou.
- Před přidáním kolegy udělat zálohy (Firebase + složka `data` Offer Studia). **Kdo vidí čí poptávky a zisky je rozhodnuto (v1.24: každý jen své, vedoucí vše)**, pravidla DB jsou hotová. Zbývá, že `/zakaznici` jsou společné a že pravidla se nasazují ručně (`firebase/PRIDANI_PRODEJCE.md`).
- Přechod z raw.githack.com na GitHub Pages je připravený (viz Technologie, `PRESUN_NA_PAGES.md`); Firebase Hosting až kdyby bylo potřeba soukromé repo, vrácení nasazení zpět nebo vlastní hlavičky. Kolem 2 000 poptávek zavést archiv (načítat jen otevřené a nedávné).
- Vyjasnit vlastnictví projektu Firebase (osobní údaje zákazníků firmy).

