# Poptávky – evidence poptávek a nabídek

Verze dokumentu: 2.41 (2026-11-03)

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
   - Marže, nákupní cena, zisk a částky korekcí jsou **jen pro prodejce**, nikdy do PDF ani e-mailu zákazníkovi.
   - Korekci (pneu, servis, poukaz…) si prodejce může zaškrtnout „do nabídky“ (Offer Studio v1.4.1): v PDF jen název a popis, bez částky. **Subvence OL/PJJ se v nabídce nikdy neukáže** (rozhodnutí uživatele).
   - **Zápis zpět ✅ Offer Studio v1.5.0 + Poptávky v1.14:** po vytvoření nabídky Offer Studio zapíše souhrn do `/poptavky/{id}/nabidky/{id konceptu}` a řádek do historie, Poptávky ho ukážou na PC (viz „Nabídky z Offer Studia (v1.14)“).
   - **Offer Studio v1.8.1 (opravy z provozu, 2026-11-03):** sleva se dá zadat v Kč i v % zároveň (nejdřív Kč, ze zbytku %; do PDF, e-mailu a Poptávek jde celková sleva), v interní části je „Dobropis Kč bez DPH“ (přičte se jen ke skutečnému zisku, příznaky marže se jím nemění; do Poptávek jde jen výsledný `skutecny_zisk`, tvar zápisu ani pravidla DB se nezměnily) a prodejce je v PDF jen v bloku vedle zákazníka (ne v záhlaví ani v patičce). Kalkulace bez nabídky funguje: stačí výpis, jméno ani fotky nejsou potřeba. Podrobnosti v `README_V1_8_1.txt` v Offer Studiu.
   - Uživatel by správně chtěl kalkulaci u každé poptávky. Zisk ale uvidí jen u poptávek s nabídkou z Offer Studia. Ruční kalkulaci v Poptávkách přidat jen na pokyn, byla by to druhá kalkulačka.
4. Nabídka – **základ je Mercedes Offer Studio** (rozhodnutí 2026-11-01). Makro s MB Configurator API (`Module1`, online kód) se vynechává. **Od v1.13** otevře „📄 Udělat nabídku“ v detailu na PC Offer Studio (v1.2.0) s vyplněným zákazníkem (viz níže). Podklady jsou v `POSOUZENI_OfferStudio.md`.
5. Odeslání nabídky e-mailem ✅ Offer Studio v1.2.0 – „📄 Vytvořit PDF a e-mail“ vytvoří PDF a soubor `.eml` (koncept s přílohou PDF a textem ze šablon makra `EmailSablony`) a otevře ho v Outlooku. **Ověřeno u uživatele (2026-11-01, celá cesta):** Poptávky → „📄 Udělat nabídku“ → Offer Studio v1.2.0 → PDF → nový Outlook otevře upravitelný koncept, texty sedí, PDF je v příloze. Odešle prodejce sám, nic se nepřipojuje k poště. Offer Studio běží na pevném portu `8774`, akční nabídky (financování, bonusy) a podpis si prodejce upravuje sám v Nastavení Offer Studia.
   - **Odpověď ve vlákně (Offer Studio v1.6.0, přání uživatele):** druhá nabídka a připomínky se neposílají jako nový e-mail. Když zákazník nabídku už má, Offer Studio vytvoří jen PDF a dá ho do schránky (**ověřeno u uživatele na PC, 2026-11-01:** nový Outlook vloží PDF ze schránky do odpovědi jako přílohu) spolu s krátkým textem „Upravená nabídka“. Prodejce v Outlooku klepne Odpovědět a vloží.
   - **Offer Studio v1.7.0 (přání uživatele, ověřeno že funguje):** rychlejší načítání fotek z odkazu (bez pevného čekání, paralelní stahování); nabídky se ukazují jen u konkrétního zákazníka (seznam všech je na `/nabidky`); „další nabídka“ k poptávce převezme zákazníka, poznámky a prodejce; prodejce (jméno, telefon, e-mail z Nastavení Offer Studia) je i v hlavičce PDF. Podrobnosti v `README_V1_7_0.txt` v Offer Studiu.
   - Zpětný zápis nabídky do Poptávek je od Offer Studia v1.5.0. **Stav se nemění:** „Nabídka odeslána“ přepíná prodejce ručně po odeslání (rozhodnutí 1 z 2026-10-28).
