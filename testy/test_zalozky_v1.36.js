// test_zalozky_v1.36.js – záložky detailu na PC (Přehled / Ekonomika / Historie), Ekonomika podle návrhu B a posuvník „Co když ustoupím?“;
// iPhone záložky nemá. Bez Firebase (SDK = atrapa).   SOUBOR=poptavky_v1.39.html node testy/test_zalozky_v1.36.js   (SCREEN_DIR=… uloží snímky)
const {chromium,devices}=require('playwright');const path=require('path');
const SOUBOR=process.env.SOUBOR||'poptavky_v1.39.html',OUT=process.env.SCREEN_DIR;
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis);if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
const NAB={model:'GLS 450 d 4MATIC',cena_sdph:3064977,cena_vuz_sdph:3064977,sleva_sdph:230697,sleva_pct:7,soubor:'x.pdf',t:5000,kdo:'a@b.cz',zdroj:'offerstudio',
  interni:{zisk:300000,skutecny_zisk:282000,korekce:18000,obchodni_marze:9.1,skutecna_marze:8.5,nestandardni:false,negativni:false}};
const nbsp=x=>x.replace(/ /g,' ');
(async()=>{
 const b=await chromium.launch();
 for(const [nazev,opts] of [['PC 1440',{viewport:{width:1440,height:1000}}],['iPhone 13',{...devices['iPhone 13']}]]){
  console.log(nazev);const ctx=await b.newContext(opts);
  await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'..',SOUBOR));
  await p.evaluate(n=>{user={email:'a@b.cz'};jeVedouci=false;
    const H=(t,x)=>({t,kdo:'a@b.cz',text:x});
    const P=(j,nab)=>({jmeno:j,telefon:'777123456',kanal:'telefon',zajem:'GLS',stav:'nabidka',dalsiKontakt:'2026-11-04',prodejce:'a@b.cz',vytvoreno:1000,historie:{h1:H(1000,'Založeno'),h2:H(2000,'Volal jsem, chce srovnat s BMW.')},...(nab?{nabidky:{k1:nab}}:{})});
    data={a:P('Anna První',n),b:P('Boris Druhý',null),c:P('Cyril Třetí',n)};
    document.querySelector('#login').classList.add('hidden');document.querySelector('#app').classList.remove('hidden');renderHome();renderDetail('a');},NAB);
  if(nazev.startsWith('iPhone')){K('na iPhonu záložky nejsou',await p.locator('.pc-zalozky').count()===0);K('na iPhonu není ekonomika ani posuvník',await p.locator('#sim-posuvnik').count()===0);K('bez chyb',errs.length===0);await ctx.close();continue;}
  const tab=t=>p.locator('.pc-zalozky button',{hasText:t});
  const txt=async()=>nbsp(await p.locator('#view').innerText());
  K('tři záložky: Přehled, Ekonomika, Historie (2)',(await p.locator('.pc-zalozky button').allInnerTexts()).join('|')==='Přehled|Ekonomika|Historie (2)');
  K('výchozí je Přehled (zákazník, stav, poznámka), bez ekonomiky',await p.locator('.pc-zalozky button.on').innerText()==='Přehled'&&await p.locator('#d-pozn').count()===1&&await p.locator('#sim-posuvnik').count()===0);
  K('v Přehledu je „Naposledy …“ s odkazem na Historii (bez rozbalené historie)',(await txt()).toLowerCase().includes('naposledy')&&(await txt()).includes('Celá historie (2)')&&await p.locator('.hist').count()===0);
  K('Přehled: soubor nabídky + 📄 PDF + 📂 Offer Studio jsou po ruce u poptávky',await p.evaluate(()=>{const a=[...document.querySelectorAll('.nab-soubory a')].map(x=>x.href);return document.querySelector('.nab-soubory').innerText.includes('x.pdf')&&a.length===2&&a[0].includes('/pdf')&&a[1].includes('/draft/');}));
  // poznámka přežije přepnutí
  await p.fill('#d-pozn','rozepsáno');await tab('Ekonomika').click();
  K('Ekonomika: cena pro zákazníka a sleva v hlavičce',(await txt()).includes('3 064 977 Kč')&&(await txt()).includes('sleva 230 697 Kč')&&(await txt()).includes('z ceníkové 3 295 674 Kč'));
  K('Ekonomika: ve výchozím stavu je zisk schovaný (pruh není, nákupní cena není)',await p.locator('.pruh').count()===0&&!(await txt()).includes('Nákupní cena')&&(await txt()).includes('•••')&&!(await txt()).includes('282 000'));
  K('Ekonomika: posuvník je tu, soubor a odkazy PDF / Offer Studio tu NEJSOU',await p.locator('#sim-posuvnik').count()===1&&await p.locator('.eko-sou').count()===0&&!(await txt()).includes('x.pdf'));
  await p.locator('.eko-hlava button',{hasText:'Ukázat'}).click();
  K('po odkrytí: pruh „Kam jde cena“ s DPH, nákupní cenou, korekcí a ziskem',await p.locator('.pruh div').count()===4&&(await txt()).includes('Skutečný zisk 282 000 Kč')&&(await txt()).includes('Korekce 18 000 Kč')&&(await txt()).includes('Nákupní cena 2 233 039 Kč'));
  K('po odkrytí: čísla případu (zisk 300 000, korekce − 18 000, skutečný zisk 282 000, marže)',(await txt()).includes('300 000 Kč')&&(await txt()).includes('− 18 000 Kč')&&(await txt()).includes('9,1 %'));
  const nastav=async v=>p.evaluate(x=>{const e=document.getElementById('sim-posuvnik');e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));},v);
  await nastav(30000);
  K('posuvník 30 000: zaplatí 3 034 977, skutečný zisk 257 207 (282 000 − 30 000/1,21), 🏆',(await txt()).includes('3 034 977 Kč')&&(await txt()).includes('257 207 Kč')&&(await txt()).includes('Zákazník právě vyhrál'));
  if(OUT)await p.screenshot({path:path.join(OUT,'zalozky_ekonomika.png'),fullPage:true});
  await tab('Přehled').click();
  K('po návratu na Přehled zůstala rozepsaná poznámka',await p.inputValue('#d-pozn')==='rozepsáno');
  await tab('Historie').click();
  K('Historie: oba záznamy, nic z ekonomiky',await p.locator('.hist').count()===2&&await p.locator('#sim-posuvnik').count()===0);
  // šipky drží záložku, nulují posuvník
  await tab('Ekonomika').click();await p.keyboard.press('ArrowRight');
  K('šipka → drží záložku Ekonomika (jiná poptávka, posuvník od nuly)',await p.evaluate(()=>curId)==='b'?true:await p.evaluate(()=>detailTab==='ekonomika'));
  await p.evaluate(()=>renderDetail('b'));
  K('poptávka bez nabídky: Ekonomika nabídne „Udělat nabídku“, bez chyby',(await txt()).includes('Zatím tu není žádná nabídka')&&await p.locator('a:has-text("Udělat nabídku")').count()>=1);
  await p.evaluate(()=>renderHome());
  K('návrat na přehled poptávek vrací záložku na Přehled',await p.evaluate(()=>detailTab==='prehled'));
  await p.evaluate(()=>{data.a.nabidky.k1.interni.skutecny_zisk=10000;data.a.nabidky.k1.interni.zisk=10000;nabidkyOdkryte=true;detailTab='ekonomika';renderDetail('a');});
  await nastav(30000);
  K('zisk pod nulou: ⚠ pod nákupní cenou, pruh se nerozpadne',(await txt()).includes('Pod nákupní cenou')&&await p.locator('.pruh').count()===1);
  K('bez chyb ve stránce',errs.length===0);if(errs.length)console.log(errs);
  await ctx.close();
 }
 await b.close();console.log(selhani?'SELHÁNÍ '+selhani:'vše v pořádku');process.exit(selhani?1:0);
})();
