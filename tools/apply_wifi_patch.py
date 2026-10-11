"""Apply narrowly-scoped source transformations to verified v0.8.1 wearable files."""
from pathlib import Path
import sys

root=Path(sys.argv[1]).resolve()
activity=root/'wear/src/main/java/dev/galaxywatchlab/bridge/MainActivity.kt'
service=root/'wear/src/main/java/dev/galaxywatchlab/bridge/SensorBridgeService.kt'
gradle=root/'wear/build.gradle.kts'
for f in (activity,service,gradle):
    if not f.is_file(): raise RuntimeError('Missing '+str(f))

def replacement(text, old, new):
    if text.count(old)!=1: raise RuntimeError('Expected exactly one anchor: '+repr(old[:70]))
    return text.replace(old,new,1)

a=activity.read_text(encoding='utf-8')
a=replacement(a,'import android.widget.Button\n','import android.widget.Button\nimport android.widget.EditText\nimport android.text.InputType\n')
a=replacement(a,'    private lateinit var frequency: RadioGroup\n','    private lateinit var frequency: RadioGroup\n    private lateinit var hostInput: EditText\n    private lateinit var tokenInput: EditText\n')
a=replacement(a,'        frequency.isEnabled = !running\n','        frequency.isEnabled = !running\n        hostInput.isEnabled = !running\n        tokenInput.isEnabled = !running\n')
a=replacement(a,'        status = TextView(this).apply { textSize = 12f; gravity = Gravity.CENTER }', '''        val config = getSharedPreferences("gwl_config", MODE_PRIVATE)
        val hostTitle = TextView(this).apply { text = "PC IPv4 (direct Wi-Fi)"; textSize=12f }
        hostInput = EditText(this).apply {
            setSingleLine(true)
            textSize=13f
            inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setText(config.getString("wifi_host", ""))
            hint="192.168.1.10"
        }
        val tokenTitle = TextView(this).apply { text = "LAN bridge token (16 hex)"; textSize=12f }
        tokenInput = EditText(this).apply {
            setSingleLine(true)
            textSize=13f
            inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(config.getString("wifi_token", ""))
            hint="copy token from PC"
        }
        status = TextView(this).apply { textSize = 12f; gravity = Gravity.CENTER }''')
a=replacement(a,'                val hz = selectedHz()\n','''                val hz = selectedHz()
                val host=hostInput.text.toString().trim()
                val token=tokenInput.text.toString().trim()
                // Refuse to start unless direct LAN is explicitly configured.
                if (!Regex("""(?:\\d{1,3}\\.){3}\\d{1,3}""").matches(host) ||
                    host.split('.').any { (it.toIntOrNull() ?: -1) !in 0..255 } ||
                    !Regex("[0-9a-fA-F]{16}").matches(token)) {
                    status.text="Enter valid PC IPv4 and 16-character token first"
                    return@setOnClickListener
                }
                getSharedPreferences("gwl_config", MODE_PRIVATE).edit()
                    .putString("wifi_host",host).putString("wifi_token",token).apply()
''')
a=replacement(a,'                    .putExtra("HZ", hz)\n','''                    .putExtra("HZ", hz)
                    .putExtra("HOST", host)
                    .putExtra("TOKEN", token)
''')
a=replacement(a,'        root.addView(status)\n','''        root.addView(hostTitle)
        root.addView(hostInput)
        root.addView(tokenTitle)
        root.addView(tokenInput)
        root.addView(status)
''')
a=a.replace('Galaxy Watch Lab v0.7.3','Galaxy Watch Lab v0.8.2')
s=service.read_text(encoding='utf-8')
s=replacement(s,'    @Volatile private var hz = 10\n','''    @Volatile private var hz = 10
    @Volatile private var wifiHost: String? = null
    @Volatile private var wifiToken: String? = null
''')
s=replacement(s,'        val requestedHz = intent?.getIntExtra("HZ", 10) ?: 10\n','''        val requestedHz = intent?.getIntExtra("HZ", 10) ?: 10
        if (intent?.action == "START") {
            val host = intent.getStringExtra("HOST")
            val token = intent.getStringExtra("TOKEN")
            if (host.isNullOrBlank() || token?.matches(Regex("[0-9a-fA-F]{16}")) != true) {
                stopSelf()
                return START_NOT_STICKY
            }
            wifiHost = host
            wifiToken = token
        }
''')
s=replacement(s,'        if (!active) return\n        if (SystemClock.elapsedRealtime() >= stopAt)', '''        if (!active) return
        if (wifiHost == null || wifiToken == null) return
        if (SystemClock.elapsedRealtime() >= stopAt)''')
s=replacement(s,'            val connection = URL("http://127.0.0.1:8766/ingest").openConnection() as HttpURLConnection\n','''            val connection = URL("http://${wifiHost}:8767/ingest").openConnection() as HttpURLConnection
''')
s=replacement(s,'                connection.setRequestProperty("Content-Type", "application/json")\n','''                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("X-GWL-Token", wifiToken)
''')
g=gradle.read_text(encoding='utf-8')
g=replacement(g,'versionCode = 5; versionName = "0.7.3"','versionCode = 6; versionName = "0.8.2"')
for f,t in ((activity,a),(service,s),(gradle,g)):
    f.write_text(t,encoding='utf-8',newline='\n')
print('WIFI_PATCH=PASS')
