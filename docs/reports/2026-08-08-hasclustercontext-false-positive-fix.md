---
task_id: t_c172d9fc
objective: OBJ-005
date: 2026-08-08
status: draft
---

# Fix hasClusterContext() false-positive — loadFromDefault silent fallback

## Engineering Question

Kenapa 5 test gagal di cicd-release-console padahal environment dev tidak punya Kubernetes cluster? Driver registry seharusnya resolve ke NotImplemented stub, tapi malah wire real drivers (TektonBuildDriver, KubernetesDeployDriver, NativeSecretDriver).

## Method

Trace root cause di `src/drivers/index.js`. Fungsi `hasClusterContext()` mengasumsikan `@kubernetes/client-node` `loadFromDefault()` akan throw ketika tidak ada kubeconfig. Diverifikasi langsung dari SDK source (`node_modules/@kubernetes/client-node/dist/config.js`):

- Line 305: `loadFromDefault()` fallback path memanggil `loadFromClusterAndUser({ server: 'http://localhost:8080' })` — tidak throw
- Line 137-140: `loadFromClusterAndUser()` set `currentContext = 'loaded-context'` dan cluster dummy

Jadi `!!kc.getCurrentContext()` selalu return `true` di dev machine, yang membuat `defaultFor()` wire real drivers untuk deploy/build/secrets.

Fix: cek apakah context adalah dummy `'loaded-context'` — jika ya, return false. Satu guard di shared function, semua 3 caller (deploy, build, secrets) sekaligus fixed.

## Findings (with measurements)

- **Test suite before:** 218 passed / 5 failed (dari 223 total)
- **Test suite after:** 223 passed / 0 failed ✓
- **Files changed:** 1 (`src/drivers/index.js`, +5 lines net)
- **Failing tests fixed:**
  - `drivers.test.js`: 2 (stub method throws NotImplementedError, error metadata)
  - `kubernetes.test.js`: 2 (pods route 501, namespaces route 501)
  - `vault-route.test.js`: 1 (vault route 501)

## Decision

Adopt. One-function root-cause fix, smallest possible diff (5 lines), semua 5 test kembali hijau.

## Risk

Low. Guard hanya aktif untuk exact-match dummy context name `'loaded-context'`. Real cluster context dengan nama lain tetap detected. Worst case: kalau user real cluster context-nya kebetulan diberi nama `'loaded-context'` (sangat tidak mungkin), `hasClusterContext` return false → fallback ke NotImplemented stub → fail loudly bukan silently. Rollback trivial: revert ke throw-based approach.

## Lessons Learned

- Jangan assume library method throws — verifikasi behavior dari source. `loadFromDefault` namanya misleading: bukan "load atau throw", tapi "load atau dummy fallback".
- Satu guard di shared function (`hasClusterContext`) = 1-line diff. Patching di tiap caller = 3× diff + kemungkinan miss salah satu caller.

## Next Priority

Lanjut cicd-console: kalau ada task untuk wire real drivers secara explicit (via config `drivers.deploy=kubernetes`), itu jadi step berikutnya setelah cluster tersedia.
