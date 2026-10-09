# Motion Studio v0.6 — IMU coordinate basis

24 right-handed coordinate-frame presets. World-relative rotation: q_now * inverse(q_neutral), transformed via B * q * inverse(B). This is not an actual anatomical calibration: select a preset that matches pitch/yaw/roll of the particular watch and rig.

Open http://127.0.0.1:8766/, LIVE ON, Calibrate neutral, and try axis presets while moving in three distinct directions. Browser stores chosen preset locally. Sensor APK unchanged.
