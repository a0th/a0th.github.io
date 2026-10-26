"""World Bank Pink Sheet commodity prices.

The Excel URL hash changes every month. Discover it from the Commodity
Markets page, then parse the annual workbook with the stdlib.
"""

from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "commodities.csv"
UA = "brviz/0.1 (https://github.com/nilo)"
PAGE = "https://www.worldbank.org/en/research/commodity-markets"
NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

INDEX_COLS = [
    ("all", "World Bank Commodity Price Index"),
    ("energy", "Energy"),
    ("non_energy", "Non-energy"),
    ("agriculture", "Agriculture"),
    ("beverages", "Beverages"),
    ("food", "Food"),
    ("oils_meals", "Oils & Meals"),
    ("grains", "Grains"),
    ("other_food", "Other Food"),
    ("raw_materials", "Raw Materials"),
    ("timber", "Timber"),
    ("other_raw", "Other Raw Materials"),
    ("fertilizers", "Fertilizers"),
    ("metals_minerals", "Metals & Minerals"),
    ("base_metals", "Base Metals (ex. iron ore)"),
    ("precious_metals", "Precious Metals"),
]

KEEP_PRICES = {
    "Crude oil, average": ("crude_oil", "$/bbl"),
    "Iron ore, cfr spot": ("iron_ore", "$/dmtu"),
    "Copper": ("copper", "$/mt"),
    "Soybeans": ("soybeans", "$/mt"),
    "Soybean oil": ("soybean_oil", "$/mt"),
    "Soybean meal": ("soybean_meal", "$/mt"),
    "Sugar, world": ("sugar", "$/kg"),
    "Coffee, Arabica": ("coffee_arabica", "$/kg"),
    "Coffee, Robusta": ("coffee_robusta", "$/kg"),
    "Maize": ("maize", "$/mt"),
    "Beef": ("beef", "$/kg"),
    "Orange": ("orange", "$/kg"),
    "Cotton, A Index": ("cotton", "$/kg"),
    "Aluminum": ("aluminum", "$/mt"),
}

ANNUAL_XLSX = re.compile(
    r"https://thedocs\.worldbank\.org/en/doc/[^\"']+/CMO-Historical-Data-Annual\.xlsx"
)


def _get_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def _get_text(url: str) -> str:
    return _get_bytes(url).decode("utf-8", "replace")


def discover_annual_url() -> str:
    html = _get_text(PAGE)
    match = ANNUAL_XLSX.search(html)
    if not match:
        raise RuntimeError(f"Pink Sheet annual xlsx not found on {PAGE}")
    return match.group(0)


