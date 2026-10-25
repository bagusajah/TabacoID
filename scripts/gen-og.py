#!/usr/bin/env python3
"""Prerender per-route OG tags for /trending and /trending/<slug>.

The site is a Vite SPA: every route serves the root index.html, so link
previews (Telegram/WhatsApp) always showed the generic "TabacoID" card.
This script copies the built index.html into dist/trending/index.html and
dist/trending/<slug>/index.html, swapping title/description to each daily
report's own H1 + summary line — so the preview caption matches the link.

Run AFTER `vite build` (wire into build script or CI before deploy).
"""
import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
DOCS = ROOT / "docs" / "trending"
SITE_URL = "https://www.tabaco.id"


def meta_block(title: str, desc: str, url_path: str) -> str:
    """Replacement og/title block. Keeps og:image (static brand card)."""
    esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    url = f"{SITE_URL}{url_path}"
    return (
        f'<meta property="og:title" content="{esc(title)}" />\n'
        f'    <meta property="og:description" content="{esc(desc)}" />\n'
        f'    <meta property="og:type" content="article" />\n'
        f'    <meta property="og:url" content="{url}" />\n'
        f'    <title>{esc(title)}</title>\n'
        f'    <meta name="description" content="{esc(desc)}" />'
    )


def swap(html: str, title: str, desc: str, url_path: str) -> str:
    html = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", html, flags=re.S)
    html = re.sub(
        r'(<meta property="og:title" content=")[^"]*(")',
        rf'\g<1>{title}\g<2>', html)
    html = re.sub(
        r'(<meta property="og:description" content=")[^"]*(")',
        rf'\g<1>{desc}\g<2>', html)
    html = re.sub(
        r'(<meta property="og:url" content=")[^"]*(")',
        rf'\g<1>{SITE_URL}{url_path}\g<2>', html)
    html = re.sub(
        r'(<meta name="description" content=")[^"]*(")',
        rf'\g<1>{desc}\g<2>', html)
    return html


def report_meta(md_path: Path) -> tuple[str, str]:
    """Title = first H1; description = the `>` summary line right after it."""
    text = md_path.read_text(encoding="utf-8")
    h1 = re.search(r"^#\s+(.+)$", text, re.M)
    title = h1.group(1).strip() if h1 else md_path.stem
    summary = re.search(r"^>\s*(?:Ringkasan:\s*)?(.+)$", text, re.M)
    desc = summary.group(1).strip() if summary else title
    return title, desc


def main():
    index = (DIST / "index.html").read_text(encoding="utf-8")

    # 1) /trending list page — static caption
    list_title = "Arsip GitHub Trending Harian — TabacoID"
    list_desc = "Laporan harian repo GitHub yang sedang trending, dengan riset konteks untuk repo teratas."
    out = DIST / "trending" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(swap(index, list_title, list_desc, "/trending"), encoding="utf-8")
    print(f"og: /trending -> {list_title}")

    # 2) /trending/<slug> — caption matches that day's report
    # /trending/<slug> is served from two dirs (daily root + monthly/), same as the
    # import.meta.glob pair in Trending.tsx — prerender both or SPA rewrite wins.
    for md in sorted(DOCS.glob("*.md")) + sorted((DOCS / "monthly").glob("*.md")):
        slug = md.stem
        title, desc = report_meta(md)
        if len(desc) > 300:
            desc = desc[:297] + "..."
        page = DIST / "trending" / slug / "index.html"
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(swap(index, title, desc, f"/trending/{slug}"), encoding="utf-8")
        print(f"og: /trending/{slug} -> {title}")

    # 3) SPA rewrite must NOT swallow these real files. Vercel serves an existing
    # index.html file before applying rewrites, so nothing to change — but assert:
    assert (DIST / "trending" / "index.html").exists(), "list prerender missing"


if __name__ == "__main__":
    main()
