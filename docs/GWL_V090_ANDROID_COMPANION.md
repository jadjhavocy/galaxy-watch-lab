# Galaxy Watch Lab v0.9.0 — Pixel 7a Android Companion Preview

**Primary product:** gesture-driven control of mobile `ru.yandex.music` and `com.soundcloud.android` on Google Pixel 7a using Galaxy Watch5 Pro. Windows Media Bridge is only an experimental test fixture. Pixel 7a and watch are already paired; user verified the built-in Wear OS media controls work. This does not demonstrate our custom data channel or custom gestures.

## Scope

- New `:mobile` Android app module; `applicationId=dev.galaxywatchlab.bridge` to pair with the existing Wear OS app for Google Play Services Wear Data Layer (both apps eventually need matching signatures).
- No watch application modification, no APK install, no USB/ADB, no persistent IMU collection, no network listener, no accessibility hacks.
- User explicitly grants Android **Notification Access**. This is a system-wide sensitive permission; it makes notification data accessible to a NotificationListenerService in principle, but **our service does not handle, read, log, store, or transmit notifications**. It exists solely to authorize `MediaSessionManager.getActiveSessions()`.
- Exact media-session routing only to `ru.yandex.music` or `com.soundcloud.android`, chosen in UI. Zero or multiple matching sessions fail closed; no routing to other players. Commands are subject to advertised PlaybackState actions.
- One command every >=900ms and <=12 dispatch requests per rolling 60sec; two-minute local manual/remote enable windows are off by default and live in app process memory. Leaving the main UI disarms manual controls, while an explicitly armed remote window expires after two minutes even with the screen off. No foreground service is used. No auto-retry after ambiguous dispatch. No title/artist, album art, or identifiers collected.
- This code requests transport commands to Android MediaController, not proof that the app obeyed. Actual support for Yandex and SoundCloud depends on their active sessions and device-specific tests.
- The new phone WearableListenerService accepts only exact `/gwl/v1/media` Play Services Data Layer messages, in strict JSON format: `{"v":1,"command":"NEXT","id":"unique-id-123"}`. No watch sender exists in this release; no watch hardware changes. Duplicate IDs are rejected. Message delivery requires apps on both devices with same application ID and compatible signing, connected by Play Services.

## Build

**GalaxyWatch window**: release script tests existing JS functionality, adds `:mobile`, compiles `:mobile:assembleDebug` with JDK17 and Android SDK if present, creates and pushes a new branch only on success. No install occurs. `PowerShell Server` remains unused.

APK after PASS: `mobile/build/outputs/apk/debug/mobile-debug.apk`. Installation on Pixel is a separate, explicit decision. Never install on the watch as part of this release. Do not try Data Layer until there is a separately tested Wear sender.

## On-device manual test later (only with user permission)

1. Back up the work, inspect the built APK, then install **only on Pixel**.
2. Open phone app, grant Android Notification Access manually after reviewing sensitive permission warning; start Yandex Music, refresh. The app should display exactly one matching session.
3. Choose target, arm **manual** controls for two minutes, send one PLAY_PAUSE. Observe actual music state, and only then test NEXT/PREVIOUS if supported.
4. Repeat separately for SoundCloud. Revoke notification access after testing if desired.
5. Watch Data Layer sender and custom on-watch classifier are later phases, after correcting freeze/ADB issues. Existing working Galaxy Watch media controls remain untouched.

## Trust boundary

The notification permission can give access to far more than music; app implementation must be audited before installation. v0.9.0 is a source/build preview, not a phone-validated release. Watch radio/wireless debugging remains off. No merge into main automatically.

Android reference: https://developer.android.com/reference/android/media/session/MediaSessionManager
Wear Data Layer: https://developers.google.com/android/reference/com/google/android/gms/wearable/MessageClient
