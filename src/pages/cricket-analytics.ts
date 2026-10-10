import type { BatPlayer, BowlPlayer, DataSet, Match } from "./CricketDashboard";

export type RecordTile = { label: string; value: string; subject: string; detail: string };
export type ChampionshipRow = { team: string; titles: number; finals: number; runnersUp: number; undecided: number; seasons: number[] };
export type OrderRow = {
  name: string; matches: number; batPlayed: number; bowlPlayed: number;
  batDecided: number; bowlDecided: number; batWins: number; bowlWins: number;
  batWinRate: number | null; bowlWinRate: number | null;
};

export const isDecided = (match: Match) => match.winner === match.team1 || match.winner === match.team2;

// ISO dates preserve chronological ordering. Match ID only resolves same-day ties.
// Infer finals from the full schedule, NEVER from an already-filtered subset.
export function inferSeasonFinals(matches: Match[]): Match[] {
  const lastBySeason = new Map<number, Match>();
  for (const match of matches) {
    const last = lastBySeason.get(match.season);
    if (!last || match.date > last.date || (match.date === last.date && match.id > last.id)) lastBySeason.set(match.season, match);
  }
  return [...lastBySeason.values()].sort((a, b) => b.season - a.season);
}

export function filterFinals(finals: Match[], season: string, team: string, opponent: string): Match[] {
  return finals.filter(match =>
    (season === "all" || String(match.season) === season) &&
    (team === "all" || match.team1 === team || match.team2 === team) &&
    (opponent === "all" || match.team1 === opponent || match.team2 === opponent)
  );
}

export function championshipTable(finals: Match[], focusTeam = "all"): ChampionshipRow[] {
  const grouped = new Map<string, ChampionshipRow>();
  for (const match of finals) {
    for (const team of [match.team1, match.team2]) {
      if (focusTeam !== "all" && team !== focusTeam) continue;
      const row = grouped.get(team) ?? { team, titles: 0, finals: 0, runnersUp: 0, undecided: 0, seasons: [] };
      row.finals++;
      if (isDecided(match)) {
        if (match.winner === team) { row.titles++; row.seasons.push(match.season); }
        else row.runnersUp++;
      } else row.undecided++;
      grouped.set(team, row);
    }
  }
  return [...grouped.values()].sort((a, b) => b.titles - a.titles || b.finals - a.finals || a.team.localeCompare(b.team));
}

// Use the toss to identify actual batting order. Win margins alone miss tie-breaks.
export function battingFirstTeam(match: Match): string | null {
  if (![match.team1, match.team2].includes(match.toss_winner)) return null;
  if (match.toss_decision === "bat") return match.toss_winner;
  if (match.toss_decision === "field") return match.toss_winner === match.team1 ? match.team2 : match.team1;
  return null;
}

export function orderBreakdown(matches: Match[], focusTeam: string, dimension: "team" | "venue" | "overall"): OrderRow[] {
  const groups = new Map<string, { row: OrderRow; ids: Set<number> }>();
  for (const match of matches) {
    const first = battingFirstTeam(match);
    for (const team of [match.team1, match.team2]) {
      if (focusTeam !== "all" && team !== focusTeam) continue;
      const name = dimension === "team" ? team : dimension === "venue" ? match.venue || "Unknown venue" : "Overall";
      const group = groups.get(name) ?? {
        row: { name, matches: 0, batPlayed: 0, bowlPlayed: 0, batDecided: 0, bowlDecided: 0, batWins: 0, bowlWins: 0, batWinRate: null, bowlWinRate: null },
        ids: new Set<number>(),
      };
      group.ids.add(match.id);
      const row = group.row;
      if (first) {
        if (team === first) {
          row.batPlayed++;
          if (isDecided(match)) { row.batDecided++; if (match.winner === team) row.batWins++; }
        } else {
          row.bowlPlayed++;
          if (isDecided(match)) { row.bowlDecided++; if (match.winner === team) row.bowlWins++; }
        }
      }
      groups.set(name, group);
    }
  }
  return [...groups.values()].map(({ row, ids }) => ({
    ...row, matches: ids.size,
    batWinRate: row.batDecided ? row.batWins * 100 / row.batDecided : null,
    bowlWinRate: row.bowlDecided ? row.bowlWins * 100 / row.bowlDecided : null,
  })).sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name));
}

export function recordTiles(matches: Match[], innings: DataSet["innings"], batting: BatPlayer[], bowling: BowlPlayer[], allMatches: Match[]): RecordTile[] {
  const highestScore = [...batting].sort((a, b) => b.highScore - a.highScore || a.player.localeCompare(b.player))[0];
  const bestSpell = [...bowling].sort((a, b) => b.bestWickets - a.bestWickets || a.bestRuns - b.bestRuns || a.player.localeCompare(b.player))[0];
  const highestInnings = [...innings].sort((a, b) => b[3] - a[3])[0];
  const seasons = new Map(allMatches.map(match => [match.id, match.season]));
  const decided = matches.filter(isDecided);
  const tossWins = decided.filter(match => match.winner === match.toss_winner).length;
  const boundaryRuns = batting.reduce((sum, row) => sum + row.fours * 4 + row.sixes * 6, 0);
  const totalBatRuns = batting.reduce((sum, row) => sum + row.runs, 0);
  const fours = batting.reduce((sum, row) => sum + row.fours, 0);
  const sixes = batting.reduce((sum, row) => sum + row.sixes, 0);
  const largestWin = [...matches].filter(match => match.dl_applied === 0 && match.win_by_runs > 0 && isDecided(match)).sort((a, b) => b.win_by_runs - a.win_by_runs)[0];
  return [
    { label: "Highest individual score", value: highestScore ? String(highestScore.highScore) : "—", subject: highestScore?.player ?? "No batting innings", detail: "Runs in a single innings · selected player filters" },
    { label: "Best bowling figures", value: bestSpell ? `${bestSpell.bestWickets}/${bestSpell.bestRuns}` : "—", subject: bestSpell?.player ?? "No bowling spells", detail: "Wickets / runs · most wickets, then fewest runs" },
    { label: "Highest team total", value: highestInnings ? String(highestInnings[3]) : "—", subject: highestInnings?.[1] ?? "No team innings", detail: highestInnings ? `vs ${highestInnings[2]} · ${seasons.get(highestInnings[0])}` : "Runs per innings in the matches shown" },
    { label: "Largest run-margin win", value: largestWin ? `+${largestWin.win_by_runs}` : "—", subject: largestWin?.winner ?? "No run-margin victories", detail: largestWin ? `${largestWin.season} · non-D/L matches only` : "Non-D/L matches only" },
    { label: "Boundary contribution", value: totalBatRuns ? `${(boundaryRuns * 100 / totalBatRuns).toFixed(1)}%` : "—", subject: "Share of batter runs", detail: `${fours.toLocaleString("en-IN")} fours · ${sixes.toLocaleString("en-IN")} sixes` },
    { label: "Toss-winner success", value: decided.length ? `${(tossWins * 100 / decided.length).toFixed(1)}%` : "—", subject: "Won toss and match", detail: `${tossWins} wins / ${decided.length} decided matches` },
  ];
}
