# 22 Yards — A Game of Margin

## Project documentation

**Product:** A standalone IPL cricket-statistics website  
**Seasons covered:** 2008–2017  
**Brand:** 22 Yards — A Game of Margin  
**Inputs:** Two supplied CSV files; no external data feeds  
**Current product structure:** Overview, Teams, and Players views

## 1. Project overview

22 Yards turns a historical IPL match schedule and ball-by-ball deliveries file into a filterable cricket record book. It brings together season and match summaries, inferred tournament results, team performance by batting order, and player batting and bowling summaries.

The delivery file is used to calculate aggregated player and innings statistics. The website does **not** display individual delivery records or a ball-by-ball score viewer. The application is designed to run as a static client-side website with a locally bundled, precomputed JSON dataset; it does not require a database, application API, login, or user-provided credentials.

The intended users are cricket followers who want to browse a decade of IPL results, compare teams and players, and narrow the analysis by season, team, opponent, or venue.

## 2. Source datasets

Both files were provided with the project and are retained as the data source:

| File | Records | Purpose |
|---|---:|---|
| `matches_1791551424126.csv` | 636 matches | Season, date, participating teams, city and venue, toss, result, winner, win margin, D/L indicator, and player of the match |
| `deliveries_1791551424126.csv` | 150,460 deliveries | Match and innings, batting and bowling teams, batter and bowler, runs, extras, super-over indicator, and dismissal details |

The match file covers ten seasons, 2008 through 2017, and 35 venues. Important match fields include `id`, `season`, `date`, `team1`, `team2`, `toss_winner`, `toss_decision`, `winner`, `win_by_runs`, `win_by_wickets`, `dl_applied`, and `venue`. Important delivery fields include `match_id`, `inning`, `batting_team`, `bowling_team`, `over`, `ball`, `batsman`, `bowler`, `is_super_over`, `batsman_runs`, `total_runs`, and dismissal fields.

Delivery records are rolled up before display. The current bundled dataset contains 9,550 batter-match summaries, 7,571 bowler-match summaries, and 1,270 team-innings summaries. The source files remain available to rebuild those summaries; raw ball-by-ball detail is not a dashboard feature.

## 3. Data preparation and metric definitions

- Match, batting, bowling, and innings summaries are prepared from the two supplied CSVs and bundled as `public/data/cricket.json`.
- Super-over deliveries are excluded from player and innings summaries.
- “Balls faced” excludes wides. Legal balls exclude wides and no-balls.
- Bowler runs conceded exclude byes, leg-byes, and penalty runs.
- Run-outs, retired hurt, obstructing the field, and retired out do not count as bowler wickets. Retired hurt also does not count as a batter dismissal.
- The “best bowling figures” tile ranks by most wickets first, then fewest runs conceded.
- The abbreviated Rising Pune franchise spelling in the source data is normalized. Other franchise identities remain distinct.
- Missing batting or bowling averages are shown as a dash rather than an invented value.
- The batting-first team is identified from the toss decision and toss winner, not inferred from the winning margin.
- A batting-order win rate is **wins divided by decided appearances in that batting order**. The dashboard also displays the wins and decided-match count. No-results and ties without an awarded winner are excluded; matches with a recorded tie-break winner and D/L matches are included.

## 4. Main dashboard features

### Overview

- Four archive summary cards: matches in view, average team innings total, leading run-scorer, and leading wicket-taker.
- Six compact, filter-aware record tiles: highest individual score, best bowling figures, highest team total, largest non-D/L run-margin victory, boundary contribution, and toss-winner success.
- An inferred championship and finals ledger, rankable by championships or finals appearances.
- A season-by-season list of the inferred final matchups and recorded winners.
- Season, team, and opponent controls for the match archive and tournament ledger.

### Teams

- Team-focused results, season performance, and head-to-head context.
- Win-rate comparison for batting first and bowling first, based on toss decisions.
- The comparison can be summarized overall, by team, or by venue.
- Team and venue breakdown tables provide match counts, wins and decided appearances for both batting orders. Venue selection is local to the strategy comparison.
- Rates with no decided appearances are shown as unavailable, not as zero.

### Players

- Aggregated batting and bowling summaries with season, team, and opponent filters.
- Player statistics can be explored against opponents without exposing delivery-by-delivery records.
- Top score and best bowling figures are identified in the filtered data.
- Player tables default to 10 rows and offer 20, 30, 40, or 50 rows per page. Pagination makes remaining results reachable.
- Pie-chart series are accompanied by color-coded labels and values.
- The match scorecard trail uses a sortable, paginated data grid rather than a stack of match cards.

## 5. Product design and implementation

- **Visual direction:** editorial cricket record book; warm paper, forest green, and vermilion; DM Serif Display headings with DM Sans supporting text.
- **Brand:** 22 Yards, with the user-provided tagline “A Game of Margin.”
- **Responsive behavior:** the overview, charts, tables, and filters adapt to mobile-sized screens.
- **Web stack:** React, TypeScript, Vite, and Recharts.
- **Runtime:** a bundled static data file is loaded by the browser. There is no runtime database or API requirement.
- **Build artifact:** `downloads/crease-source.zip` contains an independent copy of the app and supplied inputs. The source archive retains its original project folder name; the displayed product brand is 22 Yards.

## 6. Tournament-inference rule

The supplied match file does not provide an independently verified final label for each season. At the user's direction, the app treats the **latest match by date in each season** as the inferred final; match ID resolves a same-date tie. The winner recorded for that match is treated as champion.

Finals are identified from the **complete season schedule before** team, opponent, or season filters are applied. Filters then select among those inferred finals. This avoids mistaking a team's latest filtered match for a season final. The UI presents these results as inferred, not as independently verified official tournament records.

On the supplied 2008–2017 data, this rule identifies Mumbai Indians as champions three times and Chennai Super Kings as appearing in the most inferred finals, six times.

## 7. User-led design history

The work went through **four major user-led stages**: the initial brief plus three refinement rounds. This is a count of high-level product/design requests, not individual code edits.

1. **Initial brief and discovery:** build a cricket analytics website from two standalone CSV files; show summary, team, interactive, and player statistics; summarize deliveries rather than displaying ball-by-ball records. In discovery, the user chose a visual prototype first and to use only the two bundled files.
2. **First refinement:** requested configurable player-page sizes and pagination, top batting score, best bowling figures, clearer pie-chart labels, a scorecard data grid, and removal of the uninformative season-by-season graph.
3. **Second refinement:** requested scorecard-style tiles instead of descriptive insight text, inferred season champions and finals appearances from the last match, removal of repeated overview figures, and stronger batting-first/bowling-first rates with team and venue analysis.
4. **Brand refinement:** the user replaced “Crease” with the custom name and tagline “22 Yards — A Game of Margin.”

The fuller prompt history and a reusable handoff prompt are in [`requirements.md`](requirements.md).

## 8. Known boundaries

- The dataset is limited to the supplied 2008–2017 CSV records.
- There is no CSV upload or refresh workflow.
- Tournament-final and champion labels are inferred under the rule above.
- Dashboard summaries aggregate delivery data; individual ball-by-ball records are not displayed.
- No external data sources, live scores, or later IPL seasons are included.
