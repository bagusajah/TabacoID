---
task_id: weekly-retrospective
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-11-15
status: published
human_review: autonomous
---

# Retrospective W46 (9–15 Nov 2026)

## Ringkasan Minggu

8 task selesai, semua tutup dengan laporan terukur. Dua tema besar: **penutupan saga Telegram** (relay → verdict → breaker → veto, tiap lapis diverifikasi) dan **rescue backup offsite** yang ternyata diam-diam mati 30 hari.

| Objective | Task | Item |
|-----------|------|------|
| OBJ-002 (infra) | 5 | t_2466e2ed verdict relay 6-hari; t_92da2f45 hapus pin MTU 1492; t_78f26965 circuit breaker watchdog; t_f14b9f42 verdict breaker hari-1; t_addd567f veto self-heal |
| OBJ-002 (infra) | 2 | t_95c05741 aktivasi backup offsite rclone→VPS; t_d88142d6 restore drill end-to-end |
| OBJ-005 (workflow) | 1 | t_8d3920e2 vitest `isolate:false` — REJECT terukur |

Catatan: t_1a681419 (OG prerender, 8 Nov) muncul di window 7-hari tapi secara ISO week termasuk W45.

## Kualitas Keputusan

**Adopt — semua terbukti live, bukan asumsi:**
- Relay VPS L4 untuk Telegram: verdict 6-hari, Nov 9–13 nol episode, episode 14 Nov semua self-heal <2 menit.
- Circuit breaker watchdog: cap 3 restart/6 jam ditegakkan presisi di batas window (fail-open benar), 17 restart diblok hari-1.
- Guard veto self-heal: 2/2 trip 15 Nov (01:15, 13:50) terjadi pas episode sudah sembuh sendiri — restart yang dihindari memang tidak perlu.
- Backup offsite + restore drill: SHA-256 match dua sisi, 3287 file terekstrak utuh.

**Reject — dua-duanya benar:**
- Pin MTU 1492 (fase-1): tidak pernah terbukti efek di 4 episode pasca-pin, dihapus dari config live dan dibuang dari rekomendasi permanen.
- Vitest `isolate:false`: speed-up −42% konsisten tapi state sqlite bocor antar file test. Dan ini **reject kedua** untuk eksperimen yang sama (pertama 7 Nov, 14/407 fail; kedua 14 Nov, 3 fail + 122 skip).

## Metrik Kunci Minggu Ini

- `telegram_connect_timeout`: ~690/11 jam (8 Nov) → 44/24 jam (14 Nov, semua self-heal); fatal rebuild 49 → 0 per hari.
- Watchdog restart-loop: 41 trigger/7 hari kronis → 0 restart pada 15 Nov (2 trip, dua-duanya diveto).
- Backup offsite: 0 copy terverifikasi (SKIP diam 17 Okt–15 Nov) → 1 copy terverifikasi + drill restore PASS.
- Pin MTU: 1 route pin live → 0 (fase-1 mati total, 0 error pasca-hapus).

## Tren & Pelajaran

1. **Defense-in-depth yang sehat berlapis dengan verdict per lapis.** Telegram sekarang: relay L4 (kurangi paparan black-hole) → breaker (batasi restart loops) → veto (jangan restart saat self-heal). Tiap lapis diadopsi karena punya angka, dan fase yang tidak terbukti (MTU pin) dibunuh, bukan dipertahankan.
2. **Eksperimen rejected bisa ter-schedule ulang.** `isolate:false` dijalankan dua kali di dua minggu berbeda dengan hasil setara. Sebelum menjalankan eksperimen, cek board + archive untuk reject sejenis — sudah dua laporan yang membuktikan hal yang sama.
3. **Silent failure backup adalah class of failure sendiri.** 30 hari SKIP tanpa alarm baru ketemu pas audit. Sekarang ada guard remote-missing (rc=1 + alert), dan pelajarannya tetap: backup dianggap valid hanya setelah restore drill, bukan karena cron-nya jalan.
4. **"Restart bukan cure" makin terbukti:** no_heal 25/40 (62.5%) historis, post-patch 2/3, dan kedua trip 15 Nov terjadi saat episode sudah sembuh. Net effect: nol restart otomatis baru tanpa bukti perlu.

## Follow-up

1. Task baru dibuat: restart docker daemon saat maintenance window (live-restore sudah di daemon.json sejak triage APT 7 Nov, baru efektif pasca-restart; docker-ce upgrade ikut).
2. Open human items (tidak dibikin task, sudah tercatat di BATON/laporan): push branch `qa/dashboard-a11y`, cert apex cleanup, journald RuntimeMaxUse 100M→20M (opsional).
3. Board: 4 task tersisa di `ready` semuanya objective nodes — planner slot berikutnya perlu bikin task eksekusi baru. Pola normal untuk jadwal weekend-only, bukan stall.

## Next Priority

Saga Telegram dan backup DR resmi tutup. Kandidat minggu depan: H2 gateway memory trend (leak detection), HE1 memory efficiency audit, atau W3 webreader API error baseline.
