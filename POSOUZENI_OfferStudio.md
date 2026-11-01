# Posouzení: Poptávky ↔ Mercedes Offer Studio SOLO

Datum: 2026-10-28 · Posuzovaná verze Offer Studio: v1.1.9 (repo `spavlacek-glitch/Mercedes-Offer-Studio`)

> **Podklad pro budoucí rozhodnutí, ne zadání.** Z tohoto dokumentu nevzniká žádný vývojový úkol ani nová architektura. Poptávky v1.0 zůstávají beze změn.

## Rozhodnutí uživatele (2026-11-01) – platí přednostně
1. **Offer Studio bude základ nabídek.** Umí i fotky z odkazu.
2. **Makro `Module1` (Mercedes Configurator API, online kód) se vynechává.** Online kód je jen zkušební a uživatel ho dál řešit nebude. Nahrazuje ho Offer Studio.
3. **Kalkulace zůstává v Offer Studiu** (makro `KalkulaceSlevy` se do Poptávek nepřevádí, rozhodnutí 5 níže platí).
4. **E-mailové šablony** z makra `EmailSablony.bas` se převezmou (5 scénářů, oslovení v 5. pádě, texty podle modelu, financování, bonusy BEV, podpis), včetně oprav chyb nalezených v makru.
5. **Cíl uživatele:** jedním krokem udělat nabídku do PDF a otevřít v Outlooku připravený koncept e-mailu s přílohou. Odeslání zůstává na prodejci.

### Ověřeno na pracovním PC (2026-11-01): koncept přes soubor `.eml`
- Nový Outlook pro Windows nejde ovládat makrem (COM) a firemní IT nepovoluje napojení aplikací na poštu (`KONTEXT_obchod.md`, odpověď 49).
- **Řešení bez napojení na poštu:** Offer Studio vytvoří soubor `.eml` s hlavičkou `X-Unsent: 1` (příjemce, předmět, tělo HTML a prostý text, příloha PDF) a otevře ho, jako by na něj prodejce dvakrát klikl.
- **Výsledek testu u uživatele:** otevřel se **nový Outlook** s **upravitelným konceptem**. Text šel upravit, tučné i barevné písmo zůstalo zachované, příloha PDF a odkaz byly v pořádku.
- Testovací soubor: HTML + prostý text (`multipart/alternative`) a příloha PDF (`multipart/mixed`), UTF-8 s diakritikou v předmětu i jménu příjemce.

### Stav implementace (2026-11-01)
- **Krok 1 hotový – Poptávky v1.13:** „📄 Udělat nabídku“ v detailu na PC (odkaz na `127.0.0.1:8774/nova`).
- **Krok 2 hotový – Offer Studio v1.2.0** (větev `claude/offer-studio-outlook-integration-ckmeje` v repu Offer Studia):
  - „📄 Vytvořit PDF a e-mail“ = Word + PDF + koncept `.eml` otevřený v Outlooku; „✉ Jen e-mail“ s posledním PDF (připomínky),
  - šablony 1–5 z makra s opravami (viz níže), náhled e-mailu, volby uložené ke konceptu,
  - Nastavení (jen v PC, `data/nastaveni.json`): prodejce, financování, bonusy BEV, platnost akcí s upozorněním, podpis (výchozí vypnutý).
  - Na Windows je potřeba ověřit samotné otevření konceptu po exportu (`os.startfile`), na Linuxu ověřen tvar `.eml`.
- **Krok 3 zatím ne:** zápis souhrnu nabídky do Poptávek (Firebase z Offer Studia, přihlášení). Stav dál přepíná prodejce ručně.
- **Krok 4 zatím ne:** připomínací e-maily navázané na připomínky v Poptávkách. Šablony 2–5 už jdou ručně přes „✉ Jen e-mail“.

### Navržený postup
1. **Poptávky (PC):** v detailu tlačítko „📄 Udělat nabídku“. Otevře Offer Studio (`127.0.0.1:<pevný port>`) s vyplněným jménem, telefonem, e-mailem a ID poptávky. Je to jen odkaz, takže nevzniká problém s CORS.
2. **Offer Studio:** konfigurace, sleva, fotky a PDF beze změny. Nově „Hotovo → e-mail“: uloží PDF, sestaví e-mail ze šablony (oslovení z jména poptávky, model, BEV, podpis) a otevře `.eml` koncept.
3. **Zpět do Poptávek:** souhrn do `/poptavky/{id}/nabidky/{pushId}` a řádek do historie „Nabídka připravena“. **Stav se nemění** (rozhodnutí 1 z 2026-10-28). Po odeslání ho prodejce jedním klepnutím přepne na „Nabídka odeslána“ a připomínka za 3 dny se nastaví sama.
4. **Později:** připomínací e-maily (šablony 2–5) navázané na připomínky v Poptávkách.

### Doplněná rozhodnutí uživatele (2026-11-01)
- **Pevný port Offer Studia: `8774`.**
- **Akční nabídky jsou upravitelné:** financování (Credit „140. výročí“, Credit 0 %, Agility), bonusy BEV (předplacený servis, poukaz na nabíjení) a další akce mají omezenou platnost. Prodejce je proto musí sám upravit na jednom místě v Offer Studiu, nejlépe s datem platnosti. Rozpor 5,99 % / 1,4 % z makra tím odpadá, platí to, co prodejce zadá.
- **Podpis podle nastavení prodejce:** uživatel má v Outlooku podpis automaticky u nové pošty. Podpis v šabloně musí jít zapnout nebo vypnout a text si každý prodejce nastaví sám, ne natvrdo v kódu.

