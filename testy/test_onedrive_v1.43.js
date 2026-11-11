// test_onedrive_v1.43.js – odkaz na PDF ve firemním OneDrivu (odUrl, mobilní detail, odkaz u nabídky na PC). Bez Firebase (SDK = atrapa).
//   SOUBOR=poptavky_v1.43.html node testy/test_onedrive_v1.43.js
const {chromium,devices}=require('playwright');const path=require('path');
const SOUBOR=process.env.SOUBOR||'poptavky_v1.43.html';
let selhani=0;const K=(popis,ok)=>{console.log(ok?'  ✔':'  ✖',popis);if(!ok)selhani++;};
const STUB=`(function(){const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:mk(),apply:()=>mk(),construct:()=>mk()});window.firebase=mk();})();`;
const CESTA='Poptávky/Karolína Cahelová GLB/Karolína_Cahelová_GLB_nabidka1_20261109_145603.pdf';
// adresa, která byla ověřená uživatelem (otevřela PDF na mobilu i PC, 2026-11-11)
const OVERENA='https://suwautomobily-my.sharepoint.com/personal/spavlacek_suw_cz/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fspavlacek_suw_cz%2FDocuments%2FPopt%C3%A1vky%2FKarol%C3%ADna%20Cahelov%C3%A1%20GLB%2FKarol%C3%ADna_Cahelov%C3%A1_GLB_nabidka1_20261109_145603.pdf&parent=%2Fpersonal%2Fspavlacek_suw_cz%2FDocuments%2FPopt%C3%A1vky%2FKarol%C3%ADna%20Cahelov%C3%A1%20GLB';
const NAB={model:'GLB 200',cena_sdph:1500000,cena_vuz_sdph:1500000,sleva_sdph:0,sleva_pct:0,soubor:'Karolína_Cahelová_GLB_nabidka1_20261109_145603.pdf',t:5000,kdo:'spavlacek@suw.cz',zdroj:'offerstudio',onedrive:CESTA};
(async()=>{
 const b=await chromium.launch();
 for(const [nazev,opts] of [['PC 1440',{viewport:{width:1440,height:1000}}],['iPhone 13',{...devices['iPhone 13']}]]){
  console.log(nazev);const ctx=await b.newContext(opts);
  await ctx.route('https://www.gstatic.com/**',r=>r.fulfill({body:STUB,contentType:'application/javascript'}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.join(__dirname,'..',SOUBOR));
  const pripravit=(id)=>p.evaluate(([n,id])=>{user={email:'spavlacek@suw.cz'};jeVedouci=false;
    const P=(j,nab)=>({jmeno:j,telefon:'777123456',kanal:'telefon',zajem:'GLB',stav:'nabidka',dalsiKontakt:'2026-11-12',prodejce:'spavlacek@suw.cz',vytvoreno:1000,historie:{},...(nab?{nabidky:{k1:nab}}:{})});
    const bez=Object.assign({},n);delete bez.onedrive;
    data={a:P('S cestou',n),b:P('Bez cesty (starší nabídka)',bez),c:P('Bez nabídky',null)};
    document.querySelector('#login').classList.add('hidden');document.querySelector('#app').classList.remove('hidden');renderHome();renderDetail(id);},[NAB,id]);
  if(nazev.startsWith('PC')){
    K('odUrl: přesně ta adresa, kterou uživatel ověřil',await p.evaluate(n=>odUrl(n),NAB)===OVERENA);
    K('odUrl: tečky v e-mailu → podtržítka (jan.novak@suw.cz → jan_novak_suw_cz)',(await p.evaluate(n=>odUrl(n),{...NAB,kdo:'Jan.Novak@suw.cz'})).includes('/personal/jan_novak_suw_cz/'));
    K('odUrl: bez cesty, bez e-mailu nebo se špatným e-mailem je prázdný',await p.evaluate(n=>[odUrl({...n,onedrive:''}),odUrl({...n,kdo:''}),odUrl({...n,kdo:'neni-email'}),odUrl(null),odUrl({})].every(x=>x===''),NAB));
    const zly=await p.evaluate(n=>odUrl({...n,onedrive:'../../x/../"><script>alert(1)</script>/a.pdf'}),NAB);
    K('odUrl: „..“ se zahazuje, nebezpečné znaky se kódují, host je pevný',zly.startsWith('https://suwautomobily-my.sharepoint.com/personal/')&&!/[<>"]/.test(zly)&&!zly.includes('%2E%2E')&&!decodeURIComponent(zly).includes('/../'));
    K('odUrl: cizí host se nedá vnutit přes e-mail',(await p.evaluate(n=>odUrl({...n,kdo:'x@evil.com/../..'}),NAB))==='');
    await pripravit('a');
    const a=p.locator('#view a',{hasText:'OneDrive'});
    K('PC: u nabídky je odkaz „☁️ OneDrive“ s ověřenou adresou',await a.count()>=1&&await a.first().getAttribute('href')===OVERENA&&await a.first().getAttribute('target')==='_blank');
    await pripravit('b');
    K('PC: nabídka bez zapsané cesty odkaz OneDrive nemá (ostatní odkazy zůstávají)',await p.locator('#view a',{hasText:'OneDrive'}).count()===0&&await p.locator('#view a',{hasText:'PDF'}).count()>=1);
  } else {
    await pripravit('a');
    const a=p.locator('#view a.md-odkaz',{hasText:'Otevřít PDF (OneDrive)'});
    K('iPhone: v detailu je „📄 Otevřít PDF (OneDrive)“ s ověřenou adresou',await a.count()===1&&await a.getAttribute('href')===OVERENA&&await a.getAttribute('rel')==='noopener');
    K('iPhone: odkaz je pod řádkem Nabídka (cena, model)',(await p.locator('#view').innerText()).includes('GLB 200'));
    await pripravit('b');
    K('iPhone: starší nabídka bez cesty odkaz nemá, detail se vykreslí',await p.locator('#view a',{hasText:'OneDrive'}).count()===0&&(await p.locator('#view').innerText()).includes('GLB 200'));
    await pripravit('c');
    K('iPhone: poptávka bez nabídky bez chyby',await p.locator('#view a',{hasText:'OneDrive'}).count()===0);
  }
  K('bez chyb na stránce',errs.length===0);if(errs.length)console.log(errs);
  await ctx.close();
 }
 await b.close();console.log(selhani?'SELHÁNÍ '+selhani:'vše v pořádku');process.exit(selhani?1:0);
})();
