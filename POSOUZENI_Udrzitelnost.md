# Posouzení: technická udržitelnost (Git + Firebase)

Datum: 2026-11-01 · Stav: Poptávky v1.14, Offer Studio v1.5.0

> **Podklad, ne zadání.** Rozhodnutí uživatele (2026-11-01): zatím nic neměnit. Nejdřív testuje sám, nejvýš s jedním kolegou. Opatření níže řešit, až na ně dojde řada nebo až to uživatel řekne.

## Shrnutí
Pro jednoho až pár prodejců a tisíce poptávek je současné řešení udržitelné na roky. Je potřeba včas udělat tři věci: **zálohy**, **hosting mimo raw.githack.com** a **archiv starých poptávek**.

## Co je v pořádku
- **Přístup zvenčí bez VPN:** Poptávky (raw.githack.com) i Firebase jsou na veřejném internetu. Chrání je přihlášení (Firebase Auth) a pravidla databáze, ne firemní síť.
- **Místo v databázi:** bezplatný tarif Spark má 1 GB dat. Poptávka i s historií a nabídkou má zhruba 1,5 KB, takže se vejde přes půl milionu poptávek.
- **Git drží jen kód.** Data zákazníků jsou ve Firebase, PDF a fotky na PC ve složce `data` Offer Studia (v `.gitignore`). Git kvůli přibývajícím poptávkám neroste.

## Rizika a opatření (pořadí podle doporučení)
1. **Zálohy zatím nejsou.** Tarif Spark nezálohuje automaticky. Chyba, omylem smazaná poptávka nebo zrušený účet znamenají ztrátu dat. Nabídky, PDF a fotky Offer Studia jsou jen na jednom PC.
   - Návrh: Offer Studio je už přihlášené k Poptávkám, takže může jednou denně uložit zálohu celé databáze (JSON) a spolu se složkou `data` ji kopírovat na OneDrive nebo firemní disk.
   - **Udělat jako první, nejpozději před ostrým provozem s kolegou.**
2. **raw.githack.com je cizí bezplatná služba bez záruky.** Odtud i 5–10 minut zpoždění po sloučení. Když vypadne nebo skončí, Poptávky se neotevřou (data zůstanou v pořádku).
   - Návrh: přejít na Firebase Hosting (stejný projekt, zdarma, nová verze je hned venku) nebo na GitHub Pages.
   - Adresa se jednou změní, ikonu na ploše bude potřeba přidat znovu. Řešit i `poptavky.html`, `manifest.json` a odkazy v kontaktech z v1.6 (staré odkazy přestanou fungovat, pokud raw.githack.com skončí).
3. **Appka při startu načítá všechny poptávky.** Tarif Spark dovolí stáhnout 10 GB za měsíc (a mít 100 současných připojení).
   - Odhad při 1 000 poptávkách ročně: dnes asi 1,5 MB na otevření, za 5 let asi 7,5 MB. U jednoho prodejce v pohodě, při 3 a více prodejcích a letech dat se začneme blížit limitu.
   - Návrh: **až bude kolem 2 000 poptávek** načítat jen otevřené a nedávné, uzavřené starší než rok přesunout do archivu a dohledávat hledáním. Pár hodin práce.
   - Živé změny už teď chodí jen jako rozdíly, ty limit netrápí.

## Organizační body
- **Vlastnictví projektu Firebase:** obsahuje osobní údaje zákazníků firmy. Pokud běží na soukromém účtu Google, vyjasnit s firmou (GDPR, změna pracovního místa). Data jsou v EU (europe-west1).
- **PDF z mobilu:** soubory jsou jen na PC. Úložiště souborů ve Firebase (Storage) vyžaduje placený tarif Blaze. Při tomhle objemu by to stálo prakticky 0 Kč, váže se k němu ale platební karta. Alternativa je OneDrive nebo SharePoint, podle pravidel firemního IT.
- **Víc prodejců:** dnes každý schválený účet vidí všechny poptávky i zisky z nabídek. Před přidáním kolegy rozhodnout, kdo vidí co (pravidla na to jsou připravená). Souvisí s „Týmovými motivačními větami“ v `CLAUDE.md`.
- **Offer Studio** běží lokálně na Windows s Wordem. Každý prodejce má vlastní instalaci a vlastní složku `data`.

## Kdy se k tomu vrátit
- Před přidáním kolegy: zálohy a rozhodnutí, kdo vidí co.
- Při výpadku nebo zdržení raw.githack.com: hosting.
- Kolem 2 000 poptávek: archiv.
