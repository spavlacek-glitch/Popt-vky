# Předání – Poptávky / Offer Studio / Robot-DFE (stav k 2026-11-23)

> Dokument pro nové vlákno (Claude). Je to momentka; aktuální pravdu mají `CLAUDE.md` a `docs/`. Při dalším předání ho přepiš.

Uživatel: Stanislav (prodejce + Fleet Manager, S. & W. Automobily). Česky, přímo, krátce. Nejdřív přečti `CLAUDE.md` v repu Popt-vky (body 9–15 dole) a `docs/nabidky_a_vuz.md`, `docs/zarizeni_a_kontakty.md`.

## Repa a stav (vše ve `main`, pokud není uvedeno jinak)
| repo | verze | poznámka |
|---|---|---|
| `spavlacek-glitch/Popt-vky` (veřejné, Pages) | **Poptávky v1.45** | stálá adresa `https://spavlacek-glitch.github.io/Popt-vky/poptavky.html`, v řádku nikdy číslo verze, `404.html`, `MINIMALNI` = v1.45; pravidla DB `firebase/database.rules.json` (142 testů, pole `onedrive`, `onedrive_ucet`) |
| `spavlacek-glitch/Mercedes-Offer-Studio` (soukromé) | **Offer Studio v1.9.1** | knihovna akčních vozů (`akcni.py`), OneDrive odkaz (`onedrive`/`onedrive_ucet`), záloha DB, `AKTUALIZOVAT.bat`/`aktualizace.py`, nabídka bez fotek, zdroj fotek vozy.suw.cz |
| `spavlacek-glitch/Robot-DFE` (soukromé) | `main` = v0.5b + Excel `PSV202610`; **větev `claude/jolly-babbage-7oh27u` = NabidkaBot v0.6 (NEOVĚŘENO na DFE)** | `NabidkaBot_v06_Ulozit_vypis.py`, `auftragy_z_excelu.py`, `testy/test_bot_v06.py` |

Pracovní větev ve všech třech repech: `claude/jolly-babbage-7oh27u`. Po squash-merge vždy `git fetch origin main && git checkout -B claude/jolly-babbage-7oh27u origin/main && git push --force-with-lease -u origin claude/jolly-babbage-7oh27u` (stop hook jinak hlásí „unpushed commits“). U mělkého klonu Robot-DFE: `git remote set-branches --add origin <větev>`.

## Co zbývá (v tomto pořadí)
1. **Zítra (24. 11.) v práci s DFE:** otestovat bota v0.6 s DVĚMA Auftragy v `auftragy.txt`: `07-576-43006` (zákaznický, ze snímku karty → má se přeskočit) a `06-576-43037` (volný → uloží `vypisy\vypis_<Auftrag>.rtf`). Pak `.rtf` načíst v Offer Studiu (Akční vozy → Výpisy z robota). Čekám od uživatele: obsah `NabidkaBot_v06_log.txt`, snímek hlášky „vozidlo není dostupné“ i s tlačítky. Neověřené předpoklady bota: pole „Režim“/„Zákazník“, tlačítko „Storno“, text hlášky, zavření Cenové nabídky.
2. **Black Friday (víkend 28.–29. 11.):** knihovna akčních vozů musí být naplněná (40 vozů S.&W. z Excelu + výpisy). Ještě NEVIDĚNO: skutečný výpis GO z robota (testy mají DFE text a RTF z něj). Ověřit, že „marže dealera“ z Excelu = nákupní marže (zisk v kalkulaci musí sedět). Dostupnost vozu ověřuje uživatel sám, není to sklad.
3. **Ověřit u uživatele:** (a) je na Offer Studiu v1.9.1 (balíček poslán, potvrzení chybí); (b) Poptávky v1.45 – v řádku stálá adresa, staré oblíbené smazat a uložit znovu; (c) pravidla DB s `onedrive_ucet` nasazená v konzoli Firebase a odkaz „Otevřít PDF (OneDrive)“ na mobilu funguje po znovuvytvoření PDF (např. Ivan Holovko); (d) zrušil veřejný odkaz „Kdokoli“ na OneDrive složku Poptávky (dvakrát upozorněn).
4. **Kolega ještě není zapojený:** potřebuje ručně `aktualizace.py` + `AKTUALIZOVAT.bat` do své složky Offer Studia (na místním disku, ne v OneDrive); sdílená složka s balíčkem jen ke čtení.
5. **Nezodpovězeno:** popisky modelu v e-mailu (`email_sablony.py`, `POPIS`/`VYHODY`): jsou jen pro A, B, C, E, S, CLA, GLA, GLB, GLC, GLE, GLS; chybí AMG (předpona „Mercedes-AMG“), Maybach, G, EQ, V, CLE, GT; v odpovědi ve vlákně se nepíšou záměrně. Čekám, u jakého modelu a kdy chyběly.
6. Dlouhodobé: provize podle modelu (čeká na seznam modelů), příjem poptávek e-mailem (čeká na IT), pravidelná záloha Firebase (dělá uživatel), robot má jednou umět celou dávku bez zásahu.

