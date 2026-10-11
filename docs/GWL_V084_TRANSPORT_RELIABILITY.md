# GWL v0.8.4 — Offline transport impairment laboratory

This package **only adds an offline simulator, automated tests and generated reports**. It deliberately leaves the production `GestureEngine`, `SensorBridgeService`, `receiver.py` and LAN gateway untouched. No Android/ADB/watch installation, real port binding, or music playback.

## Transport profiles

All scenarios originate from v0.8.3 deterministic **5 packets/s** fixtures (14-second windows). Profiles: pristine; light 5% drops with 80 ms jitter; noisy 20% drops with 350 ms jitter and 10% duplicates; severe 45% drops with 750 ms jitter and 18% duplicates; full blackhole. A seeded PRNG makes each run reproducible. Arrival reordering emerges from jitter, and the real gesture detector processes arrival order while respecting original sensor timestamps.

Synthetic data may expose temporal sensitivity and a requirement for a buffering strategy. It is **not** evidence of measured watch/network reliability, precision/recall, battery efficiency, or false-positive rates on real gestures. In particular, an intentionally inserted `wrist_flick` fixture is not a human-labelled gesture. Loss of critical samples can cause missed detections even when the transport is functioning as designed.

## How to run

```
node tests/motion-engine.test.mjs
node gesture_campaign.test.mjs
node tests/gwl083_reliability.test.mjs
node tests/gwl084_transport.test.mjs
node tools/gwl084_transport_lab.mjs
```

The release gate writes the complete synthetic matrix as local JSON and CSV under Downloads, checks expected repository baseline, commits just this version's three files and publishes a new feature branch only if the tests succeed. Do not upload raw user gesture captures, Wi-Fi access tokens, or secrets.

## Decision criteria for later work

Use these regression results to identify which real recordings and network scenarios need coverage. Do not auto-tune production threshold on synthetic fixtures or claim measured precision/recall. After manual approval of hardware testing, collect labelled positive and negative recordings and compare recognition methods on a held-out dataset before binding gestures to media commands.
