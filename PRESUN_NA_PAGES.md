# Přesun Poptávek z raw.githack.com na GitHub Pages

**Proč:** raw.githack.com je cizí služba bez záruky a po sloučení zdržuje i 10 minut. GitHub Pages je služba GitHubu, nasazuje obvykle do minuty a postup zůstává stejný: **sloučit pull request a hotovo**, nic se nenasazuje zvlášť.

Nová adresa: `https://spavlacek-glitch.github.io/Popt-vky/poptavky.html`

## Postup (v tomto pořadí)

### 1. Zapnout Pages (2 minuty, jen vy)
Repo Popt-vky → **Settings → Pages** → *Build and deployment*: Source **Deploy from a branch**, Branch **main**, složka **/ (root)** → Save. Za minutu nebo dvě se nahoře objeví zelený pruh s adresou.

### 2. Ověřit na jednom zařízení (stará adresa zatím běží dál)
1. Otevřít `https://spavlacek-glitch.github.io/Popt-vky/poptavky.html`. Měla by se otevřít appka (v záhlaví číslo verze) a jít se přihlásit.
2. **Když přihlášení hlásí `auth/unauthorized-domain`:** Firebase konzole → Authentication → Settings → **Authorized domains** → Add domain `spavlacek-glitch.github.io`.
3. **Když hlásí chybu klíče nebo „referer“:** Google Cloud Console → APIs & Services → Credentials → Browser key → *HTTP referrers* → přidat `https://spavlacek-glitch.github.io/*`. (Pokud tam žádné omezení není, nic se nedělá.)
4. Vyzkoušet: seznam poptávek, detail, zápis poznámky, „📄 Udělat nabídku“ (otevře Offer Studio), „📄 Otevřít PDF“, aktualizační lišta (po další verzi).

### 3. Přepnout ostatní
Až to na jednom zařízení funguje:
- **Každé zařízení potřebuje po přechodu:** znovu se přihlásit, na iPhonu **smazat starou ikonu a přidat novou** z nové adresy (Sdílet → Přidat na plochu), znovu zadat provizi (ukládá se jen v zařízení), filtr prodejce se vrátí na „Moje“.
- **Kontakty uložené v iPhonu** nesou starý odkaz na githack. Starý odkaz dál funguje, dokud neuděláme krok 4. Nové uložení kontaktu už nese novou adresu.

### 4. Přesměrovat starou adresu ✅ zapnuto 2026-11-03 (všichni přepnutí)
V souboru `poptavky.html` přepnout `const PRESMEROVAT_NA_PAGES = false;` na `true` a sloučit. Stará adresa `…raw.githack.com/…/main/poptavky.html` pak přesměruje na Pages (včetně odkazu z kontaktu). Náhledy větví na githacku se nepřesměrovávají.

## Zpět
Kdyby cokoli nešlo: `PRESMEROVAT_NA_PAGES = false` a pokračovat na githacku. Pages se dají kdykoli vypnout (Settings → Pages). Data ve Firebase se přesunem nemění.

## Co je jinak
- **Náhled nesloučené verze z větve už Pages neumí** (jen `main`). Pro náhledy dál slouží adresa větve na raw.githack.com (`…/claude/<větev>/poptavky_vX.Y.html`), ta zůstává.
- **Mezipaměť:** Pages posílá soubory s 10minutovou mezipamětí. Aplikace kontroluje novou verzi sama (bez mezipaměti), takže lišta „Aktualizovat“ naskočí dřív než případná stará stálá adresa.
- **Offer Studio a odkazy `127.0.0.1:8774`** se nemění (jsou na vašem PC).
- Repo je veřejné, takže je veřejný i kód appky. Data zákazníků jsou za přihlášením a pravidly databáze.
