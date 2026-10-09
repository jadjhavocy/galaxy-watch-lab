# Motion Studio v0.5: live calibration foundation

- Source: Galaxy Watch5 Pro game_rotation_vector over ADB reverse, receiver port 8766.
- Browser: http://127.0.0.1:8766/ (NOT 8765).
- Calibrate neutral: stores current orientation in memory, never persists a raw quaternion across watch sessions.
- Smoothing: Three.js slerp; does not change telemetry sampling.
- Axis controls: 180-degree proper rotations; further per-device pose calibration is needed.
- Save settings: only configurable axes/smoothing go to localStorage.
- Optional assets/watch5pro.glb: user-provided licensed model, not bundled. Do not commit proprietary assets without permission.
- Existing anatomical hand GLB remains unchanged; proper seamless rigged forearm asset is pending. Do not imply a full forearm has been integrated.
- Continuous screen-off operation, gesture recognition and finger tracking are NOT validated.
