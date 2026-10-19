/* Cartogram · Market Potential Agent — mockup app (vanilla JS, hash router) */
(() => {
const D = window.MPA_DATA;
// MapTiler basemap — get a free key at https://cloud.maptiler.com/account/keys/
const MAPTILER_KEY = "hkeD06EOpeCbMqsZiuSm";
const MAPTILER_STYLE = "dataviz-light"; // e.g. streets-v2, basic-v2, dataviz-light
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("en-US");
const rp = jt => jt >= 1000 ? `Rp${(jt/1000).toFixed(2)} bn` : `Rp${Math.round(jt)} jt`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} },
  del(k){ try{ sessionStorage.removeItem(k); }catch(e){} },
};
let memAuth = false;
const isAuthed = () => memAuth || store.get("cartogram-auth") === "1";

function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2000); }

/* ---------------- state ---------------- */
const KEL = D.kelurahan;
KEL.forEach(k => { if(!k.excluded) k.pois = Object.values(k.mix).reduce((a,b)=>a+b,0); });
const byId = id => KEL.find(k => k.id === id);
const S = {
  W:[...D.weightsV1], active:"bhil", boqKel:"bhil", take:D.assumptions.takeUp,
  arpu:D.assumptions.arpuK, margin:D.assumptions.marginPct, cap:D.assumptions.subsPerFwaSite,
  prices:{}, ran:false, running:false, tab:"rank",
  visSegs:new Set(D.segments.map(s=>s.k)),
  layers:{ score:true, poi:true, assets:true, buffer:false, labels:true },
  sel:new Set(KEL.filter(k=>!k.excluded).map(k=>k.id)),
  loc:{ cities:new Set(D.area.cities), kec:new Set(D.area.kecamatan) },
  ranAt:null,
};

/* ---------------- scoring / costing ---------------- */
const score = (k, W=S.W) => { const tw=W.reduce((a,b)=>a+b,0)||1; return k.c.reduce((s,v,i)=>s+v*W[i],0)/tw; };
const tier = s => { const r=Math.round(s); return r>=75?"A":r>=60?"B":"C"; };
const tierColor = t => ({A:"#0F47B3",B:"#538CFF",C:"#AFAEAF"})[t];
const ranked = (W=S.W) => KEL.filter(k=>!k.excluded && S.sel.has(k.id)).map(k=>({k,s:score(k,W)})).sort((a,b)=>b.s-a.s);
const v1Rank = () => { const m={}; ranked(D.weightsV1).forEach((r,i)=>m[r.k.id]=i+1); return m; };
const weightsChanged = () => S.W.some((w,i)=>w!==D.weightsV1[i]);
const price = (item,base) => S.prices[item]!=null ? S.prices[item] : base;
function scaleQty(r,ratio){ const q=r.qty*ratio;
  if(r.scale==="ceil") return Math.ceil(q); if(r.scale==="dec") return Math.round(q*10)/10;
  if(r.scale==="lot") return Math.round(q*100)/100; return Math.round(q); }
function costs(k,t){
  const ratio=k.premises/2000, subs=Math.round(k.premises*t);
  const f=D.boq.ftth.map(r=>{const q=scaleQty(r,ratio),p=price(r.item,r.price);return{...r,q,p,tot:q*p}});
  const hp=f.reduce((a,r)=>a+r.tot,0), dp=price(D.boq.ftthSub.item,D.boq.ftthSub.price), ftthSub=subs*dp;
  const sites=Math.max(1,Math.ceil(subs/S.cap));
  const w=D.boq.fwa.map(r=>{const q=+(r.qty*sites).toFixed(2),p=price(r.item,r.price);return{...r,q,p,tot:q*p}});
  const site=w.reduce((a,r)=>a+r.tot,0), cp=price(D.boq.fwaSub.item,D.boq.fwaSub.price), fwaSub=subs*cp;
  const mon=subs*(S.arpu/1000)*(S.margin/100), ftth=hp+ftthSub, fwa=site+fwaSub;
  return {subs,f,hp,dp,ftthSub,ftth,sites,w,site,cp,fwaSub,fwa,mon,pbF:mon?ftth/mon:Infinity,pbW:mon?fwa/mon:Infinity};
}
function crossover(k){ for(let t=.05;t<=.8;t+=.01){ const c=costs(k,t); if(c.ftth<c.fwa) return Math.round(t*100); } return null; }
const mo = v => isFinite(v) ? Math.round(v)+" months" : "–";

/* ---------------- router ---------------- */
const ROUTES = ["login","hero","planning","map","report"];
function go(r){ location.hash = "#/"+r; }
function route(){
  let r = (location.hash.replace(/^#\/?/,"") || "login");
  if(!ROUTES.includes(r)) r="login";
  if(r!=="login" && !isAuthed()) r="login";
  if(r==="login" && isAuthed()) r="hero";
  if(r==="report" && !S.ran){ r="map"; toast("Run the agent first to generate a report"); }
  if(("#/"+r)!==location.hash) history.replaceState(null,"","#/"+r);
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===r));
  window.scrollTo(0,0);
  ({ hero:renderHero, planning:renderPlanning, map:enterMap, report:renderReport })[r]?.();
}
window.addEventListener("hashchange", route);
document.addEventListener("click", e => {
  const g=e.target.closest("[data-go]"); if(g){ e.preventDefault(); closePops(); go(g.dataset.go); return; }
  const a=e.target.closest("[data-action]"); if(a){
    closePops();
    if(a.dataset.action==="logout"){ memAuth=false; store.del("cartogram-auth"); go("login"); toast("Sign out successful"); }
    if(a.dataset.action==="report"){ if(a.disabled) return;
      if(mapReady && S.ran){ map.jumpTo({center:D.area.center,zoom:D.area.zoom}); let done=false; const fin=()=>{ if(!done){ done=true; go("report"); } }; map.once("idle",fin); setTimeout(fin,1500); }
      else go("report"); }
  }
});

/* ---------------- 1. login ---------------- */
$("togglePass").onclick = () => { const p=$("loginPass"); p.type = p.type==="password"?"text":"password"; $("togglePass").textContent = p.type==="password"?"Show":"Hide"; };
$("loginEmail").value = D.user.email;
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const ok = $("loginEmail").value.trim().toLowerCase()===D.login.email && $("loginPass").value===D.login.password;
  $("loginErr").classList.toggle("hidden", !!ok);
  if(!ok) return;
  const b=$("loginBtn"); b.disabled=true; b.innerHTML='<span class="spinner sm text-white"></span>';
  await sleep(900);
  memAuth=true; store.set("cartogram-auth","1");
  b.disabled=false; b.innerHTML="<span>Sign In</span>";
  go("hero");
});

/* ---------------- 2. hero ---------------- */
function renderHero(){ $("helloName").textContent = `Hello, ${D.user.first_name} ${D.user.last_name}!`; }

