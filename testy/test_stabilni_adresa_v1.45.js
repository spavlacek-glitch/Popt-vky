// test_stabilni_adresa_v1.45.js – adresa v řádku prohlížeče je stálá (poptavky.html), ne číslo verze; staré záložky na číslovanou verzi se přepnou samy;
// chybějící číslovaná verze se přesměruje přes 404.html (jako na GitHub Pages). Lokální HTTP server napodobuje Pages. Firebase SDK = atrapa.
//   node testy/test_stabilni_adresa_v1.45.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis);if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
const TYPY={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript'};
const srv=http.createServer((rq,rs)=>{
  const p=decodeURIComponent(rq.url.split('?')[0].replace(/^\/Popt-vky/,'')).replace(/^\/+/,'')||'index.html',f=path.join(ROOT,p);
  if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){rs.writeHead(200,{'Content-Type':TYPY[path.extname(f)]||'text/plain'});return rs.end(fs.readFileSync(f));}
  rs.writeHead(404,{'Content-Type':TYPY['.html']});rs.end(fs.readFileSync(path.join(ROOT,'404.html')));   // Pages: 404.html pro každou chybějící adresu
});
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));const B='http://127.0.0.1:'+srv.address().port+'/Popt-vky/';
 const akt=/AKTUALNI\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT,'poptavky.html'),'utf8'))[1];
 const b=await chromium.launch(),ctx=await b.newContext();
 await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
 const nova=async(url)=>{const p=await ctx.newPage();await p.goto(url);await p.waitForTimeout(1200);return p;};
 let p=await nova(B+'poptavky.html#poptavka=abc');
 K('stálá adresa → otevře aktuální verzi a adresa v řádku zůstane stálá (bez čísla verze)',(await p.title()).includes('Poptávky v')&&new URL(p.url()).pathname.endsWith('/Popt-vky/poptavky.html')&&!/_v\d/.test(p.url()));
 K('hash #poptavka se zachová',p.url().endsWith('#poptavka=abc'));
 K('obsah je aktuální verze ('+akt+')',(await p.evaluate(()=>VERZE.join('.')))===akt.match(/_v(\d+\.\d+)/)[1]);
 await p.close();
 p=await nova(B+akt+'#poptavka=xyz');
 K('číslovaná aktuální adresa se v řádku přepíše na stálou, hash zůstane',new URL(p.url()).pathname.endsWith('/Popt-vky/poptavky.html')&&p.url().endsWith('#poptavka=xyz'));
 K('po přepsání adresy appka funguje (bez chyb, hlavička verze)',(await p.innerText('h1')).includes('Poptávky'));
 await p.close();
 p=await nova(B+'poptavky_v1.39.html');
 K('stará záložka na v1.39 se sama přepne na aktuální verzi (MINIMALNI) a adresa je stálá',(await p.evaluate(()=>VERZE.join('.')))===akt.match(/_v(\d+\.\d+)/)[1]&&!/_v\d/.test(p.url()));
 await p.close();
 p=await nova(B+'poptavky_v1.41.html#poptavka=q1');
 K('chybějící číslovaná verze (v1.41) → 404.html → stálá adresa → aktuální verze, hash zůstane',(await p.evaluate(()=>VERZE.join('.')))===akt.match(/_v(\d+\.\d+)/)[1]&&p.url().endsWith('#poptavka=q1')&&!/_v\d/.test(p.url()));
 await p.close();
 p=await nova(B+'neco-jineho.html');
 K('jiná chybějící stránka ukáže 404 s odkazem na poptavky.html (bez přesměrování)',(await p.innerText('body')).includes('nenašel')&&await p.locator('a#dal').count()===1);
 await p.close();
 p=await nova(B+'poptavky_v1.50.html');
 K('i budoucí chybějící verze (v1.50) skončí na stálé adrese',!/_v\d/.test(p.url())&&(await p.title()).includes('Poptávky'));
 await b.close();srv.close();console.log(selhani?'SELHÁNÍ '+selhani:'vše v pořádku');process.exit(selhani?1:0);
})();
