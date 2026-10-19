# Cartogram · Market Potential Agent — mockup for Surge

Static clickable mockup. Flow: **Login → Hero → Business Planning → Location filter → Map + Agent → Report (PDF/CSV)**.
Design tokens (colors, radius, Raleway, panel layout) follow `surge-main/web`. All data is illustrative.

## Run locally (VS Code)
- Install the **Live Server** extension → right-click `index.html` → *Open with Live Server*
- or: `npx serve .`
Login: `admin@example.com` / `admintest123` (set in `data.js` → `login`).

## Deploy to Vercel
No build step needed.
- **CLI:** `npm i -g vercel` → `vercel` in this folder → `vercel --prod`
- **Dashboard:** push this folder to a GitHub repo → vercel.com → *Add New Project* → import → Framework Preset **Other**, leave build command empty → Deploy

## Files
| File | What |
|---|---|
| `index.html` | All 5 screens (hash routes `#/login`, `#/hero`, `#/planning`, `#/map`, `#/report`) |
| `data.js` | **All data** — kelurahan, scores, POI mix, Surge assets, BOQ rate card, assumptions. Swap with the Cartogram pipeline output. |
| `app.js` | Router, map, agent chat, scoring, costing, report, exports |
| `styles.css` | Component styles (panels, chat, tables, print) |
| `tailwind.css` | Compiled Tailwind (Surge tokens) |
| `tailwind.config.js`, `src/` | Only needed if you add new Tailwind classes |
| `vendor/` | MapLibre GL 4.7.1, d3-delaunay 6.0.4 (bundled, no CDN) |
| `assets/` | Images and logos from the Surge repo |

## If you add new Tailwind classes
```
npx tailwindcss@3.4.16 -c tailwind.config.js -i src/tailwind.input.css -o tailwind.css --minify
```

## Notes
- Basemap: MapTiler (`dataviz-light`). Set `MAPTILER_KEY` at the top of `app.js` (needs internet).
- Kelurahan boundaries are simplified (Voronoi) and POI points are generated from counts in `data.js`. Swap in real GeoJSON later.
- Login is client-side only (credentials in `data.js`, session in sessionStorage). No backend — not real security.
