"""Start-up days (Doing Business via OWID) and Fraser EFW (via QoG).

Fraser's own site is behind Cloudflare. QoG Basic TS redistributes fi_index
with ISO3. Doing Business was archived from WDI in 2025; OWID still ships
the historical IC.REG.DURS series. Brazil only starts in 2013.
"""

from __future__ import annotations

import csv
import io
import urllib.request

from brviz.catalog import COUNTRIES

UA = "brviz/0.1 (https://github.com/nilo)"
DAYS_URL = (
    "https://ourworldindata.org/grapher/"
    "time-required-to-start-business.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
DAYS_COL = "Time required to start a business (days)"
QOG_URL = "https://www.qogdata.pol.gu.se/data/qog_bas_ts_jan25.csv"
KEEP = set(COUNTRIES)


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode()


def _stream(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        yield from csv.DictReader(io.TextIOWrapper(resp, encoding="utf-8"))


def fetch_days() -> tuple[dict, list[dict]]:
    raw = list(csv.DictReader(io.StringIO(_get(DAYS_URL))))
    rows = []
    for row in raw:
        iso = (row.get("Code") or "").strip()
        if iso not in KEEP:
            continue
        cell = (row.get(DAYS_COL) or "").strip()
        if not cell:
            continue
        rows.append(
            {
                "metric": "start_days",
                "code": "IC.REG.DURS",
                "label": "Time to start a business (days)",
                "iso": iso,
                "country": row["Entity"],
                "year": int(row["Year"]),
                "value": float(cell),
            }
        )
    meta = {
        "code": "IC.REG.DURS",
        "lastupdated": None,
        "n": len(rows),
        "source": "Doing Business via Our World in Data",
    }
    return meta, rows


def fetch_efw(*, start: int, end: int) -> tuple[dict, list[dict]]:
    rows = []
    for row in _stream(QOG_URL):
        iso = (row.get("ccodealp") or "").strip()
        if iso not in KEEP:
            continue
        cell = (row.get("fi_index") or "").strip()
        if not cell:
            continue
        year = int(row["year"])
        if year < start or year > end:
            continue
        rows.append(
            {
                "metric": "efw",
                "code": "fi_index",
                "label": "Fraser EFW (0-10)",
                "iso": iso,
                "country": row.get("cname") or COUNTRIES[iso]["name"],
                "year": year,
                "value": float(cell),
            }
        )
    meta = {
        "code": "fi_index",
        "lastupdated": None,
        "n": len(rows),
        "source": "Fraser EFW via QoG Basic TS jan25",
    }
    return meta, rows
