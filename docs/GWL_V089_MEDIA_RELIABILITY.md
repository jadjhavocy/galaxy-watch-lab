# Galaxy Watch Lab v0.8.9 — Windows Media Reliability

## Status and provenance

On 2026-10-13, the user reported that a single manually activated **synthetic Z+** click in the v0.8.8.1 LIVE playground successfully paused real Yandex Music in Windows. This is an observed user report, not automatic telemetry, and it does not validate real wrist movements, provider-specific targeting, or repeatability.

## Reliability changes

A `MediaSafetyGuard` now protects the existing opt-in LIVE media dispatch layer:

- allowlist of **five** Windows media key actions; no arbitrary commands;
- one dispatch at a time, 900 ms minimum gap and a **12 commands per 60 seconds** safety budget;
- independent 3.5-second timeout of the external dispatcher, plus existing 3-second child-process kill watchdog;
- failures and timeouts treated as **uncertain** (key may already have reached Windows): no auto-retry, further LIVE commands blocked until the bridge process is manually restarted;
- `/api/diagnostics` shows only local anonymous counts and circuit status, no gesture payloads or secrets; the browser displays this status and disables activation if blocked;
- one-shot backend arming (10 seconds), local session nonce, Origin gate and user LIVE checkbox remain in place;
- tests use injected fake executors, including simulated success, rejection, in-flight concurrency and timeout; they **never send a real OS key**;
- the default media server remains DRY_RUN and keeps localhost port **8772**.

A command accepted and sent by the OS is **not** proof that the intended media player received or obeyed it. `OS_KEY_SENT` means the system input helper completed successfully, not that Yandex Music was confirmed as the target.

## Operator commands

**GalaxyWatch** PowerShell: run the release `.ps1` from Downloads; it verifies baseline `9656a53fd99e95e3ca52af722130ad86b30e02d2`, creates `feature/gwl-v089-media-reliability`, runs tests, commits and pushes only on PASS. It does not start live media or use a watch.

**PowerShell Server** (only after PASS): stop any previous port 8772 server via Ctrl+C before starting a new version. Default dry run:

```powershell
cd "$env:USERPROFILE\galaxy-watch-lab"
& "C:\Program Files\nodejs\node.exe" "tools\gwl088_media_bridge.mjs"
```

Browser: `http://127.0.0.1:8772`. The read-only diagnostics endpoint is `http://127.0.0.1:8772/api/diagnostics`.

Optional manual LIVE testing requires **both explicit terminal flags** and user confirmation in the browser; only when user decides to run:

```powershell
$env:GWL_PYTHON_EXE = "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
& "C:\Program Files\nodejs\node.exe" "tools\gwl088_media_bridge.mjs" --enable-os-media-keys --acknowledge-global-session
```

If diagnostics show `locked:true`, press Ctrl+C, inspect cause, and **do not retry** until you have determined whether the original key affected music. No background autostart, no batch media actions, no implicit retries.

## Boundaries

No ADB, watch installation, Wi-Fi connection from watch, ring, or SoundCloud SDK. Device reliability remains unresolved. No merge into main in this release. Synthetic gesture axes X/Y/Z are not anatomically calibrated. Smart ring is a distant backlog item.
