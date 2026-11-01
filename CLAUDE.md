# Poptávky – evidence poptávek a nabídek

Verze dokumentu: 2.11 (2026-11-01)

> **Před prací si přečti `KONTEXT_obchod.md`.** Jsou v něm odpovědi na 52 otázek o tom, jak prodejce reálně pracuje: odkud chodí poptávky, proč se Fenclotéka a Obchodní záznamník přestaly používat a co firemní IT nepovoluje (žádný automatický přístup k Outlooku). Je to **kontext, ne zadání**. Nové funkce z něj neodvozuj bez výslovného souhlasu uživatele.
>
> Hlavní měřítko úspěchu: appku bude prodejce přirozeně používat. Každá funkce, která přidá zapisování navíc, je spíš riziko než přínos.
>
> **Test každé funkce: ušetří prodejci čas, nebo ho pobaví? Když ani jedno, nepatří tam.** Systémů, které se jen nařizují, mají prodejci dost. Poptávky musí chtít používat, ne muset.

## Kdo a proč
- Uživatel: Stanislav, prodejce nových vozů a Fleet Manager, S. & W. Automobily (autorizovaný dealer Mercedes-Benz, Jenišov u Karlových Varů + Ústí nad Labem).
- Komunikace a celé UI **česky**. Odpovědi přímé a praktické, bez zbytečné složitosti.
- **Není to CRM.** Cíl je co nejjednodušší sběr poptávek, jejich evidence a připomínky, komu se ozvat.

## Výchozí stav (proč appka vzniká)
Poptávky chodí třemi kanály a každý končí jinde:
- Showroom → poznámky v telefonu
- Telefon → papírový blok
- E-mail → zůstává jen v Outlooku

Bez společné evidence se zákazníkům nikdo neozývá. Nabídku by měl dostat **každý** poptávající.
Leady z webu MB se evidují v jiném systému → **do této appky nepatří**, aby nevznikala dvojí evidence.

## Cílový řetězec (stavět postupně)
1. **Sběr** ✅ v1.0
2. **Evidence + připomínky „Dnes zavolat"** ✅ v1.0
3. Kalkulace ✅ Offer Studio v1.4.0 (rozhodnutí uživatele 2026-11-01): **počítá Offer Studio, Poptávky budou jen zobrazovat.**
   - Model převzatý ze SW Žádanek: sleva provázaně Kč s DPH / % / cena pro zákazníka, nákupní marže % (ručně), nákupní cena, zisk, obchodní marže (= nákupní marže − sleva %, pod 3 % nestandardní, pod 0 % pod nákupní cenou), korekce marže (náklady hrazené dealerem) a skutečný zisk. Navíc doplňkový prodej (příslušenství za peníze, jde do nabídky).
   - Proč v Offer Studiu: ceníková cena je přesně ve výpisu DFE/GO, který se vkládá tam. Prodejce cenu zadá jen jednou a nevzniknou dvě kalkulačky, které by se musely shodovat.
   - Marže, nákupní cena, zisk a korekce jsou **jen pro prodejce**, nikdy do PDF ani e-mailu zákazníkovi.
   - **Další krok (zatím neimplementováno):** Offer Studio po vytvoření nabídky zapíše souhrn do `/poptavky/{id}/nabidky/{pushId}` (model, ceny, sleva, zisk, marže, korekce) a řádek do historie. Poptávky na PC pak ukážou zisk v detailu a v hlavičce skutečný zisk za měsíc místo odhadu přes průměrnou provizi (v1.11). Před tím doplnit pravidla databáze a testy.
   - Uživatel by správně chtěl kalkulaci u každé poptávky. Zisk ale uvidí jen u poptávek s nabídkou z Offer Studia. Ruční kalkulaci v Poptávkách přidat jen na pokyn, byla by to druhá kalkulačka.
