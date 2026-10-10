# Galaxy Watch Lab v0.7.3 вЂ” verification (2026-10-10)

## Baseline

Device: Samsung Galaxy Watch5 Pro SM-R920, Android 14 / API 34.
Receiver: local Python service, http://127.0.0.1:8766/state, currently transported over ADB reverse.

## Verified manually

- Watch UI exposes 10, 25, 50 Hz modes and START/STOP.
- Short manual tests at all three rates were smooth.
- At 10 Hz, receiver reported connected=true, sensor_fresh=true with screen_on=false.
- Previous automated 120 s gate: 60 samples, 60 connected, 60 fresh, 31 screen-off samples, 0 HTTP errors, 0 warnings, age 18вЂ“331 ms, 423 packet increase, ADB stop successful.

## Consolidated gate (20261010-234016)

`json
[
    {
        "rate":  "25",
        "seconds":  50,
        "samples":  25,
        "connected":  25,
        "fresh":  25,
        "screen_off":  0,
        "http_errors":  0,
        "max_age_ms":  274,
        "received_delta":  176,
        "last_send_failures":  0
    },
    {
        "rate":  "50",
        "seconds":  50,
        "samples":  25,
        "connected":  25,
        "fresh":  25,
        "screen_off":  20,
        "http_errors":  0,
        "max_age_ms":  278,
        "received_delta":  175,
        "last_send_failures":  0
    }
]
`

## Constraints and caveats

- No claim of multi-hour background reliability, production Bluetooth transport, battery life, gesture-recognition accuracy, or independence from ADB reverse.
- Earlier hundreds of ADB process-tracker processes disappeared after wireless debugging restart; that observation does not prove root cause of UI lag.
- Network sender is capped around 5 posts/s independently of sensor selection.
- The user operates watch START manually. Script collects receiver measurements, then uses ADB force-stop when available.
- Raw CSV and console report remain in the user's local Downloads audit folder.
