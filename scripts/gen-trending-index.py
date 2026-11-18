#!/usr/bin/env python3
"""Generate public/trending-index.json — compact per-report context for the
trending chatbot (serverless function can't read the frontend bundle).
Mirrors the extraction logic of src/lib/reports.ts parseReport()."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs" / "trending"
OUT = ROOT / "public" / "trending-index.json"


def report_index(md_path: Path) -> dict | None:
    raw = md_path.read_text(encoding="utf-8")
    slug = md_path.stem
    h1 = re.search(r"^#\s+(.+)$", raw, re.M)
    title = h1.group(1).strip() if h1 else slug
    summary_m = re.search(r"^>\s*(?:Ringkasan:\s*)?(.+)$", raw, re.M)
    summary = summary_m.group(1).strip() if summary_m else ""

    repos = []
    # table rows: | N | [owner/repo](url) | ★ total | +N today | Lang | desc |
    for m in re.finditer(
        r"^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(https://github\.com/[^)]+\)\s*\|"
        r"\s*★\s*[\d.,]+\s*\|\s*\+\s*([\d.,]+)\s*\|\s*([^|]+)\|\s*([^|]+)\|",
        raw, re.M):
        rank, repo, stars, lang, desc = m.groups()
        repos.append({
            "repo": repo.strip(),
            "stars_today": int(stars.replace(".", "").replace(",", "")),
            "lang": lang.strip(),
            "desc": desc.strip()[:160],
            "rank": int(rank),
        })

    # insights: "Riset 3 Repo Teratas" section — repo name + first sentence per entry
    insights = []
    riset = re.search(r"^##\s+Riset.*?$(.+)", raw, re.M | re.S)
    if riset:
        for m in re.finditer(
            r"\*\*\d+\.\s*\[([^\]]+)\]\(https://github\.com/[^)]+\)\*\*\s*—\s*([^\n]+)",
            riset.group(1)):
            note = m.group(2).strip()
            # first sentence only
            note = re.split(r"(?<=[.!?])\s+", note)[0][:200]
            insights.append({"repo": m.group(1).strip(), "note": note})

    return {
        "slug": slug,
        "date": slug[:10],
        "title": title,
        "summary": summary[:300],
        "repos": repos,
        "insights": insights,
    }


def main():
    out = []
    for md in sorted(DOCS.glob("*.md")):
        r = report_index(md)
        if r:
            out.append(r)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"index: {len(out)} reports -> {OUT}")


if __name__ == "__main__":
    main()