4. Nabídka – **základ je Mercedes Offer Studio** (rozhodnutí 2026-11-01). Makro s MB Configurator API (`Module1`, online kód) se vynechává. **Od v1.13** otevře „📄 Udělat nabídku“ v detailu na PC Offer Studio (v1.2.0) s vyplněným zákazníkem (viz níže). Podklady jsou v `POSOUZENI_OfferStudio.md`.
5. Odeslání nabídky e-mailem ✅ Offer Studio v1.2.0 – „📄 Vytvořit PDF a e-mail“ vytvoří PDF a soubor `.eml` (koncept s přílohou PDF a textem ze šablon makra `EmailSablony`) a otevře ho v Outlooku. **Ověřeno u uživatele (2026-11-01, celá cesta):** Poptávky → „📄 Udělat nabídku“ → Offer Studio v1.2.0 → PDF → nový Outlook otevře upravitelný koncept, texty sedí, PDF je v příloze. Odešle prodejce sám, nic se nepřipojuje k poště. Offer Studio běží na pevném portu `8774`, akční nabídky (financování, bonusy) a podpis si prodejce upravuje sám v Nastavení Offer Studia.
   - Zpětný zápis nabídky do Poptávek (`/poptavky/{id}/nabidky`, řádek do historie) **zatím není**. Stav „Nabídka odeslána“ přepíná prodejce ručně po odeslání (rozhodnutí 1 z 2026-10-28).
6. Automatické připomínky po odeslání
7. Předání do SW Žádanek (kupní smlouva) – schválený postup, odložený po dobu pilotu Žádanek. Podklady jsou v soukromém repu Žádanek (`POSOUZENI_Poptavky.md`), do tohoto veřejného repa se nepřenášejí. Bez pokynu neimplementovat.
   - Výjimka (rozhodnutí 2026-11-01): vzorce kalkulace ze Žádanek se převzaly do **soukromého** Offer Studia. Do Poptávek (veřejné repo) jde jen zobrazení hotových výsledků. Interní hranice marže (3 %) nedávat do kódu Poptávek natvrdo, přijde s daty z Offer Studia.

## Technologie
- Jeden HTML soubor (`poptavky_vX.html`), bez build kroku, mobil + PC.
- Hosting: GitHub + raw.githack.com (stejně jako appka Zkušební jízdy).
  - **Po sloučení do `main` trvá několik minut** (ověřeno: víc než minutu, někdy 5–10 minut), než raw.githack.com ukáže novou verzi. Uživateli to vždy říct předem a nepovažovat to za chybu. Rychlá kontrola je přímá adresa nové verze (`…/main/poptavky_vX.Y.html`). Safari obejde svou mezipaměť přes `poptavky.html?cokoli`.
- **Stálá adresa `poptavky.html`** (od v1.6): přesměruje na aktuální verzi a předá `#poptavka=…`. **Při každé nové verzi v ní změnit `AKTUALNI`**, jinak odkazy z kontaktů otevřou starou verzi a běžící appky nenabídnou aktualizaci (viz „Aktualizace za chodu“).
  - `MINIMALNI` (od v1.10) zvýšit **jen při změně tvaru dat**. Starší verze se pak přepnou samy.
  - Tvar obou řádků (`const AKTUALNI = '…';`) neměnit, appka je čte.
- **`manifest.json`** (od v1.12), odkazuje na něj `poptavky.html` i každá verze (`<link rel="manifest">`):
  - `start_url: poptavky.html`: ikona na ploše startuje ze stálé adresy, takže vždy otevře nejnovější verzi,
  - `scope: ./`: k appce patří celá složka. Přepnutí na novou verzi zůstane v appce, bez lišty prohlížeče.
  - Cesty jsou jen relativní, takže funguje z `main` i z testovací větve. Každá nová verze musí mít v hlavičce `<link rel="manifest" href="manifest.json">`.
- Backend: Firebase Realtime Database (europe-west1, Spark plan), **samostatný projekt** – ne `testovaci-jizdy`, protože ten má otevřená pravidla.
- Firebase SDK compat 10.12.2 z gstatic CDN.
- Přihlášení: Firebase Auth e-mail/heslo, **samoregistrace je vypnutá**. Pravidla DB (nasazená, zdroj `firebase/database.rules.json`):
  - `/poptavky`: čtení i zápis jen pro schválené účty, tj. `/uzivatele/{UID}/schvalen: true`. Seznam schválených účtů se upravuje jen v konzoli Firebase, z aplikace zapsat nejde.
  - `/zakaznici`: pravidla jsou nasazená (jen schválené účty a jen povolená pole). Od **v1.2** se používají pro známého zákazníka u nové poptávky. Evidence začíná prázdná a zákazníci přibývají z poptávek. Import z Fenclotéky je odložený: musí spárovat zákazníky podle telefonu a e-mailu, jinak vzniknou dvojí záznamy.
  - Nová pravidla prošla 81 testy v emulátoru (`firebase/rules.test.mjs`). Po nasazení bylo ověřeno čtení i zápis v Poptávkách v1.0.
