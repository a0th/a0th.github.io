# brviz

Brazil vs peers. Source of truth: this folder.

```bash
cd projects/brviz
npm install
npm run dev          # http://127.0.0.1:3000
uv run brviz fetch   # refresh WDI / PISA / Fraser / IMF / Pink Sheet
uv run brviz fetch --only imf   # splice IMF series into data/wdi.csv
uv run brviz fetch --only commodities   # World Bank Pink Sheet prices
BRVIZ_BASE=/projects/brviz npm run build
cp -a dist/. .
```

- `src/index.md` — report
- `src/components/data.js` — series
- `src/components/plots.js` — charts
