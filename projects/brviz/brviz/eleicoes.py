"""Presidential vote by municipality joined to social indicators.

One row per municipality (IBGE code):

- PT share of valid votes in the presidential runoff, 2002-2022 (TSE)
- Auxílio Brasil families paid for October 2022 (Portal da Transparência)
- Census 2022: population, households, mean household income per capita,
  schooling of adults 25+ (IBGE SIDRA)
- great-circle distance to the state capital and to the nearest city with
  500k+ inhabitants

The Auxílio Brasil file is ~340 MB zipped (one row per payment); it is
streamed from a temporary file and discarded.
"""

from __future__ import annotations

import csv
import io
import json
import math
import tempfile
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "eleicoes.csv"
UA = "Mozilla/5.0 (brviz/0.1; https://github.com/nilo)"

YEARS = (2002, 2006, 2010, 2014, 2018, 2022)
TSE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_partido_munzona/votacao_partido_munzona_{year}.zip"
TSE_IBGE_URL = "https://raw.githubusercontent.com/betafcc/Municipios-Brasileiros-TSE/master/municipios_brasileiros_tse.csv"
MUN_URL = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv"
AUX_MONTH = "202210"
AUX_URL = f"https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/auxilio-brasil-saques/{AUX_MONTH}_AuxilioBrasil.zip"
SIDRA = "https://apisidra.ibge.gov.br/values"
SIDRA_QUERIES = {
    "pop": "/t/4709/n6/all/v/93/p/2022",
    "households": "/t/4712/n6/all/v/381/p/2022",
    "income_pc": "/t/10295/n6/all/v/13431/p/2022/c2/6794/c86/95251/c58/95253",
    "college_25": "/t/10061/n6/all/v/1002667/p/2022/c1568/99713/c58/108866/c2/6794/c86/95251",
    "no_school_25": "/t/10061/n6/all/v/1002667/p/2022/c1568/9493/c58/108866/c2/6794/c86/95251",
}
BIG_CITY = 500_000
REGION = {"1": "Norte", "2": "Nordeste", "3": "Sudeste", "4": "Sul", "5": "Centro-Oeste"}


def _get_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=600) as resp:
        return resp.read()


def _download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=600) as resp, dest.open("wb") as f:
        while chunk := resp.read(1 << 20):
            f.write(chunk)


def _csv_rows(blob: bytes) -> list[dict]:
    return list(csv.DictReader(io.StringIO(blob.decode("utf-8"))))


def _int(text: str) -> int:
    return int(text.strip().strip('"') or 0)


