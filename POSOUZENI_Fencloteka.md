# Posouzení: Poptávky ↔ Fenclotéka (Marketing 2.0)

Verze posouzení: 1.1 (2026-10-28) · Posuzovaný kód: soukromé repo `spavlacek-glitch/Fencloteka`

> **Podklad pro budoucí rozhodnutí, ne zadání.** Z tohoto dokumentu nevzniká žádný vývojový úkol. Poptávky v1.0 zůstávají beze změn. Tento repozitář je **veřejný**, proto sem nikdy nepatří zákaznická data z DFE, a to ani jako testovací soubory.

## Rozhodnutí uživatele

### 2026-10-28 – první rozhodnutí
1. CRM část Fenclotéky **není vyloučená** z budoucích Poptávek. Jde o kartotéku zákazníků, historii prodaných vozidel, historii kontaktů a obchodní radar obnovy vozového parku.
2. Cíl: **jedno pracovní prostředí**. Nemá vzniknout další samostatné CRM a nic se nemá programovat znovu.
3. Zákaznická data zůstávají v soukromém repu Fenclotéky. **Žádný automatický přesun** do Firebase ani jinam.
4. Zatím se nic neimplementuje.

### 2026-10-28 – upřesnění (platí přednostně)
5. Směr: **jedna společná evidence zákazníků** pro nové i stávající zákazníky.
6. Při zakládání poptávky na **PC i iPhonu** chci podle jména, telefonu nebo e-mailu vyhledat existujícího zákazníka a zobrazit historii odebraných vozidel. Neexistuje-li, založí se nový.
7. Využít existující logiku Fenclotéky: **import DFE, normalizaci kontaktů, párování vozidel, obchodní radar**.
8. **Dlouhodobě synchronizace přes Firebase** (mobil + PC). Předtím je nutné vyřešit oprávnění a ochranu firemních zákaznických dat.
9. **Marže ani interní poznámky dealera** se do mobilní evidence nepřenášejí.
10. **Poptávky zůstávají hlavní pracovní aplikací.** Žádná další samostatná kartotéka ani dvojí zapisování.
11. Zatím nic neimplementovat a nepřesouvat data. Bod 3 (žádný *automatický* přesun) platí, dokud nebude přesun výslovně schválen.

## Co Fenclotéka je
- Statické HTML a čistý JavaScript (asi 2 000 řádků) bez serveru, bez internetu a bez build kroku.
- Data ukládá do IndexedDB prohlížeče, tedy na jedno PC a do jednoho prohlížeče. Denní záloha se stahuje do JSON. Nemá přihlašování.
- Moduly:
  - `matching.js`: normalizace kontaktů (telefon, e-mail, IČO, VIN, datum), párování zákazníků (jen podle IČO, e-mailu a telefonu; samotné jméno nikdy neslučuje), radar.
  - `excel.js`: import XLSX z DFE Cargistic přes SheetJS s automatickým mapováním sloupců.
  - `storage.js`: IndexedDB, automatické ukládání, záloha.
  - `app.js`: obrazovky, tedy dashboard, karta zákazníka, formulář kontaktu, radar, cílové modely, obnova parku, duplicity a ruční založení zákazníka.
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
- **Téměř beze změny:** `matching.js` (normalizace, párování, radar), `excel.js` (import DFE).
- **S úpravou:**
  - `storage.js`: místo IndexedDB by se zapisovalo do Firebase.
  - `app.js`: obrazovky by se přenesly do Poptávek. Kolidují pomocné funkce `$` a `esc`.
- **Nepřebírat:** `esc()` z Fenclotéky. Nic neescapuje a Poptávky musí dál používat vlastní `esc()`.
- **Opravit při převzetí:** `Radar.todayStr()` počítá dnešek v UTC, takže mezi půlnocí a 1–2 hodinou ráno vrací včerejšek.
- **Ochrana dat je už částečně vyřešená.** `excel.js` přebírá z exportu jen sloupce ze svého seznamu `FIELDS`. Marže, Poznámka dealera, Poznámka veřejná, DIČ, Stav, Režim ani Dat. smlouvy se nenačítají vůbec. Ukládá ale celé pole „Zákazník s adresou“ (`account`), tedy i adresu.

## Cílový stav podle upřesnění: společná evidence zákazníků
Dřívější varianta C („data z DFE ve Firebase“) se tímto stává **cílovým směrem**, podmíněným vyřešením oprávnění a ochrany dat. Varianty A a B (jen lokální data) jsou nejvýš mezikrok.

### Princip
- **Import z DFE probíhá jen na PC v prohlížeči** (SheetJS + `excel.js` + `matching.js`). Do Firebase odchází jen normalizovaný výsledek s **povolenými poli**. Excel se nikam nenahrává.
- **Zákazník** je společný záznam. Vzniká buď importem z DFE, nebo automaticky při uložení poptávky s novým kontaktem (žádný krok navíc).
- **Poptávka** odkazuje na zákazníka. Historie odebraných vozidel se zobrazuje z evidence zákazníků.
- **Ruční zákazník z poptávky se při dalším importu z DFE spáruje** podle telefonu, e-mailu nebo IČO. Logika „nový import nikdy nesmaže ručně zadané údaje“ ve Fenclotéce už existuje.
- **Radar** se počítá v prohlížeči nad evidencí zákazníků, takže funguje na PC i na iPhonu.

