// test_sipky_v1.31.js – šipky „Předchozí / Další“ v detailu (PC i iPhone), bez Firebase (SDK nahrazené prázdnou atrapou).
//   SOUBOR=poptavky_v1.31.html node testy/test_sipky_v1.31.js
const {chromium,devices}=require('playwright');
const path=require('path');
const SOUBOR=process.env.SOUBOR||'poptavky_v1.32.html';
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis,ok?'':'');if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
const dnes=o=>{const d=new Date();d.setDate(d.getDate()+o);return d.toISOString().slice(0,10);};
(async()=>{
 const b=await chromium.launch();
 for(const [nazev,opts] of [['PC 1280',{viewport:{width:1280,height:900}}],['iPhone 13',{...devices['iPhone 13']}]]){
  console.log(nazev);
  const ctx=await b.newContext(opts);
  await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'..',SOUBOR));
  await p.evaluate(d=>{
    user={email:'prodejce@suw.example.cz'};jeVedouci=false;
    const P=(j,st,dk)=>({jmeno:j,telefon:'777123456',kanal:'telefon',zajem:'GLC',stav:st,dalsiKontakt:dk,prodejce:'prodejce@suw.example.cz',vytvoreno:1000,historie:{}});
    data={a:P('Anna První','nova',d[0]),b:P('Boris Druhý','nova',d[1]),c:P('Cyril Třetí','nabidka',d[2]),z:P('Zora Prodaná','prodano',null)};
    document.querySelector('#login').classList.add('hidden');document.querySelector('#app').classList.remove('hidden');
    filtr='otevrene';hledat='';renderHome();
  },[dnes(0),dnes(1),dnes(2)]);
  const poc=()=>p.evaluate(()=>{const e=document.querySelector('.sip-poc');return e?e.textContent:null;});
  const jm=()=>p.evaluate(()=>curId);
  K('v přehledu nejsou šipky',await poc()===null);
  await p.evaluate(()=>renderDetail('a'));
  K('první: 1 / 3',await poc()==='1 / 3');
  K('první: Předchozí je vypnuté, Další zapnuté',await p.evaluate(()=>{const [a,b]=[...document.querySelectorAll('.sipky .sip')];return a.disabled&&!b.disabled;}));
  await p.locator('.sipky .sip',{hasText:'Další'}).click();
  K('klepnutí na Další otevře druhou poptávku',await jm()==='b'&&await poc()==='2 / 3');
  await p.keyboard.press('ArrowRight');
  K('klávesa → otevře třetí',await jm()==='c'&&await poc()==='3 / 3');
  await p.keyboard.press('ArrowRight');
  K('na konci → nic neudělá',await jm()==='c');
  await p.keyboard.press('ArrowLeft');
  K('klávesa ← vrací na druhou',await jm()==='b');
  // psaní do pole šipky nebere
  await p.evaluate(()=>{const i=document.createElement('input');i.id='tst';document.body.appendChild(i);i.focus();});
  await p.keyboard.press('ArrowRight');
  K('při psaní do pole šipky nelistují',await jm()==='b');
  await p.evaluate(()=>document.getElementById('tst').remove());
  // prodaná není v seznamu otevřených
  await p.evaluate(()=>renderDetail('z'));
  K('poptávka mimo seznam (prodaná při filtru Otevřené) nemá šipky',await poc()===null);
  // po přepnutí stavu na prodáno zůstane pořadí, ve kterém jsme ji otevřeli
  await p.evaluate(()=>renderDetail('b'));await p.evaluate(()=>{data.b.stav='prodano';data.b.dalsiKontakt=null;renderDetail('b');});
  K('po změně na Prodáno šipky drží původní pořadí (2 / 3)',await poc()==='2 / 3'||await poc()===null);
  // hledání zužuje listování
  await p.evaluate(()=>{data.b.stav='nova';filtr='otevrene';hledat='Cyril';renderHome();renderDetail('c');});
  K('hledání: jen jeden výsledek → bez šipek',await poc()===null);
  K('žádné chyby ve stránce',errs.length===0);if(errs.length)console.log(errs);
  await ctx.close();
 }
 await b.close();
 console.log(selhani?'SELHÁNÍ '+selhani:'vše v pořádku');process.exit(selhani?1:0);
})();
