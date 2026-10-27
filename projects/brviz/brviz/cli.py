from __future__ import annotations

import argparse
from pathlib import Path

from brviz.commodities import fetch as fetch_commodities
from brviz.edu_intl import fetch as fetch_edu_intl
from brviz.eleicoes import fetch as fetch_eleicoes
from brviz.ocindex import fetch as fetch_ocindex
from brviz.openalex import fetch as fetch_openalex
from brviz.pisa import fetch as fetch_pisa
from brviz.prouni import fetch as fetch_prouni
from brviz.uis import fetch as fetch_uis
from brviz.wdi import fetch, splice

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "wdi.csv"
PISA_OUT = ROOT / "data" / "pisa.csv"
COMMODITIES_OUT = ROOT / "data" / "commodities.csv"
OCINDEX_OUT = ROOT / "data" / "ocindex.csv"
ELEICOES_OUT = ROOT / "data" / "eleicoes.csv"
UIS_OUT = ROOT / "data" / "uis.csv"
OPENALEX_OUT = ROOT / "data" / "openalex.csv"
EDU_INTL_OUT = ROOT / "data" / "edu_intl.csv"
PROUNI_OUT = ROOT / "data" / "prouni.csv"

STANDALONE = {
    "pisa": (fetch_pisa, PISA_OUT),
    "commodities": (fetch_commodities, COMMODITIES_OUT),
    "ocindex": (fetch_ocindex, OCINDEX_OUT),
    "eleicoes": (fetch_eleicoes, ELEICOES_OUT),
    "uis": (fetch_uis, UIS_OUT),
    "openalex": (fetch_openalex, OPENALEX_OUT),
    "edu_intl": (fetch_edu_intl, EDU_INTL_OUT),
    "prouni": (fetch_prouni, PROUNI_OUT),
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="brviz")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_fetch = sub.add_parser(
        "fetch",
        help="Download WDI, WGI RQ, start-up days, Fraser EFW, IMF, PISA, Pink Sheet, OC Index, municipal election data, UIS, and OpenAlex",
    )
    p_fetch.add_argument("--start", type=int, default=1990)
    p_fetch.add_argument("--end", type=int, default=2024)
    p_fetch.add_argument(
        "--all",
        action="store_true",
        help="Also fetch FDI, education, internet, demographics, …",
    )
    p_fetch.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p_fetch.add_argument(
        "--only",
        nargs="+",
        help="Refresh these series only (WDI/IMF keys splice wdi.csv; pisa, commodities, ocindex, eleicoes, uis, openalex, edu_intl and prouni rewrite their own files)",
    )

    args = parser.parse_args(argv)
    if args.cmd == "fetch":
        if args.only:
            rest = []
            for key in args.only:
                if key in STANDALONE:
                    fn, path = STANDALONE[key]
                    meta = fn(out=path)
                    _print_meta(meta)
                else:
                    rest.append(key)
            if rest:
                meta = splice(keys=rest, start=args.start, end=args.end, out=args.out)
                print(f"spliced {meta['path']}  rows={meta['n_rows']}")
                for key, info in meta["indicators"].items():
                    print(f"  {key:16s} {info.get('code', ''):22s} n={info['n']:4d}")
            return 0
        meta = fetch(start=args.start, end=args.end, extra=args.all, out=args.out)
        _print_meta(meta)
        _print_meta(fetch_pisa(out=PISA_OUT))
        _print_meta(fetch_commodities(out=COMMODITIES_OUT))
        _print_meta(fetch_ocindex(out=OCINDEX_OUT))
        _print_meta(fetch_eleicoes(out=ELEICOES_OUT))
        _print_meta(fetch_uis(out=UIS_OUT))
        _print_meta(fetch_openalex(out=OPENALEX_OUT))
        _print_meta(fetch_edu_intl(out=EDU_INTL_OUT))
        _print_meta(fetch_prouni(out=PROUNI_OUT))
    return 0


def _print_meta(meta: dict) -> None:
    print(f"wrote {meta['path']}  rows={meta['n_rows']}")
    for key, info in meta["indicators"].items():
        code = info.get("code") or ""
        print(f"  {key:16s} {code:22s} n={info['n']:4d}")
