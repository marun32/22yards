"""Prepare compact match/player summaries from the two supplied IPL CSV files."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def team(value):
    return "Rising Pune Supergiant" if value == "Rising Pune Supergiants" else value


with (ROOT / "attached_assets/matches_1791551424126.csv").open(newline="", encoding="utf-8-sig") as handle:
    matches = list(csv.DictReader(handle))
for match in matches:
    for field in ("id", "season", "win_by_runs", "win_by_wickets", "dl_applied"):
        match[field] = int(match[field] or 0)
    for field in ("team1", "team2", "winner", "toss_winner"):
        match[field] = team(match[field])
    for field in ("umpire1", "umpire2", "umpire3"):
        match.pop(field, None)

batting = defaultdict(lambda: [0, 0, 0, 0, 0])
bowling = defaultdict(lambda: [0, 0, 0])
innings = defaultdict(lambda: [0, 0, 0])
match_ids = {m["id"] for m in matches}
delivery_count = 0
super_over_count = 0
excluded_dismissals = {"run out", "retired hurt", "obstructing the field", "retired out"}

with (ROOT / "attached_assets/deliveries_1791551424126.csv").open(newline="", encoding="utf-8-sig") as handle:
    for delivery in csv.DictReader(handle):
        delivery_count += 1
        match_id = int(delivery["match_id"])
        if match_id not in match_ids:
            raise ValueError(f"Unknown match id: {match_id}")
        if int(delivery["is_super_over"]):
            super_over_count += 1
            continue
        bat_team = team(delivery["batting_team"])
        bowl_team = team(delivery["bowling_team"])
        bat = batting[(match_id, delivery["batsman"], bat_team, bowl_team)]
        bowl = bowling[(match_id, delivery["bowler"], bowl_team, bat_team)]
        inn = innings[(match_id, bat_team, bowl_team)]
        runs = int(delivery["batsman_runs"])
        total = int(delivery["total_runs"])
        wide = int(delivery["wide_runs"])
        noball = int(delivery["noball_runs"])
        bat[0] += runs
        bat[1] += int(wide == 0)
        bat[2] += int(runs == 4)
        bat[3] += int(runs == 6)
        legal = int(wide == 0 and noball == 0)
        bowl[0] += total - int(delivery["bye_runs"]) - int(delivery["legbye_runs"]) - int(delivery["penalty_runs"])
        bowl[1] += legal
        inn[0] += total
        inn[2] += legal
        dismissed = delivery["player_dismissed"]
        kind = delivery["dismissal_kind"]
        if dismissed and kind != "retired hurt":
            batting[(match_id, dismissed, bat_team, bowl_team)][4] += 1
            inn[1] += 1
            if kind not in excluded_dismissals:
                bowl[2] += 1

payload = {
    "matches": matches,
    "batting": [list(key) + values for key, values in batting.items()],
    "bowling": [list(key) + values for key, values in bowling.items()],
    "innings": [list(key) + values for key, values in innings.items()],
    "meta": {
        "deliveryCount": delivery_count,
        "excludedSuperOverDeliveries": super_over_count,
        "description": "Supplied IPL CSV records, 2008–2017. Super overs excluded from player and innings summaries. Pune spelling variants combined; distinct franchises retained.",
    },
}
import sys
target = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "artifacts/crease/public/data/cricket.json")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
print(json.dumps({
    "matches": len(matches),
    "deliveries": delivery_count,
    "battingRows": len(batting),
    "bowlingRows": len(bowling),
    "innings": len(innings),
    "superOverDeliveriesExcluded": super_over_count,
    "battingRuns": sum(v[0] for v in batting.values()),
    "bowlerWickets": sum(v[2] for v in bowling.values()),
    "bytes": target.stat().st_size,
}))
