#!/usr/bin/env python3
"""Validate registry shape, stable IDs, and completeness."""

from __future__ import annotations

import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {
    "id", "domain", "title", "description", "why_it_matters", "applicability", "activation",
    "priority", "minimum_level", "levels", "implementation_guidance", "verification_method",
    "evidence_requirement", "dependencies", "conflicts", "framework_notes", "what", "why", "who",
    "when", "where", "source_classification",
    "requirement_type", "platform_status", "official_sources", "platforms", "search_surfaces",
    "level", "official_source", "platform", "search_surface_matrix", "concept_classification",
    "ai_terms", "schema_org_status", "google_eligibility", "bing_eligibility",
    "ai_discoverability_relevance", "risk", "evidence_types", "allowed_statuses",
}
LEVELS = ["LITE", "RECOMMENDED", "EXTRA", "ULTRA"]
ACTIVATIONS = {
    "always", "public_site", "has_images", "has_video", "ecommerce", "local_business",
    "multilingual_or_multiregional", "ugc", "paywall_or_subscription", "content_publication",
    "public_documents", "analytics_or_measurement", "has_cdn_or_waf", "javascript_app",
    "interactive_app", "editorial_content",
}
REQUIRED_PATHS = [
    "SKILL.md", "agents/openai.yaml", "requirements/registry.md", "requirements/manifest.json",
    "requirements/coverage-map.json", "scripts/audit_coverage.py",
    "references/discovery-applicability.md", "references/subagents.md", "references/framework-adapters.md",
    "references/verification.md", "references/search-surface-matrix.md", "references/ai-taxonomy.md",
    "references/ai-crawler-policy-matrix.md", "assets/templates/audit-report.md", "assets/templates/final-report.md",
]
REQUIRED_TERMS = [
    "next.js", "react", "django", "fastapi", "monorepo", "saas", "ecommerce", "marketplace",
    "google discover", "bing copilot", "indexnow", "llms.txt", "merchant center", "schema.org",
    "image licensing", "video sitemap", "rss", "atom", "pdf", "paywall", "ugc", "cdn", "waf",
    "etag", "last-modified", "bfcache", "wcag 2.2 aa", "hacked", "regression", "search-surface",
    "aeo", "geo", "leo", "llmo", "sxo", "axo", "aio", "aiseo", "gaio", "aaio", "xeo",
    "meo", "veo", "google-extended", "gptbot", "oai-searchbot", "chatgpt-user", "claudebot",
    "perplexitybot", "amazonbot", "bytespider", "applebot", "data-nosnippet", "indexifembedded",
    "merchant center diagnostics", "bing ai performance", "site-name", "@id", "llms-full.txt",
]
PLATFORM_STATUSES = {
    "OFFICIAL_PLATFORM_CONCEPT", "ESTABLISHED_PRACTICE", "INDUSTRY_TERM",
    "EMERGING_PRACTICE", "EXPERIMENTAL",
}
SURFACE_VALUES = {"RELEVANT", "NOT_RELEVANT", "UNKNOWN"}
OPTIONAL_NONEMPTY_FIELDS = {"official_sources", "platforms", "ai_terms"}


