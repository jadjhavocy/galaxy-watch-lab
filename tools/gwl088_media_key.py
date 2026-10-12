"""Explicit single-shot Windows media key helper. NO activity unless --execute is passed.
Windows media keys control a system-selected media session, never a guaranteed app.
"""
import argparse
import ctypes
import os
import sys
from ctypes import wintypes

KEYS = {
    'NEXT': 0xB0, 'PREVIOUS': 0xB1,
    'PLAY_PAUSE': 0xB3, 'VOLUME_UP': 0xAF, 'VOLUME_DOWN': 0xAE,
}

def send_media_key(command):
    if command not in KEYS:
        raise ValueError('non-allowlisted command')
    if os.name != 'nt':
        raise OSError('Windows only')
    # SendInput structures must match pointer alignment on 64-bit Windows.
    ULONG_PTR = wintypes.WPARAM
    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [('dx', wintypes.LONG), ('dy', wintypes.LONG),
                    ('mouseData', wintypes.DWORD), ('dwFlags', wintypes.DWORD),
                    ('time', wintypes.DWORD), ('dwExtraInfo', ULONG_PTR)]
    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [('wVk', wintypes.WORD), ('wScan', wintypes.WORD),
                    ('dwFlags', wintypes.DWORD), ('time', wintypes.DWORD),
                    ('dwExtraInfo', ULONG_PTR)]
    class HARDWAREINPUT(ctypes.Structure):
        _fields_ = [('uMsg', wintypes.DWORD), ('wParamL', wintypes.WORD), ('wParamH', wintypes.WORD)]
    class INPUT_UNION(ctypes.Union):
        _fields_ = [('mi', MOUSEINPUT), ('ki', KEYBDINPUT), ('hi', HARDWAREINPUT)]
    class INPUT(ctypes.Structure):
        _fields_ = [('type', wintypes.DWORD), ('data', INPUT_UNION)]
    vk = KEYS[command]
    values = (INPUT(1, INPUT_UNION(ki=KEYBDINPUT(vk, 0, 0, 0, 0))),
              INPUT(1, INPUT_UNION(ki=KEYBDINPUT(vk, 0, 0x0002, 0, 0))))
    win = ctypes.windll.user32
    win.SendInput.argtypes = (wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int)
    win.SendInput.restype = wintypes.UINT
    for one in values:
        if win.SendInput(1, ctypes.byref(one), ctypes.sizeof(INPUT)) != 1:
            raise ctypes.WinError()

def main():
    parser = argparse.ArgumentParser(description='One-shot OS media key; does not choose target app')
    parser.add_argument('--command', choices=sorted(KEYS), required=True)
    parser.add_argument('--execute', action='store_true', help='Opt in to a real OS media key')
    args = parser.parse_args()
    if not args.execute:
        print('DRY_RUN='+args.command)
        return 0
    send_media_key(args.command)
    print('SENT_OS_GLOBAL_MEDIA_KEY='+args.command)
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError) as err:
        print('MEDIA_KEY_ERROR='+str(err), file=sys.stderr)
        sys.exit(2)
