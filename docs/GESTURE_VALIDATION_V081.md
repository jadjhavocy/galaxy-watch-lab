# GWL v0.8.1 Gesture Validation Campaign

A repeatable seven-window on-device recording campaign. Windows: stillness, typing, walking, raising arm (negative), and three sensor-axis wrist flick types (positive). The positive gesture cases are **not** individual labelled repetitions, so no precision/recall claims can be made from these alone. Report only case-level detection and event counts.

Dependencies: existing local Python receiver running at port 8766, active watch session 10 Hz with ADB reverse, Node.js >=18. There are seven 14-second captures + 3-second countdown each (~119 sec); watch diagnostic session remains bounded to five minutes. No change to Wear APK or service.

Run `node gesture_campaign.mjs capture` from repository directory; keep the watch streaming and follow console instructions. Do the walking exercise only when safe with an unobstructed area; do not look at computer while walking. Press Ctrl+C to stop. Captures and analysis stored under `artifacts/gesture-validation/` (local only, excluded from Git; contains motion telemetry). `node gesture_campaign.mjs analyze <folder>` regenerates the report.

After collecting genuine positive and negative labelled examples, next package may compare sensitivity/specificity at varied thresholds using held-out data and alter implementation. Do not automatically enable media keys.
