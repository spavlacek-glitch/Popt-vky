# Posouzení: Poptávky ↔ Fenclotéka (Marketing 2.0)

Datum: 2026-10-28 · Posuzovaný kód: soukromé repo `spavlacek-glitch/Fencloteka`

> **Podklad pro budoucí rozhodnutí, ne zadání.** Z tohoto dokumentu nevzniká žádný vývojový úkol. Poptávky v1.0 zůstávají beze změn. Tento repozitář je **veřejný**, proto sem nikdy nepatří zákaznická data z DFE, a to ani jako testovací soubory.

## Rozhodnutí uživatele (2026-10-28)
1. CRM část Fenclotéky **není vyloučená** z budoucích Poptávek. Jde o kartotéku zákazníků, historii prodaných vozidel, historii kontaktů a obchodní radar obnovy vozového parku. O jejím začlenění se rozhodne samostatně.
2. Cíl: **jedno pracovní prostředí** pro nové poptávky i stávající zákazníky. Nemá vzniknout další samostatné CRM a nic se nemá programovat znovu.
3. Zákaznická data zůstávají v soukromém repu Fenclotéky. **Žádný automatický přesun do Firebase ani do jiného úložiště.**
4. Zatím se nic neimplementuje.

## Co Fenclotéka je
- Statické HTML a čistý JavaScript (asi 2 000 řádků) bez serveru, bez internetu a bez build kroku. Otevírá se z disku přes `index.html`.
- Data ukládá do IndexedDB prohlížeče, tedy na jedno PC a do jednoho prohlížeče. Nesynchronizuje se mezi zařízeními. Denní záloha se stahuje do souboru JSON. Nemá přihlašování.
- Moduly:
  - `matching.js`: normalizace kontaktů (telefon, e-mail, IČO, VIN, datum), párování zákazníků, radar.
  - `excel.js`: import XLSX z DFE Cargistic přes SheetJS s automatickým mapováním sloupců.
  - `storage.js`: IndexedDB, automatické ukládání, záloha.
  - `app.js`: obrazovky, tedy dashboard, karta zákazníka, formulář kontaktu, radar, cílové modely, obnova parku a duplicity.
- Repo je nahrané bez podsložek `js/` a `css/`, které `index.html` očekává. Z repa se aplikace tak, jak je, nespustí.

## Srovnání s Poptávkami v1.0
| | Fenclotéka | Poptávky v1.0 |
|---|---|---|
| Předmět | stávající zákazníci a prodaná vozidla | nové poptávky (obchodní případy) |
| Data | import z DFE (XLSX) | ruční zápis do 30 s |
| Úložiště | IndexedDB, jedno PC | Firebase, PC i iPhone |
| Historie | `{date, type, note, nextFollowUp}` | `{t, kdo, text}` |
| Připomínka | `nextFollowUp`: „Dnes volat / Po termínu“ | `dalsiKontakt`: „Dnes zavolat“ |
| Navíc | radar stáří vozů, cílové modely, obnova parku, slučování duplicit, tisk | parser e-mailu |

## Využitelnost kódu
- **Téměř beze změny:** `matching.js`, `excel.js`, `storage.js`.
- **S úpravou:** `app.js`. Kolidují pomocné funkce `$` (Fenclotéka používá `getElementById`, Poptávky `querySelector`) a `esc`.
- **Nepřebírat:** `esc()` z Fenclotéky. Nic neescapuje a Poptávky musí dál používat vlastní `esc()`.
- **Opravit při převzetí:** `Radar.todayStr()` počítá dnešek v UTC, takže mezi půlnocí a 1–2 hodinou ráno vrací včerejšek. Poptávky používají místní datum.

## Varianty jednoho prostředí
| Varianta | Princip | Data z DFE | iPhone |
|---|---|---|---|
| **A. Fenclotéka jako součást Poptávek** | Moduly Fenclotéky se vloží do Poptávek jako záložka „Zákazníci“. Import z DFE proběhne lokálně na PC. | prohlížeč na PC | jen poptávky |
| **B. Dvě stránky propojené odkazy** | Z karty zákazníka tlačítko „Založit poptávku“ otevře Poptávky s předvyplněným kontaktem. | prohlížeč na PC | jen poptávky |
| C. Data z DFE ve Firebase | CRM dostupné i na iPhonu. | cloud | ano |

- Varianta **C** je podle rozhodnutí 3 vyloučená. Možná je jen po samostatném rozhodnutí: GDPR, firemní souhlas a v žádném případě marže ani poznámky dealera.
- Varianta **A** nejlépe splňuje „jedno prostředí“. Varianta **B** má nejméně zásahů, ale aplikace zůstávají dvě.

### Přínosy varianty A
- **Jeden ranní seznam:** „Dnes zavolat“ z Poptávek a „Moje úkoly“ z Fenclotéky dohromady (`dalsiKontakt` ≈ `nextFollowUp`).
- **Známý zákazník:** při zápisu poptávky se podle telefonu, e-mailu nebo IČO zobrazí historie nákupů. Žádné zapisování navíc.
- **Radar → poptávka:** z radaru obnovy parku jedním klepnutím vznikne poptávka i s připomínkou.
- **Vazba zákazník ↔ poptávka:** normalizovaný klíč (telefon, e-mail nebo IČO) uložený u poptávky. Jeden zákazník může mít více poptávek.

## Omezení a rizika
1. **Repo Poptávek je veřejné.** Kód Fenclotéky sem smí, Excely z DFE nikdy.
2. **Fenclotéka přes raw.githack.com nepoběží**, protože githack zobrazuje jen veřejná repa. Ve variantě A to nevadí: kód by šel do Poptávek a data by se načítala lokálně z Excelu.
3. **Adresa raw.githack.com je sdílená** všemi stránkami, které přes ni běží (např. appkou Zkušební jízdy). Místní databáze se zákaznickými daty by byla teoreticky čitelná i z jiných stránek na githacku. Řešit by se dalo vlastní adresou, např. GitHub Pages zdarma. To je samostatné rozhodnutí.
4. CRM část bude **jen na PC**, dokud data nebudou v cloudu (varianta C).
5. Data v prohlížeči jsou vázaná na jeden počítač a jeden prohlížeč. Vymazání dat prohlížeče je odstraní, proto musí zůstat denní záloha do JSON.
6. **`CLAUDE.md`** („Není to CRM“, „jeden HTML soubor“) je s variantou A v rozporu. Kód Fenclotéky má asi 2 000 řádků a SheetJS 880 kB, knihovnu lze načítat z CDN. Před začleněním je nutná úprava `CLAUDE.md`, a to jen na pokyn uživatele.
7. **Zapisování navíc:** přebírat jen to, co nepřidává povinná pole. Zápis nové poptávky musí zůstat do 30 vteřin.
8. **Zákaznická data v soukromém repu Fenclotéky** (exporty DFE včetně marže a poznámek dealera) zůstávají z rozhodnutí uživatele. Nikdy je nekopírovat do tohoto ani jiného veřejného repa.

## Doporučené pořadí (až se bude rozhodovat)
1. Nechat Poptávky v1.0 projít běžným provozem.
2. Rozhodnout variantu A, nebo B, a s ní úpravu `CLAUDE.md`.
3. U varianty A začít společným ranním seznamem a nápovědou „známý zákazník“, radar zařadit až potom.
