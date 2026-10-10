import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import "./cricket.css";
import { PlayerTable } from "./PlayerTable";
import { ScorecardGrid } from "./ScorecardGrid";
import { OverviewInsights } from "./OverviewInsights";
import { MatchStrategy } from "./MatchStrategy";

export type Match = {
  id: number; season: number; date: string; team1: string; team2: string; winner: string;
  result: string; venue: string; city: string; toss_winner: string; toss_decision: string;
  win_by_runs: number; win_by_wickets: number; player_of_match: string; dl_applied: number;
};
export type DataSet = {
  matches: Match[];
  batting: [number, string, string, string, number, number, number, number, number][];
  bowling: [number, string, string, string, number, number, number][];
  innings: [number, string, string, number, number, number][];
  meta: { deliveryCount: number; excludedSuperOverDeliveries: number; description: string };
};
export type BatPlayer = { player: string; team: string; runs: number; balls: number; fours: number; sixes: number; outs: number; innings: number; avg: number | null; sr: number | null; highScore: number };
export type BowlPlayer = { player: string; team: string; conceded: number; balls: number; wickets: number; innings: number; average: number | null; economy: number | null; bestWickets: number; bestRuns: number };
type Tab = "Overview" | "Teams" | "Players";

const DEFAULT_TEAM = "Mumbai Indians";
const number = (value: number) => new Intl.NumberFormat("en-IN").format(value);
const decimal = (value: number | null, digits = 1) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
const shortTeam = (team: string) => team
  .replace("Royal Challengers Bangalore", "RCB")
  .replace("Kolkata Knight Riders", "KKR")
  .replace("Mumbai Indians", "MI")
  .replace("Chennai Super Kings", "CSK")
  .replace("Rajasthan Royals", "RR")
  .replace("Delhi Daredevils", "DD")
  .replace("Delhi Capitals", "DC")
  .replace("Kings XI Punjab", "KXIP")
  .replace("Sunrisers Hyderabad", "SRH")
  .replace("Deccan Chargers", "DC")
  .replace("Gujarat Lions", "GL")
  .replace("Rising Pune Supergiant", "RPS")
  .replace("Pune Warriors", "PW")
  .replace("Kochi Tuskers Kerala", "KTK");

function aggregateBat(rows: DataSet["batting"], matchSeason: Map<number, number>, season: string, team: string, opponent: string): BatPlayer[] {
  const grouped = new Map<string, BatPlayer>();
  rows.forEach(([matchId, player, rowTeam, rowOpponent, runs, balls, fours, sixes, outs]) => {
    if ((season !== "all" && String(matchSeason.get(matchId)) !== season) || (team !== "all" && rowTeam !== team) || (opponent !== "all" && rowOpponent !== opponent)) return;
    const key = player;
    const item = grouped.get(key) ?? { player, team: rowTeam, runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, innings: 0, avg: null, sr: null, highScore: 0 };
    if (item.team !== rowTeam) item.team = "Multiple teams";
    item.runs += runs; item.balls += balls; item.fours += fours; item.sixes += sixes; item.outs += outs; item.innings += 1;
    item.highScore = Math.max(item.highScore, runs);
    grouped.set(key, item);
  });
  return [...grouped.values()].map(item => ({ ...item, avg: item.outs ? item.runs / item.outs : null, sr: item.balls ? item.runs * 100 / item.balls : null })).sort((a, b) => b.runs - a.runs);
}
function aggregateBowl(rows: DataSet["bowling"], matchSeason: Map<number, number>, season: string, team: string, opponent: string): BowlPlayer[] {
  const grouped = new Map<string, BowlPlayer>();
  rows.forEach(([matchId, player, rowTeam, rowOpponent, conceded, balls, wickets]) => {
    if ((season !== "all" && String(matchSeason.get(matchId)) !== season) || (team !== "all" && rowTeam !== team) || (opponent !== "all" && rowOpponent !== opponent)) return;
    const key = player;
    const item = grouped.get(key) ?? { player, team: rowTeam, conceded: 0, balls: 0, wickets: 0, innings: 0, average: null, economy: null, bestWickets: wickets, bestRuns: conceded };
    if (item.team !== rowTeam) item.team = "Multiple teams";
    item.conceded += conceded; item.balls += balls; item.wickets += wickets; item.innings += 1;
    if (wickets > item.bestWickets || (wickets === item.bestWickets && conceded < item.bestRuns)) {
      item.bestWickets = wickets; item.bestRuns = conceded;
    }
    grouped.set(key, item);
  });
  return [...grouped.values()].map(item => ({ ...item, average: item.wickets ? item.conceded / item.wickets : null, economy: item.balls ? item.conceded / (item.balls / 6) : null })).sort((a, b) => b.wickets - a.wickets || (a.economy ?? 999) - (b.economy ?? 999));
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="crease-empty"><strong>{title}</strong>{detail}</div>;
}

