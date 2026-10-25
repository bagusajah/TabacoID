#!/usr/bin/env python3
"""Regenerate public/sitemap.xml from site routes + docs/reports/ filenames.
Run from anywhere; paths are repo-relative. Wired into report-auto-commit.sh
so the sitemap ships in the same push as new reports."""
import datetime
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGIN = "https://www.tabaco.id"

STATIC_ROUTES = [
    ("/", "1.0", "daily"),
    ("/reports", "0.9", "daily"),
    ('/trending', "0.8", "daily"),
    ("/ambience", "0.8", "daily"),
    ("/workflow", "0.8", "monthly"),
    ("/about", "0.7", "monthly"),
]


def git_date(path: pathlib.Path) -> str:
    out = subprocess.run(
        ["git", "log", "-1", "--format=%ad", "--date=short", "--", str(path)],
        capture_output=True, text=True, cwd=ROOT,
    ).stdout.strip()
    return out or datetime.date.today().isoformat()


def filename_date(path: pathlib.Path) -> str:
    """Reports are named YYYY-MM-DD-slug.md; anything else falls back to git date."""
    try:
        datetime.date.fromisoformat(path.name[:10])
        return path.name[:10]
    except ValueError:
        return git_date(path)


def is_published(report: pathlib.Path) -> bool:
    """Drafts are not public URLs — exclude them (must match src/lib/reports.ts isPublished)."""
    try:
        fence = report.read_text(encoding="utf-8")[:2048]
    except OSError:
        return False
    import re
    m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", fence)
    if not m:
        return True  # no frontmatter (trending digests) = public
    return bool(re.search(r"^status:\s*published\s*$", m.group(1), re.M))


def main() -> None:
    today = datetime.date.today().isoformat()
    urls = [(loc, pr, cf, today) for loc, pr, cf in STATIC_ROUTES]
    for report in sorted((ROOT / "docs" / "reports").glob("*.md")):
        if not is_published(report):
            continue
        urls.append((f"/reports/{report.stem}", "0.6", "monthly", filename_date(report)))
    for md_dir in (ROOT / "docs" / "trending", ROOT / "docs" / "trending" / "monthly"):
        for digest in sorted(md_dir.glob("*.md")):
            if not is_published(digest):
                continue
            urls.append((f"/trending/{digest.stem}", "0.6", "monthly", filename_date(digest)))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, priority, changefreq, lastmod in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{ORIGIN}{loc}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")

    out = ROOT / "public" / "sitemap.xml"
    out.write_text("\n".join(lines) + "\n")
    print(f"sitemap: {len(urls)} URLs -> {out}")


if __name__ == "__main__":
    main()
