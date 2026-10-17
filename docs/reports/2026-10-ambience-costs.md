# Ambience pipeline costs — 2026-10

Automated monthly extract from the production ledger (`spend_log.jsonl`, recorded by produce.py at each paid stage: ElevenLabs stems via API balance delta, fal.ai Flux still, Kling i2v package units).

```
service  events      units      usd  scenes
el           10     34,183    34.18  10
fal          10         10     0.25  10
kling         9        180     0.00  9
TOTAL                         34.43

period: 2026-10 | events: 29
```

- Cost per full title (Short + 20-min + 8-hour): ≈ $3.6–4.0, dominated by ElevenLabs stem generation.
- Kling motion is prepaid (Resources Package) — units shown, no incremental cash.
- Sources of truth: ElevenLabs subscription API (exact character delta), fal.ai/Kling list prices.

_Generated automatically by the ambience factory; next update ships with the monthly report._
