package dev.galaxywatchlab.bridge

import android.app.*
import android.content.*
import android.hardware.*
import android.os.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

class SensorBridgeService : Service(), SensorEventListener {
    private lateinit var sensors: SensorManager
    private lateinit var sensorThread: HandlerThread
    private var wakeLock: PowerManager.WakeLock? = null
    private val sender = Executors.newSingleThreadScheduledExecutor()
    private val seq = AtomicLong()
    private val events = AtomicLong()
    private val failures = AtomicLong()
    private val startElapsed = SystemClock.elapsedRealtime()
    @Volatile private var q = floatArrayOf(0f, 0f, 0f, 1f)
    @Volatile private var accel = floatArrayOf(0f, 0f, 0f)
    @Volatile private var gyro = floatArrayOf(0f, 0f, 0f)
    @Volatile private var qStamp = 0L
    @Volatile private var latestElapsed = 0L
    @Volatile private var hz = 25
    @Volatile private var active = false
    private val power by lazy { getSystemService(POWER_SERVICE) as PowerManager }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        sensors = getSystemService(SENSOR_SERVICE) as SensorManager
        sensorThread = HandlerThread("GWL-IMU", Process.THREAD_PRIORITY_MORE_FAVORABLE).apply { start() }
        val channel = NotificationChannel("bridge", "IMU background collection", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        val notification = Notification.Builder(this, "bridge")
            .setContentTitle("Galaxy Watch Lab: IMU active")
            .setContentText("Screen-off acquisition; stop in app")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true).build()
        startForeground(41, notification)
        // No arbitrary one-hour expiry. Released in onDestroy; battery usage is intentional.
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GWL:SensorBridge").apply {
            setReferenceCounted(false); acquire()
        }
        active = true
        registerSensors()
        sender.scheduleAtFixedRate({ transmit() }, 0, 40, TimeUnit.MILLISECONDS)
        sender.scheduleAtFixedRate({
            // Recover from a stalled non-wakeup sensor; cannot override vendor power policy.
            val age = SystemClock.elapsedRealtime() - latestElapsed
            if (latestElapsed > 0 && age > 10000 && active) {
                Handler(sensorThread.looper).post { if (active) registerSensors() }
            }
        }, 12, 12, TimeUnit.SECONDS)
    }

    private fun registerSensors() {
        sensors.unregisterListener(this)
        val us = 1_000_000 / hz
        for (type in listOf(Sensor.TYPE_GAME_ROTATION_VECTOR, Sensor.TYPE_ACCELEROMETER, Sensor.TYPE_GYROSCOPE)) {
            sensors.getDefaultSensor(type)?.let { sensors.registerListener(this, it, us, Handler(sensorThread.looper)) }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
        val newHz = intent?.getIntExtra("HZ", hz) ?: hz
        if (newHz in listOf(10, 25, 50) && newHz != hz) {
            hz = newHz
            Handler(sensorThread.looper).post { registerSensors() }
        }
        return START_STICKY
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onSensorChanged(event: SensorEvent) {
        events.incrementAndGet()
        when (event.sensor.type) {
            Sensor.TYPE_GAME_ROTATION_VECTOR -> {
                val tmp = FloatArray(4)
                SensorManager.getQuaternionFromVector(tmp, event.values)
                q = floatArrayOf(tmp[1], tmp[2], tmp[3], tmp[0])
                qStamp = event.timestamp
                latestElapsed = SystemClock.elapsedRealtime()
            }
            Sensor.TYPE_ACCELEROMETER -> accel = event.values.take(3).toFloatArray()
            Sensor.TYPE_GYROSCOPE -> gyro = event.values.take(3).toFloatArray()
        }
    }

    private fun transmit() {
        if (!active || qStamp == 0L) return
        // Repeated snapshots are explicitly marked stale rather than misreported as fresh samples.
        val stamp = qStamp
        val age = (SystemClock.elapsedRealtimeNanos() - stamp) / 1_000_000L
        val quaternion = q; val acc = accel; val gyr = gyro
        val s = seq.incrementAndGet()
        val battery = getSystemService(BATTERY_SERVICE) as BatteryManager
        val percent = battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val body = """{"schema":1,"seq":$s,"timestamp_ns":$stamp,"quat_xyzw":[${quaternion.joinToString(",")}],"accel_mps2":[${acc.joinToString(",")}],"gyro_rads":[${gyr.joinToString(",")}],"source":"game_rotation_vector","screen_on":${power.isInteractive},"sensor_age_ms":$age,"sensor_events":${events.get()},"send_failures":${failures.get()},"battery_pct":$percent,"target_hz":$hz,"uptime_ms":${SystemClock.elapsedRealtime()-startElapsed}}"""
        try {
            val connection = URL("http://127.0.0.1:8766/ingest").openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.connectTimeout = 600; connection.readTimeout = 600
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                if (connection.responseCode != 204) failures.incrementAndGet()
            } finally { connection.disconnect() }
        } catch (_: Exception) { failures.incrementAndGet() }
    }

    override fun onDestroy() {
        active = false
        sensors.unregisterListener(this)
        sender.shutdownNow()
        sensorThread.quitSafely()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }
}
