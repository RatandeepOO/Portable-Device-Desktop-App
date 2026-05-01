package com.emergency.portable

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class EmergencyApp : Application() {

    companion object {
        const val CHANNEL_ID_ALERTS = "emergency_alerts"
        const val CHANNEL_ID_LOCATION = "location_service"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val alertChannel = NotificationChannel(
                CHANNEL_ID_ALERTS,
                "Emergency Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for incoming emergency alerts"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
            }

            val locationChannel = NotificationChannel(
                CHANNEL_ID_LOCATION,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background location tracking service"
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(alertChannel)
            manager.createNotificationChannel(locationChannel)
        }
    }
}
