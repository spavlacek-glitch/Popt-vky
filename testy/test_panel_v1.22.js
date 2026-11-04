// test_panel_v1.22.js – panel „Další akce“ na mobilu se zavře posunutím dolů (bez Firebase: SDK je nahrazené prázdnou atrapou).
//   SOUBOR=poptavky_v1.22.html node testy/test_panel_v1.22.js
const {chromium,devices}=require('playwright');
const path=require('path');
const SOUBOR=process.env.SOUBOR||'poptavky_v1.38.html';
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis);if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({...devices['iPhone 13'],hasTouch:true});
 await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.join(__dirname,'..',SOUBOR));
 await p.evaluate(()=>{for(let e=document.querySelector('#md-panel');e;e=e.parentElement){e.classList.remove('hidden');e.hidden=false;e.style.display='';} data['x']={jmeno:'Jan Novák',telefon:'777123456',email:'a@b.cz',stav:'nova'};});
 const cdp=await ctx.newCDPSession(p);
 const touch=async(type,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:200,y}]});
 const stav=()=>p.evaluate(()=>({skryty:document.querySelector('#md-panel').classList.contains('hidden'),tf:document.querySelector('#md-panel').style.transform}));
 const box=async()=>p.locator('#md-panel').boundingBox();
 // 1) otevřít, potáhnout dolů o 150 px -> zavře
 await p.evaluate(()=>otevriAkce('x'));let bb=await box();K('panel se otevře',(await stav()).skryty===false);
 let y=bb.y+20;await touch('touchStart',y);for(let i=1;i<=10;i++)await touch('touchMove',y+i*15);
 K('při tažení se panel posouvá s prstem',(await stav()).tf==='translateY(150px)');await touch('touchEnd');await p.waitForTimeout(300);
 K('potažení o 150 px panel zavře',(await stav()).skryty===true);
 // 2) krátké potáhnutí (30 px) -> vrátí zpět
 await p.evaluate(()=>otevriAkce('x'));bb=await box();y=bb.y+20;await touch('touchStart',y);for(let i=1;i<=3;i++)await touch('touchMove',y+i*10);await touch('touchEnd');await p.waitForTimeout(400);
 {const t=await stav();K('krátké potáhnutí (30 px) panel vrátí zpět',t.skryty===false&&t.tf==='');}
 // 3) nahoru nic
 await touch('touchStart',y);for(let i=1;i<=5;i++)await touch('touchMove',y-i*20);await touch('touchEnd');K('tažení nahoru nic nedělá',(await stav()).skryty===false);
 // 4) znovu otevřít po zavření -> bez zbytkového posunu
 await p.evaluate(()=>{zavriAkce();otevriAkce('x');});{const t=await stav();K('po zavření a otevření bez zbytkového posunu',t.skryty===false&&t.tf==='');}
 // 5) klepnutí na pozadí stále zavírá
 await p.evaluate(()=>zavriAkce());await p.evaluate(()=>otevriAkce('x'));await p.tap('#md-zavoj',{position:{x:200,y:40}});K('klepnutí na pozadí dál zavírá',(await stav()).skryty===true);
 K('bez chyb ve stránce',errs.length===0);await b.close();if(selhani){console.log('selhalo: '+selhani);process.exit(1)}console.log('vše v pořádku (8 kontrol)');
})();