## Jak se pracuje (důležité, ať se neopakují chyby)
- **Merge do `main` jen po výslovném „sluč“.** Jednou systém sloučení zamítl, protože jsem ho odvodil z náznaku. Vždy PR (šablona v repech není), `squash`, pak srovnat větev.
- **Balíček pro uživatele/kolegy** (kvůli „slepici a vejci“): v sandboxu `git archive HEAD | tar -x -C <tmp>/src`, v něm `python3 aktualizace.py balicek <tmp>/share`, pak `SendUserFile` na `OfferStudio_vX.Y.Z.zip` + `verze.txt`. Uživatel je dá do OneDrive složky `OfferStudio_aktualizace` (starý ZIP a `verze.txt` smazat), zavře Offer Studio a **přetáhne celou složku (ne ZIP) myší na `AKTUALIZOVAT.bat`**. NIKDY před tím nespouštět `VYTVORIT_BALICEK.bat` (přepíše `verze.txt` starou verzí). Opakované chyby uživatele: zadání cesty k ZIPu místo složky, webový odkaz místo místní cesty ve „Složce zákazníků“.
- **Data:** 2026-11-06 se přepsáním celé složky ztratila DB nabídek. Aktualizovat jen soubory programu, nikdy celou složku; od v1.8.12 se DB zálohuje do `Dokumenty\OfferStudio_zaloha`.
- **Citlivá data:** snímek karty vozidla obsahoval jméno a adresu zákazníka; nikam neukládat ani neopakovat (bot v0.6 loguje jen „zákaznický“). Nákupní marže/zisk nikdy do PDF ani e-mailu zákazníka.
- **Poptávky – nová verze:** `git mv poptavky_vA.B.html poptavky_vA.(B+1).html`, přepsat `<title>`, hlavičku, komentář, `const VERZE = [1, N]`, `AKTUALNI` (a podle potřeby `MINIMALNI`) v `poptavky.html`, `sed` na `testy/*.js` (výchozí soubor), pustit `node testy/test_verze.js` a ostatní node testy (zalozky, karty, panel, sipky, pracovni_dny, onedrive, stabilni_adresa); testy pravidel: `cd firebase && npm install && env -u HTTPS_PROXY -u https_proxy -u JAVA_TOOL_OPTIONS npx firebase emulators:exec --only database --project demo-poptavky "node --test rules.test.mjs"` (po `npm install` vrátit `package-lock.json`). Po sloučení říct, že Pages potřebují pár minut.
- **Offer Studio testy:** `python3 testy/test_offerstudio.py` (139), a s `PYTHONPATH=.`: `test_akcni.py` (15), `test_aktualizace.py` (21), `test_onedrive.py` (15), `test_zaloha.py`, `test_suw_gallery.py`; `node testy/test_akcni_prohlizec.js` (opravdový prohlížeč). Pasti: JS v f-stringech má zdvojené `{{ }}` a `\\n`; před `(function(){…})()` musí být `;`; `node --check` nezachytí chybějící středník – proto prohlížečový test.
- **Prostředí uživatele:** firemní OneDrive, Složka zákazníků = `C:\Users\spavlacek\OneDrive - S. & W. Automobily s.r.o\Poptávky`; OneDrive účet `spavlacek@suw.cz`, do Poptávek se přihlašuje `stanislav.pavlacek@suw.cz` (proto pole `onedrive_ucet`). Offer Studio běží lokálně na portu 8774, program a `data` na místním disku, ne v OneDrive.

## Kde je dokumentace
`CLAUDE.md` (Popt-vky) body 9–15, `docs/nabidky_a_vuz.md`, `docs/zarizeni_a_kontakty.md`, `docs/testy.md`; v Offer Studiu `README_V1_8_x.txt`, `README_V1_9_0.txt`, `README_V1_9_1.txt`; v Robot-DFE `README.md`.
