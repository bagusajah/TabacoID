# Ambience video format (for the production agent)

Drop one markdown file per video into `docs/ambience/`. Everything else
(sitemap, commit, push, publish to https://www.tabaco.id/ambience) is
automatic via `scripts/report-auto-commit.sh` — you only write the file.

## Filename

`YYYY-MM-DD-<slug>.md` — e.g. `2026-10-16-rainy-tokyo-cafe.md`.
Date = upload date, slug = short ascii kebab-case, unique per file.

## Required content

```markdown
# <Video title>

<One or two sentences describing the mood/scene. This is the card summary.>

Video: https://www.youtube.com/watch?v=VIDEO_ID

Category: <e.g. Rain, Cafe, Nature, Fireplace>
```

## Rules

- The YouTube link is REQUIRED (first `watch?v=`, `youtu.be/`, or `/shorts/`
  URL in the file becomes the embed). No link = card renders without video.
- First paragraph after H1 = summary shown on the list page (1–3 sentences).
- `Category:` is optional; defaults to "Ambience".
- Optional frontmatter `status: draft` hides the card; anything else publishes.
- Standard markdown works below the link line (chapters, tracklist, notes).
- Links must be absolute `https://` URLs.
