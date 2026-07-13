const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};
const run=s=>{for(let i=0;i<s*10;i++){__clock.advance(100);__tick();}};

console.log("\n=== ENCODE / DECODE ===");
t("full round-trip: name, hue, cat, segs, per-segment sound", ()=>{
  const {app}=boot();
  const p={name:"Sunday Rajma",hue:3,cat:"Indian",fav:true,
    segs:[{name:"Pressure cook",sec:1500},{name:"Bhuna",sec:720,snd:"wood"}]};
  const out=app.decodeShared(app.encodePreset(p));
  eq(out.name,"Sunday Rajma"); eq(out.hue,3); eq(out.cat,"Indian");
  eq(out.segs.map(s=>[s.name,s.sec,s.snd??null]),
     [["Pressure cook",1500,null],["Bhuna",720,"wood"]]);
  eq(out.fav,false,"shared presets never arrive pinned");
});
t("unicode survives: emoji and diacritics", ()=>{
  const {app}=boot();
  const p={name:"🍞 Pão de Queijo",hue:0,segs:[{name:"Ferment ☕",sec:90}]};
  const out=app.decodeShared(app.encodePreset(p));
  eq(out.name,"🍞 Pão de Queijo"); eq(out.segs[0].name,"Ferment ☕");
});
t("URL is fragment-based, url-safe, unpadded", ()=>{
  const {app}=boot();
  const url=app.shareUrl(app.presets[0]);
  ok(url.startsWith("https://vguttikonda07.github.io/timgo/#p="), url);
  const payload=url.split("#p=")[1];
  ok(/^[A-Za-z0-9_-]+$/.test(payload), "base64url only");
});
t("every seeded preset round-trips identically", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>{
    const out=app.decodeShared(app.encodePreset(p));
    eq(out.segs.map(s=>[s.name,s.sec,s.snd??null]),
       p.segs.map(s=>[s.name,s.sec,s.snd??null]), p.name);
  });
});

console.log("\n=== HOSTILE LINKS ===");
t("garbage, truncation, wrong version, wrong shape all -> null", ()=>{
  const {app}=boot();
  for(const bad of ["!!!", "AAAA", app.encodePreset(app.presets[0]).slice(0,8)])
    eq(app.decodeShared(bad), null, bad);
  const b64=s=>Buffer.from(s).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  eq(app.decodeShared(b64('[2,"x",0,"",[["a",5,""]]]')), null, "future version rejected");
  eq(app.decodeShared(b64('{"name":"x"}')), null, "non-array rejected");
});
t("hostile payloads are clamped by the shared gate", ()=>{
  const {app}=boot();
  const b64=s=>Buffer.from(s).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const evil=JSON.stringify([1,"x".repeat(500),-9,"<script>",
    Array.from({length:200},()=>["a",1e12,"kazoo"])]);
  const out=app.decodeShared(b64(evil));
  eq(out.name.length,40); eq(out.hue,3); eq(out.cat,undefined);
  eq(out.segs.length,64,"seg count capped");
  eq(out.segs[0].sec,86400,"duration capped"); ok(!out.segs[0].snd,"bad sound dropped");
});

console.log("\n=== RECEIVING ===");
t("boot with a share hash opens the confirm sheet and clears the hash", ()=>{
  const pre=boot();
  const url=pre.app.shareUrl({name:"Coach Intervals",hue:1,segs:[{name:"Work",sec:40,snd:"blip"},{name:"Rest",sec:20}]});
  global.location.hash="#p="+url.split("#p=")[1];
  global.__hashCleared=0;
  const {app,nodes}=boot();
  eq(nodes.csheet.hidden,false,"prompt shown");
  ok(nodes.cmsg.textContent.includes("Coach Intervals"),nodes.cmsg.textContent);
  ok(global.__hashCleared>=1,"hash cleared so refresh is quiet");
  global.location.hash="";
});
t("accepting adds, saves, and loads it fresh-boot", ()=>{
  const pre=boot();
  const url=pre.app.shareUrl({name:"Coach Intervals",hue:1,segs:[{name:"Work",sec:40},{name:"Rest",sec:20}]});
  global.location.hash="#p="+url.split("#p=")[1];
  const {app,nodes,store}=boot();
  const n=app.presets.length;
  nodes.cok.click();
  eq(app.presets.length,n+1);
  eq(app.segs.map(s=>s.sec),[40,20],"loaded into the working timer");
  ok(store["timgo.presets"].includes("Coach Intervals"),"persisted");
  global.location.hash="";
});
t("declining adds nothing", ()=>{
  const pre=boot();
  const url=pre.app.shareUrl({name:"Nope",hue:0,segs:[{name:"a",sec:5}]});
  global.location.hash="#p="+url.split("#p=")[1];
  const {app,nodes}=boot();
  const n=app.presets.length;
  nodes.ccancel.click();
  eq(app.presets.length,n);
  global.location.hash="";
});
t("link arriving MID-SESSION saves but never touches the clock", ()=>{
  const {app,nodes}=boot();
  app.toggle(); run(90);
  const l=app.left, a=app.active;
  global.location.hash="#p="+app.shareUrl({name:"Later",hue:0,segs:[{name:"x",sec:5}]}).split("#p=")[1];
  app.receiveShared();
  nodes.cok.click();
  eq(app.left, l, "clock untouched — no ticks ran");
  eq([app.active,app.running],[a,true],"position and state untouched");
  ok(app.presets.some(p=>p.name==="Later"),"still saved");
  global.location.hash="";
});
t("name collision gets the (shared) suffix", ()=>{
  const pre=boot();
  const url=pre.app.shareUrl({name:"Tabata",hue:5,segs:[{name:"w",sec:20}]});
  global.location.hash="#p="+url.split("#p=")[1];
  const {app,nodes}=boot();
  nodes.cok.click();
  ok(app.presets.some(p=>p.name==="Tabata (shared)"));
  global.location.hash="";
});
t("malformed hash toasts and never prompts", ()=>{
  global.location.hash="#p=corrupted!!!";
  const {nodes}=boot();
  eq(nodes.csheet.hidden,true);
  ok(nodes.toast.textContent.includes("didn't parse"), nodes.toast.textContent);
  global.location.hash="";
});
t("unrelated fragment (#settings) is silently inert", ()=>{
  global.location.hash="#settings";
  const {nodes}=boot();
  eq(nodes.csheet.hidden,true);
  ok(!nodes.toast || nodes.toast.hidden !== false, "no toast for foreign fragments");
  global.location.hash="";
});
t("RESCUE: chat-app trailing period still opens the prompt", ()=>{
  const pre=boot();
  const url=pre.app.shareUrl({name:"Rescued",hue:2,segs:[{name:"a",sec:30}]});
  global.location.hash="#p="+url.split("#p=")[1]+".";
  const {nodes}=boot();
  eq(nodes.csheet.hidden,false,"prompt shown despite the period");
  ok(nodes.cmsg.textContent.includes("Rescued"));
  nodes.ccancel.click();
  global.location.hash="";
});
t("no hash: completely inert", ()=>{
  global.location.hash="";
  const {nodes}=boot();
  eq(nodes.csheet.hidden,true);
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}
