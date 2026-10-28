# Pravidla Realtime Database – návrh v0.1 (2026-10-28)

> **Návrh, zatím NENASAZENÝ.** Produkční pravidla projektu `poptavky-sw` se tímto souborem nemění. Nasazení provádí jen uživatel ručně v konzoli Firebase podle postupu níže.
> Testy běží výhradně proti lokálnímu emulátoru (projekt `demo-poptavky`) s fiktivními daty.

## Soubory
| soubor | co obsahuje |
|---|---|
| `database.rules.json` | navrhovaná pravidla: schválené účty, `/poptavky` beze změny tvaru, `/zakaznici` jen s povolenými poli |
| `database.rules.produkce-v1.json` | současná pravidla podle `CLAUDE.md`, jen pro srovnávací testy |
| `rules.test.mjs` | 62 testů pravidel (Node test runner + `@firebase/rules-unit-testing`) |
| `firebase.json` | nastavení emulátoru (port 9000) |

## Co pravidla dělají
- **Schválené účty:** přístup má jen účet, který má v databázi `/uzivatele/{UID}/schvalen = true`.
  - Seznam se upravuje **jen v konzoli Firebase**. Z aplikace se do něj zapsat nedá, a to ani schváleným uživatelem.
  - Každý přihlášený uživatel si smí přečíst jen svůj vlastní záznam.
- **`/poptavky`:** čtení i zápis jen pro schválené účty.
  - Tvar dat se nekontroluje, stejně jako dnes, aby Poptávky v1.0 fungovaly beze změny.
  - Ověřeno testy všech operací, které `poptavky_v1.html` dělá: načtení, založení s historií, úprava, změna stavu, poznámka, smazání.
- **`/zakaznici`:** čtení i zápis jen pro schválené účty a **jen povolená pole**:
  - zákazník: `jmeno`, `prijmeni`, `firma`, `ico`, `telefon`, `email`, `zdroj` (`dfe` | `poptavka`), `vytvoreno`, `upraveno`, `upravil` (musí být UID zapisujícího), `klice/*`, `vozidla/*`
  - vozidlo: `model`, `trida`, `vin`, `auftrag`, `predano` (`YYYY-MM-DD`)
  - **Jakékoli jiné pole se odmítne**, kdekoli v záznamu: marže, poznámky dealera, adresa, DIČ, prodejce, překlepy.
- **Cokoli mimo `/uzivatele`, `/poptavky` a `/zakaznici`** je zakázané, včetně přepsání kořene databáze.

### Poznámky k budoucímu kódu `/zakaznici`
- Klíče v Realtime Database nesmí obsahovat `.` `#` `$` `[` `]` `/`. E-mail ve vyhledávacích klíčích je proto nutné kódovat, např. `.` → `,` (`em:jan,novak@example,cz`).
- Časy `vytvoreno` a `upraveno` zapisovat jako `ServerValue.TIMESTAMP`. Čas z hodin zařízení, který je napřed, pravidla odmítnou.
- `adresa` a `prodejce` jsou zatím zakázané. Povolit je lze až po rozhodnutí (`POSOUZENI_Fencloteka.md`, otevřené body).

## Spuštění testů
Na PC s Node.js 20+ a Javou 11+:
```bash
cd firebase
npm install
npm test
```
`npm test` spustí emulátor, testy a emulátor zase vypne. Při prvním spuštění si stáhne emulátor (asi 30 MB).

## Výsledek testů (2026-10-28)
**62 / 62 prošlo** (emulátor databáze v4.11.2).

| skupina | testů | výsledek |
|---|---|---|
| nepřihlášený uživatel: nečte ani nezapisuje nic | 6 | ✔ |
| přihlášený, ale neschválený (bez záznamu i se `schvalen: false`): nečte ani nezapisuje, nemůže se sám schválit | 13 | ✔ |
| schválený: všechny operace Poptávek v1.0 fungují, mimo povolené cesty nezapíše nic | 11 | ✔ |
| schválený: platný zákazník a vozidlo se zapíší | 5 | ✔ |
| schválený: marže, poznámky dealera, adresa, DIČ, prodejce a neplatné hodnoty se odmítnou | 23 | ✔ |
| současná pravidla v1.0 pro srovnání: potvrzené slabiny | 4 | ✔ |

**Kontrola testů:** po odebrání seznamu povolených polí z pravidel selhalo přesně 11 testů zakázaných polí. Testy tedy chybu skutečně zachytí.

## Zjištění o současném stavu
- `poptavky_v1.html` používá jen přihlášení e-mailem a heslem a jen cestu `/poptavky`. **Pro nová pravidla se nemusí měnit.**
- Současná pravidla (`auth != null`):
  - pustí ke všem poptávkám **jakýkoli účet** v projektu,
  - dovolí zapsat **libovolná pole**.

  Obojí potvrzeno testem.
- Pokud je ve Firebase Auth zapnutá samoregistrace (výchozí stav), může si účet založit kdokoli, kdo zná veřejný `apiKey` z `poptavky_v1.html`. Se současnými pravidly by pak četl všechny poptávky.
- Skutečný stav produkčních pravidel a nastavení Auth nebylo z tohoto prostředí možné ověřit, protože síť k Firebase je blokovaná. **Je nutné ho zkontrolovat v konzoli** (krok 1 níže).

## Postup bezpečného nasazení (ručně v konzoli Firebase, projekt `poptavky-sw`)
Nic z toho není provedeno. Každý krok je samostatné rozhodnutí.

1. **Záloha a kontrola současného stavu**
   - Realtime Database → Rules: zkopíruj současná pravidla do souboru (záloha) a porovnej je s `database.rules.produkce-v1.json`.
   - Authentication → Users: zkontroluj, že tam jsou jen známé účty. Neznámé smaž.
2. **Vypnutí samoregistrace**
   - Authentication → Settings → User actions → zruš „Enable create (sign-up)“ (a „Enable delete“).
   - Ověř, že je zapnutá „Email enumeration protection“.
   - Přihlašování existujících účtů se tím nemění.
3. **Seznam schválených účtů: PŘED změnou pravidel**
   - Authentication → Users: zkopíruj **User UID** svého účtu.
   - Realtime Database → Data: přidej `uzivatele` → `{UID}` → `schvalen: true` (boolean, ne text) a `email: "…"` (jen pro orientaci).
   - Pokud by se pravidla nasadila bez tohoto kroku, Poptávky ti přestanou načítat data. Nic se neztratí, jen se ti nezobrazí, dokud krok nedoplníš.
4. **Test v simulátoru konzole**
   - Realtime Database → Rules: vlož obsah `database.rules.json`, **zatím nepublikuj** a otevři „Rules Playground“.
     - čtení `/poptavky`, Authenticated, provider Password, UID = tvoje UID → **povoleno**
     - totéž s vymyšleným UID → **zamítnuto**
     - Unauthenticated → **zamítnuto**
5. **Publikování**
   - Klikni na „Publish“. Změna platí během několika sekund.
6. **Ověření v provozu**
   - Na PC i na iPhonu otevři Poptávky v1.0: přihlášení, seznam, „Dnes zavolat“.
   - Založ zkušební poptávku, změň jí stav, zapiš poznámku a smaž ji.
7. **Návrat zpět**
   - Kdyby cokoli nefungovalo, vlož do Rules zálohu z kroku 1 a klikni na „Publish“. Stav se vrátí během sekund a data zůstanou nedotčená.

Až budou pravidla v provozu, je potřeba upravit sekci „Pravidla DB“ v `CLAUDE.md`, ale jen na pokyn uživatele.
