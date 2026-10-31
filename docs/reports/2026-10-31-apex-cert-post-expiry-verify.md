---
task_id: t_e60a9105
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-31
status: published
human_review: autonomous
---

# Verifikasi Pasca-Expiry Cert Apex tabaco.id: Nol Regressi, Satu Risk Baseline Tertutup

## Engineering Question

Cert web apex `tabaco.id` expired **2026-10-28 21:54 GMT**. Pre-mortem 10-24 (t_b52851b9) menyimpulkan "dampak produksi nol" dari SNI-probe T-4 — tapi itu klaim pra-expiry. Pertanyaan hari ini (T+3, 3 siklus renewal-gagal sudah lewat): **apakah prediksi itu bertahan di dunia nyata pasca-expiry?**

## Method

Ulangi SNI-probe baseline yang sama persis dari Pi: 2 endpoint publik via DNS, origin :443 direct-IP, panel :8083, mail :993/:995/:465/:587/:25. Tambah dua cross-check yang baseline kerjakan via config: /etc/hosts Pi & VPS (deteksi consumer origin-apex baru), dan hitung ulang noise renewal di log Hestia. Eksekusi T+3 bukan T+0 memang sengaja: biar minimal 3 siklus cron renewal harian lewat dulu.

## Findings

**Tabel verifikasi pasca-expiry, probe live 2026-10-31 (vs baseline 2026-10-24):**

| Endpoint | Baseline 10-24 | Live 10-31 | Δ |
|----------|----------------|------------|---|
| `tabaco.id`:443 publik (DNS → Vercel) | LE, exp 2027-01-01 ✅ | LE, exp 2027-01-01 | tidak berubah |
| `www.tabaco.id`:443 | LE, exp 2026-12-31 ✅ | LE, exp 2026-12-31 | tidak berubah |
| Origin `202.10.34.149`:443 SNI apex | LE apex, exp 10-28 ⚠️ | **masih expired cert dilayani** (notAfter 10-28 21:54) | sesuai prediksi — nol konsumen |
| Panel `host.tabaco.id`:8083 (via TS) | self-signed, exp 2027-03-31 ✅ | self-signed, exp 2027-03-31 | tidak berubah |
| IMAP :993 / POP3S :995 / SMTPS :465 | mail LE, exp 2027-01-06 ✅ | mail LE, exp 2027-01-06 | tidak berubah |
| :587 STARTTLS | inferensi (sama chain dgn :465) ✅ | **live verified**, mail LE exp 2027-01-06 | inferensi → terukur |
| :25 STARTTLS | timeout, tak terjawab | **terjawab via Tailscale**: mail LE, exp 2027-01-06 | risk baseline tertutup |
| Konsumen origin apex | nol | nol (hosts Pi 0 entri; VPS cuma pin `host.tabaco.id`→127.0.0.1) | tidak ada consumer baru |

- **Nol regressi.** Semua endpoint non-origin menyerahkan cert identik dengan baseline — expiry, issuer, semuanya pas.
- **Renewal noise apex: 17× → 20×** di log `LE-tabacoweb-tabaco.id.log` current — tepat +3 dalam 3 hari, satu kegagalan per hari (404 challenge, detail: A apex → Vercel 216.198.79.1, HTTP-01 tidak mungkin lolos). Fail-soft, tanpa alert, persis pola yang sudah diketahui.
- **Kontras yang memperkuat diagnosis:** cert `mail.tabaco.id` punya notBefore **8 Okt** — renewal LE untuk domain yang DNS-nya menunjuk VPS sukses normal. Yang gagal murni apex, purely karena A record apex → Vercel.
- **:25 baseline timeout ternyata bukan config exim** — dari jalur Tailscale port 25 hidup dan ber-TLS normal. Baseline menebak "block jaringan hosting" dan tebakan itu benar: block terjadi di jalur publik/hosting provider, bukan di VPS.

## Decision

**Adopt** — strategi pasif (Opsi A) terkonfirmasi benar dua kali: pra-expiry (10-24) dan pasca-expiry (hari ini). Cert apex expired 3 hari, dunia tidak berubah apa-apa, nol user terdampak. Task verifikasi ini selesai; tidak ada follow-up teknis baru yang dibutuhkan.

Satu-satunya item terbuka tetap keputusan human (sejak 10-17): cleanup opsional `v-delete-letsencrypt-domain tabaco.id` untuk mematikan noise renewal harian. Sekarang dengan data tambahan: 20 kegagalan di log current, sinyal renewal failure cert lain makin tenggelam. Rekomendasi tidak berubah, hanya makin berbobot.

## Risk

- Origin :443 akan terus menyajikan cert expired tanpa batas waktu — aman selama tidak ada service baru yang pin origin apex. Deteksi murah sudah ada: /etc/hosts + daftar konsumen vhost.
- Noise renewal terus +1/hari tanpa alert. Kalau kelak cert penting gagal renewal, pola failurenya identik dengan noise yang sudah "diterima".

## Lessons Learned

- Pre-mortem yang bagus pun tetap butuh post-mortem: prediksi "nol dampak" baru jadi fakta setelah diukur ulang di T+3.
- Risk yang "tidak terjawab" (port 25 timeout) jangan dibiarkan menggantung tanpa batas — satu jalur alternatif (Tailscale) langsung menutupnya dan malah meluruskan diagnosis root cause.
- Eksekusi terjadwal T+3 alih-alih T+0 itu gratis dan menaikkan nilai evidence: 3 siklus cron gagal menjadi bagian dari pengukuran, bukan noise.

## Next Priority

- Human review: biarkan A polos (noise +1/hari terus) atau approve cleanup `v-delete-letsencrypt-domain tabaco.id`.
- Pertengahan Nov: re-check expiry `vault.juwara.id` / `nb.juwara.id` (renewal Des harus sukses).
