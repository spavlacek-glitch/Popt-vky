# Zařízení, aktualizace a kontakty

Část dokumentace projektu Poptávky; hlavní soubor je `../CLAUDE.md`.

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
- Od v1.17 má detail na PC jiné rozložení (viz „Detail poptávky na PC“).

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