/* ---------------- 3. business planning ---------------- */
const BP = [
  { slug:"agent", label:"Market Potential Agent", isNew:true, img:"business-planning-1.png",
    desc:"Ask in plain language. Four AI agents find businesses, score every kelurahan, and cost FTTH vs FWA.",
    icon:'<path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>' },
  { slug:"market", label:"Market Potential Analysis", img:"business-planning-1.png",
    desc:"Analyze market opportunities and identify high-potential areas for network expansion.",
    icon:'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>' },
  { slug:"backhaul", label:"Assets Management", img:"business-planning-2.png",
    desc:"Precision routing for resilient, effective and cost-efficient asset management.",
    icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  { slug:"fwa", label:"Fixed Wireless Access", img:"business-planning-3.png",
    desc:"Identify high-value FWA deployment zones through network and market insights.",
    icon:'<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>' },
];
function renderPlanning(){
  $("bpCards").innerHTML = BP.map(o=>`
    <div data-bp="${o.slug}" class="bg-white border shadow-md border-grey-300 rounded-md p-5 xl:p-6 cursor-pointer group hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${o.isNew?"ring-2 ring-blue-500/40":""}">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-sm bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${o.icon}</svg></div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-grey-900 mb-2 group-hover:text-blue-600 transition-colors">${o.label}${o.isNew?' <span class="ml-1 text-2xs font-bold text-white bg-blue-500 rounded-full px-2 py-0.5 align-middle">NEW</span>':""}</h3>
          <p class="text-sm text-grey-600 leading-relaxed">${o.desc}</p>
        </div>
        <svg class="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </div>
    </div>`).join("");
  updateLocLabel();
}
$("bpCards").addEventListener("mouseover", e => { const c=e.target.closest("[data-bp]"); if(!c) return; const o=BP.find(x=>x.slug===c.dataset.bp);
  $("bpHero").style.backgroundImage=`url(assets/${o.img})`; $("bpTitle").textContent=o.label; $("bpDesc").textContent=o.desc; });
$("bpCards").addEventListener("mouseleave", () => { $("bpHero").style.backgroundImage="url(assets/business-planning-0.png)"; $("bpTitle").textContent="Business Planning";
  $("bpDesc").textContent="Analyze market potential, optimize asset management, and assess FWA deployment opportunities."; });
$("bpCards").addEventListener("click", e => { const c=e.target.closest("[data-bp]"); if(!c) return;
  if(c.dataset.bp==="agent") openLoc(); else toast("Existing Surge module · not part of this mockup"); });
$("bpLocation").onclick = openLoc;
function updateLocLabel(){ const c=[...S.loc.cities]; $("bpLocLabel").textContent = `${D.area.province}${c.length?", "+c[0]:""}${c.length>1||S.loc.kec.size>1?" ... see more":""}`; }

/* location modal */
const ALL_CITIES = ["Jakarta Pusat","Jakarta Selatan","Jakarta Barat","Jakarta Timur","Jakarta Utara"];
const ALL_KEC = { "Jakarta Pusat":["Tanah Abang","Menteng","Gambir"], "Jakarta Selatan":["Setiabudi","Kebayoran Baru","Tebet"] };
function openLoc(){ renderLoc(); $("locModal").classList.remove("hidden"); }
function closeLoc(){ $("locModal").classList.add("hidden"); }
function chip(label,on,attr,disabled){ return `<button ${attr} ${disabled?"disabled":""} class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-xxs border ${on?"bg-brand-50 text-brand-500 border-brand-200 font-semibold":"border-grey-200 text-grey-600"} ${disabled?"opacity-40 cursor-not-allowed":"hover:border-brand-300"}">${on?"✓ ":""}${label}</button>`; }
function renderLoc(){
  const kecOpts = [...S.loc.cities].flatMap(c=>ALL_KEC[c]||[]);
  $("locBody").innerHTML = `
    <label class="flex items-center gap-2 text-xs text-grey-400"><input type="checkbox" disabled> Show all data (no filter)</label>
    <div class="space-y-1.5"><p class="text-2xs">Province</p><div class="flex flex-wrap gap-1">${chip(D.area.province,true,"",false)}</div></div>
    <div class="space-y-1.5"><p class="text-2xs">City / Kab</p><div class="flex flex-wrap gap-1">${ALL_CITIES.map(c=>chip(c,S.loc.cities.has(c),`data-city="${c}"`,!ALL_KEC[c])).join("")}</div></div>
    <div class="space-y-1.5"><p class="text-2xs">Kecamatan</p><div class="flex flex-wrap gap-1">${kecOpts.length?kecOpts.map(k=>chip(k,S.loc.kec.has(k),`data-kec="${k}"`,!D.area.kecamatan.includes(k))).join(""):'<span class="text-2xs text-grey-400">Pick a city first</span>'}</div></div>
    <p class="text-2xs text-grey-500">Demo data covers Kec. Tanah Abang and Setiabudi only.</p>`;
}
$("locModal").addEventListener("click", e => {
  if(e.target===$("locModal") || e.target.closest("[data-close-modal]")) return closeLoc();
  const c=e.target.closest("[data-city]"), k=e.target.closest("[data-kec]");
  if(c){ const v=c.dataset.city; S.loc.cities.has(v)?S.loc.cities.delete(v):S.loc.cities.add(v); renderLoc(); }
  if(k){ const v=k.dataset.kec; S.loc.kec.has(v)?S.loc.kec.delete(v):S.loc.kec.add(v); renderLoc(); }
});
$("locApply").onclick = () => {
  if(!S.loc.kec.size){ toast("Pick at least one kecamatan"); return; }
  S.sel = new Set(KEL.filter(k=>!k.excluded && S.loc.kec.has(k.kec)).map(k=>k.id));
  if(!S.sel.has(S.active)){ const r=ranked()[0]; if(r){ S.active=S.boqKel=r.k.id; } }
  closeLoc(); updateLocLabel(); go("map"); if(map) refreshMap();
};

/* ---------------- 4. map ---------------- */
let map=null, mapReady=false, kelGeo=null, poiGeo=null, labels={};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function buildGeometry(){
  if(!window.d3 || !d3.Delaunay) return;
  const pts=KEL.map(k=>[k.lon,k.lat]), cx=106.819, cy=-6.207;
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2; pts.push([cx+Math.cos(a)*.034, cy+Math.sin(a)*.030]); }
  const del=d3.Delaunay.from(pts), vor=del.voronoi([106.76,-6.26,106.88,-6.15]);
  kelGeo={type:"FeatureCollection",features:KEL.map((k,i)=>({type:"Feature",properties:{id:k.id},geometry:{type:"Polygon",coordinates:[vor.cellPolygon(i)]}}))};
  const rnd=mulberry32(42), feats=[]; let n=0;
  KEL.forEach((k,i)=>{ if(k.excluded) return;
    D.segments.forEach(sg=>{ for(let j=0;j<(k.mix[sg.k]||0);j++){
      let x,y,tries=0;
      do{ const r=Math.sqrt(-2*Math.log(rnd()+1e-9))*.0021, a=rnd()*Math.PI*2; x=k.lon+r*Math.cos(a); y=k.lat+r*Math.sin(a); tries++; }
      while(del.find(x,y,i)!==i && tries<25);
      if(tries>=25){ x=k.lon+(rnd()-.5)*.0012; y=k.lat+(rnd()-.5)*.0012; }
      feats.push({type:"Feature",properties:{id:++n,kel:k.id,seg:sg.k},geometry:{type:"Point",coordinates:[+x.toFixed(6),+y.toFixed(6)]}});
    }});
  });
  poiGeo={type:"FeatureCollection",features:feats};
}
function circle(lon,lat,km,n=56){const c=[],dl=km/110.574,dn=km/(111.32*Math.cos(lat*Math.PI/180));for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;c.push([lon+dn*Math.cos(a),lat+dl*Math.sin(a)])}return c}