def pt_runoff(year: int, tse_to_ibge: dict[str, str]) -> dict[str, tuple[int, int]]:
    """IBGE code -> (PT votes, valid votes) in the presidential runoff."""
    blob = _get_bytes(TSE_URL.format(year=year))
    pt: Counter[str] = Counter()
    valid: Counter[str] = Counter()
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        name = next(n for n in z.namelist() if n.endswith(f"{year}_BR.csv"))
        with z.open(name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1"), delimiter=";")
            votes_col = "QT_VOTOS_NOMINAIS_VALIDOS" if "QT_VOTOS_NOMINAIS_VALIDOS" in reader.fieldnames else "QT_VOTOS_NOMINAIS"
            for r in reader:
                if r["CD_CARGO"].strip('"') != "1" or r["NR_TURNO"].strip('"') != "2":
                    continue
                ibge = tse_to_ibge.get(str(int(r["CD_MUNICIPIO"])))
                if not ibge:
                    continue
                n = _int(r[votes_col])
                valid[ibge] += n
                if r["SG_PARTIDO"].strip() == "PT":
                    pt[ibge] += n
    return {k: (pt[k], v) for k, v in valid.items() if v}


def auxilio_families(siafi_to_ibge: dict[str, str]) -> dict[str, int]:
    """IBGE code -> families paid Auxílio Brasil for the reference month."""
    counts: Counter[str] = Counter()
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "aux.zip"
        _download(AUX_URL, path)
        with zipfile.ZipFile(path) as z, z.open(z.namelist()[0]) as raw:
            reader = csv.reader(io.TextIOWrapper(raw, encoding="latin-1"), delimiter=";")
            header = next(reader)
            i_ref = header.index("MÊS REFERÊNCIA")
            i_siafi = header.index("CÓDIGO MUNICÍPIO SIAFI")
            for r in reader:
                if r[i_ref] == AUX_MONTH:
                    counts[r[i_siafi]] += 1
    out: dict[str, int] = defaultdict(int)
    for siafi, n in counts.items():
        ibge = siafi_to_ibge.get(str(int(siafi)))
        if ibge:
            out[ibge] += n
    return out


def sidra(path: str) -> dict[str, float]:
    rows = json.loads(_get_bytes(SIDRA + path))[1:]
    out = {}
    for r in rows:
        try:
            out[r["D1C"]] = float(r["V"])
        except ValueError:
            continue
    return out


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def fetch(*, out: Path = DEFAULT_OUT) -> dict:
    muns = _csv_rows(_get_bytes(MUN_URL))
    tse = _csv_rows(_get_bytes(TSE_IBGE_URL))
    tse_to_ibge = {str(int(r["codigo_tse"])): r["codigo_ibge"] for r in tse}
    siafi_to_ibge = {str(int(r["siafi_id"])): r["codigo_ibge"] for r in muns}
    names = {r["codigo_ibge"]: (r["nome_municipio"], r["uf"]) for r in tse}

    census = {key: sidra(path) for key, path in SIDRA_QUERIES.items()}
    votes = {year: pt_runoff(year, tse_to_ibge) for year in YEARS}
    aux = auxilio_families(siafi_to_ibge)

    coords = {r["codigo_ibge"]: (float(r["latitude"]), float(r["longitude"])) for r in muns}
    capitals = {r["codigo_uf"]: r["codigo_ibge"] for r in muns if r["capital"] == "1"}
    big = [ibge for ibge, pop in census["pop"].items() if pop >= BIG_CITY and ibge in coords]

    rows = []
    for m in muns:
        ibge = m["codigo_ibge"]
        lat, lon = coords[ibge]
        cap = capitals[m["codigo_uf"]]
        hh = census["households"].get(ibge)
        row = {
            "ibge": ibge,
            "name": m["nome"],
            "uf": names.get(ibge, ("", ""))[1],
            "region": REGION[ibge[0]],
            "capital": int(m["capital"]),
            "lat": lat,
            "lon": lon,
            "pop": int(census["pop"].get(ibge, 0)) or None,
            "households": int(hh) if hh else None,
            "income_pc": census["income_pc"].get(ibge),
            "college_25": census["college_25"].get(ibge),
            "no_school_25": census["no_school_25"].get(ibge),
            "aux_families": aux.get(ibge, 0),
            "aux_share": round(100 * aux.get(ibge, 0) / hh, 2) if hh else None,
            "dist_capital_km": round(_haversine(lat, lon, *coords[cap]), 1),
            "dist_big_km": round(min(_haversine(lat, lon, *coords[b]) for b in big), 1),
        }
        for year in YEARS:
            pt, valid = votes[year].get(ibge, (None, None))
            row[f"pt{year}"] = round(100 * pt / valid, 2) if valid else None
            row[f"valid{year}"] = valid
        rows.append(row)

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    indicators = {
        key: {"n": sum(r[key] is not None for r in rows)}
        for key in ["pop", "households", "income_pc", "college_25", "no_school_25", "aux_share", *(f"pt{y}" for y in YEARS)]
    }
    meta = {
        "source": "TSE (votação por partido e município), Portal da Transparência (Auxílio Brasil), IBGE SIDRA (Censo 2022)",
        "urls": {
            "tse": TSE_URL,
            "auxilio": AUX_URL,
            "sidra": {k: SIDRA + v for k, v in SIDRA_QUERIES.items()},
            "tse_ibge": TSE_IBGE_URL,
            "municipios": MUN_URL,
        },
        "aux_month": AUX_MONTH,
        "big_city_threshold": BIG_CITY,
        "big_cities": len(big),
        "indicators": indicators,
        "n_rows": len(rows),
        "path": _rel(out),
    }
    out.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
    cache = ROOT / "src" / ".observablehq" / "cache" / "data" / "eleicoes.csv"
    cache.unlink(missing_ok=True)
    return meta
