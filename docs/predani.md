# Předání – Poptávky / Offer Studio / Robot-DFE (stav k 2026-11-26)

> Dokument pro nové vlákno (Claude). Je to momentka; aktuální pravdu mají `CLAUDE.md` a `docs/`. Při dalším předání ho přepiš.

Uživatel: Stanislav (prodejce + Fleet Manager, S. & W. Automobily). Česky, přímo, krátce. Nejdřív přečti `CLAUDE.md` v repu Popt-vky (body 9–17 dole) a `docs/nabidky_a_vuz.md`, `docs/zarizeni_a_kontakty.md`.

## Repa a stav (úpravy dne 2026-11-26 jsou na větvi `claude/read-claude-predani-docs-qy5g7e` ve všech třech repech a **nejsou ve `main`**; merge až po „sluč“)
| repo | verze | poznámka |
|---|---|---|
| `spavlacek-glitch/Popt-vky` (veřejné, Pages) | **Poptávky v1.45** (beze změny) | jen dokumentace (`CLAUDE.md` 2.49, `docs/`). **Do veřejného repa nepatří marže, ceny ani podklady pro vedení** |
| `spavlacek-glitch/Mercedes-Offer-Studio` (soukromé) | **Offer Studio v1.9.8** | v1.9.2 HTML výpisy, 1.9.3 smazat knihovnu, 1.9.4–1.9.5 import Excelu, 1.9.6 DPH půlhaléř, 1.9.7 odkaz na fotky u vozu, 1.9.8 vlastní fotky ze souborů; `stahnout_fotky.py` (stahovač fotek pro inzerci) |
| `spavlacek-glitch/Robot-DFE` (soukromé) | bot **v0.6.11** (ověřen) + **Burza v0.1** (neověřeno) | přehledné `README.md` s poučením z ladění |

Pozn.: dřívější pracovní větev `claude/jolly-babbage-7oh27u` už není potřeba. Starší verze bota jsou v gitu.

## Co zbývá (v tomto pořadí)
1. **Black Friday (28.–29. 11.):** knihovna je naplněná; ověřit, že **marže dealera = nákupní marže** (zisk v kalkulaci sedí na jednom vozu), dostupnost vozu prodejce ověřuje sám. Po akci **vrátit v Excelu sloupce** (akční sloupec přejmenovaný na „Marže dealera“ by dál dával jiný zisk).
2. **Burza (Nabízená vozidla):** otestovat `NabidkaBot_Burza_v01` s 1–2 vozy, poslat log. Několik vozů zatím nemá výpis.
3. **Edice 140 let:** čeká na rozhodnutí vedení. **Neprogramovat**, dokud vedení nerozhodne a nepotvrdí, že ceny odpovídají ceníku (viz `docs/nabidky_a_vuz.md`).
4. **Ověřit u uživatele:** (a) nasazené v1.9.8 včetně `fotky_soubory.py` a kompaktní tabulky; (b) Poptávky v1.45 (stálá adresa); (c) pravidla DB s `onedrive_ucet` a odkaz na OneDrive na mobilu; (d) zrušený veřejný odkaz „Kdokoli“ na složku Poptávky.
5. **Kolega ještě není zapojený:** ručně `aktualizace.py` + `AKTUALIZOVAT.bat` (a nové soubory Offer Studia: `akcni.py`, `clipboard_go.py`, `fotky_soubory.py`) do jeho složky na místním disku.
6. **Nezodpovězeno:** popisky modelu v e-mailu (`email_sablony.py`, `POPIS`/`VYHODY`): chybí AMG, Maybach, G, EQ, V, CLE, GT.
7. Dlouhodobé: provize podle modelu (čeká na seznam modelů), příjem poptávek e-mailem (čeká na IT), pravidelná záloha Firebase (dělá uživatel), robot bez zásahu a bez myši (dnes při běhu nejde pracovat na PC).

