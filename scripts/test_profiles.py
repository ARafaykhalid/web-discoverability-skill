#!/usr/bin/env python3
"""Exercise selector levels and six representative Auto-mode profiles."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
SELECTOR = ROOT / "scripts/select_requirements.py"


PROFILES = {
    "A": {
        "framework": "Next.js App Router",
        "language": "TypeScript",
        "application_types": ["portfolio", "3d-webgl"],
        "public_site": True,
        "has_images": True,
        "interactive_app": True,
        "ecommerce": False,
        "paywall": False,
        "ugc": False,
        "multilingual": False,
    },
    "B": {
        "framework": "Next.js App Router",
        "language": "TypeScript",
        "application_types": ["saas", "blog", "international"],
        "public_site": True,
        "authentication": "dashboard",
        "blog": True,
        "international": True,
        "has_images": True,
    },
    "C": {
        "framework": "Next.js App Router",
        "application_types": ["ecommerce"],
        "public_site": True,
        "ecommerce": True,
        "product_catalog": True,
        "has_images": True,
        "reviews": True,
        "merchant_center": True,
        "payments": True,
    },
    "D": {
        "framework": "Django",
        "language": "Python",
        "application_types": ["content-platform", "international"],
        "public_site": True,
        "content_publication": True,
        "editorial_content": True,
        "rss": True,
        "international": True,
        "has_images": True,
    },
    "E": {
        "framework": "React SPA",
        "language": "TypeScript",
        "application_types": ["spa", "api-backed"],
        "public_site": True,
        "javascript_app": True,
        "interactive_app": True,
        "api_backend": True,
    },
    "F": {
        "framework": "Django",
        "application_types": ["ugc", "community"],
        "public_site": True,
        "ugc": True,
        "community": True,
        "profiles": True,
        "comments": True,
        "reviews": True,
        "moderation": True,
    },
}


EXPECTATIONS = {
    "A": ({"images", "javascript-rendering", "bfcache"}, {"ecommerce", "paywall", "ugc", "international", "local", "video"}),
    "B": ({"discover", "feeds", "international", "javascript-rendering", "bfcache"}, {"ecommerce", "ugc", "local"}),
    "C": ({"ecommerce", "images", "javascript-rendering", "bfcache"}, {"paywall", "ugc", "local", "international"}),
    "D": ({"discover", "feeds", "international", "images"}, {"ecommerce", "paywall", "ugc", "javascript-rendering", "bfcache"}),
    "E": ({"javascript-rendering", "bfcache"}, {"ecommerce", "paywall", "ugc", "local", "international", "feeds"}),
    "F": ({"ugc"}, {"ecommerce", "paywall", "local", "international", "video"}),
}


def select(profile_path: Path, level: str) -> dict:
    command = [sys.executable, str(SELECTOR), "--level", level, "--profile", str(profile_path), "--format", "summary"]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    if result.returncode:
        raise RuntimeError(f"selector failed: {' '.join(command)}\n{result.stdout}\n{result.stderr}")
    return json.loads(result.stdout)


def main() -> int:
    failures = []
    output = {"profiles": {}, "levels": {}}
    with tempfile.TemporaryDirectory(prefix="web-discoverability-skill-profiles-") as directory:
        temp_root = Path(directory)
        profile_paths = {}
        for name, profile in PROFILES.items():
            path = temp_root / f"profile-{name}.json"
            path.write_text(json.dumps(profile), encoding="utf-8")
            profile_paths[name] = path
            summary = select(path, "recommended")
            active = set(summary["active_domains"])
            expected_active, expected_inactive = EXPECTATIONS[name]
            missing = sorted(expected_active - active)
            unexpected = sorted(expected_inactive & active)
            if missing or unexpected:
                failures.append(f"Profile {name}: missing={missing}, unexpected={unexpected}")
            output["profiles"][name] = {
                "selected": summary["selected"],
                "active_domains": summary["active_domains"],
                "expected_active_present": not missing,
                "expected_inactive_absent": not unexpected,
            }

        level_counts = {}
        for level in ("lite", "recommended", "extra", "ultra"):
            summary = select(profile_paths["C"], level)
            level_counts[level.upper()] = summary["selected"]
        output["levels"] = level_counts
        values = [level_counts[level] for level in ("LITE", "RECOMMENDED", "EXTRA", "ULTRA")]
        if values != sorted(values) or len(set(values)) != 4:
            failures.append(f"levels are not strictly cumulative: {level_counts}")
        if level_counts["ULTRA"] != 640:
            failures.append(f"Ultra did not select all 640 requirements: {level_counts['ULTRA']}")

    output["status"] = "PASS" if not failures else "FAIL"
    output["failures"] = failures
    print(json.dumps(output, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
