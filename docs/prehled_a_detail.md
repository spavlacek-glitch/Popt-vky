# Přehled, detail a hlášky

Část dokumentace projektu Poptávky; hlavní soubor je `../CLAUDE.md`.

## Rozložení přehledu (v1.3)
- **PC (od 960 px):** dva sloupce. Vlevo panel „Dnes zavolat“ (teplé podbarvení, až 380 px), vpravo evidence: hledání, filtry, seznam, export. Formulář a detail zůstávají v úzkém sloupci 720 px.
- **Pracovní přehled na PC (v1.7, jen CSS):**
  - přehled je široký až 1600 px,
  - „Dnes zavolat“ je přilepené vlevo a při posouvání seznamu zůstává vidět (při velkém počtu hovorů se posouvá samo v sobě),
  - „⬇ Export do Excelu (CSV)“ je vpravo v hlavičce evidence,
  - od 1200 px jsou hledání a filtry na jednom řádku a každá poptávka v evidenci je jeden řádek: jméno | co chce | další kontakt | stav. Karty v „Dnes zavolat“ a pod 1200 px zůstávají jako ve v1.6.
  - Pořadí prvků ani funkce se nemění, mobil (pod 960 px) je stejný jako ve v1.6.
- **Mobil:** jeden sloupec, panel „Dnes zavolat“ nahoře, pod ním evidence. Hlavička je na jeden řádek a e-mail přihlášeného se pod 600 px nezobrazuje.
- **Detail na mobilu (do 600 px):** „← Přehled“ je modré plovoucí tlačítko dole vlevo, stejného stylu jako „+ Nová poptávka“. Sedí 16 px nad bezpečnou oblastí iPhonu a při psaní do pole se schová. Obsah detailu jde celý odrolovat nad něj. Na PC zůstává tlačítko nahoře.
  Vyzkoušeno na skutečném iPhonu: tmavá spodní lišta zabírala moc místa, proto je zpět plovoucí tlačítko, jen výraznější. Plovoucí bílé tlačítko se ztrácelo.
- **Historie kontaktů v detailu:** ve výchozím stavu sbalená. Nadpis „Historie kontaktů (X záznamů)“ ukazuje i poslední událost a klepnutím se historie rozbalí nebo sbalí. Při živém překreslení detailu, třeba po „Zapsat“, zůstane rozbalená, po návratu na přehled se znovu sbalí. Ukládání a pořadí záznamů se nemění.
- **Místo pro budoucí ceny:**
  - cena obchodu na kartě vpravo u štítku stavu (`.card .top`), zatím prázdné,
  - vpravo v hlavičce evidence (`.sekce-hlava` vedle nadpisu „Poptávky“) je od v1.11 „Tento měsíc prodáno“ (viz níže),
  - na PC případně i ve volném místě levého sloupce pod „Dnes zavolat“.

## Detail poptávky na PC (v1.17, v1.18)
- **Rozhodnutí uživatele (2026-11-01):** detail na PC byl úzký (720 px) a roloval se, přitom je na PC dost místa. Tím **končí pravidlo „detail na PC je stejný jako ve v1.4“**; mobil (do 600 px) zůstává beze změny.
- Od 960 px je detail široký až 1240 px a má **dva sloupce**:
  - vlevo: zákazník (jméno, stav, kontakty, označení kontaktu, GDPR, „📄 Udělat nabídku“) a blok „Poptávka“ (co chce, vůz, nabídky z Offer Studia),
  - vpravo (při posouvání zůstává vidět): Stav, Další kontakt, Zapsat kontakt / poznámku a **historie kontaktů, na PC ve výchozím stavu rozbalená** (jde sbalit, po zápisu zůstane sbalená),
  - dole vpravo „Upravit údaje“ a „Smazat“. Pod 960 px je jeden sloupec.
- **v1.18 (přání uživatele po zkoušce):**
  - **Tlačítko Zpět prohlížeče** (z Fenclotéky je známo, že lidé místo „Přehled“ mačkají Zpět v prohlížeči) vrací z detailu na přehled a z úpravy údajů do detailu, ne ven z appky (`history.pushState`, Vpřed otevře detail zase). Po uložení úpravy vede jedno Zpět na přehled.
  - „← Zpět na přehled poptávek“ na PC je výraznější, na mobilu zůstává „← Přehled“.
  - **Kalkulace v detailu na PC:** u každé nabídky se vždy ukazují ceníková cena, sleva (Kč a %), cena vozu, doplňkový prodej a celkem s DPH, soubor a „📂 Otevřít v Offer Studiu“, aby je prodejce měl po ruce při telefonování. **Zisk a marže zůstávají schované** do klepnutí (showroom).
