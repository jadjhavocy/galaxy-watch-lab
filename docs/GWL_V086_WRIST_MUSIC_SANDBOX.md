# Galaxy Watch Lab v0.8.6 — Wrist Music Sandbox (offline, watch-free)

## Aim and hardware boundary

This phase builds a demonstrable, protected **gesture-event to music-command routing** prototype. It deliberately does **not** install on the Galaxy Watch, start ADB, pair anything, modify the IMU receiver, touch the gateway, or control a real music application. No smart-ring functionality is implemented: ring procurement and integration remain long-term backlog only.

The existing `motion/engine.mjs` continues to classify a *single family* of `wrist_flick` events, with axis X/Y/Z and sign positive/negative. The six mappings below are a provisional **technical gesture vocabulary**, not six newly trained anatomical gestures. The source stream's up-to-5-packets/s delivery also limits reliable recognition of fast movement patterns.

| Upstream event (gyro axis and sign) | Command after explicit ARM |
|---|---|
| X positive | NEXT |
| X negative | PREVIOUS |
| Y positive | VOLUME_UP |
| Y negative | VOLUME_DOWN |
| Z positive | PLAY_PAUSE |
| Z negative | CANCEL / disarm without music action |

## Safety contract

- Router starts disarmed and runs **only** in the `music` context.
- A **human explicit ARM** enables at most one command in the following **10 seconds**. A command consumes the arm, and expiry/cancellation revokes it.
- Valid incoming sensor event stamps must be strictly increasing. Duplicate, replayed and older timestamps are ignored, even if received while disarmed.
- Command cooldown is **900 ms**, independent of the upstream classifier cooldown.
- A fixed action allowlist rejects all other commands. The player holds tracks/volume/play state **only in memory**. No OS media controls or third-party APIs.
- Sensor timestamps (nanoseconds) and host monotonic time (milliseconds) are independent domains and **must never be directly compared** without clock alignment. ARM duration uses host clock only.
- This safety prototype is **not** yet suitable to enable real media-control side effects. Real world false-action rate, context gating, operator intent and ergonomics require validation with labelled captures.

## Modules

- `motion/control_router.mjs`: explicit arm, context gate, stale/duplicate rejection, one-shot command mapping.
- `motion/virtual_player.mjs`: deterministic state machine for five allowlisted music commands.
- `tools/gwl086_demo.mjs`: existing motion classifier + synthetic IMU + router + virtual player JSON demo.
- `tools/gwl086_playground.mjs`: local HTTP server restricted to `127.0.0.1` on port `8770`, serving only a fixed set of static assets.
- `tools/gwl086_playground.html`: interactive simulated gesture control interface. **All six gesture buttons inject synthetic packets**, never actual watch data.
- `tests/gwl086_control.test.mjs`, `tests/gwl086_playground.test.mjs`: deterministic safety and loopback-server tests.

## Run browser demo manually

```
node tools/gwl086_playground.mjs
```

Open http://127.0.0.1:8770 in the browser. Click ARM, then X+/X-/Y+/Y-/Z+/Z-. Re-arm for every following command. Stop the local server with Ctrl+C.

## Offline regression gates

```
node tests/motion-engine.test.mjs
node gesture_campaign.test.mjs
node tests/gwl083_reliability.test.mjs
node tests/gwl084_transport.test.mjs
node tests/gwl085_monte_carlo.test.mjs
node tests/gwl086_control.test.mjs
node tests/gwl086_playground.test.mjs
node tools/gwl086_demo.mjs
```

The PowerShell release gate verifies the expected v0.8.5 baseline and exact set of 8 payload files, runs tests, creates a local JSON demo report, commits to a **new feature branch**, verifies the remote branch SHA, and leaves `main` untouched. No source code from previous versions is staged.

## Not done in this release

No new trained classifier, no human-labelled corpus, no guaranteed mapping of X/Y/Z signs to actual wrist motions, no Yandex Music or SoundCloud APIs, no recording on watch, no hardware reliability claims, no BLE or ring code.

Next: empirical watch stability recovery plan, labelled recordings, calibration of physical movements, long negative windows and acceptable real-world false-action rate. Hardware testing must be approved independently and wireless debugging must not be left enabled for ongoing operation.
