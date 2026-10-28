# Posouzení: Poptávky ↔ Mercedes Offer Studio SOLO

Datum: 2026-10-28 · Posuzovaná verze Offer Studio: v1.1.9 (repo `spavlacek-glitch/Mercedes-Offer-Studio`)

> **Podklad pro budoucí rozhodnutí, ne zadání.** Z tohoto dokumentu nevzniká žádný vývojový úkol ani nová architektura. Poptávky v1.0 zůstávají beze změn.

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