- **v1.19 (přání uživatele: „zpět na přehled je málo výrazné, budou pořád klikat na Zpět v prohlížeči“):** nad detailem na PC je přilepený modrý pruh s velkým tlačítkem **„← Všechny poptávky“**, drobečkovou navigací „Poptávky › Jméno“ a nápovědou **Esc**. Klávesa Esc vrací na přehled (ne při psaní do pole). Tlačítko Zpět prohlížeče funguje dál (v1.18). Mobil beze změny.
- Starší testy porovnávající PC detail s v1.4 (`test_detail_v1.5.js`) pro PC neplatí; ostatní hledají místo „Co chce“ nadpis „Poptávka“ a tlačítko návratu (`.zpet-pc, .zpet button`).

## Ekonomika na přehledu (v1.15)
- **Přání uživatele (2026-11-01):** na první stránce u každé poptávky vidět, za kolik, s jakou slevou a s jakým ziskem. Ekonomika může být rozbalovací. „Dnes zavolat“ zůstává na svém místě, popis i „kdy volat“ zůstávají.
- **Každá karta** (seznam, „Dnes zavolat“, tipy; PC i mobil) má navíc:
  - `📄 model · cena · sleva %` z poslední nabídky (bez nabídky nic, v tabulce „bez nabídky“),
  - `💬 poslední zápis · před X dny` (nejnovější záznam historie kromě „Založeno“).
- **PC od 1200 px: seznam je tabulka** Zákazník | Co řeším · poslední zápis | Nabídka | Zisk | Stav · kontakt | ▸.
  - Zisk je schovaný („••• Kč“). 👁 v záhlaví ho ukáže u všech poptávek i v součtu, do obnovení stránky. Barva podle příznaků z Offer Studia.
  - Řazení klepnutím na záhlaví (Nabídka, Zisk, kontakt), další klepnutí vrátí výchozí „nejnovější nahoře“.
  - Pod tabulkou součet za zobrazené poptávky: počet, kolik s nabídkou a za kolik, zisk (schovaný).
  - **▸ rozbalí „Ekonomiku poptávky“** v řádku (neotevře detail): cena pro zákazníka (ceníková = cena vozu + sleva, sleva Kč a %, doplňky, celkem), zisk před a po korekcích a marže (schované do klepnutí), nabídka (datum, soubor, „📂 Otevřít v Offer Studiu“ → `127.0.0.1:8774/draft/{id konceptu}`) a „Co jsem s ním řešil“ (poslední 4 zápisy).
  - Přehled je na PC široký až 1920 px.
- **Mobil (rozhodnutí uživatele 2026-11-01):** model, cena a poslední zápis ano, zisk ani ▸ ne. V mobilním detailu řádek „Nabídka“ s modelem a cenou.
- Hledání najde poptávku i podle modelu z nabídky. Nic se nezapisuje, Poptávky nic nepočítají.

## Komu zavolat, když dnes nikomu (v1.8)
- Když je „Dnes zavolat“ prázdné, panel pod hecovací větou ukáže **nejvýš 3 tipy**. Klepnutí otevře detail jako u každé karty.
- **Dlouho ticho** (nejvýš 2, nejdelší první): otevřená poptávka (`nova`, `nabidka`, `jednani`), u které se **14+ dní** nic nezapsalo.
  - Poslední zápis = nejnovější z `upraveno`, `vytvoreno` a časů v historii (poznámka mění jen historii).
  - Rozhodnutí uživatele: „nabídka bez odezvy“ a „dlouho nedotčené jednání“ jsou totéž pravidlo, proto jeden tip pro všechny otevřené stavy. Hranice 14 dní podle odpovědi 47 v `KONTEXT_obchod.md`.
- **Nejbližší kontakt:** zbylá místa doplní otevřené poptávky s nejbližším budoucím termínem („Na řadě zítra – klidně už dnes“).
- Jen čtení dat: nic se nezapisuje, termíny ani stavy se nemění. Jakmile je někdo na řadě dnes, tipy zmizí.

