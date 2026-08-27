from __future__ import annotations

import csv
import json
import time
import urllib.request
from pathlib import Path

from brviz.catalog import COUNTRIES, NAME_TO_ISO, country_codes, indicators
from brviz.institutions import fetch_days, fetch_efw

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.worldbank.org/v2"
UA = "brviz/0.1 (https://github.com/nilo)"


def _get(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def _iso(row: dict) -> str:
    iso = (row.get("countryiso3code") or "").strip()
    if iso:
        return iso
    name = (row.get("country") or {}).get("value") or ""
    return NAME_TO_ISO.get(name, "")


def fetch_indicator(code: str, start: int, end: int) -> tuple[str | None, list[dict]]:
    url = (
        f"{API}/country/{country_codes()}/indicator/{code}"
        f"?date={start}:{end}&format=json&per_page=20000"
    )
    payload = _get(url)
    if not isinstance(payload, list) or len(payload) < 2:
        return None, []
    meta, rows = payload[0], payload[1] or []
    lastupdated = meta.get("lastupdated") if isinstance(meta, dict) else None
    out = []
    for row in rows:
        if row.get("value") is None:
            continue
        iso = _iso(row)
        if not iso:
            continue
        out.append(
            {
                "iso": iso,
                "country": row["country"]["value"],
                "year": int(row["date"]),
                "value": row["value"],
            }
        )
    return lastupdated, out


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, start: int, end: int, extra: bool, out: Path) -> dict:
    catalog = indicators(extra=extra)
    out.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    sources = {}
    for key, (code, label) in catalog.items():
        lastupdated, data = fetch_indicator(code, start, end)
        sources[key] = {"code": code, "lastupdated": lastupdated, "n": len(data)}
        for d in data:
            rows.append({"metric": key, "code": code, "label": label, **d})
        time.sleep(0.15)

    days_meta, days_rows = fetch_days()
    sources["start_days"] = days_meta
    rows.extend(days_rows)

    efw_meta, efw_rows = fetch_efw(start=start, end=end)
    sources["efw"] = efw_meta
    rows.extend(efw_rows)

    fieldnames = ["metric", "code", "label", "iso", "country", "year", "value"]
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    meta = {
        "source": "World Bank Indicators API v2",
        "start": start,
        "end": end,
        "countries": sorted(COUNTRIES),
        "indicators": sources,
        "n_rows": len(rows),
        "path": _rel(out),
    }
    meta_path = out.with_suffix(".meta.json")
    meta_path.write_text(json.dumps(meta, indent=2) + "\n")
    preview_cache = ROOT / "src" / ".observablehq" / "cache" / "data" / "wdi.csv"
    preview_cache.unlink(missing_ok=True)
    return meta
