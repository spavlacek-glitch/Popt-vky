// test_pracovni_dny_v1.37.js – víkendy a české svátky se u termínů dalšího kontaktu přeskakují (funkce z poptavky_v1.40.html, bez prohlížeče)
//   node testy/test_pracovni_dny_v1.37.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const t=fs.readFileSync(path.join(__dirname,'..','poptavky_v1.40.html'),'utf8');
const z=t.indexOf('function velikonocniNedele'),k=t.indexOf('function fmtD(iso)');
const ctx={};vm.createContext(ctx);vm.runInContext(t.slice(z,k)+';this.svatek=svatek;this.jePracovni=jePracovni;this.volnoDen=volnoDen;',ctx);
let s=0;const K=(p,ok)=>{console.log(ok?'  ✔':'  ✖',p);if(!ok)s++;};
const D=(r,m,d)=>new Date(r,m-1,d);
K('Velikonoční pondělí 2026 = 6. 4.',ctx.svatek(D(2026,4,6))==='Velikonoční pondělí');
K('Velký pátek 2026 = 3. 4.',ctx.svatek(D(2026,4,3))==='Velký pátek');
K('Velikonoční pondělí 2027 = 29. 3., 2025 = 21. 4.',ctx.svatek(D(2027,3,29))!==''&&ctx.svatek(D(2025,4,21))!=='');
K('28. 10. a 17. 11. jsou svátky',ctx.svatek(D(2026,10,28))!==''&&ctx.svatek(D(2026,11,17))!=='');
K('běžný čtvrtek 5. 11. 2026 je pracovní',ctx.jePracovni(D(2026,11,5)));
K('sobota a neděle nejsou pracovní',!ctx.jePracovni(D(2026,11,7))&&!ctx.jePracovni(D(2026,11,8)));
K('Štědrý den a svátky vánoční nejsou pracovní',[24,25,26].every(d=>!ctx.jePracovni(D(2026,12,d))));
K('volnoDen: víkend / svátek / pracovní',ctx.volnoDen('2026-11-07')==='víkend'&&ctx.volnoDen('2026-10-28').startsWith('svátek')&&ctx.volnoDen('2026-11-05')==='');
// pracovniDen s předstíraným datem
const pd=(dnesISO,off)=>{const R=vm.runInNewContext(t.slice(z,k)+';pracovniDen',{Date:class extends Date{constructor(...a){if(a.length)super(...a);else super(dnesISO+'T10:00:00');}}});return R(off);};
K('pátek + 1 den → pondělí',pd('2026-11-06',1)==='2026-11-09');
K('čtvrtek 5. 11. + 3 dny (sobota) → pondělí 9. 11.',pd('2026-11-05',3)==='2026-11-09');
K('úterý 27. 10. + 1 den (svátek 28. 10.) → čtvrtek 29. 10.',pd('2026-10-27',1)==='2026-10-29');
K('středa + 1 den → čtvrtek (beze změny)',pd('2026-11-04',1)==='2026-11-05');
console.log(s?'SELHÁNÍ '+s:'vše v pořádku');process.exit(s?1:0);