def main() -> int:
    manifest_path = ROOT / "requirements/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = []
    records = []
    seen = set()
    normalized_titles = {}
    domain_names = {domain["domain"] for domain in manifest["domains"]}
    search_surfaces = manifest.get("search_surfaces", [])
    for domain in manifest["domains"]:
        path = ROOT / "requirements" / domain["file"]
        if not path.exists():
            errors.append(f"missing domain file: {path.name}")
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        if len(lines) != domain["count"]:
            errors.append(f"{path.name}: manifest count {domain['count']} != {len(lines)}")
        titles = set()
        for line_number, line in enumerate(lines, 1):
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"{path.name}:{line_number}: invalid JSON: {exc}")
                continue
            missing = REQUIRED - set(record)
            if missing:
                errors.append(f"{record.get('id', path.name)}: missing {sorted(missing)}")
            if record.get("domain") != domain["domain"]:
                errors.append(f"{record.get('id')}: wrong domain")
            if record.get("id") in seen:
                errors.append(f"duplicate id {record.get('id')}")
            seen.add(record.get("id"))
            if record.get("title") in titles:
                errors.append(f"{record.get('id')}: duplicate title in domain")
            titles.add(record.get("title"))
            normalized_title = re.sub(r"[^a-z0-9]+", " ", record.get("title", "").lower()).strip()
            if normalized_title in normalized_titles:
                errors.append(f"{record.get('id')}: normalized duplicate title with {normalized_titles[normalized_title]}")
            normalized_titles[normalized_title] = record.get("id")
            if record.get("minimum_level") not in LEVELS:
                errors.append(f"{record.get('id')}: invalid minimum level")
            if record.get("level") != record.get("minimum_level"):
                errors.append(f"{record.get('id')}: level alias differs from minimum_level")
            if record.get("activation") not in ACTIVATIONS:
                errors.append(f"{record.get('id')}: unsupported activation")
            if record.get("platform_status") not in PLATFORM_STATUSES:
                errors.append(f"{record.get('id')}: invalid platform status")
            matrix = record.get("search_surfaces", {})
            if set(matrix) != set(search_surfaces):
                errors.append(f"{record.get('id')}: incomplete search-surface matrix")
            elif set(matrix.values()) - SURFACE_VALUES:
                errors.append(f"{record.get('id')}: invalid search-surface matrix value")
            if record.get("search_surface_matrix") != matrix:
                errors.append(f"{record.get('id')}: search_surface_matrix alias differs")
            if set(record.get("evidence_types", [])) != set(manifest.get("evidence_types", [])):
                errors.append(f"{record.get('id')}: evidence model differs from manifest")
            if set(record.get("allowed_statuses", [])) != set(manifest.get("allowed_statuses", [])):
                errors.append(f"{record.get('id')}: status model differs from manifest")
            unknown_dependencies = set(record.get("dependencies", [])) - domain_names
            if unknown_dependencies:
                errors.append(f"{record.get('id')}: unknown dependencies {sorted(unknown_dependencies)}")
            for field in REQUIRED - {"dependencies", "conflicts"} - OPTIONAL_NONEMPTY_FIELDS:
                if not record.get(field):
                    errors.append(f"{record.get('id')}: empty field {field}")
            expected = LEVELS[LEVELS.index(record["minimum_level"]) :]
            if record.get("levels") != expected:
                errors.append(f"{record.get('id')}: levels are not cumulative")
            records.append(record)

    ids = [record["id"] for record in records]
    expected_ids = [f"SEO-{number:03d}" for number in range(1, len(records) + 1)]
    if ids != expected_ids:
        errors.append("IDs are not contiguous in manifest order")
    if len(records) < 530:
        errors.append(f"registry has only {len(records)} requirements; minimum is 530")
    if manifest.get("requirement_count") != len(records):
        errors.append("manifest requirement_count does not match records")
    if manifest.get("schema_version") != 2:
        errors.append("manifest schema_version must be 2")
    candidate_counts = [manifest["level_candidate_counts"][level] for level in LEVELS]
    if candidate_counts != sorted(candidate_counts) or len(set(candidate_counts)) != len(LEVELS):
        errors.append("Lite, Recommended, Extra, and Ultra candidate counts are not strictly distinct and cumulative")

    for relative_path in REQUIRED_PATHS:
        if not (ROOT / relative_path).exists():
            errors.append(f"missing required skill artifact: {relative_path}")
    skill_lines = (ROOT / "SKILL.md").read_text(encoding="utf-8").splitlines()
    if len(skill_lines) >= 500:
        errors.append(f"SKILL.md has {len(skill_lines)} lines; keep the orchestrator under 500")

    coverage_paths = [ROOT / "SKILL.md", *ROOT.glob("references/*.md"), *ROOT.glob("requirements/*.jsonl")]
    coverage = "\n".join(path.read_text(encoding="utf-8") for path in coverage_paths).lower()
    for term in REQUIRED_TERMS:
        if term not in coverage:
            errors.append(f"required coverage term missing: {term}")

    coverage_path = ROOT / "requirements/coverage-map.json"
    if coverage_path.exists():
        coverage_map = json.loads(coverage_path.read_text(encoding="utf-8"))
        mapped_ids = set()
        area_names = set()
        for area in coverage_map.get("areas", []):
            name = area.get("area")
            if not name or name in area_names:
                errors.append(f"invalid or duplicate coverage area: {name}")
            area_names.add(name)
            requirement_ids = area.get("requirement_ids", [])
            if area.get("status") != "COMPLETE" or not requirement_ids:
                errors.append(f"coverage area is not complete: {name}")
            unknown = set(requirement_ids) - seen
            if unknown:
                errors.append(f"coverage area {name}: unknown IDs {sorted(unknown)}")
            mapped_ids.update(requirement_ids)
        if mapped_ids != seen:
            errors.append(f"coverage map orphan records: {sorted(seen - mapped_ids)}")

    markdown_paths = [ROOT / "SKILL.md", *ROOT.glob("references/*.md")]
    for markdown_path in markdown_paths:
        body = markdown_path.read_text(encoding="utf-8")
        for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", body):
            if target.startswith(("http://", "https://", "#")):
                continue
            resolved = (markdown_path.parent / target.split("#", 1)[0]).resolve()
            if not resolved.exists():
                errors.append(f"orphan documentation reference in {markdown_path.relative_to(ROOT)}: {target}")

    try:
        from audit_coverage import audit

        audit_result = audit()
        if audit_result["duplicate_requirement_ids"]:
            errors.append(f"duplicate or near-duplicate requirements: {audit_result['duplicate_requirement_ids']}")
        if audit_result["generic_requirement_ids"]:
            errors.append(f"generic requirements: {audit_result['generic_requirement_ids']}")
        if audit_result["missing"] or audit_result["incomplete"] or audit_result["misclassified"]:
            errors.append(
                "coverage audit gaps: "
                f"missing={audit_result['missing']} incomplete={audit_result['incomplete']} "
                f"misclassified={audit_result['misclassified']}"
            )
    except Exception as exc:
        errors.append(f"coverage audit failed to execute: {exc}")

    if errors:
        print("Registry validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"Registry valid: {len(records)} requirements across {len(manifest['domains'])} domains.")
    print("Level candidates: " + ", ".join(f"{level}={manifest['level_candidate_counts'][level]}" for level in LEVELS))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
