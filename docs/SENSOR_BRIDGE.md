# Sensor Bridge v0.4 — first hardware integration

Android 14 / API 34 on SM-R920. This is an experimental debug transport through an *authorized* wireless ADB connection, not a production background service.

## Pipeline

Watch sensors -> Android TYPE_GAME_ROTATION_VECTOR quaternion -> foreground service (50 Hz requested sensors, 20 Hz HTTP transport) -> ADB reverse `tcp:8766 tcp:8766` -> localhost Python receiver -> browser `/state` poll -> 3D model quaternion.

The visualization uses a temporary frame convention. Sensor mounting rotation and hand model rest-pose calibration are **not yet validated**; rotation will move with the watch but directions may not match. `Game Rotation Vector` can drift in yaw. Accelerometer and gyroscope channels are retained for later gesture capture.

## Security and power

- Receiver binds to 127.0.0.1 only; ADB reverse tunnels it to the watch. Do not expose this endpoint to the LAN.
- The foreground service acquires a partial wake lock for at most 60 minutes, to test display-off sampling. Battery consumption may be high. Stop from the watch app.
- On Android 14, the `dataSync` foreground-service declaration is a technical prototype and is not a distribution-ready policy decision; re-evaluate service type and alternative lifecycle before release.
- A `POST_NOTIFICATIONS` runtime permission is not needed for an FGS to run, although the notification may be hidden from the notification drawer if denied.
- On-device rotation sensor is non-wakeup; continuous behavior under doze/OEM policies is **not guaranteed** even when a service is foreground.
- The streaming sample rate and UI latency need measurement; diagnostics files do not guarantee delivery timing.

## Open issues

- Watch model geometry and correct wrist anchor, handedness.
- Accurate sensor-to-hand coordinate matrix and zero-orientation calibration.
- Recording and replay of timestamped IMU packets.
- Authentication and direct LAN transport without ADB.
- Auto reconnect after Bluetooth/Wi-Fi loss and battery measurements.

## Building

Open repo root in Android Studio, sync, ensure Android SDK Platform 34 is installed, select `wear`, Build APK(s), then `adb -s <serial> install -r wear/build/outputs/apk/debug/wear-debug.apk`.

## Run

1. Start `python tools/receiver.py` on PC.
2. `adb -s <serial> reverse tcp:8766 tcp:8766` (check with `adb reverse --list`).
3. Start Sensor Bridge on watch and press Start sensors.
4. Open http://127.0.0.1:8766/ and select `LIVE`.
5. Stop from watch to release wake lock.
