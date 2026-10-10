import { useEffect, useState } from "react";
import type { BatPlayer, BowlPlayer } from "./CricketDashboard";
import { GridPagination } from "./GridPagination";

const number = (value: number) => value.toLocaleString("en-IN");
const decimal = (value: number | null) => value == null ? "—" : value.toFixed(2);

export function PlayerTable({ rows, kind, selected, onSelect, filterKey }: {
  rows: (BatPlayer | BowlPlayer)[];
  kind: "Batting" | "Bowling";
  selected: string | null;
  onSelect: (name: string | null) => void;
  filterKey: string;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filterKey, kind, pageSize]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <section className="crease-panel crease-table-panel">
    <div className="crease-panel-head">
      <div><div className="crease-eyebrow">Player index · {kind.toLowerCase()}</div>
        <div className="crease-panel-title">{kind === "Batting" ? "The run-makers" : "The wicket-takers"}</div>
        <div className="crease-panel-subtitle">Select a player to see opponent breakdowns and match scorecards.</div>
      </div><span className="crease-panel-subtitle">{rows.length} players</span>
    </div>
    {rows.length ? <div className="crease-table-wrap"><table className="crease-table">
      <caption className="crease-sr-only">Player {kind.toLowerCase()} statistics for the selected filters</caption>
      <thead><tr><th scope="col">Player</th><th scope="col">Team</th>
        {kind === "Batting" ? <><th scope="col">Runs</th><th scope="col">Top score</th><th scope="col">Innings</th><th scope="col">Balls</th><th scope="col">Average</th><th scope="col">Strike rate</th><th scope="col">4s</th><th scope="col">6s</th></> :
          <><th scope="col">Wickets</th><th scope="col">Best figures</th><th scope="col">Innings</th><th scope="col">Legal balls</th><th scope="col">Runs conceded</th><th scope="col">Average</th><th scope="col">Economy</th></>}
      </tr></thead>
      <tbody>{shown.map(row => <tr key={row.player} className={selected === row.player ? "crease-selected-row" : ""}>
        <td><button className="crease-player-link" aria-expanded={selected === row.player} onClick={() => onSelect(selected === row.player ? null : row.player)}>{row.player}</button></td>
        <td>{row.team}</td>
        {kind === "Batting" ? (() => { const bat = row as BatPlayer; return <>
          <td className="crease-positive">{number(bat.runs)}</td><td>{bat.highScore}</td><td>{bat.innings}</td><td>{number(bat.balls)}</td><td>{decimal(bat.avg)}</td><td>{decimal(bat.sr)}</td><td>{number(bat.fours)}</td><td>{number(bat.sixes)}</td>
        </>; })() : (() => { const bowl = row as BowlPlayer; return <>
          <td className="crease-positive">{number(bowl.wickets)}</td><td>{bowl.bestWickets}/{bowl.bestRuns}</td><td>{bowl.innings}</td><td>{number(bowl.balls)}</td><td>{number(bowl.conceded)}</td><td>{decimal(bowl.average)}</td><td>{decimal(bowl.economy)}</td>
        </>; })()}
      </tr>)}</tbody>
    </table></div> : <div className="crease-empty"><strong>No player rows found</strong>Try another search or broaden your filters.</div>}
    <GridPagination page={currentPage} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={setPageSize} />
    <div className="crease-panel-foot">{kind === "Batting" ? "Top score = highest single innings in view. Average = runs / outs; strike rate = runs per 100 balls." : "Best figures = most wickets in a single innings, then fewest runs conceded (wickets/runs). Economy = runs per six legal balls."} All player results are available through pagination.</div>
  </section>;
}
