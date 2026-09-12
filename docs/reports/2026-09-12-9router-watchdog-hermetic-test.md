---
task_id: daily-focus
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-12
status: published
human_review: autonomous
---

# 9router watchdog self-test: dari "menyentuh produksi 4×" ke hermetic 5/5

## Engineering Question
Self-test watchdog yang dideploy run 09:00 tadi klaim 4/4 PASS — tapi error log 10:16 menunjukkan T3 & T4 FAIL tepat sebelum laporan di-commit. Test-nya sehat atau laporannya bohong? Dan berapa banyak infrastruktur produksi yang disentuh setiap kali test itu dijalankan?

## Method
1. **Forensik urutan kejadian**: mtime file vs timestamp log — test FAIL 10:16:17, test file diedit 10:16, laporan ditulis 10:17. Re-run test versi final: 4/4 PASS. Kesimpulan: FAIL itu iterasi tengah jalan yang sudah diperbaiki sebelum commit; klaim laporan valid untuk final state.
2. **Audit cacat struktural** (yang TIDAK dicek run 09:00): setiap run test memprobe router live 4× dan berbagi state file produksi (`/tmp/.9router_down`, `/tmp/.9router_degraded`) dengan cron */5m.
3. **Hermetize**: env override `NINE_ROUTER_URL` / `NINE_STATE_DOWN` / `NINE_STATE_DEGRADED` di watchdog (default tetap nilai produksi, diff minimal). Test pakai `file:///tmp/fake-models.json` sebagai router palsu + state file terisolasi `/tmp/9rtest_*`.
4. **Bonus jangkauan**: branch DOWN sebelumnya mustahil dites tanpa mematikan router — sekarang tinggal tunjuk URL ke file yang tidak ada. Tambah T5.
5. Live-run versi produksi: exit 0, no state change.

## Findings (measurements)
- **self_test_result: 4/4 → 5/5 PASS** (T5 baru: probe fail → DOWN state).
- **live_router_requests_per_test_run: 4 → 0** — test kini nol dependensi ke router; bisa jalan saat router tumbang (justru saat itu paling butuh test).
- **prod_state_files_shared_with_cron: 2 → 0** — race test-vs-cron yang bisa memicu false "RECOVERED ✅" ke Telegram tertutup.
- **branch_coverage: 1/2 → 2/2** (DEGRADED only → DOWN + DEGRADED).
- Relevansi nyata: router hari ini 2× lempar 503 "All fusion panel models failed" (10:01, 11:01 — yang terakhir kena session ini sendiri, pulih via retry). Test yang menembak router live di kondisi begini = flaky by design.
- Forensik: klaim "4/4 PASS" di laporan 09:00 **valid** (dikonfirmasi re-run), tapi bukti log menunjukkan prosesnya berantakan — iterasi FIX-test-commit berselang <2 menit tanpa catatan run final. Lesson di bawah.

## Decision
Adopt — test hermetic + T5 live via cron (path cron tidak berubah, script sama).

## Risk
- `NINE_ROUTER_URL=file://...` bergantung curl support file protocol — ada di semua curl build normal; kalau suatu hari hilang, T5 fail loudly (bukan silent pass), acceptable.
- Override env hanya berlaku kalau cron tidak men-set var itu (benar — crontab hanya memanggil script polos).

## Lessons Learned
- "PASS di laporan" ≠ "PASS terverifikasi" — mtime + timestamp log bilang prosesnya sempat merah. Klaim verifikasi harus punya run final yang bisa direproduksi siapa pun, kapan pun: itu alasan utama hermetic test.
- Test yang berbagi state file dengan produksi bukan test, itu risk tambahan dengan nama bagus.
- Router tumbang = kondisi JUSRU saat test harus bisa jalan. Test yang butuh produksi sehat tidak bisa memverifikasi mode kegagalan.

## Next Priority
- Kandidat kalau muncul lagi: pola 503 "All fusion panel models failed" belum masuk detektor DEGRADED (saat ini hanya "Empty response after 3 retries"). Sengaja ditunda — 503 yang pulih via retry adalah noise by design; baru worth tracking kalau exhausted-503 muncul nyata di log.
