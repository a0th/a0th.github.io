"""Global Organized Crime Index (GI-TOC), editions 2021, 2023 and 2025.

Expert-assessed scores from 1 to 10 for criminal markets, criminal actors
and resilience. One workbook carries every edition, one sheet per year.
``WORLD`` is the simple mean of all 193 countries in each edition, and
``*_rank`` rows place each kept country among all 193 (ties share a rank).
"""

from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

from brviz.catalog import COUNTRIES
from brviz.commodities import _num, _shared_strings, _sheet_grid, _sheet_map

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "ocindex.csv"
UA = "Mozilla/5.0 (brviz/0.1; https://github.com/nilo)"
URL = "https://ocindex.net/assets/downloads/global_oc_index.xlsx"
SHEET = re.compile(r"^(\d{4})_dataset$")
RANKED = ("criminality", "criminal_markets", "criminal_actors", "resilience")

NAME_TO_ISO = {c["name"]: iso for iso, c in COUNTRIES.items() if c["group"] != "aggregate"}
NAME_TO_ISO.update(
    {
        "Venezuela": "VEN",
        "Russia": "RUS",
        "Turkey": "TUR",
        "Türkiye": "TUR",
        "Czech Republic": "CZE",
        "Korea, Rep,": "KOR",
    }
)

# 2021 headers drop the "avg." suffix on two pillars.
PILLARS = {
    "criminality": "criminality",
    "criminal_actors": "criminal_actors",
    "resilience": "resilience",
}


def _slug(header: str) -> str:
    text = re.sub(r"\bavg[.,]?", "", header.lower())
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return PILLARS.get(text, text)


def _get_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def parse(blob: bytes) -> list[dict]:
    rows = []
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        strings = _shared_strings(z)
        for name, target in _sheet_map(z).items():
            match = SHEET.match(name)
            if not match:
                continue
            year = int(match.group(1))
            grid = _sheet_grid(z, target, strings)
            header = [str(c).strip() if c else "" for c in grid[0]]
            cols = [(i, _slug(h), h.replace(" avg.", "").replace(" avg,", "").strip()) for i, h in enumerate(header) if i >= 3 and h]
            sums: dict[str, list[float]] = {}
            for r in grid[1:]:
                country = (r[2] or "").strip() if len(r) > 2 and isinstance(r[2], str) else ""
                if not country:
                    continue
                iso = NAME_TO_ISO.get(country)
                for i, metric, label in cols:
                    value = _num(r[i] if i < len(r) else None)
                    if value is None:
                        continue
                    sums.setdefault(metric, []).append(value)
                    if iso:
                        rows.append(
                            {
                                "metric": metric,
                                "label": label,
                                "iso": iso,
                                "country": COUNTRIES[iso]["name"],
                                "year": year,
                                "value": value,
                            }
                        )
            labels = {metric: label for _, metric, label in cols}
            for metric in RANKED:
                i = next(i for i, m, _ in cols if m == metric)
                by_country = {}
                for r in grid[1:]:
                    country = r[2].strip() if len(r) > 2 and isinstance(r[2], str) else ""
                    value = _num(r[i] if i < len(r) else None)
                    if country and value is not None:
                        by_country[country] = value
                for country, value in by_country.items():
                    iso = NAME_TO_ISO.get(country)
                    if not iso:
                        continue
                    rows.append(
                        {
                            "metric": f"{metric}_rank",
                            "label": f"{labels[metric]}, rank of {len(by_country)} (1 = highest)",
                            "iso": iso,
                            "country": COUNTRIES[iso]["name"],
                            "year": year,
                            "value": 1 + sum(v > value for v in by_country.values()),
                        }
                    )
            for metric, values in sums.items():
                rows.append(
                    {
                        "metric": metric,
                        "label": labels[metric],
                        "iso": "WORLD",
                        "country": f"World mean ({len(values)} countries)",
                        "year": year,
                        "value": round(sum(values) / len(values), 3),
                    }
                )
    return rows


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    rows = parse(_get_bytes(URL))
    if not rows:
        raise RuntimeError(f"no OC Index rows parsed from {URL}")

    out.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["metric", "label", "iso", "country", "year", "value"]
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    counts: dict[str, int] = {}
    for row in rows:
        counts[row["metric"]] = counts.get(row["metric"], 0) + 1
    meta = {
        "source": "Global Initiative Against Transnational Organized Crime, Global Organized Crime Index",
        "url": URL,
        "years": sorted({r["year"] for r in rows}),
        "countries": sorted({r["iso"] for r in rows}),
        "indicators": {key: {"n": n} for key, n in sorted(counts.items())},
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
    cache = ROOT / "src" / ".observablehq" / "cache" / "data" / "ocindex.csv"
    cache.unlink(missing_ok=True)
    return meta
