# Galaxy Watch Lab

Wear OS sensor exploration, 3D wrist tracking and gesture control for Galaxy Watch5 Pro (SM-R920).

## Phase 1: Motion Studio v0.1

Open `index.html` in a modern desktop browser while online. It loads Three.js from a CDN. Mouse rotates the camera; sliders and Demo rotate a procedural hand with a representative watch. **All movements are simulated**.

## Roadmap

1. Browser-based 3D motion simulator (current).
2. Wear OS accelerometer/gyroscope logger (CSV, sample rates, screen-off experiments).
3. Watch-to-desktop stream, timestamping and reconnect logic.
4. Orientation fusion and wrist-axis calibration.
5. Gesture classification and false-positive tests.
6. Android media controller for Yandex Music and SoundCloud.

Single wrist IMU does not reconstruct finger joint poses or absolute hand position. These need additional instrumentation or validated inference.