6. Automatické připomínky po odeslání
7. Předání do SW Žádanek (kupní smlouva) – schválený postup, odložený po dobu pilotu Žádanek. Podklady jsou v soukromém repu Žádanek (`POSOUZENI_Poptavky.md`), do tohoto veřejného repa se nepřenášejí. Bez pokynu neimplementovat.
   - Výjimka (rozhodnutí 2026-11-01): vzorce kalkulace ze Žádanek se převzaly do **soukromého** Offer Studia. Do Poptávek (veřejné repo) jde jen zobrazení hotových výsledků. Interní hranice marže (3 %) nedávat do kódu Poptávek natvrdo, přijde s daty z Offer Studia.

## Technologie
- Jeden HTML soubor (`poptavky_vX.html`), bez build kroku, mobil + PC.
- **Hosting: GitHub Pages je zapnuté a ověřené uživatelem (2026-11-03), všechna zařízení jsou přepnutá a přesměrování staré adresy na Pages je ZAPNUTÉ (`PRESMEROVAT_NA_PAGES = true`, 2026-11-03).** Přesun z raw.githack.com na GitHub Pages (rozhodnutí uživatele 2026-11-03, postup `PRESUN_NA_PAGES.md`): nová adresa `https://spavlacek-glitch.github.io/Popt-vky/poptavky.html`, nasazuje se samo po sloučení do `main`, `.nojekyll` v kořeni. Stará adresa se přesměruje vypínačem `PRESMEROVAT_NA_PAGES` v `poptavky.html` (teď `true`, hlídá `testy/test_verze.js`; vrácení zpět = `false` a upravit test). Přesměrovává jen `…/main/…` na githacku, náhledy větví ne. Zařízení po přesunu: nové přihlášení, nová ikona na ploše, nová provize (nový původ). Náhledy nesloučených větví dál přes raw.githack.com (Pages umí jen `main`). Dokud Pages není zapnuté, platí níže popsaný githack.
- Hosting (dosud): GitHub + raw.githack.com (stejně jako appka Zkušební jízdy).
  - **Po sloučení do `main` trvá několik minut** (ověřeno: víc než minutu, někdy 5–10 minut), než raw.githack.com ukáže novou verzi. Uživateli to vždy říct předem a nepovažovat to za chybu. Rychlá kontrola je přímá adresa nové verze (`…/main/poptavky_vX.Y.html`). Safari obejde svou mezipaměť přes `poptavky.html?cokoli`.
