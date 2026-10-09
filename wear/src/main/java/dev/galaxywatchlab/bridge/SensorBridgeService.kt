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
    private var wakeLock: PowerManager.WakeLock? = null
    private val sender = Executors.newSingleThreadScheduledExecutor()
    private val count = AtomicLong()
    @Volatile private var q = floatArrayOf(0f, 0f, 0f, 1f)
    @Volatile private var a = floatArrayOf(0f, 0f, 0f)
    @Volatile private var gyro = floatArrayOf(0f, 0f, 0f)
    @Volatile private var qStamp: Long = 0L
    @Volatile private var initialized = false
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        sensors = getSystemService(SENSOR_SERVICE) as SensorManager
        val channel = NotificationChannel("bridge", "Sensor bridge", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        val notification = Notification.Builder(this, "bridge")
            .setContentTitle("Galaxy Watch Lab")
            .setContentText("IMU streaming (test mode)")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
        startForeground(41, notification)
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GWL:SensorBridge").apply { acquire(60 * 60 * 1000L) }
        for (type in listOf(Sensor.TYPE_GAME_ROTATION_VECTOR, Sensor.TYPE_ACCELEROMETER, Sensor.TYPE_GYROSCOPE)) {
            sensors.getDefaultSensor(type)?.let { sensors.registerListener(this, it, 20000) }
        }
        sender.scheduleAtFixedRate({ transmit() }, 0L, 50L, TimeUnit.MILLISECONDS)
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
        return START_STICKY
    }
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_GAME_ROTATION_VECTOR -> {
                val tmp = FloatArray(4)
                SensorManager.getQuaternionFromVector(tmp, event.values)
                // Android returns [w,x,y,z]; network protocol sends [x,y,z,w].
                q = floatArrayOf(tmp[1],tmp[2],tmp[3],tmp[0]); qStamp = event.timestamp; initialized = true
            }
            Sensor.TYPE_ACCELEROMETER -> a = event.values.take(3).toFloatArray()
            Sensor.TYPE_GYROSCOPE -> gyro = event.values.take(3).toFloatArray()
        }
    }
    private fun transmit() {
        if (!initialized) return
        try {
            val quat=q; val acc=a; val gyr=gyro
            val s=count.incrementAndGet()
            val body = """{"schema":1,"seq":$s,"timestamp_ns":$qStamp,"quat_xyzw":[${quat.joinToString(",")}],"accel_mps2":[${acc.joinToString(",")}],"gyro_rads":[${gyr.joinToString(",")}],"source":"game_rotation_vector"}"""
            val conn = (URL("http://127.0.0.1:8766/ingest").openConnection() as HttpURLConnection)
            try {
                conn.requestMethod = "POST"; conn.connectTimeout = 750; conn.readTimeout = 750
                conn.doOutput = true; conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                conn.inputStream.use { it.readBytes() }
            } finally { conn.disconnect() }
        } catch (_: Exception) { /* Receiver offline; retry on next tick. */ }
    }
    override fun onDestroy() {
        sensors.unregisterListener(this)
        sender.shutdownNow()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }
}
