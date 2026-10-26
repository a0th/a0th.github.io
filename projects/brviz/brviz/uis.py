"""UNESCO Institute for Statistics: government spending on education by level.

The World Bank mirror of these series stops around 2015 for Brazil; the UIS
public API carries them to 2022+.
"""

from __future__ import annotations

import csv
import json
import urllib.parse
import urllib.request
from pathlib import Path

from brviz.catalog import COUNTRIES

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "uis.csv"
UA = "brviz/0.1 (https://github.com/nilo)"
API = "https://api.uis.unesco.org/api/public/data/indicators"
START = 2000

INDICATORS = {
    "uis_edu_gdp": ("XGDP.FSGOV", "Government expenditure on education (% GDP)"),
    "uis_tert_gdp": ("XGDP.5T8.FSGOV", "Government expenditure on tertiary education (% GDP)"),
    "uis_pc_primary": ("XUNIT.GDPCAP.1.FSGOV.FFNTR", "Initial government funding per primary student (% GDP per capita)"),
    "uis_pc_secondary": ("XUNIT.GDPCAP.2T3.FSGOV.FFNTR", "Initial government funding per secondary student (% GDP per capita)"),
    "uis_pc_tertiary": ("XUNIT.GDPCAP.5T8.FSGOV.FFNTR", "Initial government funding per tertiary student (% GDP per capita)"),
}
KEEP_ISO = [iso for iso, c in COUNTRIES.items() if c["group"] != "aggregate"]


def _get(code: str) -> list[dict]:
    params = [("indicator", code), ("start", str(START))] + [("geoUnit", iso) for iso in KEEP_ISO]
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp).get("records", [])


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    rows = []
    counts = {}
    for metric, (code, label) in INDICATORS.items():
        recs = [r for r in _get(code) if r.get("value") is not None]
        counts[metric] = {"code": code, "n": len(recs)}
        for r in recs:
            rows.append(
                {
                    "metric": metric,
                    "code": code,
                    "label": label,
                    "iso": r["geoUnit"],
                    "country": COUNTRIES[r["geoUnit"]]["name"],
                    "year": int(r["year"]),
                    "value": round(float(r["value"]), 4),
                }
            )
    if not rows:
        raise RuntimeError("no UIS rows fetched")

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["metric", "code", "label", "iso", "country", "year", "value"])
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["metric"], r["iso"], r["year"])))

    meta = {
        "source": "UNESCO Institute for Statistics (UIS) public data API",
        "url": API,
        "countries": KEEP_ISO,
        "indicators": counts,
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    (ROOT / "src" / ".observablehq" / "cache" / "data" / "uis.csv").unlink(missing_ok=True)
    return meta
