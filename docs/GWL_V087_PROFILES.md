# Galaxy Watch Lab v0.8.7 — Offline Music Profiles

## Status

A separate, synthetic-only interactive demo introduces editable mapping profiles for gesture events already emitted by `GestureEngine`. It does not modify the Android APK, existing runtime classifier, LAN bridge, receiver, original v0.8.6 playground, or Windows media controls. Port 8771 prevents collision with the existing v0.8.6 local demo on port 8770.

## Gesture-to-action mapping

- `classic`: X+ next, X- previous, Y+ volume up, Y- volume down, Z+ play/pause.
- `mirrored`: reverse X and Y assignments; Z+ play/pause.
- `minimal`: X+/X- track controls, Y+/Y- OFF, Z+ play/pause.
- `custom`: every mapping value must be one of five allowlisted virtual music commands or OFF. Z- is **always CANCEL**, cannot be remapped.

The upstream `ControlRouter` is the authority for one-shot explicit arming (10 s), monotonic host times, stale timestamp rejection, music context checks and cooldown. A change of profile disarms the controller. Mapping OFF consumes the single-use authorization without dispatching a command. Profiles can be saved to **this browser's localStorage** only. Neither UI nor backend has network, shell, music-player, watch or Bluetooth integrations.

## Run (after release gate)

Use Node.js directly if not available in PowerShell PATH:

```powershell
& "C:\Program Files\nodejs\node.exe" "tools\gwl087_playground.mjs"
```

Open http://127.0.0.1:8771. Keep the PowerShell server terminal open; Ctrl+C stops it. Test flow: choose a profile, click Activate, click a simulated gesture, confirm changes in the virtual player. To change profile, activate anew; one activation authorizes only one command.

## Key limitations

- X/Y/Z are watch sensor axes, **not yet anatomically calibrated** hand motion directions. Profiles are mappings, not new proven classifiers.
- Five packets per second and the current threshold-based classifier cannot yet guarantee acceptable misses/false activations; actual user recordings are needed.
- There is no direct watch-to-Wi-Fi proof, no Windows media-session integration, and no Yandex Music or SoundCloud control in this stage.
- Future real media integration needs an independent, opt-in operating-system media adapter with an explicit enable/disable switch, allowlisted targets/commands, rate limits, foreground/app context gates, and a dry-run mode. It must never launch at login or control media automatically.
- Smart ring stays in long-term backlog and is deliberately excluded from v0.8.7.
