package com.emergency.portable.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.*
import java.util.concurrent.TimeUnit

/**
 * Manages WebSocket connection to the backend server.
 * Handles login, location updates, status changes, and alert responses.
 */
class WebSocketManager(
    private val onConnected: (teamId: String) -> Unit,
    private val onNewAlert: (alertData: JsonObject) -> Unit,
    private val onAlertAccepted: (alertId: String, teamId: String) -> Unit,
    private val onAlertResolved: (alertId: String, teamId: String) -> Unit,
    private val onError: (message: String) -> Unit,
    private val onDisconnected: () -> Unit
) {
    companion object {
        private const val TAG = "WebSocketManager"
        private const val RECONNECT_DELAY_MS = 5000L
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS) // No timeout for WS
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private var webSocket: WebSocket? = null
    private var isConnecting = false
    private var shouldReconnect = true

    private var serverUrl = ""
    private var teamId = ""
    private var passkey = ""

    /**
     * Connect to the WebSocket server and authenticate.
     */
    fun connect(serverUrl: String, teamId: String, passkey: String) {
        this.serverUrl = serverUrl
        this.teamId = teamId
        this.passkey = passkey
        this.shouldReconnect = true

        doConnect()
    }

    private fun doConnect() {
        if (isConnecting) return
        isConnecting = true

        // Convert http(s) to ws(s)
        val wsUrl = serverUrl
            .replace("https://", "wss://")
            .replace("http://", "ws://")

        Log.d(TAG, "Connecting to WebSocket: $wsUrl")

        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {

            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
                isConnecting = false

                // Send login message
                val loginMsg = JsonObject().apply {
                    addProperty("type", "team:login")
                    addProperty("teamId", teamId)
                    addProperty("passkey", passkey)
                }
                webSocket.send(gson.toJson(loginMsg))
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "WS Message: $text")
                try {
                    val data = gson.fromJson(text, JsonObject::class.java)
                    when (data.get("type")?.asString) {
                        "connected" -> {
                            val connectedTeamId = data.get("teamId")?.asString ?: ""
                            onConnected(connectedTeamId)
                        }
                        "alert:new" -> {
                            val alertData = data.getAsJsonObject("data")
                            if (alertData != null) {
                                onNewAlert(alertData)
                            }
                        }
                        "alert:accepted" -> {
                            val inner = data.getAsJsonObject("data")
                            val alertId = inner?.get("alertId")?.asString ?: ""
                            val tid = inner?.get("teamId")?.asString ?: ""
                            onAlertAccepted(alertId, tid)
                        }
                        "alert:resolved" -> {
                            val inner = data.getAsJsonObject("data")
                            val alertId = inner?.get("alertId")?.asString ?: ""
                            val tid = inner?.get("teamId")?.asString ?: ""
                            onAlertResolved(alertId, tid)
                        }
                        "error" -> {
                            val msg = data.get("message")?.asString ?: "Unknown error"
                            onError(msg)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing WS message", e)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket failure: ${t.message}")
                isConnecting = false
                onDisconnected()

                if (shouldReconnect) {
                    Log.d(TAG, "Reconnecting in ${RECONNECT_DELAY_MS}ms...")
                    Thread.sleep(RECONNECT_DELAY_MS)
                    doConnect()
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closing: $reason")
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $reason")
                isConnecting = false
                onDisconnected()

                if (shouldReconnect) {
                    Thread.sleep(RECONNECT_DELAY_MS)
                    doConnect()
                }
            }
        })
    }

    /**
     * Send GPS coordinates to the server.
     */
    fun sendLocation(lat: Double, lng: Double) {
        val msg = JsonObject().apply {
            addProperty("type", "team:location")
            addProperty("lat", lat)
            addProperty("lng", lng)
        }
        webSocket?.send(gson.toJson(msg))
    }

    /**
     * Send availability status to the server.
     */
    fun sendStatus(available: Boolean, currentAlertId: String? = null) {
        val msg = JsonObject().apply {
            addProperty("type", "team:status")
            addProperty("available", available)
            if (currentAlertId != null) {
                addProperty("currentAlertId", currentAlertId)
            }
        }
        webSocket?.send(gson.toJson(msg))
    }

    /**
     * Accept an incoming emergency alert.
     */
    fun acceptAlert(alertId: String) {
        val msg = JsonObject().apply {
            addProperty("type", "alert:accept")
            addProperty("alertId", alertId)
        }
        webSocket?.send(gson.toJson(msg))
    }

    /**
     * Mark an alert as completed/resolved.
     */
    fun completeAlert(alertId: String) {
        val msg = JsonObject().apply {
            addProperty("type", "alert:complete")
            addProperty("alertId", alertId)
        }
        webSocket?.send(gson.toJson(msg))
    }

    /**
     * Disconnect cleanly.
     */
    fun disconnect() {
        shouldReconnect = false
        webSocket?.close(1000, "User disconnected")
        webSocket = null
    }

    val isConnected: Boolean
        get() = webSocket != null && !isConnecting
}
