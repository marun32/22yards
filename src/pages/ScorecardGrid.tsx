import { useEffect, useMemo, useState } from "react";
import type { DataSet, Match } from "./CricketDashboard";
import { GridPagination } from "./GridPagination";

type Card = { match: Match; team: string; opponent: string; runs: number; balls: number; fours: number; sixes: number; outs: number; wickets: number };
type SortKey = "date" | "runs" | "wickets";
export function ScorecardGrid({ data, matches, player, kind, team, opponent }: {
  data: DataSet; matches: Match[]; player: string; kind: "Batting" | "Bowling"; team: string; opponent: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortKey>("date");
  const [ascending, setAscending] = useState(false);
  useEffect(() => { setPage(1); }, [matches, player, kind, pageSize, sort, ascending]);
  const cards = useMemo(() => {
    const grouped = new Map<number, Card>();
    const byId = new Map(matches.map(match => [match.id, match]));
    const rows = kind === "Batting" ? data.batting : data.bowling;
    rows.forEach(row => {
      const match = byId.get(row[0]);
      if (!match || row[1] !== player || (team !== "all" && row[2] !== team) || (opponent !== "all" && row[3] !== opponent)) return;
      const card = grouped.get(match.id) ?? { match, team: row[2], opponent: row[3], runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, wickets: 0 };
      card.runs += row[4]; card.balls += row[5];
      if (kind === "Batting") { card.fours += row[6]; card.sixes += row[7] ?? 0; card.outs += row[8] ?? 0; }
      else card.wickets += row[6];
      grouped.set(match.id, card);
    });
    return [...grouped.values()].sort((a, b) => {
      const compare = sort === "date" ? a.match.date.localeCompare(b.match.date) : a[sort] - b[sort];
      return (ascending ? compare : -compare) || b.match.id - a.match.id;
    });
  }, [data, matches, player, kind, team, opponent, sort, ascending]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(cards.length / pageSize)));
  const header = (key: SortKey, label: string) => <th scope="col" aria-sort={sort === key ? ascending ? "ascending" : "descending" : "none"}>
    <button onClick={() => { setSort(key); setAscending(sort === key ? !ascending : false); }}>{label}{sort === key ? ascending ? " ↑" : " ↓" : " ↕"}</button>
  </th>;
  return <section className="crease-scorecard-grid">
    <div className="crease-scorecard-heading"><div><div className="crease-eyebrow">Match-by-match</div><div className="crease-panel-title">The scorecard trail</div></div><span>{cards.length} {cards.length === 1 ? "match" : "matches"}</span></div>
    <div className="crease-table-wrap"><table className="crease-table">
      <caption className="crease-sr-only">{player}'s match scorecards; date and performance columns can be sorted</caption>
      <thead><tr>{header("date", "Date")}<th scope="col">Season</th><th scope="col">Team</th><th scope="col">Opponent</th><th scope="col">Venue</th>
        {kind === "Batting" ? <>{header("runs", "Runs")}<th scope="col">Balls</th><th scope="col">4s</th><th scope="col">6s</th><th scope="col">Strike rate</th><th scope="col">Dismissed</th></> :
          <>{header("wickets", "Wickets")}{header("runs", "Runs conceded")}<th scope="col">Overs</th><th scope="col">Economy</th></>}
        <th scope="col">Match result</th>
      </tr></thead><tbody>
        {cards.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(card => <tr key={card.match.id}>
          <td>{card.match.date}</td><td>{card.match.season}</td><td>{card.team}</td><td>{card.opponent}</td><td>{card.match.venue}</td>
          {kind === "Batting" ? <><td className="crease-positive">{card.runs}</td><td>{card.balls}</td><td>{card.fours}</td><td>{card.sixes}</td><td>{card.balls ? (card.runs * 100 / card.balls).toFixed(2) : "—"}</td><td>{card.outs ? "Yes" : "No"}</td></> :
            <><td className="crease-positive">{card.wickets}</td><td>{card.runs}</td><td>{Math.floor(card.balls / 6)}.{card.balls % 6}</td><td>{card.balls ? (card.runs * 6 / card.balls).toFixed(2) : "—"}</td></>}
          <td>{!card.match.winner || card.match.winner === "NA" ? "No result" : card.match.winner === card.team ? "Won" : "Lost"}{card.match.result === "tie" ? " (tie-break)" : ""}</td>
        </tr>)}
        {!cards.length && <tr><td colSpan={kind === "Batting" ? 12 : 10}>No scorecards match the current filters.</td></tr>}
      </tbody></table></div>
    <GridPagination page={currentPage} pageSize={pageSize} total={cards.length} onPage={setPage} onPageSize={setPageSize} />
    <div className="crease-panel-foot">Click Date or performance headings to sort. Overs use legal balls (e.g. 3.2 means 3 overs and 2 balls). Individual deliveries are not displayed.</div>
  </section>;
}
