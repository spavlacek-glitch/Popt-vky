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
if (chyb) { console.log('selhalo: ' + chyb); process.exit(1); }
console.log('vše v pořádku');
