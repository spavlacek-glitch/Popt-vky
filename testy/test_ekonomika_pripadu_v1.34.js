// test_ekonomika_pripadu_v1.34.js – „Ekonomika případu“ (návrh A) a posuvník „Co když ustoupím?“ v detailu na PC (v1.34) a jejich absence na iPhonu, bez Firebase (SDK = atrapa).
//   SOUBOR=poptavky_v1.34.html node testy/test_ekonomika_pripadu_v1.34.js   (SCREEN_DIR=… pro snímek)
const {chromium,devices}=require('playwright');const path=require('path');
const SOUBOR=process.env.SOUBOR||'poptavky_v1.34.html',OUT=process.env.SCREEN_DIR;
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis);if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
const NAB={model:'GLS 450 d 4MATIC',cena_sdph:3064977,cena_vuz_sdph:3064977,sleva_sdph:230697,sleva_pct:7,soubor:'x.pdf',t:5000,kdo:'a@b.cz',zdroj:'offerstudio',
  interni:{zisk:300000,skutecny_zisk:282000,korekce:18000,obchodni_marze:9.1,skutecna_marze:9.1,nestandardni:false,negativni:false}};
(async()=>{
 const b=await chromium.launch();
 for(const [nazev,opts] of [['PC 1440',{viewport:{width:1440,height:1000}}],['iPhone 13',{...devices['iPhone 13']}]]){
  console.log(nazev);const ctx=await b.newContext(opts);
  await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'..',SOUBOR));
  await p.evaluate(n=>{user={email:'a@b.cz'};jeVedouci=false;
    const P=(j,nab)=>({jmeno:j,telefon:'777123456',kanal:'telefon',zajem:'GLS',stav:'nabidka',dalsiKontakt:'2026-11-04',prodejce:'a@b.cz',vytvoreno:1000,historie:{},...(nab?{nabidky:{k1:nab}}:{})});
    data={a:P('Tomáš Kozák',n),b:P('Bez Nabídky',null)};
    document.querySelector('#login').classList.add('hidden');document.querySelector('#app').classList.remove('hidden');renderHome();renderDetail('a');},NAB);
  const mobil=nazev.startsWith('iPhone');
  if(mobil){K('na iPhonu posuvník není (zisk nikdy na mobilu)',await p.locator('#sim-posuvnik').count()===0);K('bez chyb',errs.length===0);await ctx.close();continue;}
  K('blok Ekonomika případu: vlevo „Zákazník platí“, vpravo „Tobě zůstane“',await p.evaluate(()=>{const b=[...document.querySelectorAll('.ekop > .box h3')].map(h=>h.textContent);return b.some(x=>x.includes('Zákazník platí'))&&b.some(x=>x.includes('Tobě zůstane'));}));
  K('zisk je ve výchozím stavu schovaný, nákupní cena nikde',await p.evaluate(()=>{const t=document.querySelector('.ekop').innerText.replace(/\u00a0/g,' ');return t.includes('••• Kč')&&!t.includes('Nákupní cena')&&!t.includes('282 000');}));
  K('starý řádek „Nabídky“ v boxu Poptávka už není',await p.evaluate(()=>!document.querySelector('.nabidky')));
  K('odkazy: PDF a Offer Studio u nabídky',await p.evaluate(()=>{const a=[...document.querySelectorAll('.eko-sou a')].map(x=>x.href);return a.length===2&&a[0].includes('/pdf')&&a[1].includes('/draft/');}));
  const vyst=()=>p.locator('.sim').innerText().then(x=>x.replace(/\u00a0/g,' '));
  const nastav=async v=>p.evaluate(x=>{const e=document.getElementById('sim-posuvnik');e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));},v);
  K('posuvník je v detailu',await p.locator('#sim-posuvnik').count()===1);
  K('bez ústupku: cena z nabídky, žádné 🏆',(await vyst()).includes('3 064 977')&&!(await vyst()).includes('vyhrál'));
  await nastav(10000);
  let t=await vyst();
  K('ústupek 10 000: cena 3 054 977 Kč',t.replace(/\s/g,' ').includes('3 054 977'));
  K('ukáže 🏆 a ekvivalent (víkend na horách)',t.includes('vyhrál')&&t.includes('víkend na horách'));
  K('zisk je schovaný („•••“)',t.includes('•••')&&!t.includes('273 736'));
  K('hodnota u posuvníku: + 10 000 Kč',(await p.locator('#sim-hodnota').innerText()).replace(/\u00a0/g,' ').includes('10 000'));
  await p.locator('.ekop .skryte').click();
  K('po odkrytí ústupek zůstal, skutečný zisk = 282 000 − 10 000/1,21 = 273 736 Kč',(await p.locator('#sim-posuvnik').inputValue())==='10000'&&(await vyst()).replace(/\s/g,' ').includes('273 736'));
  K('odkryto: nákupní cena 3 064 977/1,21 − 300 000 = 2 233 000 Kč, korekce − 18 000 Kč, skutečný zisk 282 000 Kč',await p.evaluate(()=>{const t=document.querySelector('.ekop').innerText.replace(/\u00a0/g,' ');return t.includes('2 233 ')&&t.includes('− 18 000 Kč')&&t.includes('282 000 Kč');}));
  K('marže se snížila (9,1 % → 8,8 %)',(await vyst()).includes('8,8 %'));
  K('zatím bez varování',!(await vyst()).includes('⚠'));
  await nastav(20000);t=await vyst();
  K('20 000: týden u moře',t.includes('týden u moře'));
  await nastav(100000);t=await vyst();
  K('100 000: celé rodiny dovolená, cena 2 964 977 Kč',t.includes('dovolená pro celou rodinu')&&t.replace(/\s/g,' ').includes('2 964 977'));
  K('rozsah posuvníku 0–100 000 po 10 000',await p.evaluate(()=>{const e=document.getElementById('sim-posuvnik');return e.max==='100000'&&e.step==='10000';}));
  await p.evaluate(()=>{data.a.nabidky.k1.interni.skutecny_zisk=data.a.nabidky.k1.interni.zisk=10000;renderDetail('a');});
  await nastav(20000);
  K('zisk pod nulou → ⚠ pod nákupní cenou',(await vyst()).includes('Pod nákupní cenou'));
  await p.evaluate(()=>{data.a.nabidky.k1.interni.nestandardni=true;data.a.nabidky.k1.interni.zisk=data.a.nabidky.k1.interni.skutecny_zisk=300000;renderDetail('a');});
  await nastav(10000);
  K('příznak nestandardní z Offer Studia → ⚠ nízká marže',(await vyst()).includes('už v nabídce nízká'));
  await p.evaluate(()=>{renderDetail('b');});
  K('poptávka bez nabídky: posuvník není',await p.locator('#sim-posuvnik').count()===0);
  await p.evaluate(()=>{renderDetail('a');});
  K('po přepnutí na jinou poptávku se ústupek nuluje',(await p.locator('#sim-posuvnik').inputValue())==='0');
  if(OUT){await nastav(30000);await p.locator('.sim').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(OUT,'posuvnik.png')});}
  K('bez chyb ve stránce',errs.length===0);if(errs.length)console.log(errs);
  await ctx.close();
 }
 await b.close();console.log(selhani?'SELHÁNÍ '+selhani:'vše v pořádku');process.exit(selhani?1:0);
})();
