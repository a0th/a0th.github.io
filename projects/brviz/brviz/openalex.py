"""Scientific output and citation impact by country (OpenAlex).

Counts journal articles with at least one author affiliated to the country
(full counting), by publication year. Two universes:

- ``all``: every article OpenAlex indexes, including national journals;
- ``core``: articles in OpenAlex "core" sources (CWTS-curated international
  journals), the usual base for bibliometric comparisons.

``top10`` uses OpenAlex's field- and year-normalized citation percentile.
``WORLD`` is the same count without a country filter; its top-10% share is
not exactly 10% because of ties and coverage.
"""

from __future__ import annotations

import csv
import json
import time
import urllib.request
from pathlib import Path

from brviz.catalog import COUNTRIES

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "openalex.csv"
UA = "brviz/0.1 (https://github.com/nilo)"
API = "https://api.openalex.org/works?filter={filter}&group_by=publication_year"
YEARS = (2005, 2022)

ISO2 = {
    "BRA": "BR", "ARG": "AR", "CHL": "CL", "COL": "CO", "ECU": "EC", "MEX": "MX", "PER": "PE",
    "URY": "UY", "BGR": "BG", "HUN": "HU", "POL": "PL", "RUS": "RU", "TUR": "TR", "UKR": "UA",
    "CHN": "CN", "IND": "IN", "IDN": "ID", "MYS": "MY", "THA": "TH", "ZAF": "ZA", "KOR": "KR",
    "CZE": "CZ",
}
UNIVERSES = {"all": "", "core": ",primary_location.source.is_core:true"}
COUNTS = {
    "articles": "",
    "top10": ",citation_normalized_percentile.is_in_top_10_percent:true",
    "uncited": ",cited_by_count:0",
}


def _by_year(filt: str) -> dict[int, int]:
    url = API.format(filter=filt)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as resp:
                groups = json.load(resp)["group_by"]
            return {int(g["key"]): g["count"] for g in groups}
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    return {}


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    base = f"publication_year:{YEARS[0]}-{YEARS[1]},type:article"
    rows = []
    for iso, cc in [("WORLD", None), *ISO2.items()]:
        country_filter = f"institutions.country_code:{cc}," if cc else ""
        for universe, ufilter in UNIVERSES.items():
            for count, cfilter in COUNTS.items():
                for year, n in sorted(_by_year(country_filter + base + ufilter + cfilter).items()):
                    rows.append(
                        {
                            "metric": f"oa_{universe}_{count}",
                            "iso": iso,
                            "country": "World" if iso == "WORLD" else COUNTRIES[iso]["name"],
                            "year": year,
                            "value": n,
                        }
                    )

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["metric", "iso", "country", "year", "value"])
        w.writeheader()
        w.writerows(rows)

    counts: dict[str, int] = {}
    for r in rows:
        counts[r["metric"]] = counts.get(r["metric"], 0) + 1
    meta = {
        "source": "OpenAlex works API (group_by=publication_year)",
        "url": API,
        "years": list(YEARS),
        "countries": ["WORLD", *ISO2],
        "indicators": {k: {"n": n} for k, n in sorted(counts.items())},
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    (ROOT / "src" / ".observablehq" / "cache" / "data" / "openalex.csv").unlink(missing_ok=True)
    return meta