export function CricketDashboard() {
  const [data, setData] = useState<DataSet | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [season, setSeason] = useState("all");
  const [team, setTeam] = useState("all");
  const [opponent, setOpponent] = useState("all");
  const [teamFocus, setTeamFocus] = useState(DEFAULT_TEAM);
  const [playerKind, setPlayerKind] = useState<"Batting" | "Bowling">("Batting");
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [breakdownOpponent, setBreakdownOpponent] = useState("all");

  const loadData = () => {
    setLoading(true); setLoadError(false);
    fetch(`${import.meta.env.BASE_URL}data/cricket.json`)
      .then(response => { if (!response.ok) throw new Error("Could not load cricket data"); return response.json() as Promise<DataSet>; })
      .then(result => { setData(result); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
  };
  useEffect(() => { loadData(); }, []);

  const seasons = useMemo(() => [...new Set((data?.matches ?? []).map(match => match.season))].sort((a, b) => a - b), [data]);
  const teams = useMemo(() => [...new Set((data?.matches ?? []).flatMap(match => [match.team1, match.team2]))].sort(), [data]);
  useEffect(() => {
    if (teams.length && (!teams.includes(teamFocus) || teamFocus === "all")) setTeamFocus(teams.includes(DEFAULT_TEAM) ? DEFAULT_TEAM : teams[0]);
  }, [teams, teamFocus]);
  const matchSeason = useMemo(() => new Map((data?.matches ?? []).map(match => [match.id, match.season])), [data]);

  const filteredMatches = useMemo(() => (data?.matches ?? []).filter(match =>
    (season === "all" || String(match.season) === season) &&
    (team === "all" || match.team1 === team || match.team2 === team) &&
    (opponent === "all" || match.team1 === opponent || match.team2 === opponent)
  ), [data, season, team, opponent]);
  const filteredInnings = useMemo(() => {
    const matchIds = new Set(filteredMatches.map(match => match.id));
    return (data?.innings ?? []).filter(row => matchIds.has(row[0]));
  }, [data, filteredMatches]);
  const allWins = filteredMatches.filter(match => match.winner && match.winner !== "NA").length;
  const batting = useMemo(() => aggregateBat(data?.batting ?? [], matchSeason, season, team, opponent), [data, matchSeason, season, team, opponent]);
  const bowling = useMemo(() => aggregateBowl(data?.bowling ?? [], matchSeason, season, team, opponent), [data, matchSeason, season, team, opponent]);

  const teamMatches = useMemo(() => (data?.matches ?? []).filter(match =>
    (season === "all" || String(match.season) === season) &&
    (match.team1 === teamFocus || match.team2 === teamFocus) &&
    (opponent === "all" || match.team1 === opponent || match.team2 === opponent)
  ), [data, season, teamFocus, opponent]);
  const teamWins = teamMatches.filter(match => match.winner === teamFocus).length;
  const teamLosses = teamMatches.filter(match => match.winner && match.winner !== "NA" && match.winner !== teamFocus).length;
  const winRate = teamWins + teamLosses ? teamWins * 100 / (teamWins + teamLosses) : null;
  const h2h = useMemo(() => teamMatches.filter(match => opponent !== "all" && (match.team1 === opponent || match.team2 === opponent)), [teamMatches, opponent]);
  const headWins = h2h.filter(match => match.winner === teamFocus).length;
  const oppWins = h2h.filter(match => match.winner === opponent).length;
  const teamTrend = seasons.filter(year => season === "all" || String(year) === season).map(year => {
    const group = teamMatches.filter(match => match.season === year);
    const wins = group.filter(match => match.winner === teamFocus).length;
    const decided = group.filter(match => match.winner && match.winner !== "NA").length;
    return { year, winRate: decided ? wins * 100 / decided : null, played: group.length };
  });
  const playerRows = playerKind === "Batting" ? batting : bowling;
  const visiblePlayers = playerRows.filter(row => row.player.toLowerCase().includes(search.toLowerCase()));
  const selectedBat = selectedPlayer ? batting.find(player => player.player === selectedPlayer) : undefined;
  const selectedBowl = selectedPlayer ? bowling.find(player => player.player === selectedPlayer) : undefined;
  const playerMatches = useMemo(() => {
    if (!data || !selectedPlayer) return [];
    const matchIds = new Set<number>();
    if (playerKind === "Batting") {
      data.batting.forEach(row => {
        if (row[1] === selectedPlayer && (season === "all" || String(matchSeason.get(row[0])) === season) && (team === "all" || row[2] === team) && (opponent === "all" || row[3] === opponent)) matchIds.add(row[0]);
      });
    } else {
      data.bowling.forEach(row => {
        if (row[1] === selectedPlayer && (season === "all" || String(matchSeason.get(row[0])) === season) && (team === "all" || row[2] === team) && (opponent === "all" || row[3] === opponent)) matchIds.add(row[0]);
      });
    }
    return data.matches.filter(match => matchIds.has(match.id)).sort((a, b) => b.season - a.season || b.date.localeCompare(a.date));
  }, [data, selectedPlayer, playerKind, season, team, opponent, matchSeason]);
  const playerOpponentBreakdown = useMemo(() => {
    if (!data || !selectedPlayer) return [];
    const grouped = new Map<string, number>();
    if (playerKind === "Batting") {
      data.batting.forEach(row => {
        const [matchId, player, playerTeam, opposingTeam, runs] = row;
        if (player !== selectedPlayer || (season !== "all" && String(matchSeason.get(matchId)) !== season) ||
            (team !== "all" && playerTeam !== team) || (opponent !== "all" && opposingTeam !== opponent) ||
            (breakdownOpponent !== "all" && opposingTeam !== breakdownOpponent)) return;
        grouped.set(opposingTeam, (grouped.get(opposingTeam) ?? 0) + runs);
      });
    } else {
      data.bowling.forEach(row => {
        const [matchId, player, playerTeam, opposingTeam, , , wickets] = row;
        if (player !== selectedPlayer || (season !== "all" && String(matchSeason.get(matchId)) !== season) ||
            (team !== "all" && playerTeam !== team) || (opponent !== "all" && opposingTeam !== opponent) ||
            (breakdownOpponent !== "all" && opposingTeam !== breakdownOpponent)) return;
        grouped.set(opposingTeam, (grouped.get(opposingTeam) ?? 0) + wickets);
      });
    }
    return [...grouped.entries()].map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [data, selectedPlayer, playerKind, season, team, opponent, breakdownOpponent, matchSeason]);

  const clearFilters = () => { setSeason("all"); setTeam("all"); setOpponent("all"); setTeamFocus(teams.includes(DEFAULT_TEAM) ? DEFAULT_TEAM : (teams[0] ?? DEFAULT_TEAM)); setSelectedPlayer(null); };
  useEffect(() => { setBreakdownOpponent("all"); }, [selectedPlayer, playerKind, season, team, opponent]);
  if (loading) return <main className="crease"><div className="crease-shell"><header className="crease-masthead"><div className="crease-brand"><span className="crease-mark">22</span><span className="crease-brand-name">22 Yards</span></div><span className="crease-prototype">IPL archive · 2008–2017</span></header><div className="crease-loading"><div className="crease-skeleton" /><div className="crease-skeleton" /><div className="crease-skeleton" /></div></div></main>;
  if (loadError || !data) return <main className="crease"><div className="crease-shell"><header className="crease-masthead"><div className="crease-brand"><span className="crease-mark">22</span><span className="crease-brand-name">22 Yards</span></div><span className="crease-prototype">IPL archive · 2008–2017</span></header><section className="crease-error"><h2>The scorebook is out of reach.</h2><p>22 Yards could not read the supplied IPL archive. Check that the data file is available, then try again.</p><button onClick={loadData}>Try again</button></section></div></main>;

  const averageRuns = filteredInnings.length ? filteredInnings.reduce((sum, row) => sum + row[3], 0) / filteredInnings.length : null;
  const overviewTitle = season === "all" ? ["Ten seasons.", "Every edge."] : [`${season}`, "In the numbers."];
  const changeTeamFilter = (nextTeam: string) => {
    setTeam(nextTeam);
    if (opponent === nextTeam) setOpponent("all");
    setSelectedPlayer(null);
  };
  const changeTeamFocus = (nextTeam: string) => {
    if (nextTeam === "all") return;
    setTeamFocus(nextTeam);
    if (opponent === nextTeam) setOpponent("all");
    setSelectedPlayer(null);
  };
  const changeOpponent = (nextOpponent: string) => {
    const focusedTeam = tab === "Teams" ? teamFocus : team;
    setOpponent(nextOpponent !== "all" && nextOpponent === focusedTeam ? "all" : nextOpponent);
    setSelectedPlayer(null);
  };

  return (
    <main className="crease">
      <div className="crease-shell">
        <header className="crease-masthead">
          <div className="crease-brand"><span className="crease-mark">22</span><span className="crease-brand-name">22 Yards</span><span className="crease-edition">A Game of Margin</span></div>
          <div className="crease-prototype">Cricket analytics <span>·</span> IPL 2008–2017</div>
        </header>
        <section className="crease-topline">
          <div><div className="crease-kicker">A decade, under the microscope</div><h1 className="crease-headline">{overviewTitle[0]}<br /><em>{overviewTitle[1]}</em></h1><p className="crease-deck">Follow the rivalries, the repeat performers and the moments hidden inside ten seasons of Indian Premier League cricket.</p></div>
          <div style={{ textAlign: "right", color: "#758078", fontSize: 10, lineHeight: 1.8 }}><div>2008 — 2017</div><div>{number(data.matches.length)} matches in archive</div></div>
        </section>
        <nav className="crease-nav" aria-label="Cricket analysis sections">
          {(["Overview", "Teams", "Players"] as Tab[]).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setSelectedPlayer(null); }}>{item}</button>)}
        </nav>
        <section className="crease-filterbar" aria-label="Data filters">
          <span className="crease-filter-label">Filter the archive</span>
          <label className="crease-select-wrap"><select className="crease-select" value={season} onChange={event => { setSeason(event.target.value); setSelectedPlayer(null); }} aria-label="Season"><option value="all">All seasons</option>{seasons.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
          <label className="crease-select-wrap"><select className="crease-select" value={tab === "Teams" ? teamFocus : team} onChange={event => tab === "Teams" ? changeTeamFocus(event.target.value) : changeTeamFilter(event.target.value)} aria-label={tab === "Teams" ? "Focus team" : "Team"}>{tab !== "Teams" && <option value="all">All teams</option>}{teams.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="crease-select-wrap"><select className="crease-select" value={opponent} onChange={event => changeOpponent(event.target.value)} aria-label="Opponent"><option value="all">Any opponent</option>{teams.filter(name => name !== (tab === "Teams" ? teamFocus : team)).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <button className="crease-reset" onClick={clearFilters}>Reset filters</button>
          <span className="crease-view-note">{tab === "Teams" ? `Team focus: ${teamFocus}` : tab === "Players" ? "Performance filters apply to player rows" : "Match filters · all seasons by default"}</span>
        </section>

        {tab === "Overview" && (filteredMatches.length === 0 ? <section className="crease-panel" style={{ marginTop: 8 }}><Empty title="No matches in this view" detail="Nothing in the supplied archive matches all three filters. Reset them to return to the full record." /><div style={{ textAlign: "center", padding: "0 16px 22px" }}><button className="crease-empty-action" onClick={clearFilters}>Reset filters</button></div></section> : <>
          <section className="crease-stats">
            <div className="crease-stat"><div className="crease-stat-label">Matches in view</div><div className="crease-stat-value">{number(filteredMatches.length)}</div><div className="crease-stat-detail">{number(allWins)} decided · selected filters</div></div>
            <div className="crease-stat"><div className="crease-stat-label">Average innings</div><div className="crease-stat-value">{decimal(averageRuns, 0)}</div><div className="crease-stat-detail">Runs per recorded innings in this view</div></div>
            <div className="crease-stat"><div className="crease-stat-label">Leading run-scorer</div><div className="crease-stat-value" style={{ fontSize: 25 }}>{batting[0] ? number(batting[0].runs) : "—"}</div><div className="crease-stat-detail">{batting[0]?.player ?? "No player data"}</div></div>
            <div className="crease-stat"><div className="crease-stat-label">Leading wicket-taker</div><div className="crease-stat-value" style={{ fontSize: 25 }}>{bowling[0] ? number(bowling[0].wickets) : "—"}</div><div className="crease-stat-detail">{bowling[0]?.player ?? "No player data"}</div></div>
          </section>
          <OverviewInsights data={data} matches={filteredMatches} innings={filteredInnings} batting={batting} bowling={bowling} season={season} team={team} opponent={opponent} />
        </>)}

        {tab === "Teams" && <>
          <section className="crease-team-hero"><div><div className="crease-eyebrow" style={{ color: "#d6bb70" }}>Team dossier · select a team above</div><div className="crease-team-name">{teamFocus}</div></div><div className="crease-team-record"><div><strong>{teamMatches.length}</strong><span>Played</span></div><div><strong>{teamWins}</strong><span>Won</span></div><div><strong>{decimal(winRate, 1)}%</strong><span>Win rate</span></div></div></section>
          <div className="crease-team-layout">
            <section className="crease-panel"><div className="crease-panel-head"><div><div className="crease-eyebrow">Season trajectory</div><div className="crease-panel-title">Win rate by season</div><div className="crease-panel-subtitle">Wins ÷ decided matches · percent</div></div></div>{teamTrend.some(row => row.winRate !== null) ? <div className="crease-chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={teamTrend} margin={{ top: 7, right: 12, left: -13, bottom: 0 }}><CartesianGrid stroke="#e7e5dc" vertical={false} /><XAxis dataKey="year" tick={{ fill: "#7b837c", fontSize: 10 }} axisLine={{ stroke: "#d7d7cc" }} tickLine={false} /><YAxis domain={[0, 100]} tickFormatter={value => `${value}%`} tick={{ fill: "#7b837c", fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#fbfaf6", border: "1px solid #d9d8cd", borderRadius: 2, fontSize: 11 }} formatter={value => [`${decimal(typeof value === "number" ? value : null, 1)}%`, "Win rate"]} labelFormatter={label => `Season ${label}`} /><Line type="monotone" dataKey="winRate" stroke="#c44e32" strokeWidth={2.5} dot={{ r: 3, fill: "#174b3c", strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} /></LineChart></ResponsiveContainer></div> : <Empty title="No matches in this slice" detail="Choose another season or clear the opponent filter." />}<div className="crease-panel-foot">No-result and undecided matches are excluded from the rate.</div></section>
            <section className="crease-panel"><div className="crease-panel-head"><div><div className="crease-eyebrow">Against the selected opponent</div><div className="crease-panel-title">{opponent === "all" ? "Head-to-head" : `${shortTeam(teamFocus)} × ${shortTeam(opponent)}`}</div><div className="crease-panel-subtitle">{opponent === "all" ? "Choose an opponent filter above to isolate the rivalry." : `${h2h.length} meetings in filtered seasons`}</div></div></div>{opponent === "all" ? <Empty title="Rivalry, on record" detail="Select an opponent in the filter bar to compare wins." /> : h2h.length ? <><div className="crease-h2h"><div className="crease-h2h-side"><b>{headWins}</b><span>{shortTeam(teamFocus)} wins</span></div><div className="crease-h2h-vs">versus</div><div className="crease-h2h-side"><b>{oppWins}</b><span>{shortTeam(opponent)} wins</span></div></div><div className="crease-split"><span style={{ flex: headWins || 0.1 }} /><span style={{ flex: oppWins || 0.1 }} /></div><div className="crease-split-legend"><span>{h2h.length - headWins - oppWins} no result / tie</span><span>{h2h.length} matches</span></div></> : <Empty title="No meetings found" detail="This pairing has no matches under the current season filter." />}</section>
          </div>
          <MatchStrategy matches={teamMatches} focusTeam={teamFocus} filterKey={JSON.stringify([season, teamFocus, opponent])} />
        </>}

        {tab === "Players" && <>
          <div className="crease-player-controls"><div className="crease-segment" role="group" aria-label="Player discipline"><button className={playerKind === "Batting" ? "active" : ""} onClick={() => { setPlayerKind("Batting"); setSelectedPlayer(null); }}>Batting</button><button className={playerKind === "Bowling" ? "active" : ""} onClick={() => { setPlayerKind("Bowling"); setSelectedPlayer(null); }}>Bowling</button></div><input className="crease-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a player by scorecard name" aria-label="Search players" /></div>
          <PlayerTable rows={visiblePlayers} kind={playerKind} selected={selectedPlayer} onSelect={setSelectedPlayer} filterKey={JSON.stringify([season, team, opponent, search])} />
          {selectedPlayer && <section className="crease-drill">
            <div className="crease-drill-head"><div><div className="crease-eyebrow">Player breakdown · {season === "all" ? "all seasons" : season}</div><h3>{selectedPlayer}</h3></div><button className="crease-close" onClick={() => setSelectedPlayer(null)} aria-label="Close player details">×</button></div>
            <div className="crease-drill-summary">{playerKind === "Batting" ? `${number(selectedBat?.runs ?? 0)} runs · ${selectedBat?.highScore ?? "—"} top score · ${decimal(selectedBat?.avg ?? null, 2)} average · ${decimal(selectedBat?.sr ?? null, 2)} strike rate` : `${number(selectedBowl?.wickets ?? 0)} wickets · ${selectedBowl ? `${selectedBowl.bestWickets}/${selectedBowl.bestRuns}` : "—"} best figures · ${decimal(selectedBowl?.economy ?? null, 2)} economy`}</div>
            <div className="crease-breakdown">
              <section className="crease-breakdown-panel">
                <div className="crease-breakdown-heading"><div><div className="crease-eyebrow">{playerKind === "Batting" ? "Runs by opponent" : "Wickets by opponent"}</div><div className="crease-panel-title">{playerKind === "Batting" ? "Where the runs came" : "Where the wickets fell"}</div></div>
                  <label className="crease-select-wrap"><span className="crease-sr-only">Filter pie chart by opponent team</span><select className="crease-select" value={breakdownOpponent} onChange={event => setBreakdownOpponent(event.target.value)} aria-label="Chart opponent team"><option value="all">All opponents</option>{teams.filter(name => name !== team).map(name => <option key={name} value={name}>{name}</option>)}</select></label>
                </div>
                {playerOpponentBreakdown.length ? <div className="crease-pie-layout">
                  <div className="crease-pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={playerOpponentBreakdown} dataKey="value" nameKey="name" innerRadius="57%" outerRadius="88%" paddingAngle={2} stroke="#fbfaf6" strokeWidth={2} isAnimationActive={false}>{playerOpponentBreakdown.map((entry, index) => <Cell key={entry.name} fill={["#174b3c", "#c44e32", "#d4b45b", "#547d71", "#859a82", "#9c613e", "#93b0a0", "#788b50", "#b27055", "#627970", "#a6996e", "#b4c5b5", "#425d4f", "#d9c482"][index % 14]} />)}</Pie><Tooltip contentStyle={{ background: "#fbfaf6", border: "1px solid #d9d8cd", borderRadius: 2, fontSize: 11 }} formatter={(value: number, _name: string, item) => [number(value), `${item.payload.name} · ${playerKind === "Batting" ? "runs" : "wickets"}`]} /></PieChart></ResponsiveContainer><div className="crease-pie-total"><strong>{number(playerOpponentBreakdown.reduce((sum, item) => sum + item.value, 0))}</strong><span>{playerKind === "Batting" ? "runs" : "wickets"}</span></div></div>
                  <div className="crease-color-key" aria-label="Opponent color descriptions"><div className="crease-eyebrow">Color key · {playerKind === "Batting" ? "runs" : "wickets"} by opponent</div>{playerOpponentBreakdown.map((item, index) => { const total = playerOpponentBreakdown.reduce((sum, slice) => sum + slice.value, 0); return <div className="crease-color-key-item" key={item.name}><span className="crease-color-swatch" aria-hidden="true" style={{ background: ["#174b3c", "#c44e32", "#d4b45b", "#547d71", "#859a82", "#9c613e", "#93b0a0", "#788b50", "#b27055", "#627970", "#a6996e", "#b4c5b5", "#425d4f", "#d9c482"][index % 14] }} /><div><strong>{item.name}</strong><p>{number(item.value)} {playerKind === "Batting" ? "runs" : "wickets"} · {total ? (item.value * 100 / total).toFixed(1) : "0"}% of this pie</p></div></div>; })}</div>
                </div> : <Empty title={`No ${playerKind === "Batting" ? "runs" : "wickets"} in this slice`} detail="Choose a different opponent or widen the season and team filters." />}
              </section>
            </div>
            <ScorecardGrid data={data} matches={playerMatches} player={selectedPlayer} kind={playerKind} team={team} opponent={opponent} />
          </section>}
        </>}
        <footer className="crease-footer"><span>22 YARDS · A GAME OF MARGIN</span><span>Based on supplied 2008–2017 match and innings aggregates. Super overs excluded.</span></footer>
      </div>
    </main>
  );
}
