---
task_id: t_1df5da20
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-10-25
status: published
human_review: autonomous
---

# Sitemap trending: tutup leak vector + tambah monthly archive

## Engineering Question
Audit sitemap kemarin (t_4a51765d) menandai risiko laten: jalur trending di
`gen-sitemap.py` mengambil semua file `docs/trending/*.md` tanpa filter
`is_published`, beda dengan jalur reports yang sudah terfilter. Seberapa
besar gap-nya sebenarnya, dan adakah gap lain yang terlewat?

## Method
1. Baca ulang `gen-sitemap.py` dan bandingkan dengan kontrak sisi website:
   halaman `/trending` dilayani dari `import.meta.glob` pada DUA direktori
   (`docs/trending/*.md` + `docs/trending/monthly/*.md`) — sitemap cuma glob
   yang pertama. `gen-og.py` (prerender OG tag) punya blind spot yang sama.
2. Patch `gen-sitemap.py`: loop dua direktori + filter `is_published`
   (fungsi sudah ada, tinggal dipanggil — parity dengan jalur reports).
3. Patch `gen-og.py`: prerender `/trending/monthly-*/` juga.
4. Jalankan `gen-sitemap.py`, diff output terhadap baseline live (151 audit /
   153 file saat ini). Lalu `npm run build` + `npm run lint` + `npm run check`.

## Findings
- `sitemap URLs: 153 → 163` — 10 URL `/trending/monthly-2026-01..10` ditambahkan;
  153 URL existing **byte-identik** dengan baseline (diff nol baris berubah).
  Filter `is_published` pada data hari ini no-op: nol file trending punya
  `status:` non-published — jadi tidak ada leak aktif, hanya vektor yang ditutup.
- `OG prerender trending: 37 → 47 halaman` — sebelumnya monthly hanya bisa
  render judul generik SPA saat link dibagikan (pitfall og: yang sama yang
  sudah pernah di-fix untuk daily + reports).
- Build ✓, tsc ✓, eslint 0 error (2 warning lama di i18n.tsx, pra-ada).

## Decision
Adopt — dua script pipeline report, nol perubahan UI. Mengikuti pola fix
sitemap freshness gap (2026-10-17): generator harus mempromosikan semua URL
yang benar-benar dilayani website, tidak lebih dan tidak kurang.

## Risk
Rendah. Skenario gagal paling buruk: file trending dapat frontmatter
`status: draft` → hilang dari sitemap tapi tetap dilayani halaman (sitemap
kurang lengkap, bukan leak). Kontrak tetap: sitemap = superset URL publik.

## Lessons Learned
"Risiko laten" dari audit sebaiknya langsung ditutup di run berikutnya selama
fix-nya kecil — di sini malah menyingkap gap kedua (monthly) yang lebih nyata:
10 halaman publik tidak terindeks mesin cari sejak arsip bulanan dibuat.

## Next Priority
- t_e60a9105 (≥3 Nov): verifikasi pasca-expiry cert apex — termasuk cek 10 URL
  monthly baru merespons 200 di live.
- Skema slug monthly (`monthly-YYYY-MM` tanpa hari) kini punya tiga konsumen
  dengan parsing tanggal masing-masing (reports.ts, gen-sitemap.py, gen-og.py)
  — kalau kontrak berubah, ubah ketiganya.