## Tento měsíc prodáno (v1.11)
- V hlavičce evidence (PC vpravo vedle „Poptávky“, mobil pod nadpisem):
  - „🎉 Tento měsíc prodáno: 3 auta ≈ 24 000 Kč“, při nule povzbudivě „🚗 Tento měsíc zatím 0 aut – první kus se chystá“,
  - pod tím „Rozjednáno: 8 obchodů · výhled ≈ … Kč“.
- **Jen poptávky přihlášeného prodejce** (`prodejce` = e-mail), připraveno pro víc prodejců.
- **Prodáno tento měsíc** = poslední „Stav → Prodáno“ v historii v aktuálním kalendářním měsíci, bez záznamu čas `upraveno`. Kdy obchod začal, nevadí (rozhodnutí uživatele: obchody běží i týdny přes konec měsíce).
- **Výhled** = všechny moje otevřené × moje úspěšnost × provize, zaokrouhleno na stovky. Úspěšnost = prodané / (prodané + ztracené). Méně než 5 uzavřených obchodů → „výhled spočítám po 5 uzavřených obchodech“, nic se nevymýšlí.
- **Průměrná provize za auto:** zadá se po prvním klepnutí nebo přes „✏️ provize“. Uloží se **jen v tomhle zařízení** (`localStorage`, klíč `poptavky.provize`), ne do databáze. Na PC a iPhonu se zadává zvlášť.
- **Částky jsou schované** („≈ ••• Kč“), klepnutí je ukáže nebo zase schová. Po obnovení stránky jsou znovu schované (showroom).
- **Mobil (do 600 px, rozhodnutí uživatele: „nebude tam moc informací?“):** jen jeden krátký řádek „🎉 3 auta tento měsíc ›“ (při nule „🚗 Tento měsíc zatím 0 aut ›“). Klepnutí rozbalí celý blok rovnou s částkami, další klepnutí ho sbalí. Po obnovení stránky je zase sbalený. PC beze změny.
- Do databáze se nic nezapisuje. Rozepsaná provize přežije živé překreslení.

## Detail poptávky na mobilu (v1.5)
- **Dva vzhledy detailu (rozhodnutí uživatele):**
  - do 600 px nový mobilní detail podle schváleného prototypu,
  - na PC detail z v1.4 beze změny (test porovnává vykreslené HTML), protože na PC bude v budoucnu víc informací.
  - Při otočení telefonu nebo změně okna se detail přepne. Oba vzhledy volají stejné funkce pro ukládání.
- **Uspořádání na mobilu:**
  - nahoře karta: stav, termín („Zavolat dnes“ / „⚠ Zavolat – prošlé …“), jméno, „Co chce“ (dlouhý text zkrácený na 4 řádky s „Zobrazit celý text“), tlačítka Zavolat a Napsat,
  - blok „Po hovoru“: poznámka → další kontakt (den slovy, rychlé volby a „📅 Datum…“) → stav (Nová / **Nabídka odeslána** / Jednáme a zvlášť ✓ Prodáno / ✕ Ztraceno),
  - sbalená historie.
- **Plovoucí tlačítka (rozhodnutí uživatele, neměnit):** „← Přehled“ dole vlevo, „Další akce ⋯“ dole vpravo.
  - Panel „Další akce“ obsahuje kontakt do iPhonu (s označením), úpravu údajů a smazání s potvrzením přímo v panelu.
  - Panel je mimo překreslovaný obsah, takže ho živá aktualizace nezavře.
- **Panel „Další akce“ se zavře i posunutím dolů (v1.22, nalezeno uživatelem v provozu):** dřív šlo jen klepnout na pozadí. Táhne se za celý panel, když je odrolovaný nahoru (ne při psaní do pole); krátké potáhnutí se vrátí, klepnutí na pozadí a Esc fungují dál. Test `testy/test_panel_v1.22.js`.
- **Plovoucí tlačítka při psaní:** schovají se hned, vrátí se až 0,3 s po opuštění pole. Jinak by se při klepnutí na „Zapsat poznámku“ vynořila pod prstem a klepnutí by dostala ona (nalezeno testem na šířce iPhonu SE).

