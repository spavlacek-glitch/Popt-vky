// test_verze.js – číslo verze v kódu (`const VERZE`) musí sedět s názvem souboru, jinak lišta „Aktualizovat“ nabízí stále tutéž verzi
// (chyba ve v1.22: VERZE zůstala [1, 21]). Kontroluje i to, že `poptavky.html` ukazuje na existující soubor se správným číslem.
//   node testy/test_verze.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let chyb = 0;
const K = (popis, ok) => { console.log(ok ? '  ✔' : '  ✖', popis); if (!ok) chyb++; };
for (const f of fs.readdirSync(ROOT).filter(n => /^poptavky_v\d+\.\d+\.html$/.test(n))) {
  const [, a, b] = /_v(\d+)\.(\d+)\.html/.exec(f), t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!t.includes('const VERZE')) continue;   // starší verze bez kontroly aktualizací
  K(`${f}: VERZE = [${a}, ${b}]`, new RegExp(`const VERZE = \\[${a}, ${b}\\];`).test(t) && t.includes(`<title>Poptávky v${a}.${b}</title>`));
}
const akt = /AKTUALNI\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'poptavky.html'), 'utf8'))[1];
K(`poptavky.html → ${akt} existuje`, fs.existsSync(path.join(ROOT, akt)));
const nejvyssi = fs.readdirSync(ROOT).filter(n => /^poptavky_v\d+\.\d+\.html$/.test(n)).sort((x, y) => { const p = n => /_v(\d+)\.(\d+)/.exec(n).slice(1).map(Number); const [a1, b1] = p(x), [a2, b2] = p(y); return a1 - a2 || b1 - b2; }).pop();
K(`AKTUALNI je nejnovější verze (${nejvyssi})`, akt === nejvyssi);
// Přesměrování na GitHub Pages (poptavky.html): logika se spustí s předstíraným `location`
const vm = require('vm');
const htmlStab = fs.readFileSync(path.join(ROOT, 'poptavky.html'), 'utf8'), skript = /<script>([\s\S]*?)<\/script>/.exec(htmlStab)[1];
const beh = (hostname, pathname, zapnuto) => {
  let kam = null; const loc = {hostname, pathname, hash: '#poptavka=abc', replace: u => { kam = u; }};
  const kod = skript.replace(/const PRESMEROVAT_NA_PAGES = (true|false);/, `const PRESMEROVAT_NA_PAGES = ${zapnuto};`);
  vm.runInNewContext(kod, {location: loc, document: {addEventListener() {}}}); return kam; };
const A = akt, PG = 'https://spavlacek-glitch.github.io/Popt-vky/';
K('poptavky.html: vypínač přesměrování na Pages je ve výchozím stavu VYPNUTÝ (zapíná se až po ověření Pages)', /const PRESMEROVAT_NA_PAGES = false;/.test(htmlStab));
K('vypnuto: githack /main/ zůstává na githacku (relativně, s #poptavka)', beh('raw.githack.com', '/spavlacek-glitch/Popt-vky/main/poptavky.html', false) === A + '#poptavka=abc');
K('zapnuto: githack /main/ → Pages (s #poptavka)', beh('raw.githack.com', '/spavlacek-glitch/Popt-vky/main/poptavky.html', true) === PG + A + '#poptavka=abc');
K('zapnuto: náhled větve na githacku se nepřesměruje', beh('raw.githack.com', '/spavlacek-glitch/Popt-vky/claude/jina-vetev/poptavky.html', true) === A + '#poptavka=abc');
K('zapnuto: na Pages ani lokálně se nic nepřesměrovává (žádná smyčka)', beh('spavlacek-glitch.github.io', '/Popt-vky/poptavky.html', true) === A + '#poptavka=abc' && beh('127.0.0.1', '/Popt-vky/main/poptavky.html', true) === A + '#poptavka=abc');
K('.nojekyll v kořeni (Pages nespouští Jekyll)', fs.existsSync(path.join(ROOT, '.nojekyll')));
K('index.html v kořeni přesměruje na poptavky.html (kořenová adresa Pages jinak nic nezobrazí)', fs.existsSync(path.join(ROOT, 'index.html')) && /location\.replace\('poptavky\.html'/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
if (chyb) { console.log('selhalo: ' + chyb); process.exit(1); }
console.log('vše v pořádku');
