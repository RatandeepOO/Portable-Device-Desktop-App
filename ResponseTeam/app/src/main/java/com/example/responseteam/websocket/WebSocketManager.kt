package com.example.responseteam.websocket

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.example.responseteam.utils.PrefsManager
import com.google.gson.Gson
import okhttp3.*
import java.util.concurrent.TimeUnit

class WebSocketManager(private val prefs: PrefsManager) {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()
    
    private var webSocket: WebSocket? = null
    private val gson = Gson()
    private val handler = Handler(Looper.getMainLooper())
    private var isConnecting = false
    private var isConnected = false
    
    private val reconnectRunnable = object : Runnable {
        override fun run() {
            if (!isConnected) {
                Log.d("WebSocket", "Auto-reconnect timer triggered")
                connect()
            }
            handler.postDelayed(this, 15000)
        }
    }
    
    interface WebSocketListener {
        fun onMessageReceived(message: String)
        fun onStatusChanged(connected: Boolean)
    }
    
    private var listener: WebSocketListener? = null
    
    fun setListener(listener: WebSocketListener) {
        this.listener = listener
        // Start reconnection loop when listener is attached
        handler.removeCallbacks(reconnectRunnable)
        handler.post(reconnectRunnable)
    }

    @Synchronized
    fun connect() {
        if (isConnected || isConnecting) return
        isConnecting = true

        // Hardcoded URL as per user request
        val finalUrl = "wss://fractious-subimbricately-ivey.ngrok-free.dev/ws/team/${prefs.teamId}"
        
        Log.d("WebSocket", "Attempting connection to: $finalUrl")
        
        val request = Request.Builder()
            .url(finalUrl)
            .build()
        
        webSocket = client.newWebSocket(request, object : okhttp3.WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("WebSocket", "Connected Successfully to $finalUrl")
                isConnecting = false
                isConnected = true
                listener?.onStatusChanged(true)
                login()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d("WebSocket", "Message received: $text")
                listener?.onMessageReceived(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("WebSocket", "Closing: $code / $reason")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("WebSocket", "Closed: $code / $reason")
                isConnecting = false
                isConnected = false
                listener?.onStatusChanged(false)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                val errorMsg = response?.let { "HTTP ${it.code} ${it.message}" } ?: t.message
                Log.e("WebSocket", "Connection Failed: $errorMsg")
                isConnecting = false
                isConnected = false
                listener?.onStatusChanged(false)
            }
        })
    }

    private fun login() {
        val message = mapOf(
            "type" to "team:login",
            "teamId" to prefs.teamId,
            "passkey" to prefs.passkey
        )
        sendMessage(gson.toJson(message))
    }

    fun sendLocation(lat: Double, lng: Double) {
        val message = mapOf(
            "type" to "team:location",
            "lat" to lat,
            "lng" to lng
        )
        sendMessage(gson.toJson(message))
    }

    fun sendStatus(available: Boolean, currentAlertId: String? = null) {
        val message = mutableMapOf<String, Any>(
            "type" to "team:status",
            "available" to available
        )
        currentAlertId?.let { message["currentAlertId"] = it }
        sendMessage(gson.toJson(message))
    }

    fun acceptAlert(alertId: String) {
        val message = mapOf(
            "type" to "alert:accept",
            "alertId" to alertId
        )
        sendMessage(gson.toJson(message))
    }

    fun completeAlert(alertId: String) {
        val message = mapOf(
            "type" to "alert:complete",
            "alertId" to alertId
        )
        sendMessage(gson.toJson(message))
    }

    fun forwardAlert(alertId: String) {
        val message = mapOf(
            "type" to "alert:forward",
            "alertId" to alertId
        )
        sendMessage(gson.toJson(message))
    }

    private fun sendMessage(message: String) {
        val sent = webSocket?.send(message) ?: false
        if (!sent) {
            Log.w("WebSocket", "Message failed to send (WS null or closed): $message")
        }
    }

    fun disconnect() {
        webSocket?.close(1000, "App closed")
    }
}