## Hlášky v „Dnes zavolat“ (v1.8, rozšířeno ve v1.21)
- Nad seznamem „Dnes zavolat“ je krátká povzbuzující věta podle počtu hovorů (`HECOVANI`: `nula`, `malo`, `stredne`, `hodne`, `prosle`). Věta se vybírá podle dne, takže v jednom dni zůstává stejná.
- **Tón (rozhodnutí uživatele, 2026-11-01): suchý a černý humor.** Smí se smát situaci (telefon, konkurence, kafe), nikdy na účet zákazníka, kolegy nebo prodejce, a nikdy nesrážet („pozadu“, „poslední“ se nepoužije). Test `testy/test_hlasky_v1.21.js` to hlídá.
- V1.21 přidala 15 vět, mimo jiné od uživatele: „Kafe je zadarmo, tak pozvi zákazníka na showroom. Je to jediné, co dostane zdarma ☕“. Další hlášky přidává uživatel nebo se navrhnou a schválí. V1.32 přidala 20 vět (4 do každé skupiny; celkem 55).

## Dohody z porady, Můj týden a Porada (v1.20)
- **Přání uživatele (2026-11-01):** vedoucí prodeje osobních vozů (5 prodejců) si každé pondělí sedne s každým prodejcem nad obchodními případy. Chce vidět **kdo a kolik má rozjednáno, v jakém stavu, ekonomiku obchodu, jak dlouho se řeší, kdy byl poslední kontakt a kolikrát se zákazníkovi ozval**. Kontakt 14+ dní prodejce musí vysvětlit (viz `KONTEXT_obchod.md`, odpovědi kolem 14 dní). Další pondělí se vedoucí vrací k tomu, co se dohodlo. Uživatel to **testuje sám v obou rolích**, kolegové přibudou později.
- **Zásady, aby to nebyl „bič“ (rozhodnutí uživatele):** aplikace má být zábava, prodejce ani vedoucí nemají mít víc zapisování.
  1. **Dohoda je jedna věta**, kterou vedoucí napíše za pár vteřin (např. „Zavolej mu a dej mu 1 % navíc.“), s hotovými větami, předvyplněným termínem (příští pondělí) a nepovinným „když to nevyjde: uzavřít jako ztracený / vrátit na poradu“. Žádná povinná pole.
  2. **Prodejce nic nevyplňuje ani nepotvrzuje.** Dohodu vidí jako „Tip od šéfa“ u obchodu (karta, detail PC i mobil) a klepne jen „✓ Hotovo“. Čas klepnutí se neukazuje.
  3. **Rozhoduje vedoucí:** „Hotovo“ jedním klepnutím potvrdí, jinak „Dopracovat“ s nepovinným tipem na příště, nebo „↻ Na další týden“. **Slovo „nesplněno“ se nepoužívá**, žádná červená, žádné body.
  4. **Bez pořadí prodejců** (karty abecedně), označují se obchody, ne lidé. Vedoucí je sám prodejce a vidí i „Můj týden“.
  5. **14 dní bez kontaktu** je štítek „bez kontaktu N dní“ s tlačítkem „Zapsat, co se děje“ (důvod pár slovy → zelený štítek „důvod: …“, pole `duvodTicha`). Obchod ze seznamu nezmizí.
  6. Zisk a marže jsou v Poradě schované do klepnutí (👁), jako jinde.
- **Role:** vedoucí = v databázi `/uzivatele/{UID}/vedouci: true`. Nastavuje se **jen ručně v konzoli Firebase** (z aplikace zapsat nejde, `/uzivatele` je jen ke čtení). Bez příznaku je uživatel prodejce: vidí „Můj týden“, tip od šéfa a „Hotovo“, nevidí formulář dohody ani „Porada“. S příznakem vidí obojí.
  - **Role se od v1.24 vynucují i v pravidlech DB** (viz „Více prodejců“ v sekci Technologie): dohody zadává a potvrzuje jen vedoucí, prodejce jen klepne „Hotovo“, každý prodejce vidí jen své poptávky.
