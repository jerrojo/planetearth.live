#!/usr/bin/env python3
"""
Planet Lens v1.1 — biodiversity pillar re-score.

WHY THIS EXISTS
---------------
Until v1.0 the biodiversity pillar (15% of the composite) was a hand-curated
judgement. v1.1 replaces it with a transparent, reproducible formula built
from two published datasets:

  BII  — Biodiversity Intactness Index, Natural History Museum London v2.1.1
         (2020 raster, ~10 km). Mean BII per country, AREA-WEIGHTED by
         cos(latitude) over the country polygon. Measures how much of the
         original ecosystem remains intact, 0-100%.
         https://doi.org/10.5519/k33reyb6   (CC-BY-NC-SA 4.0)

  RLI  — Red List Index, IUCN, served via Our World in Data (2024 values).
         The official SDG indicator 15.5.1. Tracks the aggregate extinction-
         risk trend of a country's species, 0-1 (1 = all Least Concern).
         https://ourworldindata.org/grapher/red-list-index

FORMULA
-------
  biodiversity_score = round( 0.80 * BII  +  0.20 * (RLI * 100) )

  BII is weighted 80% because it is the better CROSS-COUNTRY state measure:
  it asks "how intact is the ecosystem here", not "how many species are
  threatened". RLI is kept at 20% as a secondary trend signal — it is
  deliberately minor because RLI is biased toward species-poor countries
  (a desert with few species easily has them all 'Least Concern', which
  would otherwise reward arid states over megadiverse ones).

The composite score is then recomputed as the documented 7-pillar weighted
sum, and the traffic light re-derived (green >=65, yellow 40-64, red <40).

USAGE
-----
  python3 data/countries/tools/rescore-biodiversity.py          # apply
  python3 data/countries/tools/rescore-biodiversity.py --dry    # preview only

Re-running is safe: the rationale note is only appended once.
"""
import json
import sys
from pathlib import Path

# ── Paths (relative to this file → repo-portable) ──────────────────────
TOOLS_DIR = Path(__file__).resolve().parent
COUNTRIES_DIR = TOOLS_DIR.parent              # data/countries/
DATA_DIR = COUNTRIES_DIR / "data"             # data/countries/data/
INDEX = COUNTRIES_DIR / "_index.json"

DRY = "--dry" in sys.argv

# ── Inputs ─────────────────────────────────────────────────────────────
# BII: area-weighted mean per country, NHM v2.1.1, year 2020 raster.
# Computed once via cos(lat)-weighted zonal stats over Natural Earth 50m
# country polygons. (See commit message for the zonal-stats method.)
BII = {
    "CHN": 45.9, "USA": 51.7, "IND": 33.0, "RUS": 72.5, "JPN": 51.7,
    "DEU": 27.8, "KOR": 39.0, "CAN": 85.0, "MEX": 55.7, "BRA": 64.8,
    "IDN": 58.0, "COD": 71.9, "SAU": 60.1, "ARE": 61.7, "AUS": 59.8,
    "NOR": 76.2, "GBR": 31.0, "ZAF": 45.0, "FRA": 37.6, "ISL": 80.4,
    "CRI": 69.9, "DNK": 19.1, "SWE": 65.5, "URY": 38.6, "NZL": 60.1,
    "CHL": 73.4, "MAR": 57.7, "VNM": 43.2, "COL": 73.9, "ECU": 71.7,
}
# RLI: IUCN Red List Index, 2024, via Our World in Data.
RLI = {
    "CHN": 0.72, "USA": 0.83, "IND": 0.67, "RUS": 0.95, "JPN": 0.75,
    "DEU": 0.97, "KOR": 0.68, "CAN": 0.97, "MEX": 0.68, "BRA": 0.88,
    "IDN": 0.75, "COD": 0.88, "SAU": 0.89, "ARE": 0.84, "AUS": 0.81,
    "NOR": 0.95, "GBR": 0.97, "ZAF": 0.76, "FRA": 0.83, "ISL": 0.88,
    "CRI": 0.84, "DNK": 0.98, "SWE": 0.99, "URY": 0.91, "NZL": 0.64,
    "CHL": 0.75, "MAR": 0.88, "VNM": 0.70, "COL": 0.74, "ECU": 0.65,
}

BII_WEIGHT = 0.80
RLI_WEIGHT = 0.20

