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

/** Bounded, low-rate diagnostic session. Never auto-restarts after a system kill. */
class SensorBridgeService : Service(), SensorEventListener {
    private lateinit var sensors: SensorManager
    private lateinit var sensorThread: HandlerThread
    private var wakeLock: PowerManager.WakeLock? = null
    private val sender = Executors.newSingleThreadScheduledExecutor()
    private val seq = AtomicLong()
    private val events = AtomicLong()
    private val failures = AtomicLong()
    private val startedAt = SystemClock.elapsedRealtime()
    private val stopAt = startedAt + SESSION_MS
    @Volatile private var quat = floatArrayOf(0f, 0f, 0f, 1f)
    @Volatile private var accel = floatArrayOf(0f, 0f, 0f)
    @Volatile private var gyro = floatArrayOf(0f, 0f, 0f)
    @Volatile private var qStamp = 0L
    @Volatile private var lastSensorElapsed = 0L
    @Volatile private var lastSentStamp = 0L
    @Volatile private var active = false
    @Volatile private var hz = 10
    private val power by lazy { getSystemService(POWER_SERVICE) as PowerManager }
    private val prefs by lazy { getSharedPreferences("gwl_status", MODE_PRIVATE) }

    private fun persistStatus() {
        prefs.edit()
            .putLong("started_elapsed", startedAt)
            .putLong("events", events.get())
            .putLong("sent", seq.get())
            .putLong("failures", failures.get())
            .putLong("last_sensor_elapsed", lastSensorElapsed)
            .apply()
    }

    companion object { private const val SESSION_MS = 5 * 60 * 1000L }
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        sensors = getSystemService(SENSOR_SERVICE) as SensorManager
        sensorThread = HandlerThread("GWL-IMU", Process.THREAD_PRIORITY_DEFAULT).apply { start() }
        val channel = NotificationChannel("bridge", "IMU diagnostic session", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        val notification = Notification.Builder(this, "bridge")
            .setContentTitle("Galaxy Watch Lab: safe diagnostic")
            .setContentText("5 min maximum; 5 Hz network; stop in app")
            .setSmallIcon(android.R.drawable.ic_menu_compass).setOngoing(true).build()
        startForeground(41, notification)
        // A time-bounded wake lock; device firmware may disable it in Doze.
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GWL:SensorBridge").apply {
            setReferenceCounted(false)
            acquire(SESSION_MS)
        }
        active = true
        persistStatus()
        registerSensors()
        sender.scheduleWithFixedDelay({ transmit() }, 0L, 200L, TimeUnit.MILLISECONDS)
        sender.scheduleWithFixedDelay({ persistStatus() }, 1L, 5L, TimeUnit.SECONDS)
        Handler(Looper.getMainLooper()).postDelayed({ stopSelf() }, SESSION_MS)
    }

    private fun registerSensors() {
        val callbackHandler = Handler(sensorThread.looper)
        val periodUs = 1_000_000 / hz
        for (type in listOf(Sensor.TYPE_GAME_ROTATION_VECTOR, Sensor.TYPE_ACCELEROMETER, Sensor.TYPE_GYROSCOPE)) {
            sensors.getDefaultSensor(type)?.let { sensors.registerListener(this, it, periodUs, callbackHandler) }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
        // The watch UI chooses 10, 25, or 50 Hz. Transport remains capped at 5 Hz.
        val requestedHz = intent?.getIntExtra("HZ", 10) ?: 10
        if (requestedHz in listOf(10, 25, 50) && requestedHz != hz) {
            hz = requestedHz
            Handler(sensorThread.looper).post {
                if (active) {
                    sensors.unregisterListener(this)
                    registerSensors()
                }
            }
        }
        return START_NOT_STICKY
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onSensorChanged(event: SensorEvent) {
        events.incrementAndGet()
        lastSensorElapsed = SystemClock.elapsedRealtime()
        when (event.sensor.type) {
            Sensor.TYPE_GAME_ROTATION_VECTOR -> {
                val out = FloatArray(4)
                SensorManager.getQuaternionFromVector(out, event.values)
                quat = floatArrayOf(out[1], out[2], out[3], out[0])
                qStamp = event.timestamp
            }
            Sensor.TYPE_ACCELEROMETER -> accel = event.values.take(3).toFloatArray()
            Sensor.TYPE_GYROSCOPE -> gyro = event.values.take(3).toFloatArray()
        }
    }

    private fun transmit() {
        if (!active) return
        if (SystemClock.elapsedRealtime() >= stopAt) {
            Handler(Looper.getMainLooper()).post { stopSelf() }
            return
        }
        val stamp = qStamp
        if (stamp == 0L || stamp == lastSentStamp) return
        lastSentStamp = stamp
        val age = (SystemClock.elapsedRealtimeNanos() - stamp) / 1_000_000L
        if (age > 2000L || age < 0L) return
        val q = quat; val a = accel; val g = gyro
        val number = seq.incrementAndGet()
        val body = """{"schema":1,"seq":$number,"timestamp_ns":$stamp,"quat_xyzw":[${q.joinToString(",")}],"accel_mps2":[${a.joinToString(",")}],"gyro_rads":[${g.joinToString(",")}],"source":"game_rotation_vector","screen_on":${power.isInteractive},"sensor_age_ms":$age,"sensor_events":${events.get()},"send_failures":${failures.get()},"target_hz":$hz,"uptime_ms":${SystemClock.elapsedRealtime() - startedAt}}"""
        try {
            val connection = URL("http://127.0.0.1:8766/ingest").openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.connectTimeout = 400
                connection.readTimeout = 400
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                if (connection.responseCode != 204) failures.incrementAndGet()
            } finally { connection.disconnect() }
        } catch (_: Exception) { failures.incrementAndGet() }
    }

    override fun onDestroy() {
        active = false
        persistStatus()
        sensors.unregisterListener(this)
        sender.shutdownNow()
        sensorThread.quitSafely()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }
}
