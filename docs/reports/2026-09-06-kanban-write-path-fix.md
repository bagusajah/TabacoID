---
task_id: t_85ee1e32
objective: OBJ-005
experiment: null
category: Engineering
date: 2026-09-06
status: published
human_review: autonomous
---

# Kanban write-path diperbaiki: raw SQL → CLI lifecycle

## Engineering Question
Kenapa pembuatan task kanban gagal dengan `Error: in prepare` — dan kenapa
board sering kosong padahal planner "sudah" bikin task? Dua kegagalan tercatat
hari ini (errors.log 11:22 & 13:05), dan executor sering reply `[SILENT]`.

## Method
1. Baca errors.log 24 jam — temukan 2 kegagalan `sqlite3 ... Error: in prepare`
   saat agent mencoba INSERT task baru.
2. Reproduksi: `hermes kanban create` dengan body YAML multiline via temp file
   → sukses sekali jalan. CLI-nya sehat; yang rusak adalah jalur raw-SQL yang
   di-copy-paste agent dari snippet skill (quoting pecah di shell).
3. Audit SKILL.md `tabacoid-daily-improvement`: hitung semua blok SQL tulis
   (INSERT/UPDATE) yang rawan pecah saat agent mereproduksinya.
4. Ganti semua blok tulis dengan subcommand CLI yang diverifikasi dulu satu per
   satu (`claim --ttl`, `complete --result`, `block --kind`, `reclaim --reason`,
   `archive`).
5. Dogfood: eksekusi lifecycle penuh task ini memakai persis pola baru dari skill.

## Findings
- **raw-SQL write blocks di skill: 6 → 0** (planner create, reap UPDATE+INSERT,
  claim UPDATE, complete UPDATE, blocked INSERT ×2, Step 7 report INSERT).
  SELECT dibiarin — blok baca tidak pernah jadi sumber kegagalan.
- **2 kegagalan task-creation hari ini → 0** setelah pola temp-file body
  (`--body "$(cat /tmp/task-body.md)"`). Task `t_85ee1e32` dibuat dalam satu
  percobaan, tanpa SQL manual.
- **Bug query category-floor:** filter `completed_at > now-7d` di atas task
  `ready`/`running` selalu menghitung 0 (`completed_at` NULL sampai done) —
  floor cicd-console/website jadi selalu "starving" secara semu. Diganti ke
  `created_at` + eksklusi `type: objective`.
- **Bug query executor:** hanya nyari `status='ready'`; task `todo`
  (t_80028482, eksperimen latency bot) tidak pernah kelihatan berhari-hari.
  Sekarang `status IN ('ready','todo')`.
- **Jebakan `--parent <objective_id>`:** parent link = dependency. Task anak
  terkunci di `todo` sampai parent done — dan objective node by-design tidak
  pernah selesai. `promote` pun menolak tanpa `--force`. Solusi: objective link
  cukup di frontmatter body; `unlink` membebaskan (sekaligus auto-promote
  todo→ready).
- **Bonus repair:** blok Step 7 (Record Traceability) di skill ternyata sudah
  korup sebelumnya — baris `\\\"INSERT...` nyampur jadi satu dengan heading.
  Dibenerin sekalian (sekarang: traceability = report path di `--result`).
- CLI `claim` pakai TTL (default 900s) — kalau session executor mati, claim
  kadaluarsa sendiri dan task balik ke `ready`. Kelas zombie (reap manual >15
  menit) hilang di sumbernya.

## Decision
**Adopt.** Semua penulisan ke kanban board lewat CLI subcommand; raw SQL hanya
untuk SELECT. Skill v0.5 tetap; ini perbaikan tooling di dalam prosedurnya.

## Risk
Rendah. Skill file adalah infrastruktur lokal (bukan bagian repo website);
perubahan hanya dokumentasi prosedur. Rollback: blok SQL lama terdokumentasi di
git history report ini + catatan legacy di skill. Satu catatan: versi
SKILL.md pra-edit tidak dibackup — kalau perlu balik, susun ulang dari deskripsi
di report ini (semua perubahan tercantum).

## Lessons Learned
- Snippet skill yang berisi multiline SQL + shell quoting adalah jebakan bagi
  agent language model: copy-paste-nya meledak diam-diam. API CLI yang membuat
  hal salah jadi mustahil > snippet yang harus di-copy dengan benar.
- `completed_at IS NULL` pada task aktif = klasik bug floor-count. Selalu bedakan
  "dibuat dalam 7 hari" vs "selesai dalam 7 hari".
- Objective node jangan pernah jadi parent dependency — dia node struktur, bukan
  work item.

## Next Priority
Planner run berikutnya: penuhi floor cicd-console (builder sedang fokus
`country-storage`, kandidat Phase 3 terakhir di ROADMAP) dan evaluasi task
`todo` t_80028482 (latency benchmark) untuk dijalankan via jalur CLI baru.
