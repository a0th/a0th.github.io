from __future__ import annotations

import argparse
from pathlib import Path

from brviz.pisa import fetch as fetch_pisa
from brviz.wdi import fetch

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "wdi.csv"
PISA_OUT = ROOT / "data" / "pisa.csv"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="brviz")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_fetch = sub.add_parser(
        "fetch", help="Download WDI, WGI RQ, start-up days, Fraser EFW, and PISA"
    )
    p_fetch.add_argument("--start", type=int, default=1990)
    p_fetch.add_argument("--end", type=int, default=2024)
    p_fetch.add_argument(
        "--all",
        action="store_true",
        help="Also fetch FDI, education, internet, demographics, …",
    )
    p_fetch.add_argument("--out", type=Path, default=DEFAULT_OUT)

    args = parser.parse_args(argv)
    if args.cmd == "fetch":
        meta = fetch(start=args.start, end=args.end, extra=args.all, out=args.out)
        print(f"wrote {meta['path']}  rows={meta['n_rows']}")
        for key, info in meta["indicators"].items():
            print(f"  {key:16s} {info['code']:22s} n={info['n']:4d}")
        pisa = fetch_pisa(out=PISA_OUT)
        print(f"wrote {pisa['path']}  rows={pisa['n_rows']}")
        for key, info in pisa["indicators"].items():
            print(f"  {key:16s} {info['code']:22s} n={info['n']:4d}")
    return 0
