# GWL v0.9.1 — Pixel 7a safe mobile media action policy

## Precondition

v0.9.0 source and mobile-debug.apk compile succeeded on Windows. **Neither Yandex Music nor SoundCloud has yet been tested using our own APK**. Existing Galaxy Watch5 Pro -> Pixel 7a built-in music control works, but our custom watch sender is not implemented. Windows player control is only a test fixture.

## What changed

- Pure Android-free `MediaCommandPolicy` chooses the exact dispatch operation from the selected media session's advertised actions.
- If PAUSE/PLAY is explicitly advertised for the current state, use `transportControls.pause()`/`.play()`. If only `ACTION_PLAY_PAUSE` is advertised, fall back to sending a DOWN + UP media-toggle **to the chosen MediaController** (`MediaController.dispatchMediaButtonEvent`), not to Android's global media key or arbitrary app.
- If neither the explicit action nor toggle is advertised, fail closed (`BLOCKED_UNSUPPORTED_ACTION`). NEXT/PREVIOUS stay independently gated by playback-state flags. MediaKey acceptance does not prove playback state changed on target.
- If either part of the toggle dispatch fails, latch ambiguous failure and require restarting our app before more attempts. Do not retry (the first key may have arrived).
- Exact package selection, one-session restriction, manual notification-listener permission, two-minute opt-in, 900 ms cooldown, 12/min rolling budget, watch message validation, and all device restrictions remain unchanged.
- Fix nullable `ArrayDeque.peekFirst` Kotlin warning by using the safe `first()` accessor only inside a `!requests.isEmpty()` loop.
- Make unarmed check explicit (`permitUntil == 0L || now >= permitUntil`).
- Bump phone APK versionCode 2 / versionName 0.9.1-phone-preview, update in-app header.

## Validation and no-device release

The v0.9.1 script accepts **only** branch `feature/gwl-v090-pixel-companion` at commit `8e9759bb60a054f734d18e9a5994ceaa56d66fb9`, clean tracked files, and two pre-existing untracked paths `artifacts/` and `docs/IMU_FREQUENCY_V073.md`. It never deletes either. It writes to a new feature branch; does not merge main. It runs prior Node test suite + new source contract; Gradle `:mobile:testDebugUnitTest` (pure Kotlin JUnit policy matrix), then `:mobile:assembleDebug`. The process does not install APK, invoke ADB, modify or connect watch, request notification access, access real Android media sessions, or send keys.

If Gradle or tests fail, do not commit or push. Existing build and legacy diagnostics stay in place. Logs in Downloads, APK in `mobile/build/outputs/apk/debug/mobile-debug.apk` after PASS. The current watch and Bluetooth pairing stay untouched.

## Next manually approved phone-only test

1. Audit APK checksum/package, transfer **only** to Pixel 7a after user's approval; do not use ADB or USB unless separately agreed.
2. Review Android Notification Access carefully: the `NotificationListenerService` implementation does not inspect notification payloads, but the OS permission itself is broad.
3. Start mobile Yandex Music, choose its target, inspect number of eligible sessions and advertised actions. Manually arm for 2 min and send exactly one Play/Pause, checking the actual app responds.
4. Test SoundCloud separately, then NEXT/PREVIOUS as supported. All commands are user-clicked and targeted to the selected app. Revoke the permission after testing if desired.
5. Only after phone validation, plan safe Wear Data Layer sender and controlled on-watch gesture classification.
