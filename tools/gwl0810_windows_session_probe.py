"""GWL 0.8.10: optional, read-only Windows system media session inventory.

Never triggers media buttons, requests source metadata, controls a session, or installs dependencies.
Default mode is dependency information only. --inspect explicitly opts into read-only enumeration.
"""
import argparse
import asyncio
import importlib
import json
import os
import re
import sys
from dataclasses import dataclass


def classify_app_id(app_id):
    """An AUMID can identify a native app, not a specific browser tab or web site."""
    value = (app_id or "").lower()
    if not isinstance(app_id, str) or not value.strip():
        return "UNKNOWN_SOURCE"
    if re.search(r"(?:chrome|msedge|firefox|opera|brave|vivaldi|browser)", value):
        return "BROWSER_TAB_UNRESOLVED"
    if "yandex" in value or "яндекс" in value:
        return "YANDEX_APP_CANDIDATE_UNVERIFIED"
    if "soundcloud" in value:
        return "SOUNDCLOUD_APP_CANDIDATE_UNVERIFIED"
    return "OTHER_APP"


def sanitize_status(info):
    try:
        status = getattr(info, "playback_status", None)
        name = getattr(status, "name", "") or str(status)
        name = str(name).upper()
        return name if name in {"PLAYING", "PAUSED", "STOPPED", "CHANGING", "CLOSED", "OPENED"} else "UNKNOWN"
    except Exception:
        return "UNKNOWN"


def load_winrt():
    errors = []
    for name in ("winrt.windows.media.control", "winsdk.windows.media.control"):
        try:
            return importlib.import_module(name), name, errors
        except (ImportError, OSError) as exc:
            errors.append(type(exc).__name__)
    return None, None, errors


async def inspect_sessions(media, include_identifiers=False):
    # WinRT globalMediaControl manager is read-only in this script.
    manager = await media.GlobalSystemMediaTransportControlsSessionManager.request_async()
    sessions = manager.get_sessions()
    current = manager.get_current_session()
    current_app = getattr(current, "source_app_user_model_id", None) if current else None
    result = []
    for session in sessions:
        app_id = getattr(session, "source_app_user_model_id", "") or ""
        try:
            playback = session.get_playback_info()
            state = sanitize_status(playback)
        except Exception:
            state = "UNKNOWN"
        item = {
            "source_class": classify_app_id(app_id),
            "playback": state,
            "same_app_id_as_system_current": bool(app_id and current_app and app_id == current_app),
        }
        # Explicit reveal is for local inspection only; do not share application identifiers accidentally.
        if include_identifiers:
            item["source_app_user_model_id"] = app_id
        result.append(item)
    return {
        "schema": 1,
        "kind": "READ_ONLY_WINDOWS_MEDIA_SESSION_INVENTORY",
        "count": len(result),
        "sessions": result,
        "note": "Source IDs do not distinguish browser tabs. Same app ID does not guarantee the exact current session.",
        "media_actions_executed": 0,
    }


def run():
    ap = argparse.ArgumentParser(description="GWL: inspect OS media session list, never control media")
    ap.add_argument("--inspect", action="store_true", help="Explicitly request read-only WinRT session listing")
    ap.add_argument("--show-app-ids", action="store_true", help="Include local application identifiers; do not upload raw output")
    args = ap.parse_args()
    if args.show_app_ids and not args.inspect:
        ap.error("--show-app-ids requires --inspect")
    if not args.inspect:
        print("GWL_WINDOWS_SESSIONS=NOT_STARTED")
        print("MODE=READ_ONLY_OPT_IN")
        print("REAL_OS_MEDIA_KEYS_NOT_SENT=YES")
        return 0
    if os.name != "nt":
        print("GWL_WINDOWS_SESSIONS=UNSUPPORTED_PLATFORM")
        print("REAL_OS_MEDIA_KEYS_NOT_SENT=YES")
        return 0
    media, lib, _ = load_winrt()
    if media is None:
        print("GWL_WINDOWS_SESSIONS=OPTIONAL_DEPENDENCY_MISSING")
        print("OPTIONAL_PACKAGE=winrt-Windows.Media.Control")
        print("AUTO_INSTALL=NO")
        print("REAL_OS_MEDIA_KEYS_NOT_SENT=YES")
        return 0
    try:
        data = asyncio.run(inspect_sessions(media, include_identifiers=args.show_app_ids))
    except Exception as exc:
        print("GWL_WINDOWS_SESSIONS=READ_FAILED")
        print("ERROR_TYPE=" + type(exc).__name__)
        print("REAL_OS_MEDIA_KEYS_NOT_SENT=YES")
        return 0
    print("GWL_WINDOWS_SESSIONS=READ_ONLY_COMPLETE")
    print("LIBRARY=" + lib)
    print(json.dumps(data, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(run())