- **Stálá adresa `poptavky.html`** (od v1.6): přesměruje na aktuální verzi a předá `#poptavka=…`. **Při každé nové verzi v ní změnit `AKTUALNI`**, jinak odkazy z kontaktů otevřou starou verzi a běžící appky nenabídnou aktualizaci (viz „Aktualizace za chodu“).
  - `MINIMALNI` (od v1.10) zvýšit **jen při změně tvaru dat**. Starší verze se pak přepnou samy.
  - Tvar obou řádků (`const AKTUALNI = '…';`) neměnit, appka je čte.
  - **V nové verzi přepsat i `const VERZE = [1, N];` v kódu appky** (spolu s názvem souboru, `<title>` a hlavičkou). Ve v1.22 zůstalo `[1, 21]`: appka se pak považuje za starší než `AKTUALNI`, lišta „Aktualizovat“ se ukazuje pořád a klepnutí nic neudělá (přepne na stejný soubor). Opraveno ve v1.23, hlídá to `testy/test_verze.js` (spouštět před každým pull requestem).
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
  - `/poptavky/{id}/nabidky` (od v1.14): kontrola tvaru zápisu z Offer Studia (jen povolená pole, čísla, `kdo` = přihlášený, jen k existující poptávce). 95 testů. Pravidla se nasazují ručně v konzoli Firebase (Realtime Database → Pravidla → Publikovat). Uživatel je zkoušel nasadit a zápis z Offer Studia funguje (2026-11-01).
  - **Více prodejců (v1.24, rozhodnutí uživatele 2026-11-03: „každý jen své“):** nová pravidla (`firebase/database.rules.json`, 133 testů; předchozí verze v `firebase/database.rules.pred-vice-prodejci.json` pro návrat). Prodejce čte a mění jen poptávky se svým e-mailem v poli `prodejce` (čtení jen dotazem `orderByChild('prodejce').equalTo(e-mail)`, proto `.indexOn: prodejce`), včetně `nabidky`, `historie` a `duvodTicha`. Vedoucí (`/uzivatele/{UID}/vedouci: true`) čte a mění vše. **Dohody:** zadává, potvrzuje a maže jen vedoucí, prodejce smí jen změnit `stav` na `hotovo` u své dohody (text, termín a `zadal` zůstanou). `/zakaznici` zůstávají společné všem schváleným (kvůli známému zákazníkovi). Prodejce nemůže převést poptávku na jiného ani ji přepsat jako celek (zápis jednotlivých polí funguje). Pravidla se nasazují ručně v konzoli, postup a pořadí v `firebase/PRIDANI_PRODEJCE.md`.
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
| vuz | od v1.16, nepovinné, zadává prodejce ručně: `puvod` (`sklad` / `objednany` / `vyroba` / `dealer`, od v1.30 čtyři), `id` (Auftrag, např. 05-576-12345, nebo online kód), `lokace` (jen sklad a dealer). Prázdné pole se nezapisuje, bez vyplnění `vuz` v DB není. Pravidla DB beze změny. |
| dohody/{id} | od v1.20: dohoda vedoucího s prodejcem k obchodu. `text` (jedna věta, ≤140), `do` (`YYYY-MM-DD`), `vyjde` (nepovinné: „uzavřít jako ztracený“ / „vrátit na poradu“), `zadal` (e-mail), `t`, `stav` = `otevrena` / `hotovo` (prodejce klepl) / `potvrzena` / `dopracovat` / `preneseno`, nepovinný `tip`. **Čas klepnutí „Hotovo“ se neukládá ani neukazuje** (rozhodnutí uživatele). |
| duvodTicha | od v1.20, nepovinné: `{text, kdo}` – proč je obchod 14+ dní bez kontaktu (dovolená apod.), zapisuje prodejce jedním řádkem. |
| nabidky/{id konceptu} | od v1.14, zapisuje jen Offer Studio (v1.5.0+): `model`, `cena_sdph` (celkem pro zákazníka), `cena_vuz_sdph`, `sleva_sdph`, `sleva_pct`, `doplnky_sdph`, `soubor`, `zdroj: offerstudio`, `t`, `kdo`; nepovinně `interni` = `{zisk, skutecny_zisk, obchodni_marze, skutecna_marze, korekce, nestandardni, negativni}`. Jedna položka na nabídku, nové PDF ji přepíše. |

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

## Konvence
- **Verzovat vše**: číslo verze v názvu souboru, v `<title>`, v hlavičce i v komentáři na začátku souboru.
- Uživatelské texty česky, klidně s lehkým humorem.
- **Tón appky (rozhodnutí uživatele):** povzbuzovat a bavit, nikdy nesrážet. Žádné žebříčky „kdo je poslední“ ani výčitky. Humor je vítaný, pokud prodejci pomáhá nebo ho pobaví. Prodejce má zapisování bavit – když je appka vtipná a usnadní práci, bude ji používat.
- Escapovat veškerý obsah z DB při vkládání do HTML (`esc()`).

