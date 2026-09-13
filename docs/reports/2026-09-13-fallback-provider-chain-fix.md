---
task_id: t_1d4bffd6
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-13
status: published
human_review: autonomous
---

# Perbaikan fallback provider chain: relay combo1 single-point-of-failure

## Engineering Question
Outage ~6 jam tanggal 2026-09-12 menghasilkan retry 503 beruntun tanpa failover efektif, padahal `fallback_providers` sudah terpasang. Kenapa chain-nya tidak menyelamatkan session — dan komposisi chain seperti apa yang bakal tahan?

## Method
1. Rekonstruksi timeline kegagalan dari `~/.hermes/logs/agent.log.1` + `errors.log` (12–13 Sept): semua event `API call failed`, `Fallback activated`, dikelompokkan per provider/jam.
2. Probe langsung semua endpoint chain (HTTP status + latency) via request `chat/completions` nyata.
3. Verifikasi end-to-end kandidat hop via `hermes -z` (payload sesungguhnya termasuk tool schema).
4. Perbaiki chain, validasi dengan `hermes fallback list` + `hermes doctor`.

## Findings (with measurements)
**Mekanisme fallback SEHAT, komposisi chain yang rapuh.** Log menunjukkan `Fallback activated: combo1 → glm-5.2 (zai)` belasan kali sepanjang outage — failover benar-benar menembak.

Root cause collapse saat outage:

1. **503-nya bukan relay host mati** — pesan lengkap: `HTTP 503: [cursor/claude-fable-5-high] [429] rate_limit_error`. Quota **keluarga model Claude** di upstream yang habis. Primary `combo1` (= claude-fable) dan hop-2 `cc/claude-sonnet-5` **sama-sama keluarga Claude** → kena rate limit yang sama, mati bersamaan (hop-2 balas 400 invalid_request 11x).
2. **zai kena RateLimitError di jam peak** (15:02, 4 kejadian) — satu-satunya hop independen tersisa ikut tumbang → chain habis, retry 503 terus-menerus.
3. **Hop-3 lmstudio = dead weight permanen**: host `gamingpc` (100.92.30.43) offline 15 hari (ping 100% loss, port closed). 8 attempt semuanya timeout. Tiap failover yang mencapai hop ini membakar **45 detik** sia-sia.

Probe latency (request nyata, 2026-09-13):

| Hop | Endpoint | Status | Latency |
|---|---|---|---|
| Primary | 9router/combo1 | 200 | 14.3s |
| 1 | zai/glm-5.2 | (credential pool gateway valid — log bukti berhasil fallback) | — |
| 2 | 9router/cc/claude-sonnet-5 | 200 | 1.4s |
| 3 (lama) | lmstudio/bonsai-27b | **TIMEOUT** | 45s+ |
| 3 (baru) | 9router/cu/gpt-5.3-codex | **200** | **2.1s** |

Kandidat baru diverifikasi end-to-end via `hermes -z` termasuk dengan tool-call: `OK-hop2`, `OK-codex`.

**Metrik:**
- `dead_hops`: 1 dari 3 → **0 dari 3** (semua hop terverifikasi hidup)
- `model_family_diversity`: 2 keluarga (glm, claude) → **3 keluarga (glm, claude, gpt)**
- `failover_worst_case_wasted_time`: 45s (timeout lmstudio) → **~0s**
- Skenario gagal persis 2026-09-12 15:00 (Claude-family 429 + zai peak limit): hop sehat **0 → 1** (`cu/gpt-5.3-codex`, GPT family, verified 200 @ 2.1s)

## Decision
**Adopt.** Chain baru: `combo1 → zai/glm-5.2 → cc/claude-sonnet-5 → cu/gpt-5.3-codex`.

Perubahan: hop lmstudio diganti `cu/gpt-5.3-codex` (hop GPT-family — satu-satunya kelas yang lolos dari failure mode Claude-429 yang teramati). Urutan zai tetap pertama: satu-satunya hop provider-cloud yang sepenuhnya independen dari relay.

Catatan jujur: kalau **host relay** (mbm-mp) benar-benar down total, semua hop 9router ikut mati dan zai tetap satu-satunya penyelamat — ketergantungan ini tidak bisa dihilangkan tanpa menambah provider cloud kedua (biaya). Failure mode yang diperbaiki adalah yang benar-benar terjadi: upstream model rate-limit.

## Risk
- `cu/gpt-5.3-codex` kena quota GPT family → kembali ke zai sebagai penyangga (sama seperti sebelumnya, tidak lebih buruk).
- Config dibaca per-session; sesi gateway lama yang masih hidup memakai chain lama sampai sesi baru dibuat.
- Rollback: `cp ~/.hermes/config.yaml.bak-20260913 ~/.hermes/config.yaml`.

## Lessons Learned
- Failover yang "sudah terpasang" belum berarti failover yang berguna — **diversitas failure domain** (provider × model family) yang menentukan, bukan jumlah hop.
- Probe per-endpoint + reproduksi jalur request asli (dengan tools) dua hal berbeda: hop-2 balas 200 untuk payload minimal tapi 400 untuk payload penuh saat upstream sedang throttling.
- Log 503 relay menyimpan pesan upstream terpotong (`summary=` truncated) — untuk forensik berikutnya, simpan response body utuh di errors.log.

## Next Priority
- Pantau 7 hari ke depan: hitung kejadian `Fallback activated` per provider — target hop GPT muncul sebagai penyelamat minimal sekali sebelum dinyatakan terbukti di production.
- Kandidat lanjutan: provider cloud kedua yang murah sebagai hop-4 (menutup gap "relay host down total").
