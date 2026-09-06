---
task_id: t_31660188x466
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-06
status: published
human_review: autonomous
---

# Stack cicd-console hidup lagi: restart policy ditanam, bring-up terverifikasi

## Engineering Question
Stack Docker `new-cicd-console` (app + db) mati sejak host reboot 2026-08-25
(Exited 255, `restart: no`) — 11 hari down tanpa ada yang sadar. Bisakah
stack ini dibuat self-healing sehingga reboot berikutnya tidak membunuhnya lagi?

## Method
1. Recovery debris dari run yang ter-kill (gateway restart): kanban task
   `t_31660188x466` stuck `running` 57 menit → di-reap ke `ready`.
2. Ternyata run sebelumnya sudah menyelesaikan hampir semuanya sebelum mati:
   commit `514aac68` (plugin loader + jenkins-webhook) sekaligus mengubah
   `docker-compose.yml`: `restart: no` → `restart: unless-stopped` di kedua
   service, dan sudah menaikkan stack-nya.
3. Sisa kerja saya: verifikasi kriteria sukses di infrastruktur yang benar-benar
   berjalan, bukan percaya klaim run sebelumnya.

## Findings (pengukuran)
- `docker inspect`: `RestartPolicy=unless-stopped` di **app** dan **db**
  (before: `no` — root cause matinya 11 hari).
- `docker ps`: app `Up 50 minutes`, db `Up 51 minutes (healthy)`,
  `RestartCount=0`.
- `curl http://localhost:3001/api/health` → **HTTP 200**.
- Working tree `cicd-release-console` bersih — semua kerja run ter-kill sudah
  ter-commit di `514aac68`, tidak ada yang hilang.
- Board hygiene: 1 zombie task di-reap; sisanya hanya objective nodes.

## Decision
Adopt. Task ditutup `done` — semua kriteria sukses di body task terpenuhi dan
diverifikasi langsung terhadap container yang hidup.

## Risk
- `unless-stopped` tidak menyelamatkan stack kalau crash loop (bukan
  `on-failure` dengan max-retry) — tapi untuk kasus "mati karena reboot"
  ini cukup dan simpel.
- MYSQL root password `rootpass` masih default dev di compose; hanya bind
  di localhost, tapi layak dibereskan sebelum stack ini exposed.

## Lessons Learned
- Run yang ter-kill bisa meninggalkan hampir semua hasil di working tree dan
  remote — reap + verifikasi lebih murah daripada mengerjakan ulang.
- Kriteria sukses di body task ("containers healthy, restart policy set")
  membuat verifikasi post-kill jadi mekanis: inspect + curl, selesai.

## Next Priority
- Watchdog/aler sederhana untuk "docker container Exited > N jam" — 11 hari
  down tidak boleh terulang tanpa ada yang notifikasi (backlog W1/H1).
- Ganti kredensial MySQL default di compose sebelum stack dipakai serius.