# 7-pillar composite weights (must match data/countries/README.md)
PILLAR_WEIGHTS = {
    "climate": 0.25, "forests_land": 0.15, "biodiversity": 0.15,
    "env_governance": 0.15, "protected_areas": 0.10, "pollution": 0.10,
    "agriculture": 0.10,
}

RATIONALE_MARKER = "[Planet Lens v1.1"
TODAY = "2026-05-24"


def traffic_light(value: float) -> str:
    if value >= 65:
        return "green"
    if value >= 40:
        return "yellow"
    return "red"


def biodiversity_score(iso3: str) -> int:
    bii = BII[iso3]
    rli = RLI[iso3]
    return round(BII_WEIGHT * bii + RLI_WEIGHT * (rli * 100))


def main() -> None:
    index = json.loads(INDEX.read_text())
    by_iso = {c["iso_a3"]: c for c in index["countries"]}

    rows = []
    for iso3 in sorted(BII):
        path = DATA_DIR / f"{iso3.lower()}.json"
        doc = json.loads(path.read_text())

        bio = doc["pillars"]["biodiversity"]
        bio_old = bio["score"]
        bio_new = biodiversity_score(iso3)

        # Recompute composite as the documented weighted sum.
        comp_old = doc["score"]["value"]
        pillars = {k: doc["pillars"][k]["score"] for k in PILLAR_WEIGHTS}
        pillars["biodiversity"] = bio_new
        comp_new = round(sum(pillars[k] * w for k, w in PILLAR_WEIGHTS.items()))
        light_old = doc["score"]["traffic_light"]
        light_new = traffic_light(comp_new)

        rows.append((iso3, bio_old, bio_new, comp_old, comp_new,
                     light_old, light_new))

        if DRY:
            continue

        # ── Apply to the country JSON ──────────────────────────────────
        bio["score"] = bio_new
        bio["data_confidence"] = "high"
        # Append the methodology note once.
        if RATIONALE_MARKER not in bio.get("rationale", ""):
            bii_v = BII[iso3]
            rli_v = RLI[iso3]
            bio["rationale"] = (
                bio["rationale"].rstrip()
                + f" {RATIONALE_MARKER}] Score = 80% Biodiversity Intactness "
                + f"Index ({bii_v:.1f}%, NHM 2020, area-weighted) + 20% Red "
                + f"List Index ({rli_v:.2f}, IUCN/OWID 2024)."
            )

        doc["score"]["value"] = comp_new
        doc["score"]["traffic_light"] = light_new
        doc["last_updated"] = TODAY

        # Ensure BII + RLI appear in the sources list.
        srcs = doc.setdefault("sources", [])
        have = {s.get("url", "") for s in srcs}
        if "https://doi.org/10.5519/k33reyb6" not in have:
            srcs.append({
                "name": "Biodiversity Intactness Index v2.1.1 — Natural History Museum",
                "url": "https://doi.org/10.5519/k33reyb6",
                "date_accessed": TODAY,
            })
        if "https://ourworldindata.org/grapher/red-list-index" not in have:
            srcs.append({
                "name": "Red List Index (IUCN, SDG 15.5.1) — Our World in Data",
                "url": "https://ourworldindata.org/grapher/red-list-index",
                "date_accessed": TODAY,
            })

        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")

        # ── Mirror score + light into _index.json ──────────────────────
        entry = by_iso.get(iso3)
        if entry:
            entry["score"] = comp_new
            entry["traffic_light"] = light_new

    if not DRY:
        index["version"] = "1.3"
        index["last_updated"] = TODAY
        INDEX.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")

    # ── Report ─────────────────────────────────────────────────────────
    print(f"{'iso':4} {'bioOld':>7} {'bioNew':>7} {'compOld':>8} {'compNew':>8}  light")
    flips = []
    for iso3, bo, bn, co, cn, lo, ln in sorted(rows, key=lambda r: -r[4]):
        flip = "" if lo == ln else f"   {lo} -> {ln}"
        if flip:
            flips.append(f"{iso3} {lo}->{ln}")
        print(f"{iso3:4} {bo:7} {bn:7} {co:8} {cn:8}  {ln}{flip}")
    print()
    print(f"traffic-light changes: {', '.join(flips) if flips else 'none'}")
    print("DRY RUN — nothing written." if DRY else "Applied. Re-run with --dry to preview only.")


if __name__ == "__main__":
    main()
