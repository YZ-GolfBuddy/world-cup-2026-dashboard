# 2026 FIFA World Cup Dashboard

Static interactive dashboard for the 2026 FIFA World Cup schedule, standings,
venues, knockout bracket, and Polymarket winner-market snapshot.

## Local

```bash
npm run dev
```

Open `http://localhost:5174`.

## Update Data

```bash
npm run update:data
```

The update script refreshes `data.js` from:

- Wikipedia 2026 FIFA World Cup page for schedule, scores, venues, and tables.
- Polymarket Gamma API for 2026 FIFA World Cup winner markets.

## GitHub Pages Automation

`.github/workflows/pages.yml` updates the data hourly, commits changed snapshots,
and deploys the static site to GitHub Pages. It can also be run manually from
the GitHub Actions tab.