### Co je potřeba před implementací
- Přístup k repu Offer Studia (`spavlacek-glitch/Mercedes-Offer-Studio`), připojí uživatel v nové session.
- ~~Ověřit automatický podpis~~ **Ověřeno uživatelem (2026-11-01):** nový Outlook přidá podpis podle svého nastavení sám, i do konceptu otevřeného ze souboru `.eml`. **Podpis v šabloně je proto ve výchozím stavu vypnutý.** Zapnout a nastavit si ho může prodejce, který v Outlooku automatický podpis nemá.
- **Chyby makra `EmailSablony` k opravě při převzetí:**
  - v připomenutí po 3–5 dnech se do textu propíše „modelVozu“,
  - nepřesné oslovení („Havel“ → „Havele“, ženská příjmení bez „-ová“ dostanou „pane“).
- **Do veřejného repa nepatří** makra s API klíčem (`Module1`) ani podpis s kontakty natvrdo. Podpis patří do nastavení prodejce.

## Rozhodnutí uživatele (2026-10-28)
1. Stav „Nabídka odeslána“ se potvrzuje **ručně v Poptávkách** až po skutečném odeslání zákazníkovi. Vygenerování Wordu/PDF stav **nesmí** měnit.
2. Offer Studio zatím **není** definitivní náhrada makra `Nabidka_MB_final.bas`, protože ještě není dokončené ani odladěné.
3. Offer Studio zatím chybí: e-mail podle modelu a konkrétní nabídky, volitelné příslušenství v kalkulaci a nabídce.
4. Propojení se **zatím neimplementuje**.
5. V Poptávkách **nevznikne druhá kalkulačka**. Výpočty cen, slev a DPH, parsery DFE/GO, FotoLab a export Word/PDF zůstávají v Offer Studio a do budoucna se mají využít, ne přepsat.

## Co je Offer Studio technicky
- Lokální webová aplikace: FastAPI na `http://127.0.0.1:8774` (port se zatím mění s verzí), spouští se přes `START.bat`. Nemá přihlášení a je dostupná jen z daného PC.
- Data ukládá do `data/offers.sqlite3` (tabulka `drafts`: zákazník, telefon, e-mail, model, výbava, slevy…). Fotky ukládá do `data/photos/`, exporty do `data/exports/`.
- Závislosti na Windows a na PC:
  - Export PDF: Word přes COM (`export_pdf_windows`), jen Windows s Wordem.
  - Vložit z GO: schránka Windows (`clipboard_go.py`, `win32clipboard`), jen PC uživatele.
  - FotoLab: Playwright (headless Chromium) stahuje z mercedes-benz.cz, náročné na paměť.
- Kalkulace (`offer_export.calculate`) je malá: pevná sleva v Kč, procentní sleva, DPH 21 %, kontrola součtů proti zdroji.

## Varianty propojení
| Varianta | Mobil | Server | Náklady | Hodnocení |
|---|---|---|---|---|
| Python v prohlížeči (Pyodide) | teoreticky | ne | 0 | nepoužitelné: velké stahování, chybí Word, schránka i DFE/GO |
| Offer Studio na serveru | ano | ano | ~150–300 Kč/měs. + údržba | nedoporučeno: Word COM ani schránka GO na serveru nefungují, FotoLab potřebuje 1–2 GB RAM a může být blokován, chybí přihlášení, GDPR |
| **Lokální propojení přes Firebase** | jen čtení | ne | 0 (Spark) | **doporučený směr** |

### Doporučený směr (až bude rozhodnuto o implementaci)
- **Poptávky → Offer Studio:** v detailu poptávky na PC tlačítko, které otevře Offer Studio s předvyplněným jménem, telefonem, e-mailem a ID poptávky. Funguje přes obyčejný odkaz na `127.0.0.1`, takže nevzniká problém s CORS. Potřebuje pevný port.
- **Offer Studio → Poptávky:** po exportu se k poptávce zapíše souhrn do `/poptavky/{id}/nabidky/{pushId}` (model, cena s DPH a bez DPH, sleva, platnost, název souboru, datum) a řádek do historie. **Stav se nemění** (rozhodnutí 1). Zápis jde přes Firebase REST (`requests`), přihlášení proběhne jednou a token zůstane v `data/`, mimo repo.
- Pravidla DB se nemění (`auth != null` pokrývá i `nabidky/`).
- PDF zůstává na PC. Firebase Storage vyžaduje tarif Blaze, alternativou je odkaz na OneDrive.
- Odhad rozsahu: Offer Studio ~100–150 řádků (sloupec `poptavka_id`, předvyplnění, modul zápisu do Firebase), Poptávky tlačítko a výpis nabídek.

### Otevřené body
- Pevný port Offer Studio.
- Číslo nabídky se zatím negeneruje (v hlavičce Wordu je „—“).
- Vztah k makru `Nabidka_MB_final.bas` (viz rozhodnutí 2).
