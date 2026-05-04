package com.example.responseteam.services

import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.responseteam.MainActivity
import com.example.responseteam.R
import com.example.responseteam.utils.PrefsManager
import com.example.responseteam.websocket.WebSocketManager
import com.google.android.gms.location.*

class LocationService : Service() {

    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var webSocketManager: WebSocketManager
    private lateinit var prefsManager: PrefsManager

    companion object {
        const val CHANNEL_ID = "LocationServiceChannel"
        const val NOTIFICATION_ID = 1
    }

    override fun onCreate() {
        super.onCreate()
        prefsManager = PrefsManager(this)
        // Use the singleton provider instead of creating a new manager
        webSocketManager = com.example.responseteam.websocket.WebSocketManagerProvider.getInstance(this)
        webSocketManager.connect()

        fusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(this)

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                val location = locationResult.lastLocation
                if (location != null) {
                    Log.d("LocationService", "Location: ${location.latitude}, ${location.longitude}")
                    webSocketManager.sendLocation(location.latitude, location.longitude)
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Emergency Response Tracking")
            .setContentText("Sending live location to command center...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        startLocationUpdates()

        return START_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        // Request location updates every 10 seconds as per user request (5-10s range)
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L)
            .setMinUpdateIntervalMillis(5000L)
            .build()

        fusedLocationProviderClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Location Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationProviderClient.removeLocationUpdates(locationCallback)
        webSocketManager.disconnect()
    }
}
