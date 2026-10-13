package dev.galaxywatchlab.mobile

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/** Explicit, local-only phone test surface. Does not run background sensors. */
class MainActivity : Activity() {
    private lateinit var details: TextView
    private lateinit var feedback: TextView

    private fun action(label: String, onClick: () -> Unit): Button = Button(this).apply {
        text = label
        setOnClickListener { onClick() }
    }
    private fun update() { details.text = MediaControl.status(this) }
    private fun show(result: String) { feedback.text = result; update() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(24, 24, 24, 24)
        }
        val header = TextView(this).apply {
            text = "Galaxy Watch Lab · Pixel Companion 0.9.1"
            textSize = 21f
        }
        val disclosure = TextView(this).apply {
            text = "Мобильная Яндекс Музыка и SoundCloud. Доступ к уведомлениям Android нужен ТОЛЬКО для списка медиасеансов: мы не читаем сообщения и тексты уведомлений. Управление всегда выключено до ручного разрешения; сеанс действует максимум 2 минуты. Стандартное управление музыкой с часов продолжит работать независимо."
            textSize = 15f
        }
        details = TextView(this).apply { textSize = 16f }
        feedback = TextView(this).apply { textSize = 16f }
        column.addView(header)
        column.addView(disclosure)
        column.addView(action("1. Открыть разрешение на медиасеансы") {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        })
        column.addView(action("2. Выбрать Яндекс Музыку") {
            MediaControl.setTarget(this, MediaControl.YANDEX); show("Цель: Яндекс Музыка; разрешение команд сброшено")
        })
        column.addView(action("2. Выбрать SoundCloud") {
            MediaControl.setTarget(this, MediaControl.SOUNDCLOUD); show("Цель: SoundCloud; разрешение команд сброшено")
        })
        column.addView(action("3. Обновить сведения о медиасеансах") { update() })
        column.addView(details)
        column.addView(action("4. Разрешить ручные команды на 2 минуты") { show(MediaControl.armManual()) })
        column.addView(action("Пауза / воспроизведение") { show(MediaControl.request(this, "PLAY_PAUSE", false)) })
        column.addView(action("Следующий трек") { show(MediaControl.request(this, "NEXT", false)) })
        column.addView(action("Предыдущий трек") { show(MediaControl.request(this, "PREVIOUS", false)) })
        column.addView(action("Отдельно: разрешить сообщения с часов на 2 минуты") { show(MediaControl.armRemote()) })
        column.addView(action("Отменить все разрешения на команды") { MediaControl.disarm(); show("Отключено") })
        column.addView(feedback)
        setContentView(ScrollView(this).apply { addView(column) })
        update()
    }
    override fun onResume() { super.onResume(); if (::details.isInitialized) update() }
    override fun onStop() {
        // Manual key window ends on leaving UI. Explicit remote window expires independently at 2min.
        MediaControl.disarmManual()
        super.onStop()
    }
}
