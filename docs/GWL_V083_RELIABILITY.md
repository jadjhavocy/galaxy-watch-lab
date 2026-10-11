# Galaxy Watch Lab v0.8.3 — PC-only synthetic reliability laboratory

This branch introduces deterministic 5-packet/s IMU fixtures to regress the current browser-side Gesture Engine without using a smartwatch, ADB, APK or battery-intensive hardware tests.

## Scenarios

Seven labelled **synthetic** cases: quiet hand, typing, walking, arm raising, isolated gyroscope spike, intentional sharp flick, and duplicate timestamp. Each fixture lasts 14 seconds. They do not model the full variation in human movement, anatomy or sensor placements.

## Threshold sweep and known limitations

Run `node tools/gwl083_simulator.mjs` to produce a JSON sweep for thresholds **1.5, 2.4, 3.0, 4.0 rad/s**. The JSON is *not* a statement about sensitivity, precision or specificity in real use.

The initial failing test was meaningful: **at 1.5 rad/s, an ordinary simulated arm raise triggers false detections**. The assertion requiring zero detections at every threshold was incorrect. The updated suite reports this behavior explicitly, gates the default 2.4 rad/s against all synthetic negative fixtures, and confirms that an excessive 4.0 rad/s threshold misses the synthetic 3.8 rad/s flicks. No production recognition algorithm is altered to make the test pass.

## Tests

- `node tests/motion-engine.test.mjs`
- `node gesture_campaign.test.mjs`
- `node tests/gwl083_reliability.test.mjs`
- `node tools/gwl083_simulator.mjs` (saves JSON when invoked by the release script)

No media commands. No watch access. No inference from synthetic cases to real-world false-positive rates.

## Next development block

Generate richer synthetic datasets varying noise, timing jitter, dropped packets and axis alignment; quantify algorithm robustness and record failure cases. Use a held-out corpus of actual labelled gestures before any media action is enabled.
