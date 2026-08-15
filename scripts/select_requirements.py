#!/usr/bin/env python3
"""Select applicable registry records without loading the full registry into agent context."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


LEVELS = ["LITE", "RECOMMENDED", "EXTRA", "ULTRA"]
ROOT = Path(__file__).resolve().parents[1]


def truthy(profile: dict, key: str) -> bool:
    value = profile.get(key)
    if isinstance(value, str):
        return value.lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


def application_types(profile: dict) -> set[str]:
    raw = profile.get("application_types", [])
    if isinstance(raw, str):
        raw = [raw]
    return {str(value).strip().lower().replace("_", "-") for value in raw if str(value).strip()}


def has_type(profile: dict, *names: str) -> bool:
    types = application_types(profile)
    return any(name.lower().replace("_", "-") in types for name in names)


def active(activation: str, profile: dict) -> bool:
    if activation == "always":
        return True
    if activation == "public_site":
        return profile.get("public_site", True) is not False
    if activation == "has_images":
        return truthy(profile, "has_images") or has_type(profile, "portfolio", "ecommerce", "marketplace", "media", "news")
    if activation == "has_video":
        return truthy(profile, "has_video") or has_type(profile, "video", "media-video")
    if activation == "ecommerce":
        return truthy(profile, "ecommerce") or truthy(profile, "product_catalog") or has_type(profile, "ecommerce", "marketplace")
    if activation == "local_business":
        return truthy(profile, "local_business") or truthy(profile, "location_based_intent") or has_type(profile, "local-business")
    if activation == "multilingual_or_multiregional":
        return truthy(profile, "multilingual") or truthy(profile, "international") or has_type(profile, "international", "multilingual") or int(profile.get("language_count", 1) or 1) > 1
    if activation == "ugc":
        return truthy(profile, "ugc") or truthy(profile, "community") or has_type(profile, "ugc", "community", "marketplace")
    if activation == "paywall_or_subscription":
        return truthy(profile, "paywall") or truthy(profile, "subscription") or truthy(profile, "membership") or has_type(profile, "subscription", "paywall", "membership")
    if activation == "content_publication":
        return truthy(profile, "content_publication") or truthy(profile, "blog") or truthy(profile, "news") or truthy(profile, "podcast") or has_type(profile, "blog", "news", "media", "content-platform", "cms")
    if activation == "public_documents":
        return truthy(profile, "public_documents") or truthy(profile, "pdf")
    if activation == "analytics_or_measurement":
        return truthy(profile, "analytics") or truthy(profile, "measurement")
    if activation == "has_cdn_or_waf":
        return truthy(profile, "cdn") or truthy(profile, "waf") or truthy(profile, "edge") or str(profile.get("deployment", "")).lower() in {"vercel", "cloudflare", "netlify"}
    if activation == "javascript_app":
        if "javascript_app" in profile:
            return truthy(profile, "javascript_app")
        framework = str(profile.get("framework", "")).lower()
        return any(name in framework for name in ("next", "react", "remix", "astro", "vite", "svelte", "vue"))
    if activation == "interactive_app":
        return truthy(profile, "interactive_app") or truthy(profile, "webgl") or truthy(profile, "three_d") or has_type(profile, "saas", "spa", "3d-webgl") or active("javascript_app", profile)
    if activation == "editorial_content":
        return truthy(profile, "editorial_content") or truthy(profile, "content_publication") or any(
            truthy(profile, key) for key in ("blog", "news", "media", "magazine")
        ) or has_type(profile, "blog", "news", "media", "magazine", "content-platform", "publisher")
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", choices=[level.lower() for level in LEVELS], default="recommended")
    parser.add_argument("--profile", type=Path, help="JSON project profile; omitted means a generic public site")
    parser.add_argument("--domain", action="append", help="Restrict selection to one or more domain slugs")
    parser.add_argument("--format", choices=["jsonl", "ids", "summary", "matrix", "surface-matrix"], default="jsonl")
    parser.add_argument("--out", type=Path, help="Write selected output to a file instead of stdout")
    args = parser.parse_args()

    profile = json.loads(args.profile.read_text(encoding="utf-8")) if args.profile else {}
    chosen = LEVELS.index(args.level.upper())
    manifest = json.loads((ROOT / "requirements/manifest.json").read_text(encoding="utf-8"))
    allowed_domains = set(args.domain or [domain["domain"] for domain in manifest["domains"]])
    selected = []
    active_domains = []
    inactive_domains = []

    for domain in manifest["domains"]:
        if domain["domain"] not in allowed_domains:
            continue
        is_active = active(domain["activation"], profile)
        if args.level.upper() != "ULTRA" and not is_active:
            inactive_domains.append({"domain": domain["domain"], "activation": domain["activation"]})
            continue
        active_domains.append(domain["domain"])
        for line in (ROOT / "requirements" / domain["file"]).read_text(encoding="utf-8").splitlines():
            record = json.loads(line)
            if LEVELS.index(record["minimum_level"]) <= chosen:
                selected.append(record)

    if args.format == "ids":
        output = "\n".join(record["id"] for record in selected) + ("\n" if selected else "")
    elif args.format == "summary":
        by_domain = {}
        for record in selected:
            by_domain[record["domain"]] = by_domain.get(record["domain"], 0) + 1
        output = json.dumps({
            "level": args.level.upper(),
            "selected": len(selected),
            "active_domains": active_domains,
            "inactive_domains": inactive_domains,
            "domains": by_domain,
        }, indent=2) + "\n"
    elif args.format == "surface-matrix":
        surfaces = manifest["search_surfaces"]
        rows = [
            "| ID | Domain | Requirement | " + " | ".join(surfaces) + " |\n",
            "| --- | --- | --- | " + " | ".join("---" for _ in surfaces) + " |\n",
        ]
        for record in selected:
            rows.append(
                f"| {record['id']} | {record['domain']} | {record['title']} | "
                + " | ".join(record["search_surfaces"][surface] for surface in surfaces)
                + " |\n"
            )
        output = "".join(rows)
    elif args.format == "matrix":
        rows = [
            "| ID | Domain | Requirement | Lite | Recommended | Extra | Ultra |\n",
            "| --- | --- | --- | :---: | :---: | :---: | :---: |\n",
        ]
        for record in selected:
            flags = ["✓" if level in record["levels"] else "" for level in LEVELS]
            rows.append(
                f"| {record['id']} | {record['domain']} | {record['title']} | "
                + " | ".join(flags)
                + " |\n"
            )
        output = "".join(rows)
    else:
        output = "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in selected)

    if args.out:
        args.out.write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