- **Kontakty zákazníka** (počet a poslední) se počítají z historie: zápisy, které nejsou automatické (nezačínají „Založeno“, „Stav →“, „📄“, „🤝“, „✓ Hotovo“). Nic se kvůli tomu nezapisuje navíc.
- **Příznaky „k probrání“** (u obchodu, ne u člověka): bez kontaktu 14+ dní, prošlý termín dalšího kontaktu, týden řešení a není nabídka, nízká marže / pod nákupní cenou (podle příznaků z Offer Studia).
- **Můj týden** (tlačítko v hlavičce, všichni, PC i mobil): „co na mě šéf uvidí“. Moje dohody s „Hotovo“, moje obchody k probrání s počtem kontaktů a důvodem ticha. Jen pohled, nikomu se nic neposílá.
- **Porada** (jen vedoucí, PC, tlačítko v hlavičce): nahoře „co jste si řekli minule“ (dohody, které nejsou potvrzené nebo přenesené; „prodejce hlásí hotovo“; Potvrdit / Dopracovat / Na další týden), karty prodejců (otevřené obchody, stavy, hodnota nabídek, nejdelší ticho, „k probrání“), tabulka obchodů řazená podle nejdéle bez kontaktu / hodnoty / doby řešení / marže, u obchodu „+ Dohoda“. **Pondělní program** = nejdřív minulé dohody, pak obchody s příznaky v zvoleném pořadí; prodejci nejsou řazeni.
- **Ukázky návrhu** (fiktivní data): `navrh/pondelni_porada_v0.2.html`, `navrh/dohoda_ukazka_v0.1.html`.
- **Zatím není:** zápis z porady do schránky (v návrhu byl), měsíční přehled s oslavou, tvar `dohody` v pravidlech DB, mobilní Porada. Ověřit s vedoucím, co chce vidět navíc.
- Test `testy/test_dohody_v1.20.js` (18 kontrol: role, dohody, Hotovo bez času, Můj týden, Porada, Zpět prohlížeče, iPhone).


## Šipky „Předchozí / Další“ v detailu (v1.31)
- **Přání uživatele (2026-11-03):** z detailu listovat poptávkami bez návratu na přehled. Na PC jsou v modrém pruhu vpravo „‹ Předchozí  2 / 3  Další ›“ a klávesy **←** a **→**; na mobilu je řádek se dvěma velkými tlačítky nad kartou zákazníka.
- Listuje se v **pořadí přehledu**: stejný filtr (Otevřené / Prodáno…), filtr prodejce, hledání i řazení (`poradiPrehledu()`, sdílené s `renderSeznam`). Na kraji je tlačítko vypnuté. Když poptávka z filtru mezitím vypadne (třeba přepnutá na Prodáno), drží se pořadí, ve kterém byla otevřena. Při jediné poptávce v seznamu a u poptávky mimo seznam se šipky neukazují.
- Klávesy nefungují při psaní do pole, s Ctrl/Alt/Cmd/Shift a při otevřeném panelu „Další akce“.
- Nic se nezapisuje, tlačítko Zpět prohlížeče dál vrací na přehled (záznam v historii se nahrazuje, nepřibývá). Test `testy/test_sipky_v1.31.js` (PC i iPhone, bez Firebase).

## Posuvník „Co když ustoupím?“ (v1.33)
- **Přání uživatele (2026-11-03):** při telefonování vidět, co obnáší dát zákazníkovi ještě pár tisíc slevy („někdy vyhraju obchod jen tím, že ustoupím o pár tisíc, a zákazník má pocit, že vyhrál“). Beru to jako výslovný pokyn k **simulaci nad hotovou nabídkou**, ne jako druhou kalkulačku (viz „Cílový řetězec“ v `CLAUDE.md`).
- **Kde:** jen detail na PC, samostatný blok pod „Poptávka“ (nabídky), vždy nad **poslední** nabídkou z Offer Studia. Na mobilu není (zisk tam nikdy nebyl). Bez nabídky blok není.
- **Posuvník:** ústupek navíc 0 až 100 000 Kč s DPH po 10 000 Kč (přání uživatele; původně 0–20 000 po 500 Kč) (`SIM_MAX`, `SIM_KROK`). Začíná u každé poptávky na nule. Nic se nezapisuje, skutečná sleva = nová nabídka v Offer Studiu.
- **Co ukáže:** kolik zákazník zaplatí, celkovou slevu (Kč a % z ceníkové ceny), 🏆 „Zákazník právě vyhrál X Kč a má radost“ a 💸 „Tvůj ústupek = 2× plná nádrž ⛽“ (orientační ceny: káva 60, oběd 200, nádrž 2 500, víkend na horách 8 000, od 16 000 týden u moře, od 50 000 dovolená pro celou rodinu).
- **Zisk je schovaný** (••• Kč), odkryje se klepnutím stejným příznakem jako zisk v nabídkách (`nabidkyOdkryte`). Po odkrytí: nový zisk, kolik ubyde (bez DPH i v % zisku) a nová obchodní marže.
- **Výpočet:** zisk = prodejní cena bez DPH − nákupní cena, takže při změně jen slevy je změna zisku přesně ústupek / 1,21 a změna marže ústupek / ceníková cena. Nákupní cena ani vzorec marže se do Poptávek **nepřenášejí**; vychází se z hotových `interni.zisk` / `skutecny_zisk` / `obchodni_marze`, které zapsalo Offer Studio.
- **Varování:** „⚠ Pod nákupní cenou – tady už to bolí“, když by zisk klesl pod nulu (ukáže se i při schovaném zisku, nic jiného z čísel neprozradí). „⚠ Marže je už v nabídce nízká“ jen když to Offer Studio zapsalo příznakem (`nestandardni`), a jen s odkrytým ziskem. **Hranice 3 % v kódu Poptávek není.** Případné dřívější varování před nízkou marží by vyžadovalo, aby Offer Studio zapisovalo i hranici (změna pravidel DB), zatím neděláno.
- Test `testy/test_posuvnik_v1.33.js` (PC 1440 a iPhone 13, bez Firebase).

