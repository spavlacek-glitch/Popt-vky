# Experiment: Uložit zákazníka do kontaktů iPhonu (v0.1), 2026-10-28

> Samostatný prototyp s **jedním smyšleným zákazníkem**. Žádná Firebase, žádná síť, žádná skutečná data. Produkční Poptávky se nemění.

## Co dělá
Stránka `kontakt_v0.1.html` ukáže smyšleného zákazníka a po klepnutí na **„Uložit do kontaktů“** vytvoří soubor `Jan_Testovaci.vcf` (vCard 3.0, UTF-8):

| pole | hodnota |
|---|---|
| jméno | Jan Testovací (`N:Testovací;Jan;;;`, `FN:Jan Testovací`) |
| telefon | +420 777 123 456 (mobil) |
| e-mail | jan@example.com |
| poznámka | Shání Mercedes-Benz GLE, rozpočet do 2 mil. Kč, chce leasing. |

Které řešení na iPhonu funguje, se ověřuje třemi cestami:
1. **Uložit do kontaktů:** stažení souboru `.vcf` vytvořeného přímo ve stránce. Tohle je hlavní cesta.
2. **Sdílet kartu kontaktu…:** nabídka Sdílet se souborem `.vcf`. iOS Safari ji umí od verze 15.
3. **Otevřít hotový soubor .vcf:** odkaz na `Jan_Testovaci.vcf` uložený v repu. Je bajt po bajtu stejný jako soubor ze stránky.

## Výsledek automatického testu: 21 / 21 (Chromium, ical.js)
- **Formát vCard 3.0:**
  - řádky končí CRLF,
  - žádný řádek nemá víc než 75 bajtů,
  - dlouhé řádky se zalamují, ale nikdy uprostřed českého znaku.
- **Nezávislé čtení knihovnou ical.js:** jméno, telefon, e-mail i poznámka s diakritikou a čárkami odpovídají zadání.
- **Hraniční údaje:**
  - středník, čárka, zpětné lomítko a nový řádek v poznámce projdou beze změny,
  - jména s háčky a pomlčkou jsou v pořádku,
  - telefon `602-111-222` i `00420…` se převede na `+420`.
- **Prohlížeč (PC a rozměr iPhonu):** tlačítko stáhne `Jan_Testovaci.vcf` se stejným obsahem. Stránka nedělá žádné požadavky mimo sebe a nic se neposouvá do stran.
- **Kontrola testu:** když se v kódu dočasně vypne escapování čárek nebo zalamování řádků, test selže.

**Známá odchylka knihovny:** ical.js čte vCard podle novější verze 4.0 a středník v poznámce nedekóduje. Soubor je ve verzi 3.0 a ta escapování `\;` vyžaduje. Středník proto ověřuje vlastní dekodér podle RFC 2426. **Na skutečném iPhonu zatím středník v poznámce neověřen**, testovací zákazník žádný nemá.

**Automaticky neověřitelné:** jak iPhone soubor otevře. To musí vyzkoušet uživatel na telefonu.

## Postup na iPhonu
1. Otevři odkaz na `kontakt_v0.1.html` v Safari.
2. Klepni na **Uložit do kontaktů**.
   - Zobrazí se karta kontaktu: klepni na **Vytvořit nový kontakt**.
   - Zobrazí se dotaz na stažení: stáhni, otevři soubor (Stažené nebo aplikace Soubory) a klepni na **Vytvořit nový kontakt**.
3. V Kontaktech zkontroluj:
   - jméno **Jan Testovací** s háčkem a čárkou,
   - telefon **+420 777 123 456**,
   - e-mail **jan@example.com**,
   - poznámku **Shání Mercedes-Benz GLE, rozpočet do 2 mil. Kč, chce leasing.**
4. Když cesta 1 nefunguje, zkus cesty 2 a 3 pod „Nefunguje? Zkus jinou cestu“.
5. Kontakt pak z iPhonu smaž, je smyšlený.

## Spuštění testu
```bash
ICALJS=/cesta/k/node_modules/ical.js node test_vcard_v0.1.js
```
S parametrem `--zapsat` se znovu vytvoří `Jan_Testovaci.vcf` ze stejné funkce jako stránka.
