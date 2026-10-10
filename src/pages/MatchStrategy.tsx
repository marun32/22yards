import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { GridPagination } from "./GridPagination";
import { orderBreakdown } from "./cricket-analytics";
import type { Match } from "./CricketDashboard";
import "./insights.css";

type MatchStrategyProps = { matches: Match[]; focusTeam: string; filterKey: string };
type Dimension = "overall" | "team" | "venue";
const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const pct = (value: number | null) => value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`;

export function MatchStrategy({ matches, focusTeam, filterKey }: MatchStrategyProps) {
  const [dimension, setDimension] = useState<Dimension>("team");
  const [venue, setVenue] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setVenue("all");
    setSearch("");
    setPage(1);
  }, [filterKey]);

  const venues = useMemo(() => [...new Set(matches.map(match => match.venue || "Unknown venue"))].sort(), [matches]);
  const filteredVenueMatches = useMemo(
    () => venue === "all" ? matches : matches.filter(match => (match.venue || "Unknown venue") === venue),
    [matches, venue],
  );
  const overall = useMemo(() => orderBreakdown(filteredVenueMatches, focusTeam, "overall")[0], [filteredVenueMatches, focusTeam]);
  const breakdown = useMemo(
    () => orderBreakdown(filteredVenueMatches, focusTeam, dimension),
    [filteredVenueMatches, focusTeam, dimension],
  );
  const searchRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return breakdown.filter(row => !query || row.name.toLocaleLowerCase().includes(query));
  }, [breakdown, search]);
  const pages = Math.max(1, Math.ceil(searchRows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visibleRows = searchRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const chartRows = [...breakdown].sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name)).slice(0, 10);
  const groupTitle = dimension === "overall" ? "Overall" : dimension === "team" ? "Team" : "Venue";
  const changeDimension = (next: Dimension) => { setDimension(next); setPage(1); };
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
  const changeVenue = (value: string) => { setVenue(value); setPage(1); };
  const orderTooltip = (value: unknown, name: string) => [pct(typeof value === "number" ? value : null), name === "batWinRate" || name === "Batting first" ? "Batting first" : "Bowling first"];

  return (
    <section className="crease-panel crease-strategy-panel" data-testid="section-match-strategy">
      <div className="crease-panel-head crease-strategy-head">
        <div>
          <div className="crease-eyebrow">Decision ledger</div>
          <h2 className="crease-panel-title">Bat first or chase?</h2>
          <div className="crease-panel-subtitle">Win rate by actual batting order, identified from the toss decision.</div>
        </div>
        <div className="crease-strategy-controls">
          <label className="crease-insights-control">
            <span>Venue · strategy only</span>
            <select value={venue} onChange={event => changeVenue(event.target.value)} aria-label="Venue for match strategy" data-testid="select-strategy-venue">
              <option value="all">All venues</option>
              {venues.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="crease-order-summary">
        <div className="crease-order-kicker">{focusTeam === "all" ? "All teams" : focusTeam}<span>{venue === "all" ? " · all selected venues" : ` · ${venue}`}</span></div>
        <div className="crease-order-cards">
          <div className="crease-order-card">
            <div className="crease-order-label"><i className="crease-order-swatch bat" /> Batting first</div>
            <strong>{pct(overall?.batWinRate ?? null)}</strong>
            <span>{fmt(overall?.batWins ?? 0)} wins / {fmt(overall?.batDecided ?? 0)} decided appearances</span>
          </div>
          <div className="crease-order-card">
            <div className="crease-order-label"><i className="crease-order-swatch bowl" /> Bowling first</div>
            <strong>{pct(overall?.bowlWinRate ?? null)}</strong>
            <span>{fmt(overall?.bowlWins ?? 0)} wins / {fmt(overall?.bowlDecided ?? 0)} decided appearances</span>
          </div>
        </div>
      </div>

      <div className="crease-strategy-breakdown">
        <div className="crease-strategy-chart-panel">
          <div className="crease-strategy-subhead">
            <div><span className="crease-strategy-caption">{groupTitle} comparison</span><span className="crease-panel-subtitle">Win rate · % of decided appearances</span></div>
            <div className="crease-order-legend"><span><i className="bat" /> Bat first</span><span><i className="bowl" /> Bowl first</span></div>
          </div>
          {chartRows.some(row => row.batWinRate !== null || row.bowlWinRate !== null) ? (
            <div className="crease-strategy-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 2, left: 8 }} barCategoryGap={8}>
                  <CartesianGrid stroke="#e7e5dc" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} tick={{ fill: "#7b837c", fontSize: 9 }} axisLine={{ stroke: "#d7d7cc" }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={128} tickFormatter={(value: string) => value.length > 22 ? `${value.slice(0, 21)}…` : value} tick={{ fill: "#59645d", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fbfaf6", border: "1px solid #d9d8cd", borderRadius: 2, fontSize: 10 }} formatter={orderTooltip} />
                  <Bar dataKey="batWinRate" name="Batting first" fill="#174b3c" radius={[0, 2, 2, 0]} isAnimationActive={false} />
                  <Bar dataKey="bowlWinRate" name="Bowling first" fill="#c44e32" radius={[0, 2, 2, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="crease-strategy-empty">No decided batting-order outcomes in this selection.</div>}
          {breakdown.length > 10 && <div className="crease-panel-foot">Chart shows the 10 groups with the most matches; the searchable table contains all {breakdown.length} groups.</div>}
        </div>

        <div className="crease-strategy-note">
          <div className="crease-eyebrow">Reading the rate</div>
          <p>Wins are divided by decided appearances in that order. Unresolved ties and no-results are excluded from the denominator.</p>
          <p>Super-over / awarded tie-break winners count as decided; D/L matches remain in the sample. The toss decision—not the win margin—sets batting order.</p>
          <p>Small samples can produce extreme rates. Compare the win / decided counts before drawing conclusions.</p>
          <div className="crease-strategy-sample">{fmt(filteredVenueMatches.length)} matches in strategy sample</div>
        </div>
      </div>

      <div className="crease-strategy-table-head">
        <div>
          <div className="crease-eyebrow">Full breakdown</div>
          <div className="crease-strategy-table-title">Every {dimension === "overall" ? "sample" : dimension}</div>
        </div>
        <label className="crease-strategy-search">
          <span className="crease-sr-only">Search {dimension} breakdown</span>
          <input type="search" value={search} onChange={event => changeSearch(event.target.value)} placeholder={`Search ${dimension === "overall" ? "breakdown" : dimension}`} aria-label={`Search ${dimension} breakdown`} data-testid="input-strategy-search" />
        </label>
      </div>
      <div className="crease-strategy-dimensions" role="group" aria-label="Breakdown dimension">
        {(["overall", "team", "venue"] as Dimension[]).map(item => (
          <button key={item} type="button" className={dimension === item ? "active" : ""} onClick={() => changeDimension(item)} aria-pressed={dimension === item} data-testid={`button-strategy-${item}`}>
            {item === "overall" ? "Overall" : item === "team" ? "By team" : "By venue"}
          </button>
        ))}
      </div>
      <div className="crease-table-wrap crease-strategy-table-wrap">
        <table className="crease-table crease-strategy-table">
          <thead><tr>
            <th>{groupTitle}</th><th>Matches</th><th>Bat first · wins / decided</th><th>Rate</th><th>Bowl first · wins / decided</th><th>Rate</th>
          </tr></thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.name} data-testid={`strategy-row-${row.name}`}>
                <td>{row.name}</td><td>{fmt(row.matches)}</td>
                <td>{fmt(row.batWins)} / {fmt(row.batDecided)}</td><td className="crease-strategy-rate">{pct(row.batWinRate)}</td>
                <td>{fmt(row.bowlWins)} / {fmt(row.bowlDecided)}</td><td className="crease-strategy-rate">{pct(row.bowlWinRate)}</td>
              </tr>
            ))}
            {!visibleRows.length && <tr><td colSpan={6} className="crease-strategy-no-results">No matching groups in this sample.</td></tr>}
          </tbody>
        </table>
      </div>
      <GridPagination page={currentPage} pageSize={pageSize} total={searchRows.length} onPage={next => setPage(Math.min(pages, Math.max(1, next)))} onPageSize={size => { setPageSize(size); setPage(1); }} />
    </section>
  );
}
