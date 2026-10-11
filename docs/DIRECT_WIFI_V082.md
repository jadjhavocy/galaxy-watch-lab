# GWL v0.8.2 — Direct Wi-Fi prototype

**Safety:** no ADB Reverse during usage, no automatic installation on watch, no background launch, no new battery exemptions. The foreground diagnostic service still has a strict 5-minute lifetime and a maximum of 5 network transmissions per second. No music commands.

## Local lab setup

1. On a trusted private Wi-Fi network, start `python tools/receiver.py` in the PC project folder. Keep it bound to localhost port 8766.
2. In another PC terminal, start `python tools/lan_bridge.py`. It prints `WATCH_HOST` (PC's LAN IPv4), `WATCH_PORT=8767`, and a 16-character `WATCH_TOKEN`. This token is stored locally under `artifacts/lan-bridge-key.txt`; keep it private. Don't forward port 8767 on your router, and don't use public/shared Wi-Fi.
3. After the Android build and with watches verified stable, install the new APK through a **single short authorized ADB session** if and when you explicitly decide to run a hardware test. Turn wireless debugging off again after installation. No ADB is required for subsequent normal streaming.
4. On the watch, enter the PC IPv4 and token in GWL, select 10 Hz, then press START. The watch connects via `http://PC_IP:8767/ingest`. Check `http://127.0.0.1:8766/state` on the PC. Press STOP on the watch. Do not conduct a long screen-off test on the first attempt.

**Limitations:** HTTP on LAN uses a static bearer token, not encrypted TLS. Use only an isolated/trusted private LAN; other devices on that LAN may observe traffic. The prototype has no TLS, automatic host discovery, secure pairing, or per-device authentication. Wi-Fi may go to sleep under Wear OS power policy. No claim of reliably running all day or diagnosing the earlier watch freezes. Windows Firewall may prompt for permission to listen on port 8767; allow only Private networks and only if you trust the LAN. No permanent broad firewall rule is created automatically.

## Quality Gate

Run `python -m unittest discover -s tests -p test_lan_bridge.py`. Run `gradlew.bat :wear:assembleDebug --no-daemon` on Windows before attempting any watch installation. The safe staging script does not push or install automatically.
