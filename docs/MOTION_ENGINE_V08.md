# Galaxy Watch Lab v0.8 — Motion Engine (experimental)

This package adds a **browser-side** IMU motion classifier and offline JSONL playback. It does not change the Wear OS APK, battery policy, receiver protocol, Three.js rig, or start music playback.

## Usage

Run `python tools/receiver.py`, open `http://127.0.0.1:8766/`, then use the new Motion Engine panel. The classifier is disabled until explicitly armed. The recorder already in Motion Studio can capture labelled `artifacts/gesture-recordings/*.jsonl` files for playback.

The first classifier is a *candidate detector*, not a trained gesture recognizer: two close high angular velocity samples with cooldown. False-positive and precision/recall benchmarks require user-labelled positive and negative recordings. The output axes refer to raw sensor gyro coordinates, not anatomically aligned wrist directions. Sampling snapshots at 5 Hz may miss a gesture entirely; further algorithm work should move feature extraction closer to the sensor or record all events.

## Quality gate

`node tests/motion-engine.test.mjs` (requires Node.js >= 18). No smartwatch tests are run automatically. No code is pushed to the default branch.

## Safety

No media actions; no unbounded background service; no automatic APK install. Keep 5-minute watch diagnostic sessions and manual STOP. Do not interpret screen-off verification as proof of all-day use.
