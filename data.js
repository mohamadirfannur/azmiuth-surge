/* ==========================================================
   DATA — ILLUSTRATIVE. Replace with Cartogram pipeline output.
   Everything the UI renders comes from this file.
   ========================================================== */
window.MPA_DATA = {
  user: { first_name: "Admin", last_name: "Surge", email: "admin@example.com" },
  // Demo login (client-side only, not real auth)
  login: { email: "admin@example.com", password: "admintest123" },

  area: {
    province: "DKI Jakarta",
    cities: ["Jakarta Pusat", "Jakarta Selatan"],
    kecamatan: ["Tanah Abang", "Setiabudi"],
    center: [106.8195, -6.2065],
    zoom: 13.4,
  },

  segments: [
    { k: "umkm",   label: "UMKM and home business", short: "UMKM",       color: "#205CD9" },
    { k: "ruko",   label: "Ruko and shophouses",    short: "Ruko",       color: "#00D075" },
    { k: "office", label: "Offices and B2B",        short: "Offices",    color: "#011641" },
    { k: "retail", label: "Retail, F&B, services",  short: "Retail",     color: "#F59E0B" },
    { k: "edu",    label: "Schools and clinics",    short: "Edu/health", color: "#AF0914" },
    { k: "ind",    label: "Industrial, warehouses", short: "Industrial", color: "#79797B" },
  ],

  dims: [
    { k: "density",   label: "Business density" },
    { k: "household", label: "Household demand" },
    { k: "gap",       label: "Competitive gap" },
    { k: "afford",    label: "Affordability fit" },
    { k: "mobility",  label: "Mobility and activity" },
    { k: "network",   label: "Network readiness" },
  ],
  weightsV1: [25, 20, 20, 15, 10, 10],

  /* c = component scores 0–100 in dims order.
     mix = business POIs per segment. premises = homepass/premises passed. */
  kelurahan: [
    { id:"bhil", name:"Bendungan Hilir", kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8125, lat:-6.2120, hh:9400,  bc:68, fbb:18, isps:3, premises:2000, noOdp:180, c:[96,84,92,82,80,78], mix:{umkm:300,ruko:228,office:96,retail:132,edu:22,ind:34} },
    { id:"kkac", name:"Kebon Kacang",    kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8160, lat:-6.1925, hh:8100,  bc:64, fbb:21, isps:4, premises:1800, noOdp:146, c:[90,82,86,80,78,74], mix:{umkm:262,ruko:192,office:81,retail:110,edu:20,ind:29} },
    { id:"kbal", name:"Kampung Bali",    kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8205, lat:-6.1870, hh:7300,  bc:61, fbb:24, isps:4, premises:1650, noOdp:122, c:[86,80,80,76,74,70], mix:{umkm:220,ruko:160,office:74,retail:92,edu:18,ind:24} },
    { id:"kkun", name:"Karet Kuningan",  kec:"Setiabudi",   kota:"Jakarta Selatan", lon:106.8290, lat:-6.2215, hh:6200,  bc:52, fbb:31, isps:6, premises:1500, noOdp:84,  c:[82,70,62,80,82,72], mix:{umkm:180,ruko:120,office:88,retail:110,edu:18,ind:24} },
    { id:"kmel", name:"Kebon Melati",    kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8130, lat:-6.2000, hh:8800,  bc:71, fbb:19, isps:3, premises:1400, noOdp:98,  c:[74,78,78,62,64,60], mix:{umkm:196,ruko:118,office:41,retail:78,edu:17,ind:22} },
    { id:"ksem", name:"Karet Semanggi",  kec:"Setiabudi",   kota:"Jakarta Selatan", lon:106.8190, lat:-6.2225, hh:5400,  bc:55, fbb:27, isps:5, premises:1300, noOdp:70,  c:[72,62,66,74,70,66], mix:{umkm:160,ruko:100,office:63,retail:96,edu:16,ind:20} },
    { id:"pmbr", name:"Petamburan",      kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8020, lat:-6.1985, hh:10200, bc:74, fbb:22, isps:3, premises:1200, noOdp:52,  c:[60,74,72,54,60,58], mix:{umkm:128,ruko:58,office:32,retail:44,edu:15,ind:14} },
    { id:"ktng", name:"Karet Tengsin",   kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8165, lat:-6.2080, hh:6900,  bc:66, fbb:20, isps:2, premises:1100, noOdp:48,  c:[54,64,74,58,56,56], mix:{umkm:124,ruko:52,office:18,retail:42,edu:14,ind:12} },
    { id:"stbd", name:"Setiabudi",       kec:"Setiabudi",   kota:"Jakarta Selatan", lon:106.8285, lat:-6.2085, hh:5800,  bc:58, fbb:26, isps:3, premises:1050, noOdp:44,  c:[56,60,68,66,58,50], mix:{umkm:130,ruko:50,office:22,retail:50,edu:14,ind:12} },
    { id:"kret", name:"Karet",           kec:"Setiabudi",   kota:"Jakarta Selatan", lon:106.8235, lat:-6.2150, hh:6300,  bc:63, fbb:21, isps:2, premises:950,  noOdp:40,  c:[52,62,74,56,50,48], mix:{umkm:142,ruko:44,office:9,retail:22,edu:14,ind:9} },
    { id:"glra", name:"Gelora",          kec:"Tanah Abang", kota:"Jakarta Pusat",   lon:106.8020, lat:-6.2160, hh:4100,  bc:60, fbb:23, isps:2, premises:900,  noOdp:38,  c:[48,52,72,54,52,46], mix:{umkm:138,ruko:38,office:6,retail:24,edu:12,ind:10} },
    // outside business-broadband scope in this demo
    { id:"ktim", name:"Kuningan Timur", kec:"Setiabudi", kota:"Jakarta Selatan", lon:106.8330, lat:-6.2285, excluded:true },
    { id:"mata", name:"Menteng Atas",   kec:"Setiabudi", kota:"Jakarta Selatan", lon:106.8385, lat:-6.2190, excluded:true },
    { id:"pmgs", name:"Pasar Manggis",  kec:"Setiabudi", kota:"Jakarta Selatan", lon:106.8400, lat:-6.2090, excluded:true },
    { id:"gntr", name:"Guntur",         kec:"Setiabudi", kota:"Jakarta Selatan", lon:106.8355, lat:-6.2020, excluded:true },
  ],

  surgeAssets: [
    { name:"St. Tanah Abang",            type:"KRL station", lon:106.8108, lat:-6.1856 },
    { name:"St. Karet",                  type:"KRL station", lon:106.8160, lat:-6.2006 },
    { name:"St. BNI City",               type:"KRL station", lon:106.8215, lat:-6.2024 },
    { name:"Kantor Pos Bendungan Hilir", type:"Kantor Pos",  lon:106.8150, lat:-6.2142 },
    { name:"Kantor Pos Setiabudi",       type:"Kantor Pos",  lon:106.8295, lat:-6.2105 },
  ],

  /* BOQ templates per 2,000 premises (Rp juta). Surge rate card replaces these. */
  boq: {
    ftth: [
      { item:"OLT GPON card, 16 port",         qty:2,   unit:"card", price:45,  scale:"ceil" },
      { item:"Feeder cable, 96 core",          qty:4.5, unit:"km",   price:38,  scale:"dec" },
      { item:"Distribution cable, 24 core",    qty:12,  unit:"km",   price:22,  scale:"dec" },
      { item:"ODC cabinet, 144 core",          qty:2,   unit:"unit", price:28,  scale:"ceil" },
      { item:"ODP, 16 port",                   qty:125, unit:"unit", price:2.4, scale:"ceil" },
      { item:"Pole 7 m, installed",            qty:380, unit:"unit", price:1.6, scale:"round" },
      { item:"Jointing, civil works, permits", qty:1,   unit:"lot",  price:240, scale:"lot" },
    ],
    ftthSub: { item:"Drop cable and ONT", unit:"sub", price:1.1 },
    fwa: [
      { item:"Tower collocation, civil, power", qty:1,   unit:"site",   price:280 },
      { item:"gNB radio 1.4 GHz, Open RAN",     qty:3,   unit:"sector", price:120 },
      { item:"Antenna, cabling, mounting",      qty:3,   unit:"sector", price:20 },
      { item:"Fiber backhaul to site",          qty:1.2, unit:"km",     price:75 },
      { item:"Battery and rectifier",           qty:1,   unit:"site",   price:70 },
      { item:"Install, commissioning, permits", qty:1,   unit:"lot",    price:140 },
    ],
    fwaSub: { item:"CPE, outdoor unit and router", unit:"sub", price:1.5 },
  },
  assumptions: { arpuK: 150, marginPct: 60, subsPerFwaSite: 800, takeUp: 0.30 },
};
