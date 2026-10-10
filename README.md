# Crease — Cricket Analytics

A standalone, client-side IPL dashboard using the two included CSV datasets (2008–2017).
No database, API server, login, API keys, or environment secrets are needed.

## Run locally
Install Node.js 22.12+ or Node.js 24. From this folder:

    npm install
    npm run dev

Or use `pnpm install` and `pnpm dev`.
For a production build, run `npm run build`, then `npm run preview` to preview it.
Upload the contents of `dist/` to a static website host. Do not open index.html directly
from disk: use a web server. Set `base` in vite.config.ts if hosting under a subdirectory.

## Included
- Overview, Teams, and Players views with season, team, and opponent filters.
- Player runs/wickets by opponent pie charts with color descriptions and sortable scorecard tables.
- Player pagination (10/20/30/40/50 rows), highest batting scores and best bowling figures.
- Scorecard insight tiles, inferred championships/finals, and batting-order win rates by team/venue.
- Original CSVs in attached_assets/ and a precomputed data file in public/data/.
- Source files, styling, and favicon. Fonts load from Google Fonts with local fallbacks.

## Rebuild the data (optional; Python 3 standard library only)
    python scripts/cricket-data.py public/data/cricket.json

The website ships with generated data, so Python is not needed to run or build it.
Only the supplied seasons are included; there is no live feed or upload screen.
Super overs are excluded from player summaries. Bowler wickets exclude run-outs,
retired hurt, and obstructing the field. Economy uses six legal balls per over;
bowler runs exclude byes and leg-byes. Pune spelling variants are combined, but distinct
franchises stay separate. Missing batting/bowling averages display as a dash.
Tournament finals are inferred as the last scheduled match per season (by date, with
match ID resolving same-day ties); its winner is assumed champion. Finals are inferred
from the full schedule before season/team/opponent filtering. Batting order is derived
from toss decisions. Win rates exclude no-results, include awarded tie-break winners
and D/L matches, and show wins/decided-match denominators. Local venue filters affect
the strategy comparison only, not championship records or other overview tiles.
These original CSVs are user-supplied; verify their reuse rights before redistributing.

This archive does not include credentials, dependency folders, or Replit-only services.
