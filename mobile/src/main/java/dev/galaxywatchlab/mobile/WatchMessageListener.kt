package dev.galaxywatchlab.mobile

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/** Receives only Play Services Data Layer messages from the same signed app identity.
 *  v0.9.0 watch transmitter is NOT installed or even implemented. Reception is inert until
 *  user explicitly enables a two-minute window in the phone UI. No persistence / retries.
 */
class WatchMessageListener : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        if (event.path != "/gwl/v1/media" || event.data.size > 256) return
        val json = try { JSONObject(event.data.toString(Charsets.UTF_8)) } catch (_: Exception) { return }
        if (json.optInt("v", -1) != 1) return
        if (json.length() != 3) return
        val command = json.optString("command", "")
        val id = json.optString("id", "")
        // Fail closed: no response, forwarding, logs or retries.
        MediaControl.request(this, command, fromWatch = true, id = id)
    }
}
