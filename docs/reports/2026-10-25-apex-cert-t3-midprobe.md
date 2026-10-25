---
task_id: t_ae9e3a64
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-25
status: published
human_review: autonomous
---

# Mid-probe T-3 Cert Apex tabaco.id: Nol Drift dari Baseline Premortem

## Engineering Question

Cert apex `tabaco.id` di origin VPS expired **2026-10-28 21:54 GMT** — tinggal 3 hari. Premortem kemarin (2026-10-24, t_b52851b9) menyimpulkan blast radius nol konsumen live, tapi itu snapshot T-4. Pertanyaan hari ini: **ada perubahan konsumen/config dalam 24 jam terakhir yang bisa mengubah kesimpulan itu sebelum hari-H?**

## Method

Ulangi SNI-probe yang sama dengan baseline (openssl s_client dari Pi ke origin publik 202.10.34.149 + jalur DNS publik), plus dua cek drift yang premortem sebut sebagai risiko: (1) grep referensi `ssl/tabaco.id` di semua konfig vhost/dovecot/exim VPS, (2) hitung noise renewal LE. SSH via Tailscale alias `vps-internal`.

## Findings

**Tabel blast radius T-3 vs baseline T-4 (2026-10-24):**

| Endpoint | Cert live | notAfter | vs baseline |
|----------|-----------|----------|-------------|
| `tabaco.id`:443 via origin IP | CN=tabaco.id (LE) | 2026-10-28 21:54 | identik |
| `tabaco.id`:443 via DNS publik | Vercel (YR1) | 2027-01-01 | identik, DNS masih → 216.198.79.1 |
| `www.tabaco.id`:443 | Vercel (YR2) | 2026-12-31 | identik |
| Panel :8083 | self-signed Hestia | 2027-03-31 | identik |
| IMAPS :993 / POP3S :995 | CN=mail.tabaco.id | 2027-01-06 | identik |
| SMTPS :465 | CN=mail.tabaco.id | 2027-01-06 | ✅ sehat (probe pertama timeout, 3/3 retry OK — flake jaringan, bukan regresi) |
| Submission :587 STARTTLS | CN=mail.tabaco.id | 2027-01-06 | identik |
| SMTP :25 | unreachable | — | sama dengan baseline |

**Cek drift:**
- Referensi `ssl/tabaco.id` di VPS: tetap 2 file vhost apex (`nginx.ssl.conf`, `apache2.ssl.conf`) — nol konsumen baru.
- `tabaco.id.conf` dovecot ternyata match grep, tapi isinya `local_name mail.tabaco.id` → cert **mail** (`conf/mail/...`), bukan apex — false positive grep, konsisten dengan premortem.
- Noise renewal LE: 18× "Invalid response" (kemarin 17×) — cron harian tetap gagal fail-soft, belum ada alert, belum ada sinyal baru.

**Nol drift. Tidak ada yang perlu dieksekusi sebelum 28 Okt.**

## Decision

**Adopt** — status pasif (Opsi A) tetap benar di T-3. Task verifikasi pasca-expiry `t_e60a9105` tetap terjadwal ≥ 3 Nov. Cleanup cert apex (mematikan noise harian) tetap menunggu human approval.

## Risk

- Kalau antara sekarang dan 28 Okt ada service baru pin origin apex, cert expired langsung kelihatan sebagai warning di klien itu.Probabilitas rendah (nol perubahan config 24 jam terakhir), dampak tetap kecil.
- Port :25 tetap tak terverifikasi dari Pi — tidak berubah dari baseline, chain exim identik dengan :587 yang sehat.

## Lessons Learned

- Grep nama file bisa false positive: `domains/tabaco.id.conf` match `ssl/tabaco.id` padahal path cert-nya milik mail. Baca isi file, jangan cuma nama.
- Satu probe timeout ≠ regresi; retry 3× sebelum mengubah status endpoint di tabel.

## Next Priority

3 Nov: eksekusi `t_e60a9105` (verifikasi pasca-expiry, tabel sama). Opsi cleanup noise LE menunggu approval user.
