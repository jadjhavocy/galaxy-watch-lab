package dev.galaxywatchlab.mobile

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.SystemClock
import java.util.ArrayDeque
import java.util.LinkedHashSet

/** Strict per-app media-session control. No accessibility service or global media keys. */
object MediaControl {
    const val YANDEX = "ru.yandex.music"
    const val SOUNDCLOUD = "com.soundcloud.android"
    private const val PREFS = "gwl_phone_v090"
    private const val WINDOW_MS = 120_000L
    private const val COOLDOWN_MS = 900L
    private const val LIMIT_MS = 60_000L
    private const val LIMIT = 12
    private var manualUntil = 0L
    private var remoteUntil = 0L
    private var lastRequestAt = -1L
    private var uncertain = false
    private val requests = ArrayDeque<Long>()
    private val seenIds = LinkedHashSet<String>()

    fun hasAccess(context: Context): Boolean {
        val mgr = context.getSystemService(NotificationManager::class.java)
        return mgr.isNotificationListenerAccessGranted(ComponentName(context, MediaAccessListener::class.java))
    }

    fun target(context: Context): String = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString("target", YANDEX)?.takeIf { it == YANDEX || it == SOUNDCLOUD } ?: YANDEX

    fun setTarget(context: Context, pkg: String) {
        require(pkg == YANDEX || pkg == SOUNDCLOUD)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("target", pkg).apply()
        disarm()
    }

    @Synchronized fun armManual(): String {
        if (uncertain) return "Заблокировано после неопределённой ошибки. Перезапусти приложение."
        manualUntil = SystemClock.elapsedRealtime() + WINDOW_MS
        return "Ручные команды разрешены на 2 минуты"
    }

    @Synchronized fun armRemote(): String {
        if (uncertain) return "Заблокировано после неопределённой ошибки. Перезапусти приложение."
        remoteUntil = SystemClock.elapsedRealtime() + WINDOW_MS
        return "Команды с часов разрешены на 2 минуты (если наш клиент на часах их отправляет)"
    }

    @Synchronized fun disarmManual() { manualUntil = 0L }

    @Synchronized fun disarm() { manualUntil = 0L; remoteUntil = 0L }

    @Synchronized fun status(context: Context): String {
        val selected = if (target(context) == YANDEX) "Яндекс Музыка" else "SoundCloud"
        val now = SystemClock.elapsedRealtime()
        val rem = ((remoteUntil - now).coerceAtLeast(0L) / 1000L)
        val man = ((manualUntil - now).coerceAtLeast(0L) / 1000L)
        if (!hasAccess(context)) return "Выбрано: $selected\nНет разрешения на медиасеансы.\nКоманды заблокированы."
        return try {
            val matches = sessions(context, target(context))
            "Выбрано: $selected\nАктивных сеансов этого приложения: ${matches.size}\nРучное окно: ${man}с; часы: ${rem}с\n" +
                if (uncertain) "ЗАБЛОКИРОВАНО: возможна уже выполненная команда" else "Готово к ручному тесту"
        } catch (_: SecurityException) { "Нет доступа к медиасеансам. Команды заблокированы." }
    }

    private fun sessions(context: Context, pkg: String): List<MediaController> {
        val manager = context.getSystemService(MediaSessionManager::class.java)
        return manager.getActiveSessions(ComponentName(context, MediaAccessListener::class.java))
            .filter { it.packageName == pkg }
    }

    /** Returns a diagnostic without ever claiming the remote player actually changed state. */
    @Synchronized fun request(context: Context, command: String, fromWatch: Boolean, id: String? = null): String {
        if (command !in setOf("PLAY_PAUSE", "NEXT", "PREVIOUS")) return "BLOCKED_BAD_COMMAND"
        if (uncertain) return "BLOCKED_UNCERTAIN_RESTART"
        val now = SystemClock.elapsedRealtime()
        if (now > (if (fromWatch) remoteUntil else manualUntil)) return "BLOCKED_NOT_ARMED"
        if (fromWatch) {
            if (id == null || !Regex("[A-Za-z0-9_-]{8,64}").matches(id)) return "BLOCKED_BAD_ID"
            if (!seenIds.add(id)) return "BLOCKED_DUPLICATE"
            while (seenIds.size > 64) seenIds.remove(seenIds.first())
        }
        if (!hasAccess(context)) return "BLOCKED_PERMISSION"
        if (lastRequestAt >= 0L && now - lastRequestAt < COOLDOWN_MS) return "BLOCKED_COOLDOWN"
        while (!requests.isEmpty() && now - requests.peekFirst() >= LIMIT_MS) requests.removeFirst()
        if (requests.size >= LIMIT) return "BLOCKED_RATE_LIMIT"
        val selected = target(context)
        val controllers = try { sessions(context, selected) } catch (_: SecurityException) { return "BLOCKED_PERMISSION" }
        if (controllers.size != 1) return "BLOCKED_TARGET_SESSION_COUNT_${controllers.size}"
        val controller = controllers[0]
        val playback = controller.playbackState ?: return "BLOCKED_NO_PLAYBACK_STATE"
        val actions = playback.actions
        val requested: Long = when (command) {
            "NEXT" -> PlaybackState.ACTION_SKIP_TO_NEXT
            "PREVIOUS" -> PlaybackState.ACTION_SKIP_TO_PREVIOUS
            else -> if (playback.state == PlaybackState.STATE_PLAYING) {
                PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE
            } else {
                PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PLAY_PAUSE
            }
        }
        if (actions and requested == 0L) return "BLOCKED_UNSUPPORTED_ACTION"
        // Reserve request slot before crossing the Android media IPC boundary. Never auto-retry.
        requests.addLast(now)
        lastRequestAt = now
        return try {
            when (command) {
                "NEXT" -> controller.transportControls.skipToNext()
                "PREVIOUS" -> controller.transportControls.skipToPrevious()
                else -> if (playback.state == PlaybackState.STATE_PLAYING) controller.transportControls.pause()
                        else controller.transportControls.play()
            }
            "REQUESTED_${if (selected == YANDEX) "YANDEX" else "SOUNDCLOUD"}_$command"
        } catch (_: Exception) {
            // Command might already have reached the player. Suppress retries until process restart.
            uncertain = true
            disarm()
            "BLOCKED_DISPATCH_UNCERTAIN"
        }
    }
}
