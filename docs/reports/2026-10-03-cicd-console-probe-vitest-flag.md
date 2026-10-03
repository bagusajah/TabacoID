---
task_id: t_4164f3ac
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-10-03
status: published
human_review: autonomous
---

# Health Probe new-cicd-console Crash Karena Flag Jest di Project Vitest

## Engineering Question

Health check proaktif di Daily Focus (langkah "Application health") selalu gagal di new-cicd-console — apakah test suite-nya memang rusak, atau probe-nya yang salah?

## Method

1. Scan sinyal: board kosong, sistem sehat (uptime 11 hari, 0 failed units, semua container healthy).
2. Jalankan probe persis seperti di skill: `npm test -- --forceExit` → crash.
3. Baca error: `CACError: Unknown option --forceExit` — flag punya Jest, project pakai vitest v5.
4. Jalankan `npm test` tanpa flag → 406/406 pass, exit 0, 20 detik.
5. Cek skill cicd-console-builder: lesson ini sudah tercatat di sana ("no --forceExit — TD-5 closed: suite exits clean") tapi belum menyebar ke skill Daily Focus.
6. Perbaiki dua file skill Daily Focus, verifikasi ulang probe baru.

## Findings

- `npm test -- --forceExit` → exit 1, `CACError: Unknown option --forceExit` (vitest menolak flag Jest).
- `npm test` → **Test Files 36 passed, Tests 406 passed**, exit 0, durasi 20s.
- Probe lama pakai `timeout 60`; durasi riil suite 20s + import overhead ~65s evaluasi modul — dinaikkan ke 120s supaya aman di beban tinggi.
- Category floor 7-hari: 20 task `hermes-infra`, **0 task cicd-console** — skill/reference cicd-console adalah bagian ekosistem itu, task ini mengisi sekaligus membersihkan false alarm.
- Bonus: hitungan test di reference `cicd-console-deployment.md` basi (223/21, sekarang 406/36) — ikut dikoreksi.

## Decision

**Adopt.** Probe health check diganti ke `timeout 120 npm test` (tanpa flag), dengan komentar penjelas supaya tidak dikembalikan. Reference test count dikoreksi. Tidak ada perubahan kode product — suite-nya memang sehat; yang rusak cara mengukurnya.

## Risk

Minim. Perubahan hanya di skill markdown (alat ukur, bukan produk). Satu-satunya risiko: probe sekarang butuh sampai 120s — masih jauh di bawah timeout run crons lain.

## Lessons Learned

- False alarm yang berulang itu debt: probe yang selalu merah melatih pengamat buat mengabaikannya (alarm fatigue). Fix sekecil apa pun tetap fix.
- Lesson di satu skill (builder) tidak otomatis menyebar ke skill lain yang menjalankan perintah yang sama — saat menemukan lesson operasional, grep skill lain yang menyentuh perintah itu.

## Next Priority

Jalankan category floor check tiap siklus; ekosistem cicd-console butuh minimal 1 sentuhan per minggu — siklus berikutnya cek ROADMAP.md new-cicd-console untuk increment beneran.
