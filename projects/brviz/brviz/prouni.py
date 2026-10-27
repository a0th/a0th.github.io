"""ProUni scholarships granted per year, by modality, type and course.

The MEC open-data portal (dadosabertos.mec.gov.br/prouni) sits behind a
Cloudflare challenge that blocks scripted downloads. The 2015–2020 files are
read from a public GitHub copy of the MEC CSVs (one row per scholarship). To
use the official files instead, download them by hand into ``data/raw/prouni``
as ``pda-prouni-YYYY.csv``; local files take precedence.
"""

from __future__ import annotations

import csv
import io
import json
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "prouni.csv"
LOCAL = ROOT / "data" / "raw" / "prouni"
UA = "brviz/0.1 (https://github.com/nilo)"
MIRROR = (
    "https://raw.githubusercontent.com/quirinowelton/"
    "prouni-data-analytics-investigando-o-acesso-ao-ensino-superior/main/pda-prouni-{year}.csv"
)
YEARS = range(2015, 2021)
TOP_COURSES = 15


def _text(year: int) -> str:
    local = LOCAL / f"pda-prouni-{year}.csv"
    if local.exists():
        raw = local.read_bytes()
    else:
        req = urllib.request.Request(MIRROR.format(year=year), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=180) as resp:
            raw = resp.read()
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def _rows(year: int) -> list[dict]:
    text = _text(year)
    delimiter = ";" if text.split("\n", 1)[0].count(";") > text.split("\n", 1)[0].count(",") else ","
    return list(csv.DictReader(io.StringIO(text), delimiter=delimiter))


def _course(name: str) -> str:
    """Drop campus, modality and degree-type decorations that some years append."""
    s = " ".join(name.strip().upper().split())
    for prefix in ("LICENCIATURA EM ", "BACHARELADO EM ", "CURSO DE "):
        if s.startswith(prefix):
            s = s[len(prefix) :]
    for cut in ("(", " - ", " – ", " COM HABILITA", "- "):
        if cut in s:
            s = s.split(cut, 1)[0]
    s = s.strip(" -–")
    if s.startswith("ADMINISTRAÇÃO DE EMPRESAS"):
        s = "ADMINISTRAÇÃO"
    return s or "NÃO INFORMADO"


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    out_rows = []
    courses_all: Counter = Counter()
    per_year: dict[int, Counter] = {}
    for year in YEARS:
        rows = _rows(year)
        ead = sum(1 for r in rows if "DIST" in r["MODALIDADE_ENSINO_BOLSA"].upper() or r["MODALIDADE_ENSINO_BOLSA"].upper() == "EAD")
        integral = sum(1 for r in rows if "INTEGRAL" in r["TIPO_BOLSA"].upper())
        courses = Counter(_course(r["NOME_CURSO_BOLSA"]) for r in rows)
        per_year[year] = courses
        courses_all.update(courses)
        for metric, value in (("bolsas", len(rows)), ("bolsas_ead", ead), ("bolsas_integral", integral)):
            out_rows.append({"metric": metric, "year": year, "key": "", "value": value})

    top = [c for c, _ in courses_all.most_common(TOP_COURSES)]
    for year, courses in per_year.items():
        for course in top:
            out_rows.append({"metric": "bolsas_curso", "year": year, "key": course, "value": courses[course]})
        out_rows.append({"metric": "bolsas_curso", "year": year, "key": "OUTROS", "value": sum(v for c, v in courses.items() if c not in top)})

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["metric", "year", "key", "value"])
        w.writeheader()
        w.writerows(out_rows)

    counts: dict[str, int] = {}
    for r in out_rows:
        counts[r["metric"]] = counts.get(r["metric"], 0) + 1
    meta = {
        "source": "MEC, ProUni bolsas concedidas (pda-prouni), via GitHub mirror unless data/raw/prouni has local copies",
        "url": MIRROR.split("{")[0],
        "years": list(YEARS),
        "indicators": {k: {"n": n} for k, n in sorted(counts.items())},
        "n_rows": len(out_rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    (ROOT / "src" / ".observablehq" / "cache" / "data" / "prouni.csv").unlink(missing_ok=True)
    return meta
