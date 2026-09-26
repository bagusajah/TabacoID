---
task_id: daily-focus
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-09-26
status: published
human_review: autonomous
---

# Memory prune: MEMORY.md over capacity — narasi dibuang, fakta operasional disimpan

## Engineering Question
MEMORY.md penuh 100% (2.211/2.200 chars). Memori baru tidak bisa nempel —
setiap pelajaran baru dari siklus harian langsung gugur. Apa yang aman dibuang
tanpa kehilangan fakta operasional?

## Method
1. Baca `~/.hermes/memories/MEMORY.md` utuh (12 blok, dipisah `§`).
2. Klasifikasi per blok: **fakta operasional** (endpoint, kredensial pointer,
   kontrak API, perintah yang terbukti) vs **narasi/history** (kronologi,
   alasan perubahan, format tanggal yang sudah lewat).
3. Buang hanya narasi; fakta dipertahankan semua, termasuk pointer ke
   `secrets/.env` (kred aktual memang tidak pernah disimpan di memori).

## Findings
- `memory_chars: 2.250 → 2.000 bytes (before → after)` — dari 102% kapasitas
  jadi ~90%, ruang kosong ~200 chars untuk memori berikutnya.
- Yang dibuang: penanda tanggal kadaluarsa ("login contract **berubah**
  Sep-2026" → cukup kontrak sekarang), keterangan "udah dihapus" (TRACEMALLOC),
  frasa sejarah "9router dihapus ... user request" (fakta hidupnya: provider
  sekarang zai/glm-5.3-flash), duplikasi konteks di blok journal_mode.
- Yang dipertahankan utuh: semua endpoint/DM ID/key-name/provider list, pipeline
  content STORY-FIRST + gate QC, aturan cron guard & gateway bypass, torrent
  RPC + cred pointer, warning profil EM island.
- Sinyal lain hari ini: apt 45 paket pending tapi `apt-check` = **0 security
  updates applicable** (sisanya jammy-updates media stack gstreamer/ffmpeg,
  headless box → non-urgent); systemd tanpa failed units; journal 58 MB
  sehat; errors.log hanya noise kecil (LSPRequestError ×2, JSONDecodeError ×2).

## Decision
**Adopt** — prune naratif diterapkan. Konvensi lanjutan: memori baru ditulis
sebagai fakta state-sekarang, bukan kronologi perubahan, supaya tidak
menggemukan lagi.

## Risk
Rendah. Yang hilang hanya konteks historis ("kenapa berubah"), bukan "bagaimana
cara kerjanya sekarang". Kronologi tetap bisa ditelusuri dari laporan di
`docs/reports/` — memori bukan sistem rekaman; laporan yang jadi arsip.

## Lessons Learned
- Memori yang diukur per karakter memaksa disiplin yang sama seperti kode:
  narasi adalah debt. Fakta = one-liner state sekarang.
- `apt-check --human-readable` lebih akurat dari `apt list --upgradable` untuk
  triase keamanan — 45 paket pending terdengar alarm, kenyataannya 0 urgent.

## Next Priority
HE1 lanjutan: `USER.md` belum diaudit (1.136 bytes, masih jauh dari limit) —
skip. Kembali ke backlog ops: OS3 deep-dive ESM (115 paket security di ESM
Apps — putuskan enable atau tolak dengan alasan biaya).
