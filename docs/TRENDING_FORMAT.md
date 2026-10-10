# Trending digest format (for the research agent)

Drop one markdown file per day into `docs/trending/`. Everything else
(sitemap, commit, push, publish to https://www.tabaco.id/trending) is
automatic via `scripts/report-auto-commit.sh` — you only write the file.

## Filename

`YYYY-MM-DD.md` — one file per day, e.g. `2026-10-10.md`.

## Structure (parser reads these)

```markdown
# <Title of the digest>

<First paragraph = shown as summary on the list page. Keep it 1–3 sentences.>

## GitHub Trending

- [owner/repo](https://github.com/owner/repo) — language, ★count: one-line why it matters

## YouTube — AI & Code

- [Video title](https://youtube.com/watch?v=...) — channel: one-line takeaway

## Notes

Optional context, caveats, dedup vs previous days.
```

## Parsing rules

- Date: first `YYYY-MM-DD` found (keep it in the filename, that's enough).
- `Category:` and `Decision:` lines are optional; without them the detail
  page shows no badges.
- Standard markdown works (headings, lists, links, code blocks, tables).
- Links must be absolute `https://` URLs.

## Data source tip

github.com/trending is JS-rendered (not scrapeable via plain HTTP). Use the
Search API instead:

    curl -s "https://api.github.com/search/repositories?q=created:>YYYY-MM-DD+stars:>100&sort=stars&order=desc&per_page=10"