### Návrh datového modelu (orientační, neschválený)
```
/zakaznici/{key}
  jmeno, prijmeni, firma, ico
  telefon, email               – zobrazovaná podoba
  klice: { "ph:777123456": true, "em:jan@firma.cz": true, "id:12345678": true }
  zdroj: "dfe" | "poptavka"
  vozidla/{sig}: { model, trida, vin, auftrag, predano }
  upraveno
/poptavky/{id}
  … beze změny v1.0 …
  zakaznik: {key}               – nové nepovinné pole
```
- **Nepřenáší se:** Marže, Poznámka dealera, Poznámka veřejná, DIČ, Dat. smlouvy, Stav, Režim.
- **Adresa** („Zákazník s adresou“) se z ní jen odvodí `firma`, samotná adresa se nepřenáší. To je potřeba výslovně rozhodnout.
- **Prodejce** u vozidla: rozhodnout.
- **Historie kontaktů ze staré Fenclotéky:** případná migrace je samostatné rozhodnutí.

### Vyhledávání při zakládání poptávky
- Asi 2 000 zákazníků s vozidly je zhruba 1–2 MB dat. Na PC i iPhonu se dají načíst celá a hledat lokálně podle jména, telefonu i e-mailu (normalizace z `matching.js`).
- Úspornější alternativa: vyhledání přímo dotazem do Firebase podle normalizovaného telefonu nebo e-mailu (`.indexOn`). Jméno se ale takto hledá špatně.
- Vyhledání **nesmí přidat povinné pole**. Výběr existujícího zákazníka je nabídka, ne povinnost. Pravidlo „zápis do 30 vteřin“ platí dál.

### Oprávnění a ochrana dat (podmínka před prvním přenosem)
1. **Pravidla DB:** dnešní `auth != null` pustí ke všem datům kohokoli, kdo má účet v projektu. Pro zákaznická data je nutné:
   - seznam povolených uživatelů (např. `/uzivatele/{uid}`) a čtení i zápis jen pro ně,
   - validace schématu v pravidlech: zakázat neznámá pole (`"$other": {".validate": false}`), aby se marže nebo poznámky dealera nedaly zapsat ani omylem.
2. **Firebase Auth:** vypnout samoregistraci (Authentication → Settings → User actions → zrušit „Enable create (sign-up)“), jinak si může účet vytvořit kdokoli, kdo zná `apiKey` z veřejného kódu.
3. **Hosting:** Poptávky běží na sdílené adrese raw.githack.com a přihlášení Firebase se ukládá v prohlížeči pod touto adresou. S evidencí zákazníků je vhodné přejít na vlastní adresu (např. GitHub Pages zdarma), kterou nesdílí cizí stránky.
4. **iPhone:** data jsou dostupná po přihlášení. Zvážit odhlášení po nečinnosti a spoléhat na zámek telefonu (Face ID). Ztráta telefonu znamená zrušit relaci v konzoli Firebase.
5. **GDPR a firma:**
   - Zpracování osobních údajů zákazníků v Google Cloudu (databáze je v `europe-west1`, tedy v EU) vyžaduje souhlas firmy a IT a odsouhlasené podmínky zpracování dat Firebase.
   - Rozhodnout dobu uchování a výmaz zákazníků, kteří z DFE zmizí.
6. **Veřejné repo:** kód evidence sem smí, data nikdy. Pravidla DB nejsou tajná, ochranu zajišťuje přihlášení a pravidla, ne skrytý kód.

### Kapacita a náklady
- Tarif Spark stačí: 1 GB uložených dat, 10 GB přenosu měsíčně, 100 současných připojení. Odhad evidence: jednotky MB.
- Náklady: 0 Kč. GitHub Pages: 0 Kč.

### Rozpory s `CLAUDE.md` (nutno upravit až při rozhodnutí o implementaci)
- „**Není to CRM**“: společná evidence zákazníků s radarem je odlehčené CRM. Formulace musí vyjádřit, že jde o evidenci bez povinné administrativy.
- „**Jeden HTML soubor**“: přidá se zhruba 2 000 řádků logiky z Fenclotéky a SheetJS (880 kB, lze načítat z CDN).
- **Datový model a pravidla DB** v `CLAUDE.md` neobsahují `/zakaznici`.

## Omezení a rizika
1. **Ochrana dat** (viz výše) je podmínka, ne doplněk. Bez ní nesmí do Firebase žádná zákaznická data.
2. **Zapisování navíc:** zákazník se zakládá automaticky s poptávkou. Žádný samostatný formulář „Nový zákazník“ v hlavním toku.
3. **Duplicity:** ruční zákazníci bez telefonu a e-mailu se s DFE nespárují. Fenclotéka má detekci možných duplicit, kterou je vhodné převzít.
4. **Repo Poptávek je veřejné.** Kód Fenclotéky sem smí, Excely z DFE nikdy.
5. **Zákaznická data v soukromém repu Fenclotéky** (exporty DFE včetně marže a poznámek dealera) zůstávají z rozhodnutí uživatele. Nikdy je nekopírovat do tohoto ani jiného veřejného repa.
6. **Poptávky v1.0** musí po celou dobu fungovat. Rozšíření se dělá jako nová verze souboru (`poptavky_v2.html`), v1.0 zůstává k dispozici.

## Doporučené pořadí (návrh, až se bude rozhodovat)
1. Nechat Poptávky v1.0 projít běžným provozem.
2. Zabezpečení: pravidla DB se seznamem uživatelů a validací polí, vypnutí samoregistrace, vlastní hosting. Bez zákaznických dat a bez změny funkcí.
3. Úprava `CLAUDE.md` (datový model, pravidla, vymezení „není to CRM“) a souhlas firmy se zpracováním dat.
4. Evidence zákazníků s ručním zakládáním z poptávky a vyhledáváním (zatím bez DFE).
5. Import z DFE na PC (převzatý `excel.js` + `matching.js`) do Firebase s povolenými poli.
6. Obchodní radar nad společnou evidencí.
