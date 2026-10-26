"""IMF fiscal and investment series.

WEO / Fiscal Monitor come from DataMapper (general government).
Public Finances in Modern History (FPP) is a longer historical series with
a different government definition — keep those metrics separate.
ICSD is public vs private GFCF; Brazil ends in 2019.
WEO/FM vintages include forecasts; years are clipped to ``end``.
"""

from __future__ import annotations

import csv
import io
import json
import time
import urllib.request

from brviz.catalog import COUNTRIES

UA = "brviz/0.1 (https://github.com/nilo)"
KEEP = set(COUNTRIES)
DATAMAPPER = "https://www.imf.org/external/datamapper/api/v1"
ICSD = "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.FAD/ICSD/~"

# metric -> (code, label, source)
DATAMAPPER_SERIES = {
    "gg_rev": (
        "GGR_G01_GDP_PT",
        "General government revenue (% GDP)",
        "IMF Fiscal Monitor",
    ),
    "gg_exp": (
        "G_X_G01_GDP_PT",
        "General government expenditure (% GDP)",
        "IMF Fiscal Monitor",
    ),
    "gg_debt": (
        "GGXWDG_NGDP",
        "General government gross debt (% GDP)",
        "IMF WEO",
    ),
    "gg_balance": (
        "GGXCNL_NGDP",
        "General government net lending/borrowing (% GDP)",
        "IMF WEO",
    ),
    "gg_primary": (
        "GGXONLB_G01_GDP_PT",
        "General government primary balance (% GDP)",
        "IMF Fiscal Monitor",
    ),
    "fpp_rev": (
        "rev",
        "Historical government revenue (% GDP)",
        "IMF Public Finances in Modern History",
    ),
    "fpp_exp": (
        "exp",
        "Historical government expenditure (% GDP)",
        "IMF Public Finances in Modern History",
    ),
    "fpp_interest": (
        "ie",
        "Historical interest expense (% GDP)",
        "IMF Public Finances in Modern History",
    ),
}

ICSD_SERIES = {
    "pub_inv": (
        "P51G_S13_Q_POGDP_PT",
        "Public GFCF (% GDP, const prices)",
        "IMF Investment and Capital Stock Dataset",
    ),
    "priv_inv": (
        "P51G_PS_Q_POGDP_PT",
        "Private GFCF (% GDP, const prices)",
        "IMF Investment and Capital Stock Dataset",
    ),
}

IMF_METRICS = tuple(DATAMAPPER_SERIES) + tuple(ICSD_SERIES)


def _get_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def _get_csv(url: str) -> list[dict]:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "text/csv"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return list(csv.DictReader(io.StringIO(resp.read().decode())))


def _rows_from_datamapper(
    metric: str, code: str, label: str, payload: object, *, start: int, end: int
) -> list[dict]:
    values = payload.get("values") if isinstance(payload, dict) else None
    if not isinstance(values, dict):
        return []
    inner = values.get(code) or values.get("") or {}
    if not isinstance(inner, dict):
        return []
    rows = []
    for iso, years in inner.items():
        if iso not in KEEP or not isinstance(years, dict):
            continue
        country = COUNTRIES[iso]["name"]
        for year_s, cell in years.items():
            if cell is None or cell == "":
                continue
            year = int(year_s)
            if year < start or year > end:
                continue
            rows.append(
                {
                    "metric": metric,
                    "code": code,
                    "label": label,
                    "iso": iso,
                    "country": country,
                    "year": year,
                    "value": float(cell),
                }
            )
    return rows


def fetch_datamapper(
    metric: str, *, start: int, end: int
) -> tuple[dict, list[dict]]:
    code, label, source = DATAMAPPER_SERIES[metric]
    payload = _get_json(f"{DATAMAPPER}/{code}")
    rows = _rows_from_datamapper(metric, code, label, payload, start=start, end=end)
    meta = {
        "code": code,
        "lastupdated": None,
        "n": len(rows),
        "source": source,
    }
    return meta, rows


def fetch_icsd(metric: str, *, start: int, end: int) -> tuple[dict, list[dict]]:
    code, label, source = ICSD_SERIES[metric]
    raw = _get_csv(f"{ICSD}/*.{code}.A")
    rows = []
    for row in raw:
        iso = (row.get("COUNTRY") or "").strip()
        if iso not in KEEP:
            continue
        cell = (row.get("OBS_VALUE") or "").strip()
        if not cell:
            continue
        year = int(row["TIME_PERIOD"])
        if year < start or year > end:
            continue
        rows.append(
            {
                "metric": metric,
                "code": code,
                "label": label,
                "iso": iso,
                "country": COUNTRIES[iso]["name"],
                "year": year,
                "value": float(cell),
            }
        )
    meta = {
        "code": code,
        "lastupdated": None,
        "n": len(rows),
        "source": source,
    }
    return meta, rows


def fetch_imf_metric(
    metric: str, *, start: int, end: int
) -> tuple[dict, list[dict]]:
    if metric in DATAMAPPER_SERIES:
        return fetch_datamapper(metric, start=start, end=end)
    if metric in ICSD_SERIES:
        return fetch_icsd(metric, start=start, end=end)
    raise KeyError(metric)


def fetch_imf(*, start: int, end: int) -> dict[str, tuple[dict, list[dict]]]:
    out = {}
    for i, metric in enumerate(IMF_METRICS):
        if i:
            time.sleep(0.2)
        out[metric] = fetch_imf_metric(metric, start=start, end=end)
    return out
