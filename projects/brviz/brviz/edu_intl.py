"""Education spending vs learning for every PISA participant.

Reads the country list from ``data/pisa.csv`` (run ``--only pisa`` first) and
fetches, for all of them:

- UIS initial government funding per student, constant PPP$, by level
  (pre-primary, primary, lower and upper secondary);
- WDI GDP per capita PPP and school structure (primary and lower secondary
  starting ages, lower secondary duration).

``cum_6_15_ppp`` is the government money spent on one child from age 6 to 15,
following the cohort that sat each PISA round: a student tested in year Y was
age ``a`` in year ``Y - 15 + a``, and that year's per-student funding for the
level the child attended at that age is added. Gaps are linearly interpolated
between observed years, or carried from the nearest observation up to
``MAX_CARRY`` years; a cohort needs at least ``MIN_OBSERVED`` of its ten years
actually observed.
"""

from __future__ import annotations

import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "edu_intl.csv"
PISA_CSV = ROOT / "data" / "pisa.csv"
UA = "brviz/0.1 (https://github.com/nilo)"
UIS_API = "https://api.uis.unesco.org/api/public/data/indicators"
WDI_API = "https://api.worldbank.org/v2/country/{countries}/indicator/{code}?format=json&per_page=20000&date=1995:2025"
START = 1995
PISA_ROUNDS = (2009, 2012, 2015, 2018, 2022)
MAX_CARRY = 3
MIN_OBSERVED = 5
CHUNK = 30

UIS = {
    "pupil_ppp_02": "XUNIT.PPPCONST.02.FSGOV.FFNTR",
    "pupil_ppp_1": "XUNIT.PPPCONST.1.FSGOV.FFNTR",
    "pupil_ppp_2": "XUNIT.PPPCONST.2.FSGOV.FFNTR",
    "pupil_ppp_3": "XUNIT.PPPCONST.3.FSGOV.FFNTR",
    "pupil_ppp_2t3": "XUNIT.PPPCONST.2T3.FSGOV.FFNTR",
}
WDI = {
    "gdp_pc_ppp": "NY.GDP.PCAP.PP.KD",
    "age_primary": "SE.PRM.AGES",
    "age_lowsec": "SE.SEC.AGES",
    "dur_lowsec": "SE.SEC.DURS.LO",
}


def _json(url: str):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.load(resp)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2**attempt)


def _chunks(xs: list[str]):
    for i in range(0, len(xs), CHUNK):
        yield xs[i : i + CHUNK]


def _uis(code: str, isos: list[str]) -> dict[str, dict[int, float]]:
    out: dict[str, dict[int, float]] = {}
    for part in _chunks(isos):
        params = [("indicator", code), ("start", str(START))] + [("geoUnit", iso) for iso in part]
        for r in _json(f"{UIS_API}?{urllib.parse.urlencode(params)}").get("records", []):
            if r.get("value") is not None:
                out.setdefault(r["geoUnit"], {})[int(r["year"])] = float(r["value"])
    return out


def _wdi(code: str, isos: list[str]) -> dict[str, dict[int, float]]:
    out: dict[str, dict[int, float]] = {}
    for part in _chunks(isos):
        body = _json(WDI_API.format(countries=";".join(part), code=code))
        records = body[1] if len(body) > 1 and body[1] else []
        for r in records:
            if r.get("value") is not None and r.get("countryiso3code"):
                out.setdefault(r["countryiso3code"], {})[int(r["date"])] = float(r["value"])
    return out


def _at(series: dict[int, float] | None, year: int) -> tuple[float, bool] | None:
    if not series:
        return None
    if year in series:
        return series[year], True
    before = [y for y in series if y < year]
    after = [y for y in series if y > year]
    if before and after:
        y0, y1 = max(before), min(after)
        w = (year - y0) / (y1 - y0)
        return series[y0] + w * (series[y1] - series[y0]), False
    nearest = max(before) if before else min(after)
    if abs(nearest - year) <= MAX_CARRY:
        return series[nearest], False
    return None


def _latest(series: dict[int, float] | None) -> float | None:
    return series[max(series)] if series else None


def _cumulative(iso: str, test_year: int, uis: dict, wdi: dict) -> tuple[float, int] | None:
    a_prim = _latest(wdi["age_primary"].get(iso))
    a_low = _latest(wdi["age_lowsec"].get(iso))
    d_low = _latest(wdi["dur_lowsec"].get(iso))
    if a_prim is None or a_low is None:
        return None
    a_up = a_low + (d_low if d_low is not None else 3)
    total, observed = 0.0, 0
    for age in range(6, 16):
        year = test_year - 15 + age
        if age < a_prim:
            levels = ["pupil_ppp_02", "pupil_ppp_1"]
        elif age < a_low:
            levels = ["pupil_ppp_1"]
        elif age < a_up:
            levels = ["pupil_ppp_2", "pupil_ppp_2t3"]
        else:
            levels = ["pupil_ppp_3", "pupil_ppp_2t3"]
        hit = None
        for level in levels:
            hit = _at(uis[level].get(iso), year)
            if hit:
                break
        if not hit:
            return None
        total += hit[0]
        observed += hit[1]
    if observed < MIN_OBSERVED:
        return None
    return total, observed


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    if not PISA_CSV.exists():
        raise RuntimeError("data/pisa.csv missing; run `brviz fetch --only pisa` first")
    names: dict[str, str] = {}
    with PISA_CSV.open() as f:
        for r in csv.DictReader(f):
            if r["iso"] != "OECD":
                names[r["iso"]] = r["country"]
    isos = sorted(names)

    uis = {metric: _uis(code, isos) for metric, code in UIS.items()}
    wdi = {metric: _wdi(code, isos) for metric, code in WDI.items()}

    rows = []
    for source in (uis, wdi):
        for metric, by_iso in source.items():
            for iso, series in by_iso.items():
                if iso not in names:
                    continue
                for year, value in sorted(series.items()):
                    rows.append({"metric": metric, "iso": iso, "country": names[iso], "year": year, "value": round(value, 2)})
    for iso in isos:
        for year in PISA_ROUNDS:
            hit = _cumulative(iso, year, uis, wdi)
            if hit:
                rows.append({"metric": "cum_6_15_ppp", "iso": iso, "country": names[iso], "year": year, "value": round(hit[0])})
                rows.append({"metric": "cum_6_15_observed", "iso": iso, "country": names[iso], "year": year, "value": hit[1]})

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["metric", "iso", "country", "year", "value"])
        w.writeheader()
        w.writerows(rows)

    counts: dict[str, int] = {}
    for r in rows:
        counts[r["metric"]] = counts.get(r["metric"], 0) + 1
    meta = {
        "source": "UNESCO UIS (initial government funding per student, constant PPP$) and World Bank WDI",
        "urls": [UIS_API, WDI_API.split("{")[0]],
        "countries": isos,
        "pisa_rounds": list(PISA_ROUNDS),
        "indicators": {k: {"n": n} for k, n in sorted(counts.items())},
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    (ROOT / "src" / ".observablehq" / "cache" / "data" / "edu_intl.csv").unlink(missing_ok=True)
    return meta
