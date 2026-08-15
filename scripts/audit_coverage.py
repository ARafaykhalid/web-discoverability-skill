#!/usr/bin/env python3
"""Audit registry uniqueness, quality, taxonomy coverage, and matrix completeness."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from difflib import SequenceMatcher
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
LEVELS = ["LITE", "RECOMMENDED", "EXTRA", "ULTRA"]
GENERIC_TITLES = {
    "optimize seo", "improve seo", "technical seo", "on page seo", "ai seo",
    "optimize content", "optimize metadata", "improve discoverability",
}


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def load_records(manifest: dict) -> list[dict]:
    records = []
    for domain in manifest["domains"]:
        path = ROOT / "requirements" / domain["file"]
        records.extend(json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
    return records


def duplicate_groups(records: list[dict]) -> tuple[list[list[str]], list[list[str]]]:
    exact_index: dict[str, list[str]] = defaultdict(list)
    for record in records:
        exact_index[normalize(record["title"])].append(record["id"])
    exact = [ids for title, ids in exact_index.items() if title and len(ids) > 1]

    near = []
    normalized = [(record["id"], normalize(record["title"])) for record in records]
    exact_ids = {requirement_id for group in exact for requirement_id in group}
    for index, (left_id, left) in enumerate(normalized):
        if left_id in exact_ids or len(left.split()) < 5:
            continue
        for right_id, right in normalized[index + 1 :]:
            if right_id in exact_ids or len(right.split()) < 5:
                continue
            if abs(len(left) - len(right)) > max(12, int(max(len(left), len(right)) * 0.12)):
                continue
            if SequenceMatcher(None, left, right).ratio() >= 0.965:
                near.append([left_id, right_id])
    return exact, near


def audit() -> dict:
    manifest = json.loads((ROOT / "requirements/manifest.json").read_text(encoding="utf-8"))
    coverage = json.loads((ROOT / "requirements/coverage-map.json").read_text(encoding="utf-8"))
    records = load_records(manifest)
    by_id = {record["id"]: record for record in records}
    exact, near = duplicate_groups(records)
    duplicate_ids = {requirement_id for group in exact + near for requirement_id in group}

    generic = []
    for record in records:
        normalized = normalize(record["title"])
        if normalized in GENERIC_TITLES:
            generic.append(record["id"])

    missing = []
    incomplete = []
    misclassified = []
    area_rows = []
    for area in coverage["areas"]:
        ids = area.get("requirement_ids", [])
        unknown = [requirement_id for requirement_id in ids if requirement_id not in by_id]
        if area.get("status") == "MISSING" or not ids:
            missing.append(area["area"])
        elif area.get("status") != "COMPLETE":
            incomplete.append(area["area"])
        if unknown:
            incomplete.append(area["area"])
        area_rows.append({**area, "unknown_ids": unknown})

    surface_values = set(manifest["surface_values"])
    surfaces = manifest["search_surfaces"]
    required_new_fields = {
        "requirement_type", "platform_status", "official_sources", "platforms", "search_surfaces",
        "level", "official_source", "platform", "search_surface_matrix", "concept_classification",
        "ai_terms", "schema_org_status", "google_eligibility", "bing_eligibility",
        "ai_discoverability_relevance", "risk", "evidence_types", "allowed_statuses",
    }
    for record in records:
        if required_new_fields - set(record):
            incomplete.append(record["id"])
        matrix = record.get("search_surfaces", {})
        if set(matrix) != set(surfaces) or set(matrix.values()) - surface_values:
            incomplete.append(record["id"])
        if record["id"] == "SEO-284" and record.get("platform_status") != "INDUSTRY_TERM":
            misclassified.append(record["id"])
        if record["domain"] == "llms-txt" and record.get("platform_status") != "EMERGING_PRACTICE":
            misclassified.append(record["id"])
        if record["domain"] in {"google-search", "bing-indexnow", "discover"} and not record.get("official_sources"):
            misclassified.append(record["id"])
        if record["domain"] == "structured-data" and record.get("schema_org_status") != "SCHEMA_VALIDITY_AND_PLATFORM_ELIGIBILITY":
            misclassified.append(record["id"])

    level_counts = Counter()
    for record in records:
        for level in record["levels"]:
            level_counts[level] += 1
    domain_counts = Counter(record["domain"] for record in records)
    surface_counts = {
        surface: Counter(record["search_surfaces"][surface] for record in records)
        for surface in surfaces
    }
    ai_counts = Counter(term for record in records for term in record.get("ai_terms", []))

    genuine_unique = len(records) - len(duplicate_ids) - len(generic)
    return {
        "total_requirements": len(records),
        "genuine_unique_requirements": genuine_unique,
        "duplicate_groups": {"exact": exact, "near": near},
        "duplicate_requirement_ids": sorted(duplicate_ids),
        "generic_requirement_ids": sorted(generic),
        "missing": sorted(set(missing)),
        "incomplete": sorted(set(incomplete)),
        "misclassified": sorted(set(misclassified)),
        "level_counts": {level: level_counts[level] for level in LEVELS},
        "domain_counts": dict(sorted(domain_counts.items())),
        "search_surface_counts": {
            surface: {value: surface_counts[surface][value] for value in manifest["surface_values"]}
            for surface in surfaces
        },
        "ai_taxonomy_counts": dict(sorted(ai_counts.items())),
        "coverage_areas": area_rows,
    }


def report(result: dict) -> str:
    rows = [
        "# Registry coverage audit",
        "",
        f"TOTAL REQUIREMENTS: {result['total_requirements']}",
        f"GENUINE UNIQUE REQUIREMENTS: {result['genuine_unique_requirements']}",
        f"DUPLICATES: {len(result['duplicate_requirement_ids'])}",
        f"MISSING: {len(result['missing'])}",
        f"INCOMPLETE: {len(result['incomplete'])}",
        f"MISCLASSIFIED: {len(result['misclassified'])}",
        f"LITE COUNT: {result['level_counts']['LITE']}",
        f"RECOMMENDED COUNT: {result['level_counts']['RECOMMENDED']}",
        f"EXTRA COUNT: {result['level_counts']['EXTRA']}",
        f"ULTRA COUNT: {result['level_counts']['ULTRA']}",
        "",
        "## Domain counts",
        "",
    ]
    rows.extend(f"- {domain}: {count}" for domain, count in result["domain_counts"].items())
    rows.extend(["", "## Search surface counts", ""])
    for surface, counts in result["search_surface_counts"].items():
        rows.append(f"- {surface}: " + ", ".join(f"{key}={value}" for key, value in counts.items()))
    rows.extend(["", "## AI taxonomy counts", ""])
    rows.extend(f"- {term}: {count}" for term, count in result["ai_taxonomy_counts"].items())
    rows.extend(["", "## Coverage areas", "", "| Area | Status | Requirement count | Notes |", "| --- | --- | ---: | --- |"])
    for area in result["coverage_areas"]:
        status = "PARTIAL" if area["unknown_ids"] else area["status"]
        rows.append(f"| {area['area']} | {status} | {len(area['requirement_ids'])} | {area['notes']} |")
    return "\n".join(rows) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", choices=["json", "report"], default="report")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    result = audit()
    output = json.dumps(result, indent=2) + "\n" if args.format == "json" else report(result)
    if args.out:
        args.out.write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    if result["genuine_unique_requirements"] < 530 or result["missing"] or result["incomplete"] or result["misclassified"] or result["duplicate_requirement_ids"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
