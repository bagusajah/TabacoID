---
task_id: t_ovpn_bindfix
objective: OBJ-002
experiment: null
category: Operations
date: 2026-09-06
status: published
human_review: autonomous
---

# openvpn-server crash-loop 196k restarts — satu baris config, pertengkaran selesai

## Engineering Question
Sisa audit journald kemarin: `openvpn-server@server.service` punya restart counter
**~194.000** dan terus naik. Kenapa crash-loop, sejak kapan, dan apa fix minimalnya?

## Method
1. `systemctl show` → `NRestarts=196111`, `Result=exit-code`, unit loop di
   `activating (auto-restart)` tiap ~6 detik.
2. `journalctl -u openvpn-server@server` → petunjuk fatal tiap iterasi:
   `Socket bind failed on local address [AF_INET]192.168.0.240:1194:
   Cannot assign requested address (errno=99)`.
3. Cek realitas jaringan: `eth0` sekarang `192.168.10.236/24` (DHCP).
   `server.conf` pin `local 192.168.0.240` — IP lama dari subnet router sebelumnya
   (config tertanggal Mar 2025, subnet ganti entah kapan).
4. Cek riwayat sukses: `grep -c "Initialization Sequence Completed"` atas seluruh
   jurnal = **0**. Service tidak pernah sukses sejak jurnal ada — crash-loop
   diam-diam berbulan-bulan, baru ketahuan karena audit kemarin.

## Findings (with measurements)
- `restart_rate: 0.16 restarts/detik (before) → 0 (after)` — counter beku di
  `196165` sejak fix, PID stabil (`ExecMainPID=2806817`, tidak berganti).
- `successful_starts_in_journal: 0 → 1` — `Initialization Sequence Completed`
  tercatat pertama kali, bind sukses di `[AF_INET][undef]:1194` (wildcard).
- `ss -ulnp`: openvpn listen `0.0.0.0:1194`, proses `nobody/nogroup` sesuai config.
- Root cause bukan bug OpenVPN — murni config pin IP yang tidak survive perubahan
  subnet LAN. Systemd `Restart=on-failure` lalu mengubah satu kegagalan config
  menjadi ~196k percobaan (dan ~54 hari CPU time terbuang di cycle restart).

## Decision
**Adopt.** Perubahan 1 baris di `/etc/openvpn/server/server.conf`:

```diff
-local 192.168.0.240
+# ponytail: unpin local IP — bind wildcard, survives DHCP LAN changes (crash-loop fix 2026-09-06)
```

Backup: `/etc/openvpn/server/server.conf.bak-20260906`.
Rollback: restore backup, `systemctl restart openvpn-server@server`.

Trade-off: tanpa `local`, openvpn bind semua interface — untuk box single-LAN ini
efeknya identik, dan future ganti subnet tidak akan mematikan service lagi.

## Risk
- **Perlu review human:** service VPN ini sekarang benar-benar RUNNING — selama
  berbulan-bulan secara efektif "mati". Config-nya serius (easy-rsa CA sendiri,
  tls-crypt, redirect-gateway). Kalau VPN memang sudah tidak dipakai, disable
  unit-nya (`systemctl disable --now openvpn-server@server`) daripada biarkan
  jalan tanpa pemakaian. Kalau masih dipakai: client profile lama harus tetap
  valid, tapi router perlu port-forward UDP 1194 ke IP baru 192.168.10.236.
- Port 1194/udp kini listen di semua interface — di belakang NAT home, exposure
  internet tergantung port-forward router (tidak saya utak-atik).

## Lessons Learned
- Crash-loop systemd itu samar: nggak muncul di `failed units` (statusnya
  `activating`), beban CPU-nya kecil per iterasi, tapi 6 bulan × 0.16/detik =
  ratusan ribu restart. Audit berkala `NRestarts` tinggi itu worth it.
- Pin IP di config service = bom waktu di jaringan DHCP. Kalau mau pin, pin ke
  interface (`local eth0`) atau tidak sama sekali.
- Journal gap kemarin (korupsi journald) hampir membuat sinyal ini tak terlihat —
  audit berantai satu signal menunjuk signal berikutnya.

## Next Priority
1. Keputusan human: keep atau disable openvpn-server@ (kalau disable, satu unit
   crash-loop berikutnya hilang juga).
2. Lanjut sisa backlog host-os: OS2 (dmesg/NVMe health) atau H3 (TUI session
   cleanup 914MB).
