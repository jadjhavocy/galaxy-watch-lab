package dev.galaxywatchlab.bridge

import android.app.Activity
import android.app.ActivityManager
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {
    private val ui = Handler(Looper.getMainLooper())
    private lateinit var status: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var frequency: RadioGroup
    private val refresh = object : Runnable {
        override fun run() {
            updateStatus()
            ui.postDelayed(this, 1000L)
        }
    }

    @Suppress("DEPRECATION")
    private fun serviceIsRunning(): Boolean {
        val manager = getSystemService(ACTIVITY_SERVICE) as ActivityManager
        return manager.getRunningServices(100).any {
            it.service.className == SensorBridgeService::class.java.name && it.pid > 0
        }
    }

    private fun selectedHz(): Int = when (frequency.checkedRadioButtonId) {
        110 -> 10
        125 -> 25
        150 -> 50
        else -> 10
    }

    private fun updateStatus() {
        val running = serviceIsRunning()
        val prefs = getSharedPreferences("gwl_status", MODE_PRIVATE)
        val started = prefs.getLong("started_elapsed", 0L)
        val left = if (running && started > 0L) {
            ((300000L - (SystemClock.elapsedRealtime() - started)).coerceAtLeast(0L)) / 1000L
        } else 0L
        val events = prefs.getLong("events", 0L)
        val sent = prefs.getLong("sent", 0L)
        val failures = prefs.getLong("failures", 0L)
        val lastSensor = prefs.getLong("last_sensor_elapsed", 0L)
        val age = if (lastSensor > 0L) SystemClock.elapsedRealtime() - lastSensor else -1L
        status.text = if (running) {
            "RUNNING | ${left}s left\nIMU events: $events\nHTTP attempts: $sent | errors: $failures\nLast sensor age: ${age}ms"
        } else "STOPPED | Safe to close\nLast events: $events | HTTP: $sent"
        startButton.isEnabled = !running
        stopButton.isEnabled = running
        frequency.isEnabled = !running
        for (i in 0 until frequency.childCount) frequency.getChildAt(i).isEnabled = !running
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(14, 10, 14, 10)
        }
        val title = TextView(this).apply {
            text = "Galaxy Watch Lab v0.7.3"
            textSize = 17f
            gravity = Gravity.CENTER
        }
        val info = TextView(this).apply {
            text = "Select IMU sampling rate\nNetwork max 5 Hz вЂў Session max 5 min"
            textSize = 12f
            gravity = Gravity.CENTER
        }
        frequency = RadioGroup(this).apply { orientation = RadioGroup.HORIZONTAL; gravity = Gravity.CENTER }
        for (hz in listOf(10, 25, 50)) {
            val radio = RadioButton(this).apply {
                id = when (hz) { 10 -> 110; 25 -> 125; else -> 150 }
                text = "${hz}Hz"
                textSize = 12f
            }
            frequency.addView(radio)
        }
        val chosen = getSharedPreferences("gwl_config", MODE_PRIVATE).getInt("hz", 10)
        frequency.check(when (chosen) {25 -> 125; 50 -> 150; else -> 110})
        frequency.setOnCheckedChangeListener { _, _ ->
            getSharedPreferences("gwl_config", MODE_PRIVATE).edit().putInt("hz", selectedHz()).apply()
        }
        status = TextView(this).apply { textSize = 12f; gravity = Gravity.CENTER }
        startButton = Button(this).apply {
            text = "START IMU"
            setOnClickListener {
                val hz = selectedHz()
                getSharedPreferences("gwl_config", MODE_PRIVATE).edit().putInt("hz", hz).apply()
                val command = Intent(this@MainActivity, SensorBridgeService::class.java)
                    .setAction("START")
                    .putExtra("HZ", hz)
                startForegroundService(command)
                ui.postDelayed({updateStatus()}, 500L)
            }
        }
        stopButton = Button(this).apply {
            text = "STOP SENSORS"
            setOnClickListener {
                startService(Intent(this@MainActivity, SensorBridgeService::class.java).setAction("STOP"))
                ui.postDelayed({updateStatus()}, 500L)
            }
        }
        root.addView(title)
        root.addView(info)
        root.addView(frequency)
        root.addView(status)
        root.addView(startButton)
        root.addView(stopButton)
        setContentView(ScrollView(this).apply { addView(root) })
        updateStatus()
    }
    override fun onResume() {
        super.onResume()
        ui.removeCallbacks(refresh)
        ui.post(refresh)
    }
    override fun onPause() {
        ui.removeCallbacks(refresh)
        super.onPause()
    }
}