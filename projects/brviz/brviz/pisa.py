"""OECD PISA country means by cycle.

OECD Data Explorer does not carry PISA. StatLinks on oecd.org are behind
Cloudflare. Our World in Data redistributes the Volume I trend tables
(I.B1.5.4 math, I.B1.5.5 reading, I.B1.5.6 science).
"""

from __future__ import annotations

import csv
import io
import json
import urllib.request
from pathlib import Path

from brviz.catalog import COUNTRIES

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "pisa.csv"
UA = "brviz/0.1 (https://github.com/nilo)"
OWID = (
    "https://ourworldindata.org/grapher/"
    "average-performance-of-15-year-olds-in-mathematics-reading-and-science.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)

SUBJECTS = {
    "Mathematics": ("pisa_math", "I.B1.5.4", "PISA mathematics mean"),
    "Reading": ("pisa_read", "I.B1.5.5", "PISA reading mean"),
    "Science": ("pisa_sci", "I.B1.5.6", "PISA science mean"),
}

KEEP_ISO = set(COUNTRIES) | {"OECD"}
ENTITY_ISO = {"OECD average": "OECD"}


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode()


def _iso(row: dict) -> str:
    code = (row.get("Code") or "").strip()
    if code:
        return code
    return ENTITY_ISO.get(row.get("Entity") or "", "")


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    raw = list(csv.DictReader(io.StringIO(_get(OWID))))
    rows = []
    counts = {key: 0 for key, _, _ in SUBJECTS.values()}
    for row in raw:
        iso = _iso(row)
        if iso not in KEEP_ISO:
            continue
        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue
        for col, (metric, code, label) in SUBJECTS.items():
            cell = (row.get(col) or "").strip()
            if not cell:
                continue
            rows.append(
                {
                    "metric": metric,
                    "code": code,
                    "label": label,
                    "iso": iso,
                    "country": row["Entity"],
                    "year": year,
                    "value": float(cell),
                }
            )
            counts[metric] += 1

    out.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["metric", "code", "label", "iso", "country", "year", "value"]
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    meta = {
        "source": "OECD PISA 2022 Database (I.B1.5.4–6), via Our World in Data",
        "url": OWID.split("?")[0],
        "countries": sorted({r["iso"] for r in rows}),
        "indicators": {
            key: {"code": code, "n": counts[key]}
            for col, (key, code, _) in SUBJECTS.items()
        },
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    cache = ROOT / "src" / ".observablehq" / "cache" / "data" / "pisa.csv"
    cache.unlink(missing_ok=True)
    return meta
