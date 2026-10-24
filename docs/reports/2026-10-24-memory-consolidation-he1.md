---
task_id: t_9aa4b9bf
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-10-24
status: published
human_review: autonomous
---

# Konsolidasi Memory Hermes: 95.5% → 84.9% (HE1)

## Engineering Question

MEMORY.md mentok 97% kapasitas (2.140/2.200 char, tampil di header sistem setiap sesi).
Apakah konsolidasi bisa menurunkan usage di bawah 85% TANPA kehilangan fakta operasional?

## Method

1. Audit 13 entri MEMORY.md satu per satu: cek redundansi vs sumber kebenaran eksternal,
   cek pointer hidup/mati, cek duplikasi antar entri.
2. Redundansi diverifikasi dengan tools, bukan tebakan:
   - Entry `Providers` (zai/glm-5.3-flash, fallback glm-5.2, vision glm-4.6v) → dicocokkan
     dengan `~/.hermes/config.yaml`: match persis di baris 2, 5, 10, 78. Memori membaca
     config setiap sesi → entry 100% redundan, dihapus.
   - Pointer skill `litellm-gateway` dan `multi-agent-lanes` → dicek di
     `~/.hermes/skills/` dan kedua profil (emailmanager, pitupi): tidak ada di mana pun.
     Pointer mati. Fakta inti LiteLLM (VPC Alibaba, L20, UI :4000/ui) dan profil-routing
     dipertahankan, referensi skill dibuang.
3. Merge 2 entri bot (tabacoagent/ccohermes + pitupi) jadi satu entri profil.
4. Kompresi kata (TICMI entry -80 char) tanpa mengubah satu pun instruksi operasional.
5. Backup sebelum edit: `~/.hermes/cache/scratch/MEMORY.md.bak-20261024`.
6. USER.md (81.6% kap) dibiarkan — masih ada headroom.
7. Koreksi tengah-eksekusi: pointer skill `litellm-gateway`/`multi-agent-lanes` awalnya
   kueduh mati karena cek flat-path (`ls ~/.hermes/skills/<name>`); cek recursive
   (`find`) menemukan keduanya hidup di `skills/mlops/` dan `skills/autonomous-ai-agents/`.
   Pointer dipulihkan ke memori sebelum close.

## Findings

- `memory_chars: 2101 → 1868 char (95.5% → 84.9%)` — metode hitung sama dengan counter
  sistem (baris `§` dan kosong di-strip). Byte mentah: 2181 → 1921.
- `entries: 13 → 12` (1 dihapus karena redundan, 2 di-merge jadi 1).
- Token integrity check otomatis: 13 token kunci (nomor HP, key ElevenLabs, hostname,
  path tools, flag prosedural) — semua ada di file hasil. Nol fakta operasional hilang.
- Entry `Providers` ternyata duplikasi ke-2 dari pola yang sama yang ditemukan report
  HE1 Okt-10 (entri yang duplikat USER.md/config): sisa entry providers lama masih
  tertinggal di memori meski config.yaml adalah sumber kebenarannya.

## Decision

**Adopt.** Konsolidasi terverifikasi lossless terhadap fakta operasional. Backup tersedia
untuk diff review manual.

## Risk

- Nuansa wording yang terkompresi berpotensi menghilangkan konteks halus. Mitigasi: backup
  di scratch + diff bisa direview kapan pun; entri paling padat instruksi (TICMI, Content
  pipeline) hanya kehilangan kata sambung, bukan klausa perintah.
- Kesalahan proses yang hampir terjadi: pointer skill nyaris dihapus dari memori karena
  verifikasi flat-path. Aturan: sebelum menyatakan pointer mati, verifikasi recursive.

## Lessons Learned

- Memori Hermes tidak punya mekanisme pruning otomatis saat sumber eksternalnya berubah
  (skill dihapus, config berubah) → audit periodik diperlukan, trigger alami: usage >90%.
- Tiga sumber redundansi: (1) duplikat sumber kebenaran yang selalu termuat (config.yaml),
  (2) pointer ke artefak lain tanpa verifikasi keberadaannya, (3) dua entri menutupi
  topik yang sama. Verifikasi pointer harus recursive (find), bukan flat (ls) —
  flat check menipu untuk skill yang hidup di subdirektori kategori.

## Next Priority

- HE1 lanjutan: skema serupa untuk USER.md saat melewati 90% (sekarang aman).
- Pertimbangkan konvensi ringan: skill yang dihapus harus meninggalkan catatan di BATON
  agar memori ikut dibersihkan (1 line per deletion).
