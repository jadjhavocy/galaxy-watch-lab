# Galaxy Watch Lab / Motion Studio v0.2

This iteration replaces the cube/cylinder hand with a sourced 3D **skinned GLB**.

## Model provenance
- Primary hand: Innerscene **Posable anatomical right hand**, `hand-posable.glb` (495 kB), CC0. Source https://www.innerscene.com/tools/library/3d-parts/posable-anatomical-right-hand-f6098b4f ; download https://www.innerscene.com/api/library/posable-anatomical-right-hand-f6098b4f/download . Derived from MakeHuman / MPFB CC0. 16 bones. Original bind pose right hand.
- Left hand is a runtime mirrored representation; not yet independently rigged / validated for skin normal sign and rotation conventions.
- Galaxy Watch5 Pro case is a clearly labelled placeholder, **not** manufacturer CAD.
- Three.js modules are loaded from esm.sh (online dependency).

## Functional capabilities
- Local HTTP hosted 3D viewport, orbit/pan/zoom camera, handedness switch, simulated roll/pitch/yaw, reset, demo, watch positioning adjustment.
- Imported model is normalized to fit the viewport; its native skeleton and skinning remain intact.
- No IMU streaming or joint reconstruction. Finger articulation is **not** inferred from wrist inertial measurements.

## Next engineering milestones
1. Validate actual model orientation and align watch strap to wrist bone and dorsal surface; separate left rig if reflection causes shading issues.
2. Add bone inspector, explicit fake finger-pose editor, canonical coordinate frames.
3. Build Wear OS foreground-service sensor logger, background sampling feasibility and power measurements.
4. Transport timestamped IMU packets and estimate wrist orientation with calibration/filtering.
5. Train gesture classifier and dispatch MediaSession commands through phone companion.

## Local startup
Run `python -m http.server 8765` from project root; open `http://127.0.0.1:8765/`. Opening file via file:// can block GLB fetch.
