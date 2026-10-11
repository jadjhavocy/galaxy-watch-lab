# Galaxy Watch Lab v0.8.5 — Monte Carlo Transport Benchmark and Smart Ring Extensibility

## Scope and safety

**Computer only**. This version adds a multiseed Monte Carlo benchmark (64 seeds for each combination of 5 transport profiles × 4 gyro thresholds × 7 synthetic motions × 3 delivery strategies = **26,880 offline evaluations**). It does not modify `motion/engine.mjs`, Android code, receiver or bridge; it does not invoke ADB, control media, pair Bluetooth, or communicate with a watch/ring.

The experiment compares unbuffered sensor-time filtering (`arrival_order`) against **experimental** bounded reorder buffers (250 ms and 500 ms). The buffer is modeled as non-overlapping arrival-time buckets that reorder by sensor timestamp *within* each bucket. It cannot repair packets that were lost or arrived too late; it is not a general production-grade jitter buffer, and it is not integrated into runtime.

All gesture events and accuracy surrogates refer to **synthetic motion fixtures**. Event onset at 5/9 seconds is known only because the simulator inserts two artificial high-gyro sections. The `detected_fixture_windows` statistic counts detection within 650 ms of each artificial onset based on sensor timestamps. Delay is measured against simulated processing wall time and must not be compared with real device/transport latency. The randomness is pseudorandom but deterministic; seeds assess simulator variability rather than real-world performance.

## Run locally

```
node tests/motion-engine.test.mjs
node gesture_campaign.test.mjs
node tests/gwl083_reliability.test.mjs
node tests/gwl084_transport.test.mjs
node tests/gwl085_monte_carlo.test.mjs
node tools/gwl085_monte_carlo.mjs 64 > local-monte-carlo.json
```

The release script writes synthetic CSV/JSON under the user's Downloads folder and publishes only these three files to an isolated feature branch when all gates pass.

## Future multi-wearable architecture

**Watch motion and finger gestures are separate sensors, not interchangeable.** Design a pluggable `WearableAdapter` with fields:

- `device_id`, `device_type`, `clock_domain`, `capabilities` (raw IMU, orientation, buttons, pinch events), and `sample_rate_hz`;
- `timestamp_device_ns`, `received_pc_ms` and optional orientation/gyro/acceleration;
- gestures as semantic events carrying `gesture_kind`, `confidence`, `source`, `context` and confirmation state;
- a clock-alignment layer; **never** directly compare unsynchronized ring and watch sensor timestamps;
- explicitly activated sessions with capped battery usage and opt-in BLE permissions; no permanent high-rate streaming;
- an action dispatcher with whitelisted app-specific commands, debounce, rate limits and user confirmation for consequential actions.

Possible future grammar: ring pinch + watch roll = adjust volume; finger tap = confirm an action; watch flick only in music context = switch track. Make ring capability discovery mandatory. A health-centric smart ring may provide sleep/HR summaries but no useful raw accelerometer or gesture SDK.

**Purchasing gate:** before buying a ring, verify manufacturer SDK/BLE protocol, streaming availability and rate, latency, Windows/Android support, vendor SDK continuity, battery impact, replacement parts, and permission to integrate. Genki Wave has an official open-source Python sensor API, while Samsung Galaxy Ring's gesture access through nonofficial projects is more limited and requires platform-specific caveats. These are technical leads, not a compatibility certification.

## Next hard gates

1. Real 2-source benchmark data only after independent safe watch installation and optional ring procurement are explicitly approved.
2. Add a synthetic ring adapter, event fusion and clock alignment **without connecting to any new hardware**.
3. Evaluate streaming, battery and failure recovery on devices with opt-in short sessions, with watch wireless debugging OFF after one-time install.
