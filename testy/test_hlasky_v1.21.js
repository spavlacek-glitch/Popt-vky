// test_hlasky_v1.21.js – hlášky v „Dnes zavolat“ (v1.21) v LOKÁLNÍCH emulátorech (fiktivní data), nikdy produkce.
//   SOUBOR=poptavky_v1.21.html FIREBASE10=/cesta/k/node_modules/firebase node testy/test_hlasky_v1.21.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), NS = 'demo-poptavky-default-rtdb', EMU = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const FB = process.env.FIREBASE10, SOUBOR = process.env.SOUBOR || 'poptavky_v1.38.html';
const PRAVIDLA = fs.readFileSync(path.join(ROOT, 'firebase', 'database.rules.json'), 'utf8');
let html = fs.readFileSync(path.join(ROOT, SOUBOR), 'utf8');
const a = html.indexOf('const firebaseConfig = {'), b = html.indexOf('};', a) + 2;
html = html.slice(0, a) + `const firebaseConfig = {apiKey:"demo-key", authDomain:"demo-poptavky.firebaseapp.com", databaseURL:"${EMU}?ns=${NS}", projectId:"demo-poptavky"};` + html.slice(b);
const INIT = 'const auth = firebase.auth(), db = firebase.database();';
html = html.replace(INIT, INIT + ` auth.useEmulator('${AUTH}', {disableWarnings:true}); db.useEmulator('127.0.0.1', 9000);`);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'poptavky-hlasky-'));
fs.writeFileSync(path.join(TMP, 'stranka.html'), html);
const admin = (c, method = 'GET', body) => fetch(`${EMU}/${c}.json?ns=${NS}`, {method, headers:{Authorization:'Bearer owner'}, body: body === undefined ? undefined : JSON.stringify(body)}).then(r => r.json());
const JA = 'stanislav.prodejce@suw.example.cz', HESLO = 'heslo123', ted = Date.now();
let ok = 0, celkem = 0;
async function T(popis, fn){ celkem++; try { const r = await fn(); if (r === true) { ok++; console.log('  ✔', popis); } else console.log('  ✖', popis, JSON.stringify(r)); } catch (e) { console.log('  ✖', popis, e.message.split('\n')[0]); } }
(async () => {
  await fetch(`${EMU}/.settings/rules.json?ns=${NS}`, {method:'PUT', headers:{Authorization:'Bearer owner'}, body:PRAVIDLA});
  await fetch(`${AUTH}/emulator/v1/projects/demo-poptavky/accounts`, {method:'DELETE'});
  const u = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email:JA, password:HESLO, returnSecureToken:true})}).then(r => r.json());
  await admin('', 'PUT', {uzivatele:{[u.localId]:{schvalen:true, email:JA}}, poptavky:{x:{kanal:'telefon', jmeno:'Jen Tak', telefon:'777000111', zajem:'x', stav:'nova', dalsiKontakt:'2099-01-01', vytvoreno: ted, upraveno: ted, prodejce: JA}}});
  const br = await chromium.launch(); const ctx = await br.newContext({viewport:{width:1280,height:900}});
  await ctx.route('https://www.gstatic.com/firebasejs/10.12.2/*', r => r.fulfill({path: path.join(FB, path.basename(new URL(r.request().url()).pathname)), contentType:'application/javascript'}));
  const p = await ctx.newPage(); const chyby = []; p.on('pageerror', e => chyby.push(e.message));
  await p.goto('file://' + path.join(TMP, 'stranka.html')); await p.fill('#l-mail', JA); await p.fill('#l-pass', HESLO); await p.click('button:has-text("Přihlásit")');
  await p.waitForSelector('#seznam .card');
  const H = await p.evaluate(() => HECOVANI);
  await T('všech pět skupin hlášek je plných (aspoň 6 vět), bez duplicit', async () => Object.entries(H).every(([k, v]) => v.length >= 6 && new Set(v).size === v.length) || Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.length])));
  await T('věta od uživatele o kafi je mezi hláškami „nikdo nečeká“', async () => H.nula.includes('Kafe je zadarmo, tak pozvi zákazníka na showroom. Je to jediné, co dostane zdarma ☕'));
  await T('žádná hláška nesráží (bez „pozadu“, „poslední“, „selhal“, „lenoch“)', async () => !Object.values(H).flat().some(v => /pozadu|poslední|selhal|lenoch|neschopn/i.test(v)));
  await T('vybraná věta je z dané skupiny, v rámci dne stejná', async () => p.evaluate(() => ['nula','malo','stredne','hodne','prosle'].every(k => HECOVANI[k].includes(vetaDne(k)) && vetaDne(k) === vetaDne(k))));
  await T('na přehledu „Dnes zavolat“ je jedna z vět „nikdo nečeká“ (dnes nikomu volat nemá)', async () => { const t = (await p.locator('.dnes').textContent()).replace(/\s+/g, ' '); return H.nula.some(v => t.includes(v.slice(0, 20))) || t.slice(0, 200); });
  await T('bez chyb ve stránce', async () => chyby.length === 0 || chyby);
  await br.close(); console.log(`\n${ok} / ${celkem}`); process.exit(ok === celkem ? 0 : 1);
})();