## Jak se pracuje (důležité, ať se neopakují chyby)
- **Merge do `main` jen po výslovném „sluč“.** Jednou systém sloučení zamítl, protože jsem ho odvodil z náznaku. Vždy PR (šablona v repech není), `squash`, pak srovnat větev.
- **Balíček pro uživatele/kolegy** (kvůli „slepici a vejci“): v sandboxu `git archive HEAD | tar -x -C <tmp>/src`, v něm `python3 aktualizace.py balicek <tmp>/share`, pak `SendUserFile` na `OfferStudio_vX.Y.Z.zip` + `verze.txt`. Uživatel je dá do OneDrive složky `OfferStudio_aktualizace` (starý ZIP a `verze.txt` smazat), zavře Offer Studio a **přetáhne celou složku (ne ZIP) myší na `AKTUALIZOVAT.bat`**. NIKDY před tím nespouštět `VYTVORIT_BALICEK.bat` (přepíše `verze.txt` starou verzí). Opakované chyby uživatele: zadání cesty k ZIPu místo složky, webový odkaz místo místní cesty ve „Složce zákazníků“.
- **Data:** 2026-11-06 se přepsáním celé složky ztratila DB nabídek. Aktualizovat jen soubory programu, nikdy celou složku; od v1.8.12 se DB zálohuje do `Dokumenty\OfferStudio_zaloha`.
- **Citlivá data:** snímek karty vozidla obsahoval jméno a adresu zákazníka; nikam neukládat ani neopakovat (bot v0.6 loguje jen „zákaznický“). Nákupní marže/zisk nikdy do PDF ani e-mailu zákazníka.
- **Poptávky – nová verze:** `git mv poptavky_vA.B.html poptavky_vA.(B+1).html`, přepsat `<title>`, hlavičku, komentář, `const VERZE = [1, N]`, `AKTUALNI` (a podle potřeby `MINIMALNI`) v `poptavky.html`, `sed` na `testy/*.js` (výchozí soubor), pustit `node testy/test_verze.js` a ostatní node testy (zalozky, karty, panel, sipky, pracovni_dny, onedrive, stabilni_adresa); testy pravidel: `cd firebase && npm install && env -u HTTPS_PROXY -u https_proxy -u JAVA_TOOL_OPTIONS npx firebase emulators:exec --only database --project demo-poptavky "node --test rules.test.mjs"` (po `npm install` vrátit `package-lock.json`). Po sloučení říct, že Pages potřebují pár minut.
- **Offer Studio testy:** `python3 testy/test_offerstudio.py` (139), a s `PYTHONPATH=.`: `test_akcni.py` (26), `test_dph_zaokrouhleni.py` (2), `test_stahnout_fotky.py` (4), `test_aktualizace.py` (21), `test_onedrive.py` (15), `test_zaloha.py`, `test_suw_gallery.py`; `node testy/test_akcni_prohlizec.js` (opravdový prohlížeč). Pasti: JS v f-stringech má zdvojené `{{ }}` a `\\n`; před `(function(){…})()` musí být `;`; `node --check` nezachytí chybějící středník – proto prohlížečový test.
- **Prostředí uživatele:** firemní OneDrive, Složka zákazníků = `C:\Users\spavlacek\OneDrive - S. & W. Automobily s.r.o\Poptávky`; OneDrive účet `spavlacek@suw.cz`, do Poptávek se přihlašuje `stanislav.pavlacek@suw.cz` (proto pole `onedrive_ucet`). Offer Studio běží lokálně na portu 8774, program a `data` na místním disku, ne v OneDrive.

## Kde je dokumentace
`CLAUDE.md` (Popt-vky) body 9–17, `docs/nabidky_a_vuz.md` (včetně sekce „Black Friday 2026“), `docs/zarizeni_a_kontakty.md`, `docs/testy.md`; v Offer Studiu `README_V1_8_x.txt` až `README_V1_9_8.txt`; v Robot-DFE `README.md`.

## Zásady z ladění 2026-11-26
- U robota nejdřív **průběžný log s časem u každého kroku**; hádání příčiny („visí“) stálo hodiny, jeden log by to rozhodl.
- Test na zjednodušených datech nenahradí **skutečný soubor od uživatele**: HTML výpis, Excel bez sloupce Dealer i haléřové DPH se ukázaly až na jeho datech.
- Soubory pro uživatele se posílají jednotlivě; vždy říct, které přepsat a že složka `data` zůstává.
- Při chybě ve vlastním kódu to říct hned a opravit.
- **Veřejné repo Popt-vky = žádné marže, příplatky ani obchodní podklady** (jsou v soukromých repech nebo jen v chatu). Dnes to zachytil až systém, než se to odeslalo.

