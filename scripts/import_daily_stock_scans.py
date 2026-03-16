#!/usr/bin/env python3

import csv
import io
import math
import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Tuple

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("/var/www/aurora-app/.env.local")
load_dotenv("/var/www/aurora-app/.env.production")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
    sys.exit(1)

CORE_QUERY = (
    "v=150&f=cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,"
    "fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,"
    "fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30&o=-marketcap&"
    "c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3"
)

ALTERNATIVE_QUERY = (
    "v=150&f=cap_midover,fa_curratio_o1.5,fa_debteq_u0.5,fa_epsyoy_o10,"
    "fa_epsyoy1_o10,fa_estltgrowth_o10,fa_quickratio_o0.5,fa_roa_o5,"
    "fa_roe_o5,fa_roi_o5,sh_instown_o30&o=-marketcap&"
    "c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3"
)

BASE_EXPORT_URL = "https://finviz.com/export.ashx"
PAGE_SIZE = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    ),
    "Accept": "text/csv,text/plain;q=0.9,*/*;q=0.8",
    "Referer": "https://finviz.com/",
}

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def fetch_csv(query: str) -> List[Dict[str, str]]:
    url = f"{BASE_EXPORT_URL}?{query}"
    response = requests.get(url, headers=HEADERS, timeout=45)
    response.raise_for_status()

    text = response.text.strip()
    if text.startswith("<!DOCTYPE") or text.startswith("<html"):
        raise RuntimeError("Finviz returned HTML instead of CSV")

    reader = csv.DictReader(io.StringIO(text))
    rows = [dict(row) for row in reader]
    return rows

def get_value(row: Dict[str, str], *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""

def to_record(row: Dict[str, str], scanner_list: str, stamp: str) -> Dict[str, str]:
    ticker = get_value(row, "Ticker", "Symbol").upper()
    company = get_value(row, "Company")
    sector = get_value(row, "Sector")
    industry = get_value(row, "Industry")
    market_cap = get_value(row, "Market Cap")
    price = get_value(row, "Price")
    change_pct = get_value(row, "Change")
    volume = get_value(row, "Volume")

    return {
        "scanner_list": scanner_list,
        "ticker": ticker,
        "company": company or None,
        "sector": sector or None,
        "industry": industry or None,
        "market_cap": market_cap or None,
        "price": price or None,
        "change_pct": change_pct or None,
        "volume": volume or None,
        "scan_date": stamp,
        "updated_at": stamp,
    }

def chunked(items: List[Dict[str, str]], size: int) -> List[List[Dict[str, str]]]:
    return [items[i:i + size] for i in range(0, len(items), size)]

def delete_existing_rows(supabase: Client, scanner_list: str) -> None:
    response = supabase.table("daily_stock_scans").delete().eq("scanner_list", scanner_list).execute()
    if getattr(response, "data", None) is None and getattr(response, "error", None):
        raise RuntimeError(str(response.error))

def insert_rows(supabase: Client, rows: List[Dict[str, str]]) -> None:
    for batch in chunked(rows, 500):
        response = supabase.table("daily_stock_scans").insert(batch).execute()
        if getattr(response, "data", None) is None and getattr(response, "error", None):
            raise RuntimeError(str(response.error))

def import_scan(supabase: Client, scanner_list: str, query: str) -> Tuple[int, int]:
    raw_rows = fetch_csv(query)
    stamp = utc_now_iso()

    records = []
    for row in raw_rows:
        ticker = get_value(row, "Ticker", "Symbol").upper()
        if not ticker:
            continue
        records.append(to_record(row, scanner_list, stamp))

    delete_existing_rows(supabase, scanner_list)

    if records:
        insert_rows(supabase, records)

    pages = math.ceil(len(records) / PAGE_SIZE) if records else 0
    return len(records), pages

def main() -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    print("Starting daily stock scan import...")

    core_count, core_pages = import_scan(supabase, "core", CORE_QUERY)
    print(f"Core imported: {core_count} rows across {core_pages} page(s)")

    alternative_count, alternative_pages = import_scan(
        supabase, "alternative", ALTERNATIVE_QUERY
    )
    print(
        f"Alternative imported: {alternative_count} rows across {alternative_pages} page(s)"
    )

    total = core_count + alternative_count
    print(f"Import complete. Total rows imported: {total}")

if __name__ == "__main__":
    main()
