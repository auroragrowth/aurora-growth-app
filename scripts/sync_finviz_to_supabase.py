import os
import csv
import io
from datetime import datetime, timezone

import requests

SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

REST_URL = f"{SUPABASE_URL}/rest/v1/scanner_results"

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

FINVIZ_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://finviz.com/",
    "Accept-Language": "en-GB,en;q=0.9",
}

CORE_QUERY = "v=150&f=cap_midover,fa_curratio_o2,fa_debteq_u0.4,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_peg_u2,fa_quickratio_o1,fa_roa_o10,fa_roe_o10,fa_roi_o10,sh_instown_o30&o=-marketcap&c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3"
ALT_QUERY = "v=150&f=cap_midover,fa_curratio_o1.5,fa_debteq_u0.5,fa_epsyoy_o10,fa_epsyoy1_o10,fa_estltgrowth_o10,fa_quickratio_o0.5,fa_roa_o5,fa_roe_o5,fa_roi_o5,sh_instown_o30&o=-marketcap&c=0,1,2,6,78,17,18,20,32,33,34,36,35,38,9,28,3"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def clean_float(value, default=0.0):
    try:
        if value is None:
            return default
        s = str(value).strip()
        if not s or s in ("-", "—", "N/A", "nan", "None"):
            return default
        s = s.replace("%", "").replace("$", "").replace(",", "").replace("+", "")
        return float(s)
    except Exception:
        return default

def clean_text(value):
    return str(value or "").strip()

def trend_from_change(change_percent):
    if change_percent > 0.15:
        return "up"
    if change_percent < -0.15:
        return "down"
    return "flat"

def aurora_score(row):
    score = 0

    peg = clean_float(row.get("PEG"))
    roe = clean_float(row.get("ROE"))
    roa = clean_float(row.get("ROA"))
    roi = clean_float(row.get("ROI"))
    eps_this_y = clean_float(row.get("EPS this Y"))
    eps_next_y = clean_float(row.get("EPS next Y"))
    eps_next_5y = clean_float(row.get("EPS next 5Y"))
    sales_qoq = clean_float(row.get("Sales Q/Q"))
    eps_qoq = clean_float(row.get("EPS Q/Q"))
    debt_eq = clean_float(row.get("Debt/Eq"))
    current_ratio = clean_float(row.get("Current Ratio"))
    quick_ratio = clean_float(row.get("Quick Ratio"))
    inst_own = clean_float(row.get("Inst Own"))

    if peg > 0:
        if peg <= 1: score += 18
        elif peg <= 1.5: score += 14
        elif peg <= 2: score += 10

    if roe >= 25: score += 15
    elif roe >= 15: score += 10
    elif roe >= 10: score += 6

    if roa >= 15: score += 12
    elif roa >= 10: score += 8
    elif roa >= 5: score += 4

    if roi >= 15: score += 12
    elif roi >= 10: score += 8
    elif roi >= 5: score += 4

    if eps_this_y >= 25: score += 10
    elif eps_this_y >= 10: score += 6

    if eps_next_y >= 20: score += 10
    elif eps_next_y >= 10: score += 6

    if eps_next_5y >= 20: score += 10
    elif eps_next_5y >= 10: score += 6

    if sales_qoq >= 15: score += 6
    elif sales_qoq >= 5: score += 3

    if eps_qoq >= 15: score += 6
    elif eps_qoq >= 5: score += 3

    if debt_eq <= 0.5: score += 4
    if current_ratio >= 1.5: score += 3
    if quick_ratio >= 1.0: score += 2
    if inst_own >= 30: score += 2

    return min(100, round(score))

