# GWL v0.7 — Screen-off IMU research

- Persistent foreground-service notification + PARTIAL_WAKE_LOCK for a **user-started active session**, released on Stop; Android/vendor policies may still suspend non-wakeup sensors.
- Sensor callbacks on HandlerThread, target 10/25/50Hz from watch UI; packet output sent at 25Hz (duplicates detected), with sensor-event timestamps and screen state. The actual sensor sampling rate must be measured.
- Local receiver endpoint `/state` distinguishes recently received network packets from **fresh sensor samples**. Tracks unique/duplicate samples. `/record/start` and `/record/stop` capture only new IMU samples in `artifacts/gesture-recordings/*.jsonl`.
- This version still requires ADB reverse `tcp:8766 tcp:8766`, not a phone/cloud transport. Do not expose port 8766 externally. Keep local capture files private.
- Run a 5/15/30/60-minute screen-off soak test with charging safely configured, monitor battery drain and `sensor_age_ms`. Even with WakeLock, screen-off sample delivery is device/firmware-dependent and not guaranteed.
- Foreground service remains `dataSync` for local prototype compatibility (API 34); production design needs appropriate type/permissions and platform-policy review. No promise of perpetual uninterrupted service.
