// test_karty_v1.38.js – karta Poptávek se jmenuje „poptavky“ a odkazy do Offer Studia přepínají do pojmenované karty (bez Firebase).
//   node testy/test_karty_v1.38.js
const {chromium}=require('playwright');const path=require('path'),{spawn}=require('child_process');
const PORT=18088,H='http://127.0.0.1:'+PORT+'/';const srv=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:path.join(__dirname,'..'),stdio:'ignore'});
let s=0;const K=(p,ok)=>{console.log(ok?'  ✔':'  ✖',p);if(!ok)s++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
(async()=>{
 const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1440,height:1000}});
 await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
 await ctx.route('http://127.0.0.1:8774/**',r=>r.fulfill({body:'<title>OS</title>Offer Studio',contentType:'text/html'}));
 const A=await ctx.newPage();await new Promise(r=>setTimeout(r,900));await A.goto(H+'poptavky_v1.42.html');
 K('karta Poptávek se jmenuje „poptavky“',await A.evaluate(()=>window.name)==='poptavky');
 await A.evaluate(()=>{user={email:'a@b.cz'};jeVedouci=false;data={a:{jmeno:'Anna',telefon:'777123456',kanal:'telefon',zajem:'GLS',stav:'nova',dalsiKontakt:'2026-11-05',prodejce:'a@b.cz',vytvoreno:1000}};
  document.querySelector('#login').classList.add('hidden');document.querySelector('#app').classList.remove('hidden');renderDetail('a');});
 const tl=A.locator('a.os-hlavni');K('„Udělat nabídku“ je a volá otevriOS',await tl.count()===1&&(await tl.getAttribute('onclick')).includes('otevriOS'));
 // první klepnutí otevře kartu Offer Studia
 const [B]=await Promise.all([ctx.waitForEvent('page'),tl.click()]);await B.waitForLoadState();
 K('otevře se karta Offer Studia (127.0.0.1:8774/nova…)',B.url().startsWith('http://127.0.0.1:8774/nova'));
 // druhé klepnutí nesmí otevřít další kartu
 const pred=ctx.pages().length;await tl.click();await A.waitForTimeout(700);
 K('druhé klepnutí použije stejnou kartu Offer Studia (počet karet se nezměnil)',ctx.pages().length===pred);
 await A.evaluate(()=>{data.a.nabidky={k1:{model:'GLS',cena_sdph:1000000,cena_vuz_sdph:1000000,sleva_sdph:0,sleva_pct:0,soubor:'x.pdf',t:5000,kdo:'a@b.cz',zdroj:'offerstudio'}};renderDetail('a');});
 K('„➕ Nabídka na jiné auto“ má v odkazu nova=1 (nová nabídka, ne stávající)',(await A.locator('.os-jine a').getAttribute('href')).includes('&nova=1')&&(await A.locator('.os-jine a').getAttribute('href')).includes('poptavka=a'));
 // z karty Offer Studia „zpět do Poptávek“ přes window.open(…,'poptavky') se vrátí do původní karty
 const pred2=ctx.pages().length;await A.evaluate(()=>{window.__znacka=1;});
 await B.evaluate(u=>{window.open(u,'poptavky');},H+'poptavky.html#poptavka=a');
 await A.waitForTimeout(1800);
 K('„Zpět do Poptávek“ nevytvoří novou kartu',ctx.pages().length===pred2);
 K('původní karta Poptávek se znovu načetla (kartu použil odkaz, ne nová)',await A.evaluate(()=>window.__znacka===undefined)&&A.url().includes('poptavky_v1.42.html'));
 await b.close();srv.kill();console.log(s?'SELHÁNÍ '+s:'vše v pořádku');process.exit(s?1:0);
})();