def fetch_export(query, pages=6):
    all_rows = []

    for page in range(1, pages + 1):
        start = (page - 1) * 20 + 1
        url = f"https://finviz.com/export.ashx?{query}&r={start}"
        r = requests.get(url, headers=FINVIZ_HEADERS, timeout=60)

        if r.status_code != 200:
            raise RuntimeError(f"Finviz export failed: {r.status_code}")

        text = r.text
        if "<html" in text.lower():
            raise RuntimeError("Finviz returned HTML instead of CSV")

        rows = list(csv.DictReader(io.StringIO(text)))
        if not rows:
            break

        all_rows.extend(rows)

        if len(rows) < 20:
            break

    return all_rows

def map_rows(records, scanner_type):
    ts = now_iso()
    output = []

    for r in records:
        ticker = clean_text(r.get("Ticker"))
        if not ticker:
            continue

        company = clean_text(r.get("Company"))
        sector = clean_text(r.get("Sector"))
        industry = clean_text(r.get("Industry"))
        market_cap = clean_text(r.get("Market Cap"))
        price = clean_float(r.get("Price"))
        change_percent = clean_float(r.get("Change"))

        row = {
            "ticker": ticker,
            "company": company,
            "company_name": company,
            "sector": sector,
            "industry": industry,
            "market_cap": market_cap,
            "pe": clean_float(r.get("P/E")),
            "forward_pe": clean_float(r.get("Forward P/E")),
            "peg": clean_float(r.get("PEG")),
            "eps_this_y": clean_float(r.get("EPS this Y")),
            "eps_next_y": clean_float(r.get("EPS next Y")),
            "eps_next_5y": clean_float(r.get("EPS next 5Y")),
            "sales_qoq": clean_float(r.get("Sales Q/Q")),
            "eps_qoq": clean_float(r.get("EPS Q/Q")),
            "roe": clean_float(r.get("ROE")),
            "roa": clean_float(r.get("ROA")),
            "roi": clean_float(r.get("ROI")),
            "debt_eq": clean_float(r.get("Debt/Eq")),
            "current_ratio": clean_float(r.get("Current Ratio")),
            "quick_ratio": clean_float(r.get("Quick Ratio")),
            "profit_margin": clean_float(r.get("Profit Margin")),
            "oper_margin": clean_float(r.get("Oper. Margin")),
            "inst_own": clean_float(r.get("Inst Own")),
            "insider_own": clean_float(r.get("Insider Own")),
            "target_price": clean_float(r.get("Target Price")),
            "price": price,
            "change_percent": change_percent,
            "trend": trend_from_change(change_percent),
            "score": aurora_score(r),
            "scanner_type": scanner_type,
            "source": "finviz",
            "source_list": ["finviz"],
            "updated_at": ts,
            "fetched_at": ts,
            "scanner_run_at": ts,
        }

        output.append(row)

    return output

def delete_existing_rows():
    r = requests.delete(f"{REST_URL}?id=not.is.null", headers=HEADERS, timeout=60)
    if r.status_code not in (200, 204):
        raise RuntimeError(f"Delete failed: {r.status_code} {r.text}")

def insert_rows(rows):
    chunk_size = 200
    inserted_total = 0
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i + chunk_size]
        r = requests.post(REST_URL, headers=HEADERS, json=chunk, timeout=120)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Insert failed: {r.status_code} {r.text}")
        inserted_total += len(chunk)
    return inserted_total

def main():
    if not SUPABASE_URL:
        raise RuntimeError("Missing SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY")

    core_records = fetch_export(CORE_QUERY, pages=4)
    alt_records = fetch_export(ALT_QUERY, pages=8)

    core_rows = map_rows(core_records, "core")
    alt_rows = map_rows(alt_records, "alternative")

    rows = core_rows + alt_rows

    delete_existing_rows()
    inserted = insert_rows(rows)

    print("Sync complete")
    print(f"Inserted rows: {inserted}")
    print(f"Core rows: {len(core_rows)}")
    print(f"Alternative rows: {len(alt_rows)}")
    print(f"Last update UTC: {now_iso()}")

if __name__ == "__main__":
    main()
