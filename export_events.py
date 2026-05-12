"""Phase 4b validation helper — export state events from wds.db to CSV.

Reads the `events` SQLite table written by the worker threads and dumps
state-per-second rows to a CSV. Compare these against a hand-labeled
ground-truth CSV to compute system accuracy.

Usage:
    python export_events.py                              # last 30 min, all stations
    python export_events.py --minutes 60                 # last 60 min
    python export_events.py --station pi cam             # one station only
    python export_events.py --since 2026-05-12T14:00     # from a specific UTC time
    python export_events.py --out my_export.csv          # custom output filename
"""
from __future__ import annotations

import argparse
import csv
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def export(args):
    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: {db_path} not found", file=sys.stderr)
        return 1

    # Resolve since
    if args.since:
        since = datetime.fromisoformat(args.since)
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
    else:
        since = datetime.now(timezone.utc) - timedelta(minutes=args.minutes)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    where = ["ts >= ?"]
    params: list = [since.isoformat()]
    if args.station:
        # match by station NAME via join, or directly by id
        cur = conn.execute(
            "SELECT id FROM stations WHERE name = ? OR id = ?",
            (args.station, args.station),
        )
        row = cur.fetchone()
        if not row:
            print(f"ERROR: no station with name/id '{args.station}'", file=sys.stderr)
            return 1
        where.append("station_id = ?")
        params.append(row["id"])

    sql = (
        "SELECT ts, station_id, state, fps, conf, grip_l, grip_r "
        f"FROM events WHERE {' AND '.join(where)} ORDER BY ts ASC"
    )
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    out_path = Path(args.out)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ts_iso", "station_id", "state", "fps", "conf", "grip_l", "grip_r"])
        for r in rows:
            w.writerow([r["ts"], r["station_id"], r["state"],
                        r["fps"], r["conf"], r["grip_l"], r["grip_r"]])

    # Summary
    states = {}
    for r in rows:
        states[r["state"]] = states.get(r["state"], 0) + 1
    total = max(1, len(rows))
    print(f"Exported {len(rows)} events to {out_path.resolve()}")
    print(f"  Window: from {since.isoformat()} (UTC)")
    if args.station:
        print(f"  Station filter: {args.station}")
    print()
    print(f"  {'state':<14} {'count':>8}  {'pct':>6}")
    for state, n in sorted(states.items(), key=lambda kv: -kv[1]):
        print(f"  {state:<14} {n:>8}  {100*n/total:>5.1f}%")
    return 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--db",      default="wds.db", help="path to wds.db (default: ./wds.db)")
    p.add_argument("--minutes", type=int, default=30, help="how many minutes of history (default: 30)")
    p.add_argument("--since",   help="ISO UTC timestamp; overrides --minutes")
    p.add_argument("--station", help="station name or id; default: all stations")
    p.add_argument("--out",     default="events_export.csv", help="output CSV filename")
    args = p.parse_args()
    sys.exit(export(args))


if __name__ == "__main__":
    main()
