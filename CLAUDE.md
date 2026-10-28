# Poptávky – evidence poptávek a nabídek

Verze dokumentu: 1.2 (2026-10-28)

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

## Technologie
- Jeden HTML soubor (`poptavky_vX.html`), bez build kroku, mobil + PC.
- Hosting: GitHub + raw.githack.com (stejně jako appka Zkušební jízdy).
- Backend: Firebase Realtime Database (europe-west1, Spark plan), **samostatný projekt** – ne `testovaci-jizdy`, protože ten má otevřená pravidla.
- Firebase SDK compat 10.12.2 z gstatic CDN.
- Přihlášení: Firebase Auth e-mail/heslo. Pravidla DB:
  `{ "rules": { "poptavky": { ".read": "auth != null", ".write": "auth != null" } } }`
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

## Pravidla chování (musí platit)
- Nová poptávka → stav `nova`, další kontakt = zítra.
- Přepnutí na `nabidka` → další kontakt = dnes + 3 dny, zápis do historie.
- `prodano` / `ztraceno` → další kontakt = null (zmizí z „Dnes zavolat").
- Každá změna stavu se zapíše do historie.
- „Dnes zavolat" = otevřené stavy (`nova`, `nabidka`, `jednani`) s `dalsiKontakt <= dnes`, prošlé červeně.
- Zápis poptávky musí jít do 30 vteřin – nepřidávat povinná pole.
- Parser e-mailu: jméno z řádku `Od:`/`From:`, e-mail (mimo vlastní doménu přihlášeného), telefon (9 číslic, volitelně +420), text do „Co chce". Vyplňuje jen prázdná pole.
- Při živé aktualizaci z DB nepřekreslovat detail, když uživatel píše do pole.

## Konvence
- **Verzovat vše**: číslo verze v názvu souboru, v `<title>`, v hlavičce i v komentáři na začátku souboru.
- Uživatelské texty česky, klidně s lehkým humorem.
- Escapovat veškerý obsah z DB při vkládání do HTML (`esc()`).

## Nápady na později
- QR kód na stojanu v showroomu, zákazník si poptávku vyplní sám (řešit zabezpečení zápisu bez přihlášení).
- Tlačítko přímo v Outlooku „Do evidence".
- Přiložení PDF nabídky k poptávce.
