---
task_id: t_b52851b9
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-24
status: published
human_review: autonomous
---

# Pre-mortem Cert Apex tabaco.id (T-4): Blast Radius Terukur — Nol Konsumen Live

## Engineering Question

Cert web apex `tabaco.id` di VPS (Hestia) expired **2026-10-28 21:54 GMT** (T-4 hari). Keputusan 2026-10-17 memilih Opsi A pasif dengan klaim "dampak produksi nol" — tapi klaim itu inferensi dari config, belum pernah diverifikasi per-endpoint live. Pertanyaan hari ini: **persis apa yang break saat cert expire, kalau ada?**

## Method

1. SSH ke VPS via Tailscale: enumerasi konsumen cert — vhost nginx/apache (`conf/web/*/nginx.ssl.conf`), dovecot (`conf.d/domains/`), exim (`exim4.conf.template`), panel Hestia.
2. SNI-probe live tiap endpoint dari Pi (`openssl s_client -servername`) — ground truth cert mana yang benar-benar dilayani, bukan cuma apa yang tertulis di config.
3. Cross-check jalur publik (DNS apex → Vercel) vs jalur origin (IP langsung).
4. Update angka noise renewal di log Hestia.

## Findings

**Tabel blast radius — semua endpoint TLS di VPS, hasil probe live 2026-10-24:**

| Endpoint | Cert dilayani (live) | Expiry | Status pasca 10-28 |
|----------|---------------------|--------|--------------------|
| `tabaco.id`:443 via IP origin (202.10.34.149) | CN=tabaco.id (LE) | **2026-10-28** | ⚠️ expired — tapi nol konsumen |
| `tabaco.id`:443 via DNS publik | cert Vercel | 2027-01-01 | ✅ sehat |
| `www.tabaco.id`:443 | cert Vercel | 2026-12-31 | ✅ sehat |
| Panel `host.tabaco.id`:8083 | self-signed Hestia | 2027-03-31 | ✅ sehat |
| IMAP :993 / POP3S :995 (SNI mail) | CN=mail.tabaco.id | 2027-01-06 | ✅ sehat |
| SMTPS :465 / STARTTLS :587 | CN=mail.tabaco.id | 2027-01-06 | ✅ sehat |
| SMTP :25 STARTTLS dari Pi | tidak terjawab (timeout — kemungkinan block jaringan) | — | sama chain exim dgn :587 |

**Satu-satunya konsumen cert yang expired adalah vhost origin apex** (`/home/tabacoweb/conf/web/tabaco.id/nginx.ssl.conf` → `ssl/tabaco.id.pem`, file terakhir renewal 31 Jul). Dan vhost itu tidak punya satu pun konsumen live:

- DNS publik apex A → 216.198.79.1 (Vercel) — semua traffic web user lewat sini.
- `/etc/hosts` VPS cuma pin `host.tabaco.id` → 127.0.0.1 (panel, cert sendiri). `/etc/hosts` Pi kosong dari entri tabaco.id.
- Tidak ada internal service yang memanggil `https://tabaco.id` via origin.
- dovecot pakai `local_name mail.tabaco.id` → cert mail (sehat); exim → cert mail (sehat).

**Noise renewal masih jalan:** 17× "Invalid response" di `/var/log/hestia/LE-tabacoweb-tabaco.id.log` current (log sudah rotate sejak audit 10-17 yang mencatat 194 kejadian), failure terakhir **hari ini 05:53** — cron `v-update-letsencrypt-ssl` tetap gagal tiap hari, fail-soft, tanpa alert.

**Klam "dampak produksi nol" kini terukur, bukan inferensi:** nol endpoint publik, nol endpoint internal yang menyajikan cert apex. Yang hilang pasca 10-28 hanya kemampuan menyajikan TLS di `https://202.10.34.149` — URL yang tidak dipakai siapa pun.

## Decision

**Adopt** — Opsi A pasif terkonfirmasi benar dengan evidence live. Tidak ada eksekusi apa pun sebelum/sesudah expiry. Cleanup opsional (hapus cert apex dari vhost untuk mematikan noise harian) tetap menunggu human approval — menyentuh panel produksi.

Follow-up dibuat: `t_b52851b9` lanjut verifikasi pasca-expiry (target eksekusi ≥ 3 Nov, priority low): re-probe tabel yang sama, konfirmasi nol regressi.

## Risk

- Port :25 STARTTLS tidak terverifikasi dari Pi (timeout — kemungkinan block outbound hosting). Impact kecil: exim memakai chain cert yang sama dengan :587 yang terbukti sehat.
- Kalau suatu saat ada service baru yang Pin origin apex (mis. staging), cert expired akan langsung kelihatan sebagai warning — saat ini tidak ada.
- Noise log LE harian terus menumpuk; kalau kelak ada failure renewal cert lain, sinyalnya tenggelam di antara noise apex yang sudah "diterima".

## Lessons Learned

- Klaim "dampak nol" dari audit config itu hipotesis; SNI-probe per endpoint mengubahnya jadi pengukuran. Bedanya 30 menit kerja.
- Probe langsung ke IP + SNI memisahkan dua dunia yang sering tercampur: apa yang dilayani origin vs apa yang diterima user lewat CDN.
- Fail-soft cron yang gagal senyap (17× rotate, nol alert) butuh angka yang di-refresh periodic — angka 194 dari 10-17 sudah basi, log sudah rotate.

## Next Priority

- Human review (masih terbuka sejak 10-17): biarkan A polos, atau A + cleanup cert apex (`v-delete-letsencrypt-domain tabaco.id`) untuk mematikan noise harian.
- 3 Nov+: eksekusi follow-up verifikasi pasca-expiry.
- Pertengahan Nov: re-check expiry `vault.juwara.id` / `nb.juwara.id` (renewal Des harus sukses karena masih A record ke VPS).
