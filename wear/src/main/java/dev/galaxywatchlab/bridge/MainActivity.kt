package dev.galaxywatchlab.bridge

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(16, 12, 16, 12)
        }
        val title = TextView(this).apply {
            text = "GWL IMU v0.7"; textSize = 18f; gravity = Gravity.CENTER
        }
        val info = TextView(this).apply {
            text = "Screen-off lab mode\nRequires ADB reverse to PC\nHigher Hz uses more battery"
            textSize = 12f; gravity = Gravity.CENTER
        }
        root.addView(title); root.addView(info)
        for (rate in listOf(10, 25, 50)) {
            root.addView(Button(this).apply {
                text = "Start / $rate Hz"
                setOnClickListener {
                    startForegroundService(Intent(this@MainActivity, SensorBridgeService::class.java)
                        .setAction("START").putExtra("HZ", rate))
                    info.text = "Streaming $rate Hz (target)\nCan turn screen off"
                }
            })
        }
        root.addView(Button(this).apply {
            text = "Stop sensors"
            setOnClickListener {
                startService(Intent(this@MainActivity, SensorBridgeService::class.java).setAction("STOP"))
                info.text = "Stopped"
            }
        })
        setContentView(root)
    }
}
