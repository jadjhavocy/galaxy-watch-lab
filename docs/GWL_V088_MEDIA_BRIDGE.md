# GWL v0.8.8 — Windows media bridge readiness (manual opt-in)

## Scope

The new browser playground runs at `127.0.0.1:8772` and uses the existing gesture classifier and gesture-profile safety router. By default it performs **dry-run dispatch only**; it does not operate Windows, the watch, ADB, Yandex Music or SoundCloud. The existing v0.8.6 and v0.8.7 playgrounds on ports 8770 and 8771 are unchanged. All clicks are **synthetic**; there is no real wearable input.

The backend has an independently enforced single-use **10-second arming gate**, 900ms command cooldown, strict command whitelist, loopback-only bind, random in-memory browser session token, Origin verification, bounded JSON POST size, and strict same-origin content policy. Static requests are allowlisted; no shell endpoints or arbitrary subprocess commands exist. The one-shot grant is consumed **before** dispatch. Profile switching and Cancel request backend disarm.

## Run dry-run by default

In a separate PowerShell window after the release gate:

```powershell
& "C:\Program Files\nodejs\node.exe" "tools\gwl088_media_bridge.mjs"
```

Open http://127.0.0.1:8772 and verify **DRY RUN**. A successful command changes only the local simulated player. The browser displays acknowledgement and logs whether the server rejected/accepted a command.

## Optional explicit Windows-only real-media test (NOT automatic)

**Do not run this during unattended testing.** To test *one manually clicked* media command on Windows, stop the dry-run server using Ctrl+C and run:

```powershell
& "C:\Program Files\nodejs\node.exe" "tools\gwl088_media_bridge.mjs" --enable-os-media-keys --acknowledge-global-session
```

Open http://127.0.0.1:8772, check the on-screen acknowledgement, press Activate, then a single synthetic gesture. The server invokes `tools/gwl088_media_key.py` through Python (`py -3`) via `spawn` **without a shell** and sends one Windows `SendInput` media key. The user must separately enable this server mode in the terminal. Stop with Ctrl+C. No automatic start or background scheduling.

**Caveat:** Windows chooses which active media session receives the keys. This is not targeted Yandex Music/SoundCloud control; NEXT/PREV/PLAY_PAUSE can affect another player, and VOLUME_* changes global Windows system output volume. Do not claim a specific app's compatibility until an explicit manual test proves it. OS injection can be rejected by Windows, for example due to integrity isolation. Tests and installation never invoke this live path.

## Safety and limitations

All gesture input is synthetic. Raw real-world gesture quality, power usage and real Wi-Fi connectivity are still unverified. The existing watch issue remains unresolved: **keep wireless debugging off and do not install/watch-test**. The media key adapter has not been validated on the user's Windows device. The Python helper's default mode is dry-run even when invoked manually without `--execute`. This is an experimental local development tool, not a hardened multi-user service; do not forward port 8772 or expose to another machine.

## Future

After manual verification, introduce a provider-aware media-session selector instead of indiscriminate global keys; only then connect real watch events behind the same safety gate. Smart ring stays in long-term backlog.