- Firebase `apiKey` v klientském kódu je OK. Žádné privátní klíče do repa.

## Datový model – `/poptavky/{pushId}`
| pole | význam |
|---|---|
| kanal | `showroom` / `telefon` / `email` |
| jmeno, telefon, email | kontakt (povinný aspoň telefon NEBO e-mail) |
| zajem | co chce / text poptávky |
| stav | `nova` / `nabidka` / `jednani` / `prodano` / `ztraceno` |
| dalsiKontakt | `YYYY-MM-DD` nebo null |
| vytvoreno, upraveno | server timestamp |
| prodejce | e-mail přihlášeného uživatele |
| historie/{pushId} | `{t, kdo, text}` – log kontaktů a změn stavu |
| zakaznik | klíč v `/zakaznici` (nepovinné, od v1.2). Vazba je jen jednosměrná, seznam poptávek zákazníka se dopočítá. Starší poptávky ho nemají. |

## Datový model – `/zakaznici/{key}` (od v1.2)
Pole povolená pravidly: `jmeno`, `prijmeni`, `firma`, `ico`, `telefon`, `email`, `zdroj` (`dfe` | `poptavka`), `vytvoreno`, `upraveno`, `upravil` (UID), `klice/{ph:…|em:…}: true`, `vozidla/*`. Zákazník z poptávky má `zdroj: poptavka`, jméno rozdělené na jméno a příjmení a klíč telefonu nebo e-mailu. E-mail má v klíči „.“ → „,“.

