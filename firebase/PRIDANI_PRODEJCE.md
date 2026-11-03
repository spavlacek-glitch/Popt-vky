# Přidání prodejce (návod pro správce, v1.24)

Platí pro Miroslava Sýkoru, Martina Esterku a každého dalšího prodejce. Vše se dělá **ručně v konzoli Firebase** (projekt Poptávek), z aplikace se účty zakládat nedají.

## Co platí od v1.24 (rozhodnutí uživatele 2026-11-03: „každý jen své“)
- **Prodejce** vidí, zakládá a mění **jen své poptávky** (pole `prodejce` = jeho e-mail) včetně nabídek, zisku a dohod u nich. Cizí poptávku nepřečte ani nezmění, ani přímým dotazem do databáze.
- **Vedoucí** (`vedouci: true`) vidí a mění všechny poptávky, zadává dohody a potvrzuje je (Porada). Prodejce u dohody jen klepne „Hotovo“ (pravidla to vynucují, nejde přepsat text, termín ani stav „potvrzena“).
- **Zákazníci (`/zakaznici`) zůstávají společní:** jména, telefony a e-maily zákazníků uvidí každý prodejce. Je to proto, aby appka poznala známého zákazníka a nevznikaly duplicity. Chcete-li i to omezit, je to další rozhodnutí a další úprava.
- **Poptávka bez pole `prodejce`** (z úplně prvních verzí) uvidí jen vedoucí. Předání poptávky jinému prodejci: v konzoli změnit pole `prodejce` na jeho e-mail (jen správce, z appky to nejde).

## Postup (v tomto pořadí)
1. **Záloha.** Firebase → Realtime Database → Data → ⋮ (vpravo nahoře) → **Exportovat JSON**. Uložit mimo repo (jsou tam osobní údaje zákazníků). Na PC zkopírovat složku `data` Offer Studia.
2. **Sloučit pull requesty** (Poptávky v1.24, Offer Studio v1.8.2) a počkat několik minut na raw.githack.com. Rychlá kontrola: `…/main/poptavky_v1.24.html` se otevře a v záhlaví je „v1.24“.
3. **Nasadit nová pravidla:** Realtime Database → **Pravidla** → vložit celý obsah `firebase/database.rules.json` → **Publikovat**.
   - Starou verzi pravidel máte v `firebase/database.rules.pred-vice-prodejci.json`. Kdyby se cokoli pokazilo, vložte ji zpět a publikujte.
   - Pravidla obsahují `.indexOn: ["prodejce"]`, bez něj by prodejcům nešlo načíst poptávky.
4. **Vyzkoušet sám** (jste vedoucí): přihlásit se, vidíte všechny poptávky a „Poradu“, zapsat poznámku, změnit stav. Offer Studio: Nastavení → Poptávky → „Vyzkoušet spojení“ (ukáže „tvých poptávek: N“).
5. **Založit účty kolegů** (pro každého zvlášť):
   1. Authentication → Users → **Add user**: jeho firemní e-mail a heslo. Heslo mu předejte bezpečně (ne e-mailem s e-mailem). Pozdější změna: Authentication → Users → ⋮ → Reset password (pošle e-mail).
   2. U nového účtu **zkopírovat UID**.
   3. Realtime Database → Data → `uzivatele` → **+** u `uzivatele` → klíč = UID, pod ním dvě hodnoty: `schvalen` = `true` (boolean, ne text) a `email` = jeho e-mail. **Nepřidávat `vedouci`.**
6. **Kolega:** otevře `…/main/poptavky.html`, přihlásí se, na iPhonu přidá ikonu na plochu (Sdílet → Přidat na plochu). Prvních pár poptávek zapíše, ať je vidět, že se mu objeví jen jeho.
7. **Offer Studio kolegy** (každý má své na svém PC): nahrát soubory z repa, `START.bat`, v Nastavení vyplnit prodejce (jméno, telefon, e-mail), složku zákazníků a **Poptávky → přihlásit jeho účtem**. Offer Studio zapisuje jen k jeho poptávkám.

## Kontrola, že pravidla fungují
- Kolega po přihlášení nevidí poptávky nikoho jiného (ani vaše).
- Vy vidíte všechny a v Poradě se objeví karty prodejců, jakmile mají otevřené obchody.
- Kolega nevidí tlačítko „Porada“.
- Testy pravidel: `cd firebase && npm test` (133 testů, lokální emulátor, žádná produkční data).
