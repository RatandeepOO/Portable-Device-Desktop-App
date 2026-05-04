package com.example.responseteam

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.example.responseteam.services.LocationService
import com.example.responseteam.ui.theme.ResponseTeamTheme
import com.example.responseteam.utils.PrefsManager
import com.example.responseteam.websocket.WebSocketManager
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken

data class Alert(
    val id: String,
    val status: Int,
    @SerializedName("alert_lat") val alertLat: Double,
    @SerializedName("alert_lng") val alertLng: Double,
    @SerializedName("created_at") val createdAt: String,
    val device: DeviceInfo? = null,
    var localStatus: String = "NEW"
)

data class DeviceInfo(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("user_name") val userName: String,
    @SerializedName("emergency_contact_name") val emergencyContactName: String,
    @SerializedName("emergency_contact_phone") val emergencyContactPhone: String
)

class MainActivity : ComponentActivity(), WebSocketManager.WebSocketListener {
    private lateinit var prefs: PrefsManager
    private lateinit var webSocketManager: WebSocketManager
    private var activeAlerts = mutableStateListOf<Alert>()
    private var completedAlerts = mutableStateListOf<Alert>()
    private var forwardedAlerts = mutableStateListOf<Alert>()
    
    private var isConnected = mutableStateOf(false)
    private var showSettings = mutableStateOf(false)
    private var selectedTabIndex = mutableIntStateOf(0)

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            startLocationService()
        } else {
            Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = PrefsManager(this)
        webSocketManager = com.example.responseteam.websocket.WebSocketManagerProvider.getInstance(this)
        webSocketManager.setListener(this)

        checkPermissions()

        setContent {
            ResponseTeamTheme {
                MainScreen()
            }
        }
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }

        if (allGranted) {
            startLocationService()
        } else {
            requestPermissionLauncher.launch(permissions.toTypedArray())
        }
    }

    private fun startLocationService() {
        val intent = Intent(this, LocationService::class.java)
        startForegroundService(intent)
        webSocketManager.connect()
    }

    override fun onMessageReceived(message: String) {
        val gson = Gson()
        try {
            Log.d("WebSocket", "Processing message: $message")
            val msgMap: Map<String, Any> = gson.fromJson(message, object : TypeToken<Map<String, Any>>() {}.type)
            if (msgMap["type"] == "alert:new") {
                val dataObj = msgMap["data"]
                if (dataObj != null) {
                    val incomingAlert = gson.fromJson(gson.toJson(dataObj), Alert::class.java)
                    
                    runOnUiThread {
                        val existingIndex = activeAlerts.indexOfFirst { it.id == incomingAlert.id }
                        if (existingIndex != -1) {
                            val existingAlert = activeAlerts[existingIndex]
                            incomingAlert.localStatus = existingAlert.localStatus
                            activeAlerts[existingIndex] = incomingAlert
                        } else {
                            // Check if it's already in completed or forwarded to avoid duplicates
                            val isHandled = completedAlerts.any { it.id == incomingAlert.id } || 
                                          forwardedAlerts.any { it.id == incomingAlert.id }
                            
                            if (!isHandled) {
                                incomingAlert.localStatus = "NEW"
                                activeAlerts.add(0, incomingAlert)
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("WebSocket", "Error parsing message: ${e.message}")
            e.printStackTrace()
        }
    }

    override fun onStatusChanged(connected: Boolean) {
        runOnUiThread { isConnected.value = connected }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun MainScreen() {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Emergency Response") },
                    actions = {
                        IconButton(onClick = { showSettings.value = true }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings")
                        }
                    }
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                StatusCard()
                Spacer(modifier = Modifier.height(16.dp))
                
                TabRow(selectedTabIndex = selectedTabIndex.intValue) {
                    Tab(
                        selected = selectedTabIndex.intValue == 0,
                        onClick = { selectedTabIndex.intValue = 0 },
                        text = { Text("Active") }
                    )
                    Tab(
                        selected = selectedTabIndex.intValue == 1,
                        onClick = { selectedTabIndex.intValue = 1 },
                        text = { Text("Completed") }
                    )
                    Tab(
                        selected = selectedTabIndex.intValue == 2,
                        onClick = { selectedTabIndex.intValue = 2 },
                        text = { Text("Forwarded") }
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                when (selectedTabIndex.intValue) {
                    0 -> AlertList(activeAlerts)
                    1 -> AlertList(completedAlerts)
                    2 -> AlertList(forwardedAlerts)
                }
            }

            if (showSettings.value) {
                SettingsDialog()
            }
        }
    }

    @Composable
    fun StatusCard() {
        var isAvailable by remember { mutableStateOf(prefs.isAvailable) }
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (isConnected.value) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
            )
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .padding(2.dp)
                    ) // Placeholder for dot
                    Text(
                        if (isConnected.value) "Connected - ${prefs.teamId}" else "Disconnected",
                        fontWeight = FontWeight.Medium,
                        color = Color.Black
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "My Status: ${if (isAvailable) "AVAILABLE" else "BUSY"}",
                        color = Color.Black
                    )
                    Switch(
                        checked = isAvailable,
                        onCheckedChange = {
                            isAvailable = it
                            prefs.isAvailable = it
                            webSocketManager.sendStatus(it)
                        }
                    )
                }
            }
        }
    }

    @Composable
    fun AlertList(alertsToDisplay: List<Alert>) {
        if (alertsToDisplay.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No alerts found", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(alertsToDisplay, key = { it.id }) { alert ->
                    AlertItem(alert)
                }
            }
        }
    }

    @Composable
    fun AlertItem(alert: Alert) {
        var alertStatus by remember(alert.id) { mutableStateOf(alert.localStatus) }
        
        val severityText = when(alert.status) {
            1 -> "Minor"
            2 -> "Moderate"
            3 -> "EMERGENCY"
            else -> "Unknown"
        }
        
        val context = androidx.compose.ui.platform.LocalContext.current

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Alert: $severityText", fontWeight = FontWeight.Bold, color = if(alert.status == 3) Color.Red else Color.Black)
                Text("Device: ${alert.device?.deviceId ?: "Unknown"}", fontWeight = FontWeight.Medium)
                Text("User: ${alert.device?.userName ?: "N/A"}", fontSize = 14.sp)
                Text("Location: ${alert.alertLat}, ${alert.alertLng}", fontSize = 14.sp)
                Text("Time: ${alert.createdAt}", fontSize = 12.sp, color = Color.Gray)
                
                if (alert.device != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Contact: ${alert.device.emergencyContactName} (${alert.device.emergencyContactPhone})", 
                        fontSize = 12.sp, color = Color.DarkGray)
                }

                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = {
                            val uri = "geo:${alert.alertLat},${alert.alertLng}?q=${alert.alertLat},${alert.alertLng}(Alert)"
                            val intent = Intent(Intent.ACTION_VIEW, uri.toUri())
                            intent.setPackage("com.google.android.apps.maps")
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("View Map", fontSize = 12.sp)
                    }

                    when (alertStatus) {
                        "NEW" -> {
                            Button(
                                onClick = {
                                    webSocketManager.acceptAlert(alert.id)
                                    alertStatus = "ACCEPTED"
                                    alert.localStatus = "ACCEPTED"
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Accept")
                            }
                            OutlinedButton(
                                onClick = {
                                    webSocketManager.forwardAlert(alert.id)
                                    alert.localStatus = "FORWARDED"
                                    activeAlerts.remove(alert)
                                    forwardedAlerts.add(0, alert)
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Forward", color = Color.Gray)
                            }
                        }
                        "ACCEPTED" -> {
                            Button(
                                onClick = {
                                    webSocketManager.completeAlert(alert.id)
                                    alertStatus = "COMPLETED"
                                    alert.localStatus = "COMPLETED"
                                    activeAlerts.remove(alert)
                                    completedAlerts.add(0, alert)
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Complete")
                            }
                        }
                        "COMPLETED" -> {
                            Text(
                                "COMPLETED",
                                color = Color.Green,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                        "FORWARDED" -> {
                            Text(
                                "FORWARDED",
                                color = Color.Gray,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    @Composable
    fun SettingsDialog() {
        var pass by remember { mutableStateOf(prefs.passkey) }
        var team by remember { mutableStateOf(prefs.teamId) }
        var updateKeyInput by remember { mutableStateOf("") }
        var isEditingAllowed by remember { mutableStateOf(!prefs.isLocked) }
        var errorMessage by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showSettings.value = false },
            title = { Text("Settings") },
            text = {
                Column {
                    if (prefs.isLocked && !isEditingAllowed) {
                        Text("Settings are locked.", color = Color.Red, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = updateKeyInput,
                            onValueChange = { updateKeyInput = it },
                            label = { Text("Enter Update Key to unlock") },
                            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation()
                        )
                        Button(
                            onClick = {
                                if (updateKeyInput == "update_safe") {
                                    isEditingAllowed = true
                                    errorMessage = ""
                                } else {
                                    errorMessage = "Invalid Update Key"
                                }
                            },
                            modifier = Modifier.padding(top = 8.dp)
                        ) {
                            Text("Unlock")
                        }
                    } else if (!prefs.isLocked) {
                        Text("First-time setup. Details will lock after saving.", color = Color.Blue, fontSize = 12.sp)
                    } else {
                        Text("Settings Unlocked", color = Color.Green, fontSize = 12.sp)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = team,
                        onValueChange = { team = it },
                        label = { Text("Team ID") },
                        enabled = isEditingAllowed
                    )
                    OutlinedTextField(
                        value = pass,
                        onValueChange = { pass = it },
                        label = { Text("Passkey") },
                        enabled = isEditingAllowed,
                        visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation()
                    )
                    
                    if (errorMessage.isNotEmpty()) {
                        Text(errorMessage, color = Color.Red, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            },
            confirmButton = {
                if (isEditingAllowed) {
                    TextButton(onClick = {
                        prefs.isLocked = false // Unlock to allow setter to work
                        prefs.passkey = pass
                        prefs.teamId = team
                        prefs.isLocked = true // Lock it back
                        showSettings.value = false
                        webSocketManager.disconnect()
                        webSocketManager.connect()
                    }) {
                        Text("Save & Reconnect")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettings.value = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        webSocketManager.disconnect()
    }
}
