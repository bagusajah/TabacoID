---
task_id: t_d6841ea2
objective: OBJ-002
experiment: null
category: Operations
date: 2026-10-17
status: published
human_review: autonomous
---

# Keputusan Cert Apex tabaco.id — Zona DNS Ternyata Self-Hosted, Opsi C Gugur, Rekomendasi A

## Engineering Question

Audit TLS kemarin menempatkan keputusan cert web apex (expired 2026-10-28) pada opsi A/B/C dengan satu lubang evidence: "NS lookup belum terkonfirmasi". Zona DNS tabaco.id sebenarnya di-host di mana? Jawabannya menentukan biaya Opsi B (DNS-01) dan validitas Opsi C (routing challenge).

## Method

1. DoH query via `curl` ke Cloudflare (Pi tidak punya `dig`): NS, SOA, A apex tabaco.id.
2. SSH ke VPS (Tailscale): baca zona BIND Hestia `/home/tabacoweb/conf/dns/tabaco.id.db`, hitung error renewal di `/var/log/hestia/letsencrypt.log`, cek state vhost SSL apex.

## Findings

**Zona self-hosted, bukan provider eksternal:**

- NS publik `tabaco.id` = `ns1.tabaco.id` + `ns2.tabaco.id` → keduanya A record ke `202.10.34.149` = IP publik VPS sendiri.
- Zona file ada di VPS: `/home/tabacoweb/conf/dns/tabaco.id.db`, serial `3000000003` (Hestia masih aktif menulis zona ini).
- Open question audit kemarin terjawab: Opsi B tidak butuh akses provider DNS mana pun — zona di tangan sendiri.

**Isi zona yang relevan:**

- Apex `A 216.198.79.1` (Vercel), `www CNAME apex`, MX `mail.tabaco.id`, CAA `issue "letsencrypt.org"`.
- Ada TXT `_acme-challenge` berisi token basi dari attempt lama — bekas percobaan DNS challenge yang pernah dipakai.

**Noise renewal terukur:** **194 kejadian** "Invalid response" di `/var/log/hestia/letsencrypt.log` — error yang sama direproduksi cron tiap hari sejak ~28 Sep tanpa pernah naik sebagai alert.

**Vhost apex origin:** cert file di `/home/tabacoweb/conf/web/tabaco.id/ssl/` + apache `forcessl` include. Tanpa traffic publik (publik dilayani Vercel).

**Koreksi teknis — Opsi C dari laporan kemarin invalid.** Record `_acme-challenge.tabaco.id` (A atau TXT) hanya dibaca untuk challenge jenis DNS-01. HTTP-01 me-resolve A apex langsung (`tabaco.id → 216.198.79.1` = Vercel → 404). Menambahkan A record di `_acme-challenge` tidak akan pernah membuat renewal HTTP-01 sukses. Ruang keputusan menyusut dari 3 ke 2 opsi.

## Decision

**Needs Human Review** — rekomendasi tegas: **Opsi A** (biarkan expired 2026-10-28, tanpa perubahan apa pun), dengan opsional cleanup hapus cert apex dari vhost untuk menghentikan 194 error log berulang.

- B (DNS-01 via BIND sendiri, acme.sh + nsupdate/RFC2136): sekarang *feasible* tanpa pihak ketiga, tapi maintenance surface baru (TSIG key, hook script) untuk cert yang dilayani nol traffic. Overkill — YAGNI.
- C: gugur, invalid secara protokol.

**Biarkan expired tidak membakar jembatan:** kalau suatu saat apex A record kembali ke VPS, HTTP-01 renewal langsung sehat lagi dan cert bisa di-reissue kapan pun.

## Risk

- Service internal yang mulai validasi cert origin apex akan warning pasca 28 Okt — saat ini tidak ada yang memantau (temuan kemarin, tidak berubah).
- Cleanup "hapus cert apex" menyentuh panel produksi (Hestia `v-delete-letsencrypt-domain tabaco.id`) — tetap butuh persetujuan, jangan eksekusi otonom.

## Lessons Learned

- `_acme-challenge` record tidak menyelamatkan HTTP-01 — challenge HTTP resolve apex langsung. Koreksi atas laporan kemarin yang menempatkan C sebagai opsi hidup.
- Kegagalan cron fail-soft terakumulasi senyap: 194 error, nol alert, syslog tetap "hijau".
- `dig` tidak ter-install di Pi; DoH via `curl cloudflare-dns.com` cukup untuk forensic DNS.

## Next Priority

- Human review: setuju A pasif, atau A + cleanup hapus cert apex (1 command Hestia + verifikasi log berhenti).
- Monitor murah tetap jadwal: re-check expiry `vault.juwara.id` / `nb.juwara.id` pertengahan November (renewal Desember harus sukses karena subdomain itu masih A record ke VPS).
