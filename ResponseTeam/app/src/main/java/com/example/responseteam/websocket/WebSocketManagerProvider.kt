package com.example.responseteam.websocket

import android.content.Context
import com.example.responseteam.utils.PrefsManager

object WebSocketManagerProvider {
    private var instance: WebSocketManager? = null

    fun getInstance(context: Context): WebSocketManager {
        if (instance == null) {
            instance = WebSocketManager(PrefsManager(context.applicationContext))
        }
        return instance!!
    }
}