## Podrobnosti k tématům (`docs/`)
Hlavní pravidla jsou tady, podrobnosti jednotlivých funkcí v souborech níž. **Před prací na dané oblasti přečti příslušný soubor.**
- `docs/prehled_a_detail.md` – Přehled, detail a hlášky: Rozložení přehledu, Detail poptávky na PC, Ekonomika na přehledu, Komu zavolat, když dnes nikomu, Tento měsíc prodáno, Detail poptávky na mobilu, Hlášky v „Dnes zavolat“, Dohody z porady, Můj týden a Porada
- `docs/nabidky_a_vuz.md` – Nabídky, Offer Studio a vůz: Udělat nabídku, Vůz u poptávky, Offer Studio v1.8.0, Nabídky z Offer Studia
- `docs/zarizeni_a_kontakty.md` – Zařízení, aktualizace a kontakty: Aktualizace za chodu, Souhlas GDPR, Uložit do kontaktů, Odkaz z kontaktu v iPhonu
- `docs/testy.md` – Testy: Testy
- `docs/vice_prodejcu.md` – Více prodejců a udržitelnost: Více prodejců, Udržitelnost
- `docs/email_prijem.md` – Příjem poptávek e-mailem: Příjem poptávek e-mailem

## Stav na konci session 2026-11-03 – co zbývá
Hotovo a sloučeno v `main`: Poptávky v1.30 (čtyři původy vozu); větev: v1.31 (šipky Předchozí / Další v detailu, viz `docs/prehled_a_detail.md`), Offer Studio v1.8.3, nová pravidla DB pro víc prodejců (nasazená uživatelem, ověřeno s Miroslavem Sýkorou a Martinem Esterkou), GitHub Pages (zapnuté, funguje), „Jednáme“ schované (uživatel poslední poptávku přepnul ručně).
Otevřené, v tomto pořadí:
1. ~~Přepnout zařízení na GitHub Pages a zapnout přesměrování~~ – **hotovo 2026-11-03.** Raw.githack.com zůstává jen pro náhledy větví.
2. **Pravidelná záloha Firebase** (uživatel dělá sám týdně exportem JSON). Vyjasnit vlastnictví projektu Firebase (osobní údaje zákazníků firmy).
3. **Úklid:** ✅ CLAUDE.md rozdělen na hlavní soubor a `docs/` (2026-11-03); starší verze smazány 2026-11-03 (v repu zůstává v1.24–v1.29, starší jsou v gitu). Výchozí soubor v testech je teď `poptavky_v1.31.html`; testy starších funkcí **nebyly po úklidu spuštěny** (emulátory tu nejsou), případné rozdíly proti dnešnímu vzhledu opravit při dalším spuštění. Zbývá: případně rozdělit jednosouborovou appku. Archiv poptávek kolem 2 000 kusů. Firebase Hosting jen kdyby bylo potřeba soukromé repo, vrácení nasazení nebo vlastní hlavičky.
4. **Zákazníci (`/zakaznici`) jsou společní** všem prodejcům (kvůli rozpoznání známého zákazníka). Omezit až na přání.
5. **Vůz z Offer Studia** (původ vozu hotový ve v1.30; zápis kódu/Auftragu z Offer Studia zatím není).
6. **Příjem poptávek e-mailem** čeká na odpověď IT (otázky v sekci „Příjem poptávek e-mailem“).
7. Menší nápady (šipky předchozí / další hotové ve v1.31): zápis z porady do schránky, měsíční přehled s oslavou, další hlášky, mobilní Porada, týmové motivační věty.
Poznámky pro práci: na emulátory Firebase v tomhle prostředí viz sekce Testy (odpojit proxy, `127.0.0.1`, jar přes curl); náhledy nesloučených větví přes raw.githack.com adresu větve; po sloučení vždy říct uživateli, že Pages/githack zdržuje, a ke každé nové verzi přepsat `AKTUALNI` i `VERZE` (hlídá `testy/test_verze.js`).

## Nápady na později
- QR kód na stojanu v showroomu, zákazník si poptávku vyplní sám (řešit zabezpečení zápisu bez přihlášení).
- Tlačítko přímo v Outlooku „Do evidence".
- Přiložení PDF nabídky k poptávce.
- **Týmové motivační věty** (až bude víc prodejců): jen pozitivně, třeba „Tým včera zapsal 7 poptávek 💪“ nebo pochvala nejlepšímu. Počítat i nabídky a kontakty, ne jen nové poptávky, aby se nevyplatilo zapisovat „pro statistiku“. Jména doplnit ke schváleným účtům v konzoli Firebase (appka zná jen e-mail). Předtím rozhodnout, kdo vidí čí poptávky a čí jsou „Dnes zavolat“.
