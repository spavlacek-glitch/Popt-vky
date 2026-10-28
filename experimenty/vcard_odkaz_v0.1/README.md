# Experiment: kontakt v iPhonu s odkazem na poptávku (v0.1), 2026-10-28

> Samostatný prototyp se smyšlenými daty. Žádná Firebase, žádná síť, produkční Poptávky se nemění.
> Navazuje na ověřený experiment `../vcard_v0.1`. Funkce vCard jsou stejné, přibyl jen řádek s odkazem.

## Nápad
iPhone webové aplikaci nedovolí poznat, kdo volá (to umí jen nativní aplikace přes CallKit). Kontakt uložený z Poptávek ale může nést **odkaz na svou poptávku**:
1. Zavolá zákazník. iPhone ukáže „Jan Testovací“, protože ho máš v kontaktech.
2. Otevřeš jeho kontakt: v Kontaktech, nebo během hovoru či po něm přes Telefon → Nedávné → ⓘ.
3. Klepneš na řádek **Poptávky** a otevře se rovnou detail jeho poptávky.

## Co je v prototypu
| soubor | co dělá |
|---|---|
| `kontakt_odkaz_v0.1.html` | smyšlený zákazník a „📱 Uložit do kontaktů“; vCard obsahuje odkaz „Poptávky“ |
| `poptavky_demo_v0.1.html` | ukázkové Poptávky se 3 smyšlenými poptávkami; adresa `#poptavka=<ID>` otevře rovnou detail |
| `Jan_Testovaci_odkaz.vcf` | hotový soubor s odkazem na ukázkovou stránku na raw.githack.com |
| `test_odkaz_v0.1.js` | automatický test |

**Odkaz ve vCard:**
```
item1.URL;TYPE=pref:https://…/poptavky_demo_v0.1.html#poptavka=-ODemoK7x2Pq1
item1.X-ABLabel:Poptávky
```
- Skupina `item1` s `X-ABLabel` dává v Kontaktech iPhonu vlastní popisek „Poptávky“. Stejný zápis používá iPhone sám.
- Odkaz nese **jen ID poptávky**, žádné jméno, telefon ani e-mail. V Poptávkách by navíc byl údaj vidět až po přihlášení.

## Výsledek testu: 17 / 17 (Chromium, ical.js)
- vCard má řádky CRLF a nejvýš 75 bajtů. Dlouhý odkaz je zalomený podle normy a po rozvinutí je celý a přesný.
- ical.js přečte odkaz ze skupiny `item1` a popisek „Poptávky“.
- Bez odkazu je soubor bajt po bajtu stejný jako v ověřeném `vcard_v0.1`.
- ID se zvláštními znaky se v odkazu zakóduje.
- **Celý řetězec na PC i v rozměru iPhonu 13:**
  - tlačítko stáhne `.vcf`,
  - odkaz ze staženého souboru otevře detail správné poptávky,
  - přehled a přechod na jinou poptávku fungují,
  - smazaná poptávka ukáže srozumitelnou hlášku a přehled, stejně tak poškozený odkaz.

**Automaticky neověřitelné, ověří uživatel na iPhonu:**
- zda Kontakty ukážou řádek „Poptávky“ a klepnutí otevře Safari,
- jak se chová během hovoru.

## Postup na iPhonu
1. V Safari otevři `kontakt_odkaz_v0.1.html` a klepni na **📱 Uložit do kontaktů**. Otevři soubor a klepni na **Vytvořit nový kontakt**.
2. V Kontaktech otevři **Jan Testovací**. Hledej řádek **Poptávky** s odkazem.
3. Klepni na něj: v Safari se otevře „Poptávky – ukázka“ s pruhem „📇 Otevřeno z kontaktu v iPhonu“ a detailem Jana Testovacího (GLE).
4. Volitelně: zavolej si z jiného telefonu na fiktivní číslo, nebo projdi Telefon → Nedávné → ⓘ a zkus odkaz odtamtud.
5. Kontakt pak smaž, je smyšlený.

## Před začleněním do Poptávek rozhodnout
1. **Stálá adresa aplikace.**
   - Odkaz v kontaktu zůstane v telefonu i po přechodu na novou verzi. Kdyby vedl na konkrétní soubor (`poptavky_v1.5.html`), staré kontakty by otevíraly starou verzi.
   - Doporučení: jedna stálá adresa, třeba `poptavky.html` v `main`, která přesměruje na aktuální verzi a předá `#poptavka=…`.
2. **Safari vs. ikona na ploše.**
   - Odkaz z Kontaktů se otevře v Safari, ne v Poptávkách přidaných na plochu. iOS to jinak neumí.
   - Safari a ikona na ploše mají oddělené přihlášení, takže se v Safari bude potřeba jednou přihlásit.
3. **Jen nově uložené kontakty.** Odkaz budou mít kontakty uložené po začlenění. Starší kontakty se dají uložit znovu.
