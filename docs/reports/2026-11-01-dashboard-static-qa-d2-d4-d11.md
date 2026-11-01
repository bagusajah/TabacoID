---
task_id: t_e8ad3386
objective: OBJ-002
experiment: null
category: Engineering
date: 2026-11-01
status: published
human_review: autonomous
---

# QA Dashboard Statis: D2–D4 + D11 Ditutup dengan Kontras Terukur

## Engineering Question
Apakah 4 temuan QA cursor-agent (2026-10-16) di `public/docs/dashboard/dashboard.html` bisa ditutup dengan diff minimal dan evidence kontras WCAG terukur, bukan tebak warna?

## Method
Hitung contrast ratio (WCAG relative luminance) untuk setiap pasangan lama/pengganti via python, baru patch. Satu file HTML, nol dependensi. Verifikasi struktural: grep sisa warna lama, balance tag div, build site.

## Findings (with measurements)
- **D2 (kontras segmen bar):** swift `#9aa5b5` & js `#b9c0d4` dengan teks putih gagal (putih di atasnya tak terbaca). Fix: `.lseg.dark` → teks `#1e293b`, ratio **5.87:1** dan **8.05:1** (≥4.5 AA ✓). Python `#7c6fe8` + putih = **3.97:1 ✗** → diganti `#5b4fe0` = **5.77:1 ✓**. Go sudah 6.73:1.
- **D2 (legenda swatch):** legend `■` karakter diganti swatch `.lgd i` warna asli tiap bahasa.
- **D3 (mobile):** tabel juara dibungkus `.tablewrap` (overflow-x-auto), `.brow` jadi stack 1 kolom <640px (label → bar → nilai), donut svg max-width:100%.
- **D4 (lang):** `lang="id"` + `dir="ltr"` eksplisit — konten memang ID-only; dimensi bilingual tidak ditambah (YAGNI, dokumen ini data trending ID).
- **D11 (era chart):** garis `#ffd166` di canvas terang = **1.38:1 ✗** → `#b45309` = **4.82:1 ✓**; pink `#ff6b9d` 2.57:1 → `#d6336c` **4.43:1 ✓**; periwinkle `#7c9cff` 2.50:1 → `#4f6ef7` **4.11:1 ✓** (garis 3:1 non-teks ✓). Legend terduplikasi (atas+bawah SVG) dihapus, sisakan 1 di atas. SVG diberi `role="img"` + aria-label.
- Konsistensi swatch donut legend ikut arc baru (`#7c6fe8`→`#5b4fe0`, `#ffd166`→`#b45309`).
- Verifikasi: 0 sisa warna lama, 130/130 div balance, `npm run build` hijau.

## Decision
**Adopt — menunggu review push.** Diff 27 insertions / 24 deletions, 1 file, semua warna pengganti lolos threshold WCAG (teks 4.5:1, garis 3:1) dengan angka tercatat di report ini. Per push policy (styling di luar reports = no auto-push), fix di-commit di branch `qa/dashboard-a11y` — merge setelah review user.

## Risk
Rendah. Warna python/amber sedikit lebih gelap secara visual; identitas chart tetap. File statis di `public/docs/` — bukan jalur build React, rollback = merge revert satu commit.

## Lessons Learned
Angka kontras dihitung dulu sebelum milih warna pengganti — menebak "keliatan cukup gelap" menghasilkan 3.06:1 (`#d97706`) yang tetap gagal AA. Kandidat pertama belum tentu lolos.

## Next Priority
QA re-check visual oleh cursor-agent (opsional); sisa backlog BATON: cert apex cleanup (nunggu approval user), blacklist review.