## Provize podle modelu (zapsáno, v kódu zatím není)
- **Zapsáno na přání uživatele (2026-11-03), zatím neimplementovat:** provize se počítá ze zisku podle modelu. **GLS, G, S atd. = 10 % ze zisku, ostatní modely 12,5 %.** Seznam modelů v desetiprocentní skupině řekl uživatel jen příkladem („atd.“), před implementací doptat přesný seznam.
- Dnes appka drží jen „průměrnou provizi za auto“ v zařízení (`localStorage`, viz „Tento měsíc prodáno“). Provize podle modelu by mohla nahradit průměr ve výhledu a v posuvníku (např. „tvoje provize: 29 000 → 27 800 Kč“), model je v nabídce z Offer Studia (`model`).

## Ekonomika případu v detailu na PC (v1.34, návrh A)
- **Rozhodnutí uživatele (2026-11-03):** detail byl přeplácený (řádek nabídky, zisk, odkazy a posuvník na třech místech). Z návrhů A1/A2/B (`navrh/ekonomika_pripadu_*.png`, zdroj `navrh/ekonomika_pripadu_v0.1.html`) vybrána **varianta A: jeden blok pod oběma sloupci detailu**.
- **Rozložení:** dva boxy vedle sebe, pod nimi posuvník (`.pc-eko`, třída vnitřku `.ekop`):
  - **Zákazník platí:** model a datum poslední nabídky, ceníková cena, sleva (Kč a %), u doplňkového prodeje i „Cena vozu“ a „Doplňkový prodej“, celkem s DPH, název souboru + „📄 PDF“ a „📂 Offer Studio“. Starší nabídky jsou pod čarou jako jeden řádek (model · cena · sleva · datum · odkazy).
  - **Tobě zůstane:** ve výchozím stavu „••• Kč“ s tlačítkem 👁 (showroom). Po klepnutí: nákupní cena bez DPH, zisk, − korekce, + dobropis a další (jen když se liší), **skutečný zisk**, obchodní (a skutečná) marže a varování z příznaků Offer Studia. 🙈 Schovat vrací zpět. Stejný příznak `nabidkyOdkryte` ovládá i posuvník. Bez interní kalkulace v nabídce je místo toho krátká věta.
  - **Posuvník** viz předchozí sekce; levá část slider + 🏆, pravá část dopad na cenu, slevu, skutečný zisk a marži.
- **Nákupní cena** se v Poptávkách neukládá, odvozuje se: cena vozu s DPH / 1,21 − zisk. Provize v bloku zatím není (viz „Provize podle modelu“).
- **Pryč:** starý řádek „Nabídky“ v boxu Poptávka (funkce `nabidkyDetail`), rozbalovací zisk po klepnutí na nabídku a samostatný blok posuvníku mezi Poptávkou a dohodou. Seznam (v1.15) a mobil beze změny.
- Test `testy/test_ekonomika_pripadu_v1.34.js` (dřív `test_posuvnik_v1.33.js`). Testy s emulátory (`test_nabidky_v1.14.js`, `test_zpet_kalkulace_v1.18.js`, `test_detail_pc_v1.17.js`) hledají v detailu starý řádek nabídky a po této změně je potřeba je při dalším spuštění upravit.
