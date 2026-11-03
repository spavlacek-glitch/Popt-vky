// test_posuvnik_v1.33.js – posuvník „Co když ustoupím?“ v detailu na PC (v1.33) a jeho absence na iPhonu, bez Firebase (SDK = atrapa).
//   SOUBOR=poptavky_v1.33.html node testy/test_posuvnik_v1.33.js   (SCREEN_DIR=… pro snímek)
const {chromium,devices}=require('playwright');const path=require('path');
const SOUBOR=process.env.SOUBOR||'poptavky_v1.33.html',OUT=process.env.SCREEN_DIR;
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis);if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
const NAB={model:'GLS 450 d 4MATIC',cena_sdph:3064977,cena_vuz_sdph:3064977,sleva_sdph:230697,sleva_pct:7,soubor:'x.pdf',t:5000,kdo:'a@b.cz',zdroj:'offerstudio',
  interni:{zisk:300000,skutecny_zisk:300000,obchodni_marze:9.1,skutecna_marze:9.1,korekce:[],nestandardni:false,negativni:false}};
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
  const vyst=()=>p.locator('#sim-vystup').innerText().then(x=>x.replace(/\u00a0/g,' '));
  const nastav=async v=>p.evaluate(x=>{const e=document.getElementById('sim-posuvnik');e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));},v);
  K('posuvník je v detailu',await p.locator('#sim-posuvnik').count()===1);
  K('bez ústupku: cena z nabídky, žádné 🏆',(await vyst()).includes('3 064 977')&&!(await vyst()).includes('vyhrál'));
  await nastav(5000);
  let t=await vyst();
  K('ústupek 5 000: cena 3 059 977 Kč',t.replace(/\s/g,' ').includes('3 059 977'));
  K('ukáže 🏆 a ekvivalent (2× plná nádrž)',t.includes('vyhrál')&&t.includes('2× plná nádrž'));
  K('zisk je schovaný („•••“)',t.includes('•••')&&!t.includes('295 868'));
  K('hodnota u posuvníku: + 5 000 Kč',(await p.locator('#sim-hodnota').innerText()).replace(/\u00a0/g,' ').includes('5 000'));
  await p.locator('#sim-vystup .sim-skryte').click();
  K('po odkrytí ústupek zůstal, zisk = 300 000 − 5 000/1,21 = 295 868 Kč',(await p.locator('#sim-posuvnik').inputValue())==='5000'&&(await vyst()).replace(/\s/g,' ').includes('295 868'));
  K('marže se snížila (9,1 % → 8,9 %)',(await vyst()).includes('8,9 %'));
  K('zatím bez varování',!(await vyst()).includes('⚠'));
  await nastav(20000);t=await vyst();
  K('20 000: týden u moře',t.includes('týden u moře'));
  await p.evaluate(()=>{data.a.nabidky.k1.interni.skutecny_zisk=data.a.nabidky.k1.interni.zisk=10000;renderDetail('a');});
  await nastav(20000);
  K('zisk pod nulou → ⚠ pod nákupní cenou',(await vyst()).includes('Pod nákupní cenou'));
  await p.evaluate(()=>{data.a.nabidky.k1.interni.nestandardni=true;data.a.nabidky.k1.interni.zisk=data.a.nabidky.k1.interni.skutecny_zisk=300000;renderDetail('a');});
  await nastav(1000);
  K('příznak nestandardní z Offer Studia → ⚠ nízká marže',(await vyst()).includes('už v nabídce nízká'));
  await p.evaluate(()=>{renderDetail('b');});
  K('poptávka bez nabídky: posuvník není',await p.locator('#sim-posuvnik').count()===0);
  await p.evaluate(()=>{renderDetail('a');});
  K('po přepnutí na jinou poptávku se ústupek nuluje',(await p.locator('#sim-posuvnik').inputValue())==='0');
  if(OUT){await nastav(5000);await p.locator('.sim').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(OUT,'posuvnik.png')});}
  K('bez chyb ve stránce',errs.length===0);if(errs.length)console.log(errs);
  await ctx.close();
 }
 await b.close();console.log(selhani?'SELHÁNÍ '+selhani:'vše v pořádku');process.exit(selhani?1:0);
})();
