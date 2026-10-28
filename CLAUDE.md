# Poptávky – evidence poptávek a nabídek

Verze dokumentu: 1.6 (2026-10-28)

> **Před prací si přečti `KONTEXT_obchod.md`.** Jsou v něm odpovědi na 52 otázek o tom, jak prodejce reálně pracuje: odkud chodí poptávky, proč se Fenclotéka a Obchodní záznamník přestaly používat a co firemní IT nepovoluje (žádný automatický přístup k Outlooku). Je to **kontext, ne zadání**. Nové funkce z něj neodvozuj bez výslovného souhlasu uživatele.
>
> Hlavní měřítko úspěchu: appku bude prodejce přirozeně používat. Každá funkce, která přidá zapisování navíc, je spíš riziko než přínos.

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
3. Kalkulace (sleva, cena) – **pozastaveno**: v Poptávkách nevznikne vlastní kalkulačka, výpočty řeší Mercedes Offer Studio SOLO. Případné propojení zatím neimplementovat, podklady jsou v `POSOUZENI_OfferStudio.md`.
4. Nabídka – napojení na existující VBA makro `Nabidka_MB_final.bas` (Word nabídky z MB Configurator API)
5. Odeslání nabídky e-mailem
6. Automatické připomínky po odeslání
7. Předání do SW Žádanek (kupní smlouva) – schválený postup, odložený po dobu pilotu Žádanek. Podklady jsou v soukromém repu Žádanek (`POSOUZENI_Poptavky.md`), do tohoto veřejného repa se nepřenášejí. Bez pokynu neimplementovat.

## Technologie
- Jeden HTML soubor (`poptavky_vX.html`), bez build kroku, mobil + PC.
- Hosting: GitHub + raw.githack.com (stejně jako appka Zkušební jízdy).
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
- **PC (od 960 px):** dva sloupce. Vlevo panel „Dnes zavolat“ (teplé podbarvení, až 400 px), vpravo evidence: hledání, filtry, seznam, export. Formulář a detail zůstávají v úzkém sloupci 720 px.
- **Mobil:** jeden sloupec, panel „Dnes zavolat“ nahoře, pod ním evidence. Hlavička je na jeden řádek a e-mail přihlášeného se pod 600 px nezobrazuje.
- **Detail na mobilu (do 600 px):** „← Přehled“ je modré plovoucí tlačítko dole vlevo, stejného stylu jako „+ Nová poptávka“. Sedí 16 px nad bezpečnou oblastí iPhonu a při psaní do pole se schová. Obsah detailu jde celý odrolovat nad něj. Na PC zůstává tlačítko nahoře.
  Vyzkoušeno na skutečném iPhonu: tmavá spodní lišta zabírala moc místa, proto je zpět plovoucí tlačítko, jen výraznější. Plovoucí bílé tlačítko se ztrácelo.
- **Historie kontaktů v detailu:** ve výchozím stavu sbalená. Nadpis „Historie kontaktů (X záznamů)“ ukazuje i poslední událost a klepnutím se historie rozbalí nebo sbalí. Při živém překreslení detailu, třeba po „Zapsat“, zůstane rozbalená, po návratu na přehled se znovu sbalí. Ukládání a pořadí záznamů se nemění.
- **Místo pro budoucí ceny** (zatím se nic nezobrazuje):
  - cena obchodu na kartě vpravo u štítku stavu (`.card .top`),
  - souhrnná hodnota otevřených a prodaných poptávek vpravo v hlavičce evidence (`.sekce-hlava` vedle nadpisu „Poptávky“),
  - na PC případně i ve volném místě levého sloupce pod „Dnes zavolat“.

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

## Testy
- `testy/test_v1.2.js`: celé chování od v1.2 v lokálních emulátorech Firebase (databáze + Auth), jen fiktivní data. Jiný soubor appky se testuje přes `SOUBOR=poptavky_v1.3.html`. Návod je v `testy/README.md`.
- `testy/test_vzhled.js`: snímky a rozložení přehledu na PC (1440, 1280, 1024) a iPhonu (13, SE).
- `testy/test_kontakt_v1.4.js`: export kontaktu na smyšlených poptávkách. Kontroluje diakritiku, označení, chybějící údaje, dlouhý text a to, že se nic nezapíše do databáze. Každý soubor přečte i nezávislá knihovna ical.js.
- `firebase/rules.test.mjs`: pravidla databáze.

## Konvence
- **Verzovat vše**: číslo verze v názvu souboru, v `<title>`, v hlavičce i v komentáři na začátku souboru.
- Uživatelské texty česky, klidně s lehkým humorem.
- Escapovat veškerý obsah z DB při vkládání do HTML (`esc()`).

## Nápady na později
- QR kód na stojanu v showroomu, zákazník si poptávku vyplní sám (řešit zabezpečení zápisu bez přihlášení).
- Tlačítko přímo v Outlooku „Do evidence".
- Přiložení PDF nabídky k poptávce.