## Pravidla chování (musí platit)
- Nová poptávka → stav `nova`, další kontakt = zítra.
- Přepnutí na `nabidka` → další kontakt = dnes + 3 dny, zápis do historie.
- `prodano` / `ztraceno` → další kontakt = null (zmizí z „Dnes zavolat").
- Každá změna stavu se zapíše do historie.
- „Dnes zavolat" = otevřené stavy (`nova`, `nabidka`, `jednani`) s `dalsiKontakt <= dnes`, prošlé červeně.
- Zápis poptávky musí jít do 30 vteřin – nepřidávat povinná pole.
- Parser e-mailu: jméno z řádku `Od:`/`From:`, e-mail (mimo vlastní doménu přihlášeného), telefon (9 číslic, volitelně +420), text do „Co chce". Vyplňuje jen prázdná pole.
- Při živé aktualizaci z DB nepřekreslovat detail, když uživatel píše do pole.
- **Známý zákazník (v1.2, rozhodnutí uživatele):** zákazníka hledat automaticky podle jména a telefonu. Poptávku k němu přiřadit **jen po klepnutí na Vybrat**, protože telefon nebo e-mail může mít víc lidí.
  - Možná shoda bez výběru → poptávka se uloží bez zákazníka a nový zákazník nevznikne.
  - „Je to nový zákazník“ založí nového i při podobném jménu nebo stejném telefonu (manželé, firemní linka). Platí jen proti zákazníkům, které prodejce viděl. Když údaje sedí i na někoho dalšího, uloží se bez zákazníka.
  - Žádná shoda + jméno + platný telefon nebo e-mail → nový zákazník.
  - Když `/zakaznici` nejde načíst, poptávka se uloží bez zákazníka jako ve v1.1.
- **Přijatá rizika (rozhodnutí uživatele, podklady v repu Fenclotéka, `experimenty/zakaznik_poptavka_v0.5/SOUBEH_v0.5.md`):**
  - Duplicitní zákazník při současném uložení na dvou zařízeních. Jeden prodejce na obou zařízeních současně nepracuje. Řešit až při více prodejcích.
  - Při výpadku připojení appka neukáže chybu a po zavření se neuložené změny ztratí. Výpadek je v praxi vzácný, neopravuje se.

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

## Udělat nabídku (v1.13)
- V detailu poptávky **na PC** je pod „Souhlas GDPR“ řádek „📄 Udělat nabídku“ (`.nabidka`). Na mobilu není, Offer Studio běží jen na PC prodejce.
- Je to **jen odkaz** (nové okno `offerstudio`): `http://127.0.0.1:8774/nova?poptavka=<ID>&jmeno=…&telefon=…&email=…&zajem=…` („Co chce“ nejvýš 1500 znaků). Bez CORS, nic se nezapisuje, stav se nemění.
- Offer Studio (od v1.2.0) předvyplní zákazníka, „Co chce“ dá do interních poznámek a uloží si ID poptávky. Když k poptávce už nabídku má, nabídne ji.
- Když Offer Studio neběží, prohlížeč ukáže chybu připojení (proto nápověda „musí běžet“). Spouští se přes `START.bat`.
- Hláška `{"detail":"Not Found"}` = na PC běží starší Offer Studio bez `/nova` (do v1.1.9). Aktualizovat soubory `app.py`, `email_sablony.py`, `email_koncept.py`, složku `data` nechat (nalezeno uživatelem 2026-11-01).
- Detail na PC je jinak stejný jako ve v1.4 (test porovnání ignoruje řádky `.gdpr` a `.nabidka`).

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

## Aktualizace za chodu (v1.10)
- **Proč:** ikona na ploše iPhonu i záložka na PC si pamatují adresu konkrétní verze, protože `poptavky.html` na ni hned přesměruje. Otevřená appka navíc běží dny bez obnovení.
- **Jak:** appka si při spuštění, při návratu do popředí a každých 30 minut přečte `poptavky.html` (`AKTUALNI`, `MINIMALNI`). Verze porovnává číselně (1.10 > 1.9).
  - **Novější verze** → pod hlavičkou lišta „🎉 Je tu nová verze Poptávek (v…) – Aktualizovat / Později“. Sama nic nepřepne. „Později“ ji pro tutéž verzi schová do obnovení stránky.
  - **Tahle verze je pod `MINIMALNI`** → lišta bez „Později“. Appka se přepne sama, jakmile to nic nepřeruší: na přihlášení nebo na přehledu a mimo psaní do pole.
  - Otevřený detail zůstane otevřený, předá se jako `#poptavka=…` (v1.6).
  - Bez připojení se nic neděje, zkusí to příště. Nic se nezapisuje.
- **Verze do v1.9 kontrolu nemají.** Ikonu na ploše uloženou z nich je potřeba jednou přidat znovu.
- **Lišta prohlížeče po aktualizaci (nalezeno uživatelem na iPhonu ve v1.11):** bez manifestu bral iPhone za appku jen stránku, ze které byla ikona přidaná. Po „Aktualizovat“ proto otevřel novou verzi v zabudovaném prohlížeči (dole Zpět, Sdílet, Obnovit, Safari). Opraveno manifestem ve v1.12. iPhone si ho přečte jen při přidání ikony, proto je potřeba ikonu přidanou před v1.12 **jednou naposledy** smazat a přidat znovu z `…/main/poptavky.html`.

## Souhlas GDPR (v1.9)
- V detailu poptávky je „Souhlas GDPR“: na PC řádek pod „📱 Uložit do kontaktů“, na mobilu řádek v panelu „Další akce“.
- „💬 Poslat SMS“ (je-li telefon) otevře Zprávy s připraveným textem a odkazem na formulář souhlasu Mercedes-Benz (`GDPR_ODKAZ` v kódu). V SMS je odkaz klikací (ověřeno na iPhonu). Odešle prodejce sám.
- **E-mail záměrně není (rozhodnutí uživatele):** `mailto:` umí jen prostý text a nový Outlook z něj klikací odkaz neudělá (ověřeno). Kopírování textu přes schránku (Ctrl+V) uživatel odmítl, protože přidává prodejci práci. Bez telefonu se GDPR nenabízí.
- **Bez předvyplnění:** formulář MB údaje z odkazu nepřebírá (ověřeno uživatelem).
- **Nic se nezapisuje** do Poptávek. Souhlasy se do appky nenapojují (rozhodnutí uživatele): eviduje je MB a prodejce ani neví o jejich odvolání.
- Detail na PC je jinak stejný jako ve v1.4 (test porovnání ignoruje jen řádek `.gdpr`).

## Uložit do kontaktů (v1.4)
- V detailu poptávky je pole „Označení kontaktu (nepovinné)“ a tlačítko „📱 Uložit do kontaktů“. Po klepnutí se stáhne soubor `.vcf` (vCard 3.0, UTF-8). Na iPhonu ho prodejce otevře a uloží přes „Vytvořit nový kontakt“.
- Obsah kontaktu:
  - jméno z poptávky, s označením „Jan Novák · SUV“,
  - telefon převedený na +420 (zahraniční zůstane beze změny),
  - e-mail,
  - poznámka = celý text „Co chce“.
  Chybějící údaj se vynechá. Bez jména se kontakt pojmenuje podle telefonu nebo e-mailu.
- iPhone skládá zobrazované jméno z pole `N`, ne z `FN`. Proto je označení připojené i k příjmení v `N`.
- Export je jen ruční. Nic se nezapisuje do databáze, do telefonu se nic neukládá automaticky a stávající kontakty se nemění. Model vozidla se z textu nerozpoznává.
- Kód formátu vCard je převzatý z experimentu `experimenty/vcard_v0.1` (větev `claude/experiment-vcard`), ověřeného na skutečném iPhonu.

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
- **Plovoucí tlačítka při psaní:** schovají se hned, vrátí se až 0,3 s po opuštění pole. Jinak by se při klepnutí na „Zapsat poznámku“ vynořila pod prstem a klepnutí by dostala ona (nalezeno testem na šířce iPhonu SE).

## Odkaz z kontaktu v iPhonu (v1.6)
- Kontakt uložený přes „📱 Uložit do kontaktů“ nese odkaz s popiskem **„Poptávky“** (`item1.URL` + `item1.X-ABLabel`). Klepnutí v Kontaktech, i během hovoru přes Nedávné → ⓘ, otevře Poptávky rovnou na detailu té poptávky.
- iPhone webové aplikaci neřekne, kdo volá (CallKit je jen pro nativní aplikace, vědomě vyloučen). Prodejce proto otevře kontakt sám a klepne na odkaz.
- **Podoba odkazu:** `<stálá adresa>/poptavky.html#poptavka=<ID poptávky>`.
  - Obsahuje jen ID, žádné osobní údaje. Data se ukážou až po přihlášení.
  - Adresa se skládá vzhledem k místu, odkud appka běží: větev při testování, `main` po sloučení.
- **Po přihlášení a načtení dat** se otevře detail: na iPhonu mobilní, na PC počítačový.
  - Odkaz se pak z adresy smaže, takže obnovení stránky detail znovu neotevře.
  - Smazaná poptávka nebo poškozený odkaz → přehled s hláškou „Poptávku z kontaktu jsem nenašel – možná byla smazaná.“
- **Omezení iOS (rozhodnutí uživatele, přijato):**
  - Odkaz se otevře v Safari, ne v Poptávkách na ploše. Safari má vlastní přihlášení, takže se tam jednou přihlásit.
  - Odkaz mají jen kontakty uložené od v1.6. Starší stačí uložit znovu.
- Ověřeno experimentem `experimenty/vcard_odkaz_v0.1` (větev `claude/experiment-vcard`).

## Testy
- `testy/test_v1.2.js`: celé chování od v1.2 v lokálních emulátorech Firebase (databáze + Auth), jen fiktivní data. Jiný soubor appky se testuje přes `SOUBOR=poptavky_v1.3.html`. Návod je v `testy/README.md`.
- `testy/test_vzhled.js`: snímky a rozložení přehledu na PC (1440, 1280, 1024) a iPhonu (13, SE).
- `testy/test_kontakt_v1.4.js`: export kontaktu na smyšlených poptávkách. Kontroluje diakritiku, označení, chybějící údaje, dlouhý text a to, že se nic nezapíše do databáze. Každý soubor přečte i nezávislá knihovna ical.js.
- `testy/test_detail_v1.5.js`: detail na PC beze změny proti v1.4 a nový mobilní detail na iPhonu 13 a SE se skutečnými zápisy do emulátoru.
- `testy/test_odkaz_v1.6.js`: odkaz z kontaktu – export → odkaz ze souboru → `poptavky.html` → přihlášení → detail na iPhonu i PC, smazaná a poškozená poptávka, obnovení stránky, druhý odkaz v otevřené appce, žádný zápis do databáze.
- `testy/test_tipy_v1.8.js`: tipy při prázdném „Dnes zavolat“ – pořadí, 14denní hranice, poznámka v historii, prodané a ztracené nikdy, zmizení tipů, žádný zápis do databáze; PC i iPhone.
- `testy/test_gdpr_v1.9.js`: SMS „Souhlas GDPR“ na PC i iPhonu – číslo příjemce, text s odkazem na formulář MB, žádný e-mail, bez telefonu nic, žádný zápis do databáze.
- `testy/test_aktualizace_v1.10.js`: aktualizace za chodu přes lokální HTTP server se smyšlenou v1.11 – lišta, „Později“, přepnutí s otevřeným detailem, povinná verze (ne při psaní, hned na přehledu a na přihlášení), nedostupná `poptavky.html`; PC i iPhone.
- `testy/test_vydelek_v1.11.js`: „Tento měsíc prodáno“ a výhled na PC, iPhonu 13 a SE – krátký řádek na mobilu, jen moje poptávky, měsíc podle záznamu „Stav → Prodáno“, zadání a změna provize, schování částek, méně než 5 uzavřených, nula prodaných, přepnutí na Prodáno, žádný zápis do databáze. `test_aktualizace_v1.10.js` od v1.11 funguje pro libovolnou verzi (`SOUBOR`).
- `testy/test_manifest_v1.12.js`: manifest přečtený prohlížečem (Chromium) přes lokální HTTP server ve složce jako na raw.githack.com – start ze stálé adresy, rozsah celé složky, standalone, relativní cesty, odkaz z `poptavky.html`. Chování iPhonu ověřit na zařízení.
- `testy/test_nabidka_v1.13.js`: „📄 Udělat nabídku“ na PC 1280 a 1024 – odkaz na `127.0.0.1:8774/nova` s ID, jménem, telefonem, e-mailem a „Co chce“, zvláštní znaky, umístění, na iPhonu 13 a SE není, žádný zápis do databáze. S `OFFER_STUDIO=<složka>` spustí kopii Offer Studia a ověří i předvyplněnou nabídku a oslovení v e-mailu.
- `firebase/rules.test.mjs`: pravidla databáze.

## Konvence
- **Verzovat vše**: číslo verze v názvu souboru, v `<title>`, v hlavičce i v komentáři na začátku souboru.
- Uživatelské texty česky, klidně s lehkým humorem.
- **Tón appky (rozhodnutí uživatele):** povzbuzovat a bavit, nikdy nesrážet. Žádné žebříčky „kdo je poslední“ ani výčitky. Humor je vítaný, pokud prodejci pomáhá nebo ho pobaví. Prodejce má zapisování bavit – když je appka vtipná a usnadní práci, bude ji používat.
- Escapovat veškerý obsah z DB při vkládání do HTML (`esc()`).

## Nápady na později
- QR kód na stojanu v showroomu, zákazník si poptávku vyplní sám (řešit zabezpečení zápisu bez přihlášení).
- Tlačítko přímo v Outlooku „Do evidence".
- Přiložení PDF nabídky k poptávce.
- **Týmové motivační věty** (až bude víc prodejců): jen pozitivně, třeba „Tým včera zapsal 7 poptávek 💪“ nebo pochvala nejlepšímu. Počítat i nabídky a kontakty, ne jen nové poptávky, aby se nevyplatilo zapisovat „pro statistiku“. Jména doplnit ke schváleným účtům v konzoli Firebase (appka zná jen e-mail). Předtím rozhodnout, kdo vidí čí poptávky a čí jsou „Dnes zavolat“.
