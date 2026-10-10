import "./insights.css";
import { useState } from "react";
import type { BatPlayer, BowlPlayer, DataSet, Match } from "./CricketDashboard";
import {
  championshipTable,
  filterFinals,
  inferSeasonFinals,
  recordTiles,
} from "./cricket-analytics";
import { MatchStrategy } from "./MatchStrategy";

type OverviewInsightsProps = {
  data: DataSet;
  matches: Match[];
  innings: DataSet["innings"];
  batting: BatPlayer[];
  bowling: BowlPlayer[];
  season: string;
  team: string;
  opponent: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export function OverviewInsights({
  data, matches, innings, batting, bowling, season, team, opponent,
}: OverviewInsightsProps) {
  const [rankBy, setRankBy] = useState<"titles" | "finals">("titles");
  // Finals must be inferred from the unfiltered schedule before applying the current view.
  const inferredFinals = inferSeasonFinals(data.matches);
  const filteredFinals = filterFinals(inferredFinals, season, team, opponent);
  const rows = championshipTable(filteredFinals, team);
  const allTeamRows = championshipTable(filteredFinals).sort((a, b) =>
    rankBy === "titles" ? b.titles - a.titles || b.finals - a.finals || a.team.localeCompare(b.team)
      : b.finals - a.finals || b.titles - a.titles || a.team.localeCompare(b.team));
  const tiles = recordTiles(matches, innings, batting, bowling, data.matches);
  const maxCount = Math.max(1, ...allTeamRows.map(row => Math.max(row.titles, row.finals)));

  return (
    <div className="crease-insights-page">
      <section className="crease-panel crease-record-panel" data-testid="section-selection-insights">
        <div className="crease-panel-head crease-insights-head">
          <div>
            <div className="crease-eyebrow">From the scorebook</div>
            <h2 className="crease-panel-title">What this selection reveals</h2>
            <div className="crease-panel-subtitle">Selected-match records, set out like a compact scorecard.</div>
          </div>
          <span className="crease-insights-stamp">{matches.length.toLocaleString("en-IN")} MATCHES</span>
        </div>
        <div className="crease-record-grid">
          {tiles.map((tile, index) => (
            <article className="crease-record-tile" key={tile.label} data-testid={`record-tile-${index}`}>
              <span className="crease-record-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="crease-record-label">{tile.label}</div>
              <div className="crease-record-value">{tile.value}</div>
              <div className="crease-record-subject">{tile.subject}</div>
              <div className="crease-record-detail">{tile.detail}</div>
            </article>
          ))}
        </div>
        <div className="crease-panel-foot">Records follow the selected performance rows; match outcomes follow the current match filters.</div>
      </section>

      <section className="crease-insights-honours">
        <div className="crease-panel crease-honours-panel">
          <div className="crease-panel-head">
            <div>
              <div className="crease-eyebrow">Silverware ledger</div>
              <h2 className="crease-panel-title">Championships &amp; finals</h2>
              <div className="crease-panel-subtitle">Teams with final appearances in this selection. Counts follow the season, team and opponent filters.</div>
            </div>
            <span className="crease-insights-stamp">{filteredFinals.length} FINALS</span>
          </div>
          <div className="crease-honours-ranking" role="group" aria-label="Finals team ranking">
            <button aria-pressed={rankBy === "titles"} onClick={() => setRankBy("titles")}>Most championships</button>
            <button aria-pressed={rankBy === "finals"} onClick={() => setRankBy("finals")}>Most finals</button>
          </div>
          <div className="crease-honours-chart" role="group" aria-label="Team championship and finals count comparison">
            <div className="crease-honours-axis"><span>TEAM</span><span>TITLES</span><span>FINALS</span></div>
            {allTeamRows.map(row => (
              <div className={`crease-honours-row${team !== "all" && row.team === team ? " is-focus" : ""}`} key={row.team} data-testid={`honours-row-${row.team}`}>
                <span className="crease-honours-team" title={row.team}>{row.team}</span>
                <span className="crease-honours-count">
                  <b>{row.titles}</b><i style={{ width: `${row.titles / maxCount * 100}%` }} />
                </span>
                <span className="crease-honours-count crease-honours-finals">
                  <b>{row.finals}</b><i style={{ width: `${row.finals / maxCount * 100}%` }} />
                </span>
              </div>
            ))}
            {!allTeamRows.length && <div className="crease-honours-empty">No inferred finals meet these filters.</div>}
          </div>
          <div className="crease-panel-foot">
            Inference: the last match by date in each season is assumed to be the final; match ID breaks same-day ties.
            {team !== "all" && rows[0] && <span className="crease-honours-focus"> {team}: {rows[0].titles} titles · {rows[0].finals} finals.</span>}
          </div>
        </div>

        <div className="crease-panel crease-final-panel">
          <div className="crease-panel-head">
            <div>
              <div className="crease-eyebrow">Season by season</div>
              <h2 className="crease-panel-title">Season finals</h2>
              <div className="crease-panel-subtitle">The matchups behind this filtered finals ledger.</div>
            </div>
          </div>
          <div className="crease-final-list">
            {filteredFinals.map(final => {
              const winner = final.winner === final.team1 || final.winner === final.team2 ? final.winner : "";
              return (
                <div className="crease-final-row" key={final.id} data-testid={`final-match-${final.season}`}>
                  <span className="crease-final-season">{final.season}</span>
                  <span className="crease-final-pairing">
                    <b className={winner === final.team1 ? "is-winner" : ""}>{final.team1}</b>
                    <span>v</span>
                    <b className={winner === final.team2 ? "is-winner" : ""}>{final.team2}</b>
                  </span>
                  <span className="crease-final-outcome">{winner ? `${winner} won` : "No decided winner"}</span>
                </div>
              );
            })}
            {!filteredFinals.length && <div className="crease-honours-empty">No inferred finals meet these filters.</div>}
          </div>
          <div className="crease-panel-foot">Final appearances include both finalists; an undecided result adds no title or runner-up.</div>
        </div>
      </section>

      <MatchStrategy matches={matches} focusTeam={team} filterKey={JSON.stringify([season, team, opponent])} />
    </div>
  );
}
