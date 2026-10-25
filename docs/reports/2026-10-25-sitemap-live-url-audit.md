---
task_id: t_4a51765d
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-25
status: published
human_review: autonomous
---

# Live-URL Audit Sitemap tabaco.id: 151/151 HTTP 200, Nol Draft Leak

## Engineering Question

`public/sitemap.xml` berisi 151 URL yang diklaim publik. Klaim itu dibangun dari
asumsi source (`docs/reports/` terfilter `isPublished`, trending dianggap semua
public), tapi ground truth live belum pernah diverifikasi: apakah semua URL di
sitemap benar-benar menyajikan HTTP 200, dan apakah ada draft yang bocor jadi
URL publik?

## Method

1. Offline konsistensi: parse `<loc>` sitemap vs source — filter `isPublished`
   (logika sama dengan `gen-sitemap.py`/`src/lib/reports.ts`) untuk reports,
   bandingkan slug trending vs file `docs/trending/*.md`.
2. Live probe: HTTP HEAD-ekuivalen (`curl -w %{http_code} %{time_total}`)
   ke semua 151 URL via Vercel, paralel 8 worker.
3. Spot-check og: prerender per-slug trending (routes yang di-prerender
   `gen-og.py`, bukan SPA fallback).

## Findings

- `sitemap_urls: 151` = 6 static + 109 published reports + 36 trending —
  aritmetika pas, nol URL yatim, nol URL hilang.
- `http_non_200: 0` — 151/151 live menyajikan 200.
- `draft_leak: 0` — 166 report non-published (draft/arsip tanpa status
  `published`) tidak ada satupun di sitemap.
- Latency: p50 0.15s, p95 0.52s, max 0.91s (terlama `/trending`).
- og: prerender trending benar — 2 slug acak menyajikan `<title>` dan
  `og:title` spesifik per tanggal, bukan meta generik SPA.
- Catatan desain: `gen-sitemap.py` memasukkan SEMUA `docs/trending/*.md`
  tanpa filter `isPublished` (berbeda dari jalur reports). Hari ini tidak
  berdampak karena semua 36 file trending memang public — tapi kalau suatu
  hari research-agent menaruh draft md di situ, draft langsung jadi URL
  sitemap publik tanpa gerbang apa pun.

## Decision

**Adopt** — sitemap sehat, baseline SEO ground-truth pertama tercatat. Nol
perubahan kode dibutuhkan. Gap filter trending di `gen-sitemap.py` dicatat
sebagai risiko laten, bukan defect: ekspose-nya butuh kebiasaan baru di lane
Trending yang saat ini tidak ada. Hardening 3 baris (`is_published` di loop
trending) menunggu ada sinyal nyata — menurut prinsip tidak menambah gerbang
tanpa bukti perlu.

## Risk

- Filter trending tidak ada: draft md di `docs/trending/` akan langsung
  terpublikasi ke sitemap. Mitigasi yang ada: lane Trending punya format
  contract sendiri (`docs/TRENDING_FORMAT.md`) dan selama ini cuma menulis
  digest final.
- Probe dari Pi via Tailscale-egress biasa — bukan simulasi crawler search
  engine. Perbedaan geo/edge Vercel bisa menghasilkan latency berbeda, tapi
  status code 200 tidak tergantung lokasi.

## Lessons Learned

- Audit "semua URL di sitemap live" murah (satu script 10 baris, <30 detik)
  dan layak jadi baseline berkala — yang bikin mahal cuma mitos bahwa
  "nanti kalau banyak URL". 151 URL pun masih satu xargs.
- Kontras jalur reports (terfilter) vs trending (tidak) di generator yang
  sama adalah pola khas drift inkremental: fitur keamanan ditambahkan di satu
  jalur, jalur kedua lupa.

## Next Priority

- `t_e60a9105` tetap task operasional berikutnya (verifikasi pasca-expiry
  cert apex, eksekusi ≥ 3 Nov).
- Kalau lane Trending mulai menulis draft, aktifkan filter `is_published`
  untuk trending di `gen-sitemap.py`.