function enterMap(){
  if(!map) initMap(); else requestAnimationFrame(()=>{ map.resize(); refreshMap(); });
  renderChat(); renderResult(); renderLayers(); renderLegend();
}
function initMap(){
  if(!window.maplibregl){ $("mapLoading").innerHTML='<p class="text-sm text-red-500">Map library failed to load. Check your internet connection.</p>'; return; }
  buildGeometry();
  map=new maplibregl.Map({ container:"map", center:D.area.center, zoom:D.area.zoom, attributionControl:{compact:true}, preserveDrawingBuffer:true,
    style:`https://api.maptiler.com/maps/${MAPTILER_STYLE}/style.json?key=${MAPTILER_KEY}` });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");
  map.on("load",()=>{
    if(kelGeo){
      map.addSource("kel",{type:"geojson",data:kelGeo});
      map.addLayer({id:"kel-fill",type:"fill",source:"kel",paint:{"fill-color":["get","fill"],"fill-opacity":["get","fo"]}});
      map.addLayer({id:"kel-line",type:"line",source:"kel",paint:{"line-color":"#011641","line-opacity":.55,"line-width":["case",["get","act"],2.6,.9]}});
      map.addSource("poi",{type:"geojson",data:poiGeo});
      map.addLayer({id:"poi",type:"circle",source:"poi",paint:{"circle-radius":["interpolate",["linear"],["zoom"],12,1.6,14,2.6,16,4.5],
        "circle-color":["match",["get","seg"],...D.segments.flatMap(s=>[s.k,s.color]),"#999"],"circle-stroke-color":"#fff","circle-stroke-width":.4}});
      map.on("click","kel-fill",e=>{ const id=e.features[0].properties.id; if(!byId(id).excluded && S.ran) selectKel(id,"profile"); });
      map.on("click","poi",e=>{ const p=e.features[0].properties, sg=D.segments.find(s=>s.k===p.seg);
        new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<b>${sg.label}</b><br>POI #${p.id} · ${byId(p.kel).name}`).addTo(map); });
      map.on("mouseenter","poi",()=>map.getCanvas().style.cursor="pointer");
      map.on("mouseleave","poi",()=>map.getCanvas().style.cursor="");
    }
    map.addSource("abuf",{type:"geojson",data:{type:"FeatureCollection",features:D.surgeAssets.map(a=>({type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[circle(a.lon,a.lat,1)]}}))}});
    map.addLayer({id:"abuf",type:"fill",source:"abuf",paint:{"fill-color":"#205CD9","fill-opacity":.08}});
    map.addLayer({id:"abuf-l",type:"line",source:"abuf",paint:{"line-color":"#205CD9","line-width":1,"line-dasharray":[2,2]}});
    map.addSource("assets",{type:"geojson",data:{type:"FeatureCollection",features:D.surgeAssets.map(a=>({type:"Feature",properties:{name:a.name,type:a.type},geometry:{type:"Point",coordinates:[a.lon,a.lat]}}))}});
    map.addLayer({id:"assets",type:"circle",source:"assets",paint:{"circle-radius":7,"circle-color":["match",["get","type"],"KRL station","#AF0914","#F59E0B"],"circle-stroke-color":"#fff","circle-stroke-width":2}});
    map.on("click","assets",e=>{ const p=e.features[0].properties;
      new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<b>${p.name}</b><br>Surge asset · ${p.type}`).addTo(map); });
    KEL.forEach(k=>{ const wrap=document.createElement("div"), el=document.createElement("div"); el.className="klabel"; wrap.appendChild(el); k._label=el;
      el.addEventListener("click",ev=>{ ev.stopPropagation(); if(!k.excluded && S.ran) selectKel(k.id,"profile"); });
      labels[k.id]=new maplibregl.Marker({element:wrap}).setLngLat([k.lon,k.lat]).addTo(map); });
    mapReady=true; $("mapLoading").classList.add("hidden"); refreshMap();
  });
  setTimeout(()=>$("mapLoading").classList.add("hidden"),6000);
}
function vis(id,on){ if(map.getLayer(id)) map.setLayoutProperty(id,"visibility",on?"visible":"none"); }
function refreshMap(){
  if(!mapReady) return;
  if(kelGeo){
    kelGeo.features.forEach(f=>{ const k=byId(f.properties.id), on=!k.excluded && S.sel.has(k.id);
      f.properties.act = S.ran && k.id===S.active;
      if(S.ran && S.layers.score && on){ const s=score(k); f.properties.fill=tierColor(tier(s)); f.properties.fo=Math.min(.55,Math.max(.15,(s-45)/75)); }
      else { f.properties.fill = on?"#011641":"#949495"; f.properties.fo = on?.03:.22; } });
    map.getSource("kel").setData(kelGeo);
    vis("poi", S.layers.poi && S.stage>=2);
    map.setFilter("poi",["all",["in",["get","seg"],["literal",[...S.visSegs]]],["in",["get","kel"],["literal",[...S.sel]]]]);
  }
  vis("assets",S.layers.assets); vis("abuf",S.layers.buffer); vis("abuf-l",S.layers.buffer);
  KEL.forEach(k=>{ const el=k._label; if(!el) return; const on=!k.excluded && S.sel.has(k.id);
    el.style.display = S.layers.labels ? "" : "none";
    el.className="klabel"+(on?"":" off")+(S.ran&&k.id===S.active?" active":"");
    if(S.ran && on){ const s=score(k),t=tier(s); el.innerHTML=`${k.name}<span class="sc" style="background:${tierColor(t)}">${Math.round(s)}</span>`; }
    else el.textContent=k.name; });
  renderLegend();
}
S.stage = 0;

/* panels toggling */
const PANELS = { agent:"pAgent", layers:"pLayers", legend:"pLegend" };
document.querySelectorAll(".nav-toggle").forEach(b=>b.onclick=()=>togglePanel(b.dataset.panel));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>togglePanel(b.dataset.close,false));
function togglePanel(p,force){
  const el=$(PANELS[p]), show = force!=null ? force : el.classList.contains("hidden");
  if(show && (p==="agent"||p==="layers")){ ["agent","layers"].forEach(o=>{ $(PANELS[o]).classList.add("hidden"); document.querySelector(`.nav-toggle[data-panel=${o}]`).classList.remove("on"); }); }
  el.classList.toggle("hidden",!show);
  document.querySelector(`.nav-toggle[data-panel=${p}]`).classList.toggle("on",show);
  const leftOpen = !$("pAgent").classList.contains("hidden") ? "24.5rem" : !$("pLayers").classList.contains("hidden") ? "20.5rem" : "1.5rem";
  $("pLegend").style.left = leftOpen;
}
function closePops(){ $("menuPop").classList.add("hidden"); $("toolsPop").classList.add("hidden"); }
$("menuBtn").onclick = e => { e.stopPropagation(); $("toolsPop").classList.add("hidden"); $("menuPop").classList.toggle("hidden"); };
$("toolsBtn").onclick = e => { e.stopPropagation(); $("menuPop").classList.add("hidden"); $("toolsPop").classList.toggle("hidden"); };
document.addEventListener("click", e => { if(!e.target.closest("#menuPop,#menuBtn,#toolsPop,#toolsBtn")) closePops(); });
$("toolsPop").addEventListener("click", e => { const b=e.target.closest("[data-tool]"); if(!b) return; closePops();
  const t=b.dataset.tool;
  if(t==="run"){ togglePanel("agent",true); runAgent(); return; }
  if(t==="buffer"){ S.layers.buffer=!S.layers.buffer; refreshMap(); renderLayers(); toast(S.layers.buffer?"1 km FWA reach shown around Surge assets":"Buffer hidden"); return; }
  if(!S.ran){ toast("Run the agent first"); return; }
  setTab(t==="weights"?"weights":"boq"); });
$("shareBtn").onclick = () => { const u=location.href.split("#")[0]+"#/login";
  (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast("Mockup link copied")).catch(()=>toast(u)); };

/* layers panel */
function renderLayers(){
  const row=(key,label,sub)=>`<label class="box flex items-center gap-2 cursor-pointer"><input type="checkbox" data-layer="${key}" ${S.layers[key]?"checked":""}><div class="flex-1"><p class="text-xs font-medium">${label}</p><p class="text-2xs text-grey-500">${sub}</p></div></label>`;
  $("layerList").innerHTML =
    row("score","Kelurahan score","Choropleth by tier, after agent run")+
    row("labels","Kelurahan labels","Name and score")+
    row("poi","Business POIs","Cartogram POI layer, by segment")+
    `<div class="pl-6 space-y-1">${D.segments.map(s=>`<label class="flex items-center gap-2 text-xs"><input type="checkbox" data-seg="${s.k}" ${S.visSegs.has(s.k)?"checked":""}><span class="w-2.5 h-2.5 rounded-full" style="background:${s.color}"></span>${s.label}</label>`).join("")}</div>`+
    row("assets","Surge assets","KRL stations and Kantor Pos")+
    row("buffer","FWA reach","1 km buffer around Surge assets");
}
$("layerList").addEventListener("change", e => { const t=e.target;
  if(t.dataset.layer) S.layers[t.dataset.layer]=t.checked;
  if(t.dataset.seg) t.checked?S.visSegs.add(t.dataset.seg):S.visSegs.delete(t.dataset.seg);
  refreshMap(); });
function renderLegend(){
  const segs = D.segments.map(s=>`<div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${s.color}"></span>${s.short}</div>`).join("");
  const tiers = S.ran ? `<p class="lbl pt-2">Kelurahan tier</p>
    <div class="flex items-center gap-2"><span class="w-3 h-2.5 rounded-sm" style="background:#0F47B3"></span>A · 75 and above</div>
    <div class="flex items-center gap-2"><span class="w-3 h-2.5 rounded-sm" style="background:#538CFF"></span>B · 60 to 74</div>
    <div class="flex items-center gap-2"><span class="w-3 h-2.5 rounded-sm" style="background:#AFAEAF"></span>C · below 60</div>` : "";
  $("legendBody").innerHTML = `<p class="lbl">Business POIs</p>${segs}${tiers}
    <p class="lbl pt-2">Surge assets</p>
    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ring-2 ring-white" style="background:#AF0914"></span>KRL station</div>
    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ring-2 ring-white" style="background:#F59E0B"></span>Kantor Pos</div>
    <p class="text-2xs text-grey-400 pt-2">Kelurahan boundaries simplified for the mockup</p>`;
}

/* ---------------- agent chat ---------------- */
const PROMPT = "Find all UMKM, ruko and offices in Tanah Abang and Setiabudi. Rank kelurahan for business broadband.";
const STEPS = [
  {t:"Area set: Kec. Tanah Abang + Setiabudi, 11 of 15 kelurahan", ag:"Scout"},
  {t:"4,860 business POIs pulled; 312 duplicates removed", ag:"Scout"},
  {t:"Classified into 6 segments (UMKM 2,000, ruko 1,140)", ag:"Scout"},
  {t:"All 11 kelurahan profiled and scored, weights v1", ag:"Insight · Scoring"},
  {t:"FTTH and FWA BOQ drafted for the top 3", ag:"Costing"},
];
let chatInit=false;
function addMsg(cls,html){ const d=document.createElement("div"); d.className="msg "+cls; d.innerHTML=html; $("chatBody").appendChild(d); $("chatBody").scrollTop=1e6; return d; }
function renderChat(){
  if(chatInit) return; chatInit=true;
  addMsg("agent",`<div class="who">Market Potential Agent</div>Hi ${D.user.first_name}. Tell me which area and which customers you want to target. I will find the businesses, rank every kelurahan, and cost FTTH vs FWA.`);
  setSuggest();
}
function setSuggest(){
  const sug = !S.ran ? [["▶ "+PROMPT.slice(0,52)+"…","run"]] :
    [["Why is the top kelurahan first?","why"],["Compare FTTH vs FWA","boq"],["Weight competitive gap higher","weights"],["Generate report","report"]];
  $("chatSuggest").innerHTML = sug.map(([l,k])=>`<button class="chip" data-sug="${k}">${l}</button>`).join("");
}
$("chatSuggest").addEventListener("click", e => { const b=e.target.closest("[data-sug]"); if(!b) return; handleAsk(b.dataset.sug==="run"?PROMPT:b.textContent, b.dataset.sug); });
$("chatForm").addEventListener("submit", e => { e.preventDefault(); const v=$("chatInput").value.trim(); if(!v) return; $("chatInput").value=""; handleAsk(v); });
function handleAsk(text,kind){
  const q=text.toLowerCase();
  if(!S.ran || kind==="run" || /find|cari|rank|ranking|analy/.test(q) && !/why|kenapa/.test(q)){ if(S.running) return; return runAgent(text); }
  addMsg("user",text);
  const top=ranked()[0], k=byId(S.active);
  if(kind==="why" || /why|kenapa|alasan/.test(q)){
    const tw=S.W.reduce((a,b)=>a+b,0); const parts=D.dims.map((d,i)=>({d:d.label,v:top.k.c[i]*S.W[i]/tw})).sort((a,b)=>b.v-a.v);
    addMsg("agent",`<div class="who">Insight agent</div><b>${top.k.name}</b> leads because of ${parts[0].d.toLowerCase()} (${parts[0].v.toFixed(1)} pts) and ${parts[1].d.toLowerCase()} (${parts[1].v.toFixed(1)} pts). It has ${fmt(top.k.pois)} businesses and only ${top.k.fbb}% fixed broadband penetration.`);
    selectKel(top.k.id,"profile");
  } else if(kind==="boq" || /boq|cost|biaya|capex|ftth|fwa|payback/.test(q)){
    const c=costs(k,S.take);
    addMsg("agent",`<div class="who">Costing agent</div>${k.name} at ${Math.round(S.take*100)}% take-up: FTTH ${rp(c.ftth)} (${mo(c.pbF)} payback) vs FWA ${rp(c.fwa)} (${mo(c.pbW)}). Details are in the BOQ tab.`);
    setTab("boq");
  } else if(kind==="weights" || /weight|bobot|gap/.test(q)){
    S.W[2]=Math.min(50,S.W[2]+10); setTab("weights"); refreshMap();
    addMsg("agent",`<div class="who">Scoring agent</div>Competitive gap raised to ${S.W[2]}%. Weights are now a v2 draft and all kelurahan were re-scored. Submit v2 for Surge approval when you are happy with it.`);
  } else if(kind==="report" || /report|laporan|export|pdf/.test(q)){
    addMsg("agent",`<div class="who">Planner</div>Opening the report. You can download it as PDF or export the CSVs.`); setTimeout(()=>go("report"),500);
  } else {
    addMsg("agent",`<div class="who">Market Potential Agent</div>In this mockup I can explain the ranking, compare FTTH vs FWA, change weights, or generate the report.`);
  }
}
async function runAgent(prompt=PROMPT){
  if(S.running) return; S.running=true; S.stage=0; S.ran=false;
  $("reportBtn").disabled=true; $("chatSuggest").innerHTML=""; refreshMap(); renderResult();
  addMsg("user",prompt);
  setBadge("Running","bg-blue-100 text-blue-600");
  const box=addMsg("agent",`<div class="who">Market Potential Agent</div>`+STEPS.map((s,i)=>`<div class="step" id="st${i}"><span class="dot"></span><span>${s.t}<span class="ag">${s.ag}</span></span></div>`).join(""));
  for(let i=0;i<STEPS.length;i++){
    const el=box.querySelector("#st"+i); el.classList.add("run");
    await sleep(i===1?1200:800);
    el.classList.remove("run"); el.classList.add("done"); el.querySelector(".dot").textContent="✓";
    S.stage=i+1;
    if(i===3){ S.ran=true; S.ranAt=new Date(); }
    refreshMap();
    if(i===1 && mapReady) map.easeTo({center:D.area.center,zoom:D.area.zoom,duration:800});
  }
  S.running=false;
  const top=ranked()[0]; S.active=S.boqKel=top.k.id;
  addMsg("agent",`<div class="who">Result</div><b>${top.k.name}</b> ranks first with a score of <b>${Math.round(top.s)}</b>. ${ranked().filter(x=>tier(x.s)==="A").length} kelurahan are Tier A. Recommendation: launch on FWA, overlay FTTH once take-up passes ~${crossover(top.k)||40}%.`);
  $("reportBtn").disabled=false; setSuggest(); setTab("rank"); refreshMap();
}

/* ---------------- result panel ---------------- */
function setBadge(t,cls){ const b=$("resBadge"); b.textContent=t; b.className="text-2xs font-semibold px-2 py-0.5 rounded-full "+cls; }
function setTab(t){ S.tab=t; renderResult(); }
function selectKel(id,tab){ S.active=S.boqKel=id; if(tab) S.tab=tab; renderResult(); refreshMap(); }
const TABS=[["rank","Ranking"],["profile","Profile"],["weights","Weights"],["boq","BOQ"]];
function renderResult(){
  if(!S.ran){
    $("resTabs").classList.add("hidden");
    if(!S.running) setBadge("Waiting","bg-grey-100 text-grey-600");
    $("resBody").innerHTML = `<div class="flex flex-col items-center justify-center h-full py-10 text-center space-y-3">
      <div class="w-16 h-16 bg-grey-100 rounded-full flex items-center justify-center">${S.running?'<span class="spinner text-blue-500"></span>':'<svg class="w-8 h-8 text-grey-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>'}</div>
      <div><h3 class="text-sm font-semibold">${S.running?"Agents at work…":"No Analysis Yet"}</h3><p class="text-xs text-grey-600 mt-1">${S.running?"Scout, Insight, Scoring and Costing are running":"Ask the agent on the left to see results here"}</p></div></div>`;
    return;
  }
  setBadge(weightsChanged()?"Weights v2 draft":"Weights v1","bg-green-50 text-green-700");
  $("resTabs").classList.remove("hidden");
  $("resTabs").innerHTML = TABS.map(([k,l])=>`<button class="tab ${S.tab===k?"on":""}" data-tab="${k}">${l}</button>`).join("");
  ({rank:tabRank,profile:tabProfile,weights:tabWeights,boq:tabBoq})[S.tab]();
}
$("resTabs").addEventListener("click", e => { const b=e.target.closest("[data-tab]"); if(b) setTab(b.dataset.tab); });

function tabRank(){
  const r=ranked(), v1=v1Rank(), A=r.filter(x=>tier(x.s)==="A").length;
  $("resBody").innerHTML = `
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="box"><p class="lbl">Business POIs</p><p class="num text-lg font-bold text-brand-500">${fmt(r.reduce((a,x)=>a+x.k.pois,0))}</p></div>
      <div class="box"><p class="lbl">Kelurahan</p><p class="num text-lg font-bold text-brand-500">${r.length}</p></div>
      <div class="box"><p class="lbl">Tier A</p><p class="num text-lg font-bold text-blue-600">${A}</p></div>
    </div>
    <table class="tbl"><thead><tr><th>#</th><th>Kelurahan</th><th class="n">POIs</th><th class="n">FBB</th><th class="n">ISPs</th><th class="n">Score</th><th>Tier</th></tr></thead><tbody>
    ${r.map((x,i)=>{const d=v1[x.k.id]-(i+1),t=tier(x.s); return `<tr class="clickable ${x.k.id===S.active?"active":""}" data-kel="${x.k.id}">
      <td class="num">${i+1}${d?`<span class="delta ${d>0?"up":"down"}">${d>0?"▲":"▼"}${Math.abs(d)}</span>`:""}</td><td class="font-semibold">${x.k.name}</td>
      <td class="n">${fmt(x.k.pois)}</td><td class="n">${x.k.fbb}%</td><td class="n">${x.k.isps}</td><td class="n font-bold">${Math.round(x.s)}</td><td><span class="tier t${t}">${t}</span></td></tr>`}).join("")}
    </tbody></table>
    <p class="text-2xs text-grey-500 mt-2">Click a row or a kelurahan on the map to open its profile.</p>`;
  $("resBody").querySelectorAll("tr[data-kel]").forEach(tr=>tr.onclick=()=>{ selectKel(tr.dataset.kel,"profile"); flyTo(tr.dataset.kel); });
}
function flyTo(id){ const k=byId(id); if(mapReady) map.easeTo({center:[k.lon,k.lat],zoom:14.2,duration:700}); }
function tabProfile(){
  const k=byId(S.active), s=score(k), t=tier(s), tw=S.W.reduce((a,b)=>a+b,0)||1, rk=ranked().findIndex(x=>x.k.id===k.id)+1;
  $("resBody").innerHTML = `
    <div class="flex justify-between items-start">
      <div><p class="lbl">Rank ${rk} of ${ranked().length}</p><h3 class="text-xl font-bold">${k.name}</h3><p class="text-xs text-grey-500">${k.kec}, ${k.kota}</p></div>
      <div class="text-right"><p class="num text-4xl font-bold text-brand-500 leading-none">${Math.round(s)}</p><span class="tier t${t}">Tier ${t}</span></div>
    </div>
    <p class="lbl mt-4 mb-2">Business mix · ${fmt(k.pois)} POIs</p>
    <div class="grid grid-cols-3 gap-1.5">${D.segments.map(sg=>`<div class="bg-brand-50 rounded-xxs px-2 py-1.5"><p class="num text-sm font-bold">${fmt(k.mix[sg.k])}</p><p class="text-2xs text-grey-500 flex items-center gap-1"><span class="w-2 h-2 rounded-full" style="background:${sg.color}"></span>${sg.short}</p></div>`).join("")}</div>
    <p class="lbl mt-4 mb-2">Score build-up</p>
    <div class="space-y-2">${D.dims.map((d,i)=>`<div><div class="flex justify-between text-xs"><span>${d.label}</span><span class="num text-grey-500">${k.c[i]} × ${(S.W[i]/tw*100).toFixed(0)}% = <b class="text-grey-900">${(k.c[i]*S.W[i]/tw).toFixed(1)}</b></span></div><div class="h-1 bg-grey-200 rounded-full mt-1"><div class="h-1 bg-brand-500 rounded-full" style="width:${k.c[i]}%"></div></div></div>`).join("")}</div>
    <div class="bg-blue-100 rounded-xs p-3 mt-4 text-xs space-y-1.5">
      <p class="lbl text-blue-600">Agent insight</p>
      <p>${fmt(k.noOdp)} ruko on main roads have no fiber ODP within 250 m.</p>
      <p>${fmt(k.hh)} households, ${k.bc}% in house class B to C1; ${k.isps<=3?"only ":""}${k.isps} ISPs present.</p>
      <p>${k.fbb<=21?`Fixed broadband penetration is ${k.fbb}%, well below the area average.`:`Fixed broadband penetration is already ${k.fbb}%; win on business SLA, not price.`}</p>
    </div>
    <button id="toBoq" class="w-full mt-3 bg-brand-500 text-white text-sm font-semibold rounded-xs py-2.5 hover:bg-brand-400">Open BOQ for ${k.name}</button>`;
  $("toBoq").onclick=()=>setTab("boq");
}
function tabWeights(){
  const tot=S.W.reduce((a,b)=>a+b,0), ch=weightsChanged();
  $("resBody").innerHTML = `
    <div class="box mb-3 text-xs ${ch?"bg-yellow-50 border-yellow-200":"bg-green-50 border-green-200"}">${ch?"<b>v2 draft</b> · not yet approved by Surge":"<b>v1</b> · approved by Surge"}</div>
    ${D.dims.map((d,i)=>`<div class="mb-3"><div class="flex justify-between text-xs mb-1"><span>${d.label}</span><b class="num" id="wv${i}">${S.W[i]}%</b></div><input type="range" min="0" max="50" step="5" value="${S.W[i]}" data-w="${i}"></div>`).join("")}
    <div class="flex justify-between text-xs font-bold border-t border-grey-200 pt-2 ${tot!==100?"text-red-500":""}"><span>Total</span><span class="num" id="wTot">${tot}%${tot!==100?" · normalized":""}</span></div>
    <div class="flex gap-2 mt-3"><button id="wReset" class="btn-outline" ${ch?"":"disabled"}>Reset to v1</button>${ch?'<button id="wApprove" class="bg-brand-500 text-white text-sm font-medium px-3 h-9 rounded-xxs">Submit v2 for approval</button>':""}</div>
    <p class="text-2xs text-grey-500 mt-3">Tier A 75 and above · B 60 to 74 · C below 60. Every change re-scores all kelurahan and recolors the map instantly.</p>`;
  $("resBody").querySelectorAll("[data-w]").forEach(r=>{
    r.oninput=()=>{ const i=+r.dataset.w; S.W[i]=+r.value; $("wv"+i).textContent=S.W[i]+"%"; const t=S.W.reduce((a,b)=>a+b,0); $("wTot").textContent=t+"%"+(t!==100?" · normalized":""); refreshMap(); };
    r.onchange=()=>renderResult(); });
  $("wReset").onclick=()=>{ S.W=[...D.weightsV1]; renderResult(); refreshMap(); };
  if($("wApprove")) $("wApprove").onclick=()=>toast("Weights v2 sent to Surge for approval");
}
const q1 = q => Number.isInteger(q)?fmt(q):(+q).toFixed(q<10?2:1).replace(/\.?0+$/,"");
function boqTable(rows,sub,subRow,c,kind){
  return `<table class="tbl"><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Unit Rp jt</th><th class="n">Total</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${r.item}</td><td class="n">${q1(r.q)} <span class="text-grey-400">${r.unit}</span></td><td class="n"><input type="number" step="0.1" min="0" data-item="${r.item}" value="${r.p}"></td><td class="n">${fmt(r.tot)}</td></tr>`).join("")}
    <tr class="sub"><td colspan="3">${kind==="f"?`Subtotal homepass (Rp${(c.hp/byId(S.boqKel).premises).toFixed(2)} jt per HP)`:`Subtotal site${c.sites>1?` × ${c.sites}`:""}`}</td><td class="n">${fmt(kind==="f"?c.hp:c.site)}</td></tr>
    <tr><td>${subRow.item}</td><td class="n">${fmt(c.subs)} <span class="text-grey-400">sub</span></td><td class="n"><input type="number" step="0.1" min="0" data-item="${subRow.item}" value="${kind==="f"?c.dp:c.cp}"></td><td class="n">${fmt(kind==="f"?c.ftthSub:c.fwaSub)}</td></tr>
    <tr class="tot"><td colspan="3">Total capex</td><td class="n">${fmt(kind==="f"?c.ftth:c.fwa)}</td></tr></tbody></table>`;
}
function tabBoq(){
  const k=byId(S.boqKel), c=costs(k,S.take), tp=Math.round(S.take*100), x=crossover(k), fwaFirst=c.pbW<=c.pbF;
  $("resBody").innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <select id="bKel" class="text-sm font-semibold border border-grey-200 rounded-xxs px-2 py-1.5 flex-1">${ranked().map(r=>`<option value="${r.k.id}" ${r.k.id===S.boqKel?"selected":""}>${r.k.name} · ${Math.round(r.s)} (${tier(r.s)})</option>`).join("")}</select>
      <div class="seg" id="bTake">${[20,30,40,50].map(v=>`<button data-t="${v}" class="${v===tp?"on":""}">${v}%</button>`).join("")}</div>
    </div>
    <p class="text-2xs text-grey-500 mb-3">${fmt(k.premises)} premises · ${fmt(c.subs)} subscribers at ${tp}% take-up · ARPU Rp${S.arpu}k · margin ${S.margin}% · ${S.cap} subs per FWA site</p>
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div class="box ${!fwaFirst?"border-green-500":""}"><p class="lbl">FTTH · GPON</p><p class="num text-lg font-bold">${rp(c.ftth)}</p><p class="text-2xs text-grey-500">${mo(c.pbF)} payback</p></div>
      <div class="box ${fwaFirst?"border-green-500":""}"><p class="lbl">FWA · 5G 1.4 GHz</p><p class="num text-lg font-bold">${rp(c.fwa)}</p><p class="text-2xs text-grey-500">${mo(c.pbW)} payback</p></div>
    </div>
    <div class="box mb-3"><div class="flex justify-between items-baseline"><p class="lbl">Payback vs take-up</p><p class="text-2xs text-grey-500">${x?`FTTH cheaper from ${x}%`:""}</p></div>${chartSVG(k,tp,x)}</div>
    <div class="bg-brand-500 text-white rounded-xs p-3 mb-3"><p class="lbl text-blue-200">Agent recommendation</p><p class="text-sm font-semibold mt-1">${fwaFirst
      ? `Launch ${k.name} on FWA now (${mo(c.pbW)} vs ${mo(c.pbF)} for FTTH). Overlay FTTH when take-up passes ${x||"~40"}%, before a second FWA site is needed.`
      : `At ${tp}% take-up FTTH pays back faster (${mo(c.pbF)} vs ${mo(c.pbW)}). Go FTTH-first${c.sites>1?`; FWA would need ${c.sites} sites`:""}.`}</p></div>
    <p class="lbl mb-1">FTTH · BOQ / BOM</p>${boqTable(c.f,null,D.boq.ftthSub,c,"f")}
    <p class="lbl mt-4 mb-1">FWA · BOQ / BOM</p>${boqTable(c.w,null,D.boq.fwaSub,c,"w")}
    <p class="text-2xs text-grey-500 mt-2">Unit costs are illustrative and editable; Surge's rate card replaces them.</p>`;
  $("bKel").onchange=e=>{ S.boqKel=S.active=e.target.value; renderResult(); refreshMap(); flyTo(S.boqKel); };
  $("bTake").onclick=e=>{ const b=e.target.closest("[data-t]"); if(b){ S.take=+b.dataset.t/100; renderResult(); } };
  $("resBody").querySelectorAll("input[data-item]").forEach(i=>i.onchange=()=>{ S.prices[i.dataset.item]=+i.value||0; const st=$("resBody").scrollTop; renderResult(); $("resBody").scrollTop=st; });
}
function chartSVG(k,tp,x,W=440,H=170){
  const p={l:34,r:10,t:12,b:24}, d=[]; for(let t=10;t<=60;t++){ const c=costs(k,t/100); d.push({t,f:c.pbF,w:c.pbW}); }
  const ymax=Math.min(120,Math.ceil(Math.max(...d.map(v=>Math.max(v.f,v.w)).filter(isFinite))/10)*10)||60;
  const X=t=>p.l+(t-10)/50*(W-p.l-p.r), Y=v=>p.t+(1-Math.min(v,ymax)/ymax)*(H-p.t-p.b);
  const path=key=>d.map((v,i)=>(i?"L":"M")+X(v.t).toFixed(1)+","+Y(v[key]).toFixed(1)).join("");
  let g=""; for(let v=0;v<=ymax;v+=ymax/4) g+=`<line x1="${p.l}" x2="${W-p.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E4E3E4"/><text x="${p.l-5}" y="${Y(v)+3}" font-size="9" fill="#79797B" text-anchor="end">${Math.round(v)}</text>`;
  [10,20,30,40,50,60].forEach(t=>g+=`<text x="${X(t)}" y="${H-7}" font-size="9" fill="#79797B" text-anchor="middle">${t}%</text>`);
  const sel=d.find(v=>v.t===tp)||d[0];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" font-family="Inter,sans-serif">${g}
    ${x&&x<=60?`<rect x="${X(x)}" y="${p.t}" width="${X(60)-X(x)}" height="${H-p.t-p.b}" fill="#205CD9" opacity=".06"/>`:""}
    <path d="${path("w")}" fill="none" stroke="#00D075" stroke-width="2.5"/><path d="${path("f")}" fill="none" stroke="#011641" stroke-width="2.5"/>
    <line x1="${X(sel.t)}" x2="${X(sel.t)}" y1="${p.t}" y2="${H-p.b}" stroke="#205CD9" stroke-dasharray="3 3"/>
    <circle cx="${X(sel.t)}" cy="${Y(sel.f)}" r="3.5" fill="#011641"/><circle cx="${X(sel.t)}" cy="${Y(sel.w)}" r="3.5" fill="#00D075"/>
    <g font-size="10" font-weight="600"><rect x="${W-120}" y="${p.t}" width="10" height="3" fill="#011641"/><text x="${W-106}" y="${p.t+4}">FTTH</text>
    <rect x="${W-66}" y="${p.t}" width="10" height="3" fill="#00D075"/><text x="${W-52}" y="${p.t+4}">FWA</text></g>
    <text x="${p.l}" y="${p.t-3}" font-size="9" fill="#79797B">months</text></svg>`;
}

/* ---------------- 5. report ---------------- */
function renderReport(){
  const r=ranked(), top=r[0], c=costs(top.k,S.take), x=crossover(top.k), tp=Math.round(S.take*100);
  const A=r.filter(v=>tier(v.s)==="A"), B=r.filter(v=>tier(v.s)==="B"), C=r.filter(v=>tier(v.s)==="C");
  const capA=A.reduce((a,v)=>a+costs(v.k,.3).fwa,0);
  let snap=""; try{ if(mapReady){ map.triggerRepaint(); snap=map.getCanvas().toDataURL("image/jpeg",.85); } }catch(e){ snap=""; }
  const date=(S.ranAt||new Date()).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  $("reportDoc").innerHTML = `<div class="rep">
    <div class="flex items-center justify-between border-b border-grey-200 pb-4 mb-6">
      <img src="assets/logo-cartogram.png" class="h-8" alt="Cartogram Platform">
      <span class="text-2xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">ILLUSTRATIVE DATA</span>
    </div>
    <p class="lbl">Market Potential Agent · Report</p>
    <h1 class="mt-1">Business broadband potential in Tanah Abang and Setiabudi</h1>
    <p class="text-grey-500 mt-2">${date} · ${D.area.province} · Kec. ${[...S.loc.kec].join(" + ")} · Weights ${weightsChanged()?"v2 (draft)":"v1 (approved)"}</p>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
      <div class="kpi"><b>${fmt(r.reduce((a,v)=>a+v.k.pois,0))}</b><span>business POIs found</span></div>
      <div class="kpi"><b>${r.length}</b><span>kelurahan scored</span></div>
      <div class="kpi"><b>${A.length}</b><span>Tier A kelurahan</span></div>
      <div class="kpi"><b>${rp(capA)}</b><span>Phase 1 FWA capex, Tier A at 30%</span></div>
    </div>

    <h2>1. Summary</h2>
    <p><b>${top.k.name}</b> ranks first with a score of ${Math.round(top.s)}: ${fmt(top.k.pois)} businesses, ${fmt(top.k.hh)} households and only ${top.k.fbb}% fixed broadband penetration. Top three: ${r.slice(0,3).map(v=>`${v.k.name} (${Math.round(v.s)})`).join(", ")}.
    Recommendation: launch Tier A on FWA, then overlay FTTH where take-up passes ~${x||40}%, before a second FWA site is needed.</p>

    ${snap?`<h2>2. Map</h2><img src="${snap}" alt="Map snapshot" class="w-full rounded-xs border border-grey-200">`:""}

    <h2>${snap?3:2}. Kelurahan ranking</h2>
    <table class="tbl"><thead><tr><th>#</th><th>Kelurahan</th><th>Kecamatan</th><th class="n">POIs</th><th class="n">Offices</th><th class="n">FBB pen.</th><th class="n">ISPs</th><th class="n">Score</th><th>Tier</th></tr></thead><tbody>
    ${r.map((v,i)=>`<tr><td class="num">${i+1}</td><td class="font-semibold">${v.k.name}</td><td>${v.k.kec}</td><td class="n">${fmt(v.k.pois)}</td><td class="n">${v.k.mix.office}</td><td class="n">${v.k.fbb}%</td><td class="n">${v.k.isps}</td><td class="n font-bold">${Math.round(v.s)}</td><td><span class="tier t${tier(v.s)}">${tier(v.s)}</span></td></tr>`).join("")}</tbody></table>

    <h2>${snap?4:3}. FTTH vs FWA · ${top.k.name} at ${tp}% take-up</h2>
    <table class="tbl"><thead><tr><th></th><th class="n">FTTH · GPON</th><th class="n">FWA · 5G 1.4 GHz</th></tr></thead><tbody>
      <tr><td>Capex at launch</td><td class="n">${rp(c.ftth)}</td><td class="n">${rp(c.fwa)}</td></tr>
      <tr><td>Capex per subscriber</td><td class="n">Rp${(c.ftth/c.subs).toFixed(1)} jt</td><td class="n">Rp${(c.fwa/c.subs).toFixed(1)} jt</td></tr>
      <tr><td>Payback</td><td class="n">${mo(c.pbF)}</td><td class="n">${mo(c.pbW)}</td></tr>
      <tr><td>Sites / homepass</td><td class="n">${fmt(top.k.premises)} HP</td><td class="n">${c.sites} site</td></tr></tbody></table>
    <div class="mt-3">${chartSVG(top.k,tp,x,640,200)}</div>

    <h2>${snap?5:4}. Rollout plan</h2>
    <table class="tbl"><thead><tr><th>Phase</th><th>Scope</th><th>Kelurahan</th></tr></thead><tbody>
      <tr><td class="font-semibold">1 · FWA launch</td><td>One site per kelurahan, collocated near Surge assets</td><td>${A.map(v=>v.k.name).join(", ")||"–"}</td></tr>
      <tr><td class="font-semibold">2 · Expand</td><td>After Phase 1 hits target take-up; re-score with live data</td><td>${B.map(v=>v.k.name).join(", ")||"–"}</td></tr>
      <tr><td class="font-semibold">3 · FTTH overlay</td><td>Trigger: take-up above ~${x||40}% in any launched kelurahan</td><td>Trigger-based</td></tr>
      <tr><td class="font-semibold">Hold</td><td>Monitor</td><td>${C.map(v=>v.k.name).join(", ")||"–"}</td></tr></tbody></table>

    <h2>${snap?6:5}. Method and assumptions</h2>
    <p>Score = weighted sum of six components (0–100, percentile vs DKI): ${D.dims.map((d,i)=>`${d.label} ${S.W[i]}%`).join(", ")}. Tier A 75+, B 60–74, C below 60.
    Costing: ARPU Rp${S.arpu}k, contribution margin ${S.margin}%, ${S.cap} subscribers per FWA site. BOQ unit costs are illustrative placeholders; Surge's rate card replaces them in the pilot.</p>
    <p class="text-2xs text-grey-500 mt-6 border-t border-grey-200 pt-3">Mockup prepared for Surge. All figures are illustrative and not a price offer. Data: Cartogram POI layer (sample), kelurahan boundaries simplified.</p>
  </div>`;
}
$("printBtn").onclick = () => window.print();
function download(name,content,type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast("Downloaded "+name); }
const csv = rows => rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?`"${String(v).replace(/"/g,'""')}"`:v).join(",")).join("\n");
document.querySelectorAll("[data-export]").forEach(b=>b.onclick=()=>{
  const t=b.dataset.export;
  if(t==="rank") download("kelurahan_ranking.csv",csv([["rank","kelurahan","kecamatan","pois","offices","fbb_pen_pct","isps","score","tier"],...ranked().map((x,i)=>[i+1,x.k.name,x.k.kec,x.k.pois,x.k.mix.office,x.k.fbb,x.k.isps,x.s.toFixed(1),tier(x.s)])]),"text/csv");
  if(t==="poi"){ if(!poiGeo) return toast("POI layer unavailable"); download("business_pois.geojson",JSON.stringify({type:"FeatureCollection",features:poiGeo.features.filter(f=>S.sel.has(f.properties.kel))}),"application/geo+json"); }
  if(t==="boq"){ const k=byId(S.boqKel), c=costs(k,S.take), rows=[["option","item","qty","unit","unit_rp_jt","total_rp_jt"]];
    c.f.forEach(r=>rows.push(["FTTH",r.item,r.q,r.unit,r.p,r.tot.toFixed(1)])); rows.push(["FTTH",D.boq.ftthSub.item,c.subs,"sub",c.dp,c.ftthSub.toFixed(1)],["FTTH","TOTAL","","","",c.ftth.toFixed(1)]);
    c.w.forEach(r=>rows.push(["FWA",r.item,r.q,r.unit,r.p,r.tot.toFixed(1)])); rows.push(["FWA",D.boq.fwaSub.item,c.subs,"sub",c.cp,c.fwaSub.toFixed(1)],["FWA","TOTAL","","","",c.fwa.toFixed(1)]);
    download(`BOQ_${k.name.replace(/\s+/g,"_")}_${Math.round(S.take*100)}pct.csv`,csv(rows),"text/csv"); }
});

/* ---------------- boot ---------------- */
route();
})();
