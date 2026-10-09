# Motion Studio architecture v0.1

- Renderer: Three.js; standalone static page.
- Inputs: manual Euler angles or demo motion.
- Output: procedural stylized forearm, hand, watch (not an accurate CAD model).
- Safety: no external permissions and no upload of sensor data.
- Next stage sensor packet should include monotonic timestamp, sequence, quaternion coordinate convention, calibration status, and confidence.
- Screen-off continuous IMU access on Wear OS is unverified and requires hardware testing.
- Acceptance: open page, rotate camera and wrist, reset, toggle demonstration.
- Release status: simulator only, not linked to the Galaxy Watch.
