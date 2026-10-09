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
            setPadding(18, 15, 18, 15)
        }
        val title = TextView(this).apply { text = "GWL Sensor Bridge v0.4"; textSize = 17f; gravity = Gravity.CENTER }
        val explanation = TextView(this).apply {
            text = "ADB reverse: 127.0.0.1:8766\nSends orientation + acceleration\nStart only when paired to PC"
            textSize = 12f; gravity = Gravity.CENTER
        }
        val start = Button(this).apply { text = "Start sensors"; setOnClickListener {
            startForegroundService(Intent(this@MainActivity, SensorBridgeService::class.java).setAction("START"))
        }}
        val stop = Button(this).apply { text = "Stop sensors"; setOnClickListener {
            startService(Intent(this@MainActivity, SensorBridgeService::class.java).setAction("STOP"))
        }}
        root.addView(title); root.addView(explanation); root.addView(start); root.addView(stop)
        setContentView(root)
    }
}