def _col_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _shared_strings(z: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    out = []
    for si in root:
        if _local(si.tag) != "si":
            continue
        text = "".join(el.text or "" for el in si.iter() if _local(el.tag) == "t")
        out.append(text)
    return out


def _cell_value(cell: ET.Element, strings: list[str]) -> object:
    ctype = cell.attrib.get("t")
    if ctype == "s":
        v = cell.find(f"{{{NS_MAIN}}}v")
        if v is None:
            v = next((el for el in cell if _local(el.tag) == "v"), None)
        if v is None or v.text is None:
            return None
        return strings[int(v.text)]
    if ctype == "inlineStr":
        return "".join(el.text or "" for el in cell.iter() if _local(el.tag) == "t")
    v = next((el for el in cell if _local(el.tag) == "v"), None)
    if v is None or v.text is None:
        return None
    text = v.text
    try:
        n = float(text)
        return int(n) if n.is_integer() else n
    except ValueError:
        return text


def _sheet_grid(z: zipfile.ZipFile, target: str, strings: list[str]) -> list[list[object]]:
    path = target if target.startswith("xl/") else f"xl/{target.lstrip('/')}"
    root = ET.fromstring(z.read(path))
    grid: dict[tuple[int, int], object] = {}
    max_r = 0
    max_c = 0
    for cell in root.iter():
        if _local(cell.tag) != "c":
            continue
        ref = cell.attrib.get("r")
        if not ref:
            continue
        row = int("".join(ch for ch in ref if ch.isdigit())) - 1
        col = _col_index(ref)
        grid[(row, col)] = _cell_value(cell, strings)
        if row > max_r:
            max_r = row
        if col > max_c:
            max_c = col
    rows = [[None] * (max_c + 1) for _ in range(max_r + 1)]
    for (r, c), val in grid.items():
        rows[r][c] = val
    return rows


def _sheet_map(z: zipfile.ZipFile) -> dict[str, str]:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
    out = {}
    for sheet in wb.iter():
        if _local(sheet.tag) != "sheet":
            continue
        rel = sheet.attrib.get(f"{{{NS_REL}}}id")
        if not rel:
            continue
        out[sheet.attrib["name"]] = rid[rel]
    return out


def _clean(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = re.sub(r"\s+", " ", value).strip()
    return text or None


def _num(value: object) -> float | None:
    if value in (None, "", "…"):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _index_rows(grid: list[list[object]], kind: str) -> list[dict]:
    rows = []
    for r in grid[9:]:
        year = _num(r[0] if r else None)
        if year is None:
            continue
        year = int(year)
        for i, (metric, label) in enumerate(INDEX_COLS, start=1):
            value = _num(r[i] if i < len(r) else None)
            if value is None:
                continue
            rows.append(
                {
                    "metric": metric,
                    "label": label,
                    "kind": kind,
                    "unit": "index 2010=100",
                    "year": year,
                    "value": value,
                }
            )
    return rows


def _price_rows(grid: list[list[object]]) -> list[dict]:
    names = [_clean(c) for c in (grid[6] if len(grid) > 6 else [])]
    rows = []
    for r in grid[8:]:
        year = _num(r[0] if r else None)
        if year is None:
            continue
        year = int(year)
        for i, raw in enumerate(names):
            if raw not in KEEP_PRICES:
                continue
            metric, unit = KEEP_PRICES[raw]
            value = _num(r[i] if i < len(r) else None)
            if value is None:
                continue
            rows.append(
                {
                    "metric": metric,
                    "label": raw,
                    "kind": "price_nominal",
                    "unit": unit,
                    "year": year,
                    "value": value,
                }
            )
    return rows


def parse_annual(blob: bytes) -> tuple[str | None, list[dict]]:
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        strings = _shared_strings(z)
        sheets = _sheet_map(z)
        rows = []
        updated = None
        for name, kind in [
            ("Annual Indices (Nominal)", "index_nominal"),
            ("Annual Indices (Real)", "index_real"),
        ]:
            grid = _sheet_grid(z, sheets[name], strings)
            if updated is None and len(grid) > 3:
                updated = _clean(grid[3][0])
            rows.extend(_index_rows(grid, kind))
        price_grid = _sheet_grid(z, sheets["Annual Prices (Nominal)"], strings)
        rows.extend(_price_rows(price_grid))
    return updated, rows


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    url = discover_annual_url()
    blob = _get_bytes(url)
    updated, rows = parse_annual(blob)
    if not rows:
        raise RuntimeError(f"no commodity rows parsed from {url}")

    out.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["metric", "label", "kind", "unit", "year", "value"]
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    counts: dict[str, int] = {}
    for row in rows:
        counts[row["metric"]] = counts.get(row["metric"], 0) + 1
    meta = {
        "source": "World Bank Pink Sheet (Commodity Markets Outlook)",
        "page": PAGE,
        "url": url,
        "updated": updated,
        "base": "2010=100 for indices",
        "indicators": {
            key: {"n": n} for key, n in sorted(counts.items())
        },
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    cache = ROOT / "src" / ".observablehq" / "cache" / "data" / "commodities.csv"
    cache.unlink(missing_ok=True)
    return meta
