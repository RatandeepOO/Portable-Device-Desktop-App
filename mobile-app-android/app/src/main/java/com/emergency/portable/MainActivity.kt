package com.emergency.portable

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.emergency.portable.data.PrefsManager
import com.emergency.portable.databinding.ActivityMainBinding
import com.emergency.portable.databinding.DialogProfileBinding
import com.emergency.portable.network.ApiClient
import com.emergency.portable.network.WebSocketManager
import com.emergency.portable.services.LocationService
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.gson.JsonObject

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: PrefsManager
    private lateinit var apiClient: ApiClient
    private lateinit var wsManager: WebSocketManager

    private var isAvailable = true
    private var activeAlertId: String? = null
    private var remoteTeamId: String? = null

    // ── Lifecycle ────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge dark status bar
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.statusBarColor = ContextCompat.getColor(this, R.color.black)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PrefsManager(this)
        apiClient = ApiClient(prefs.serverUrl)

        setupWebSocket()
        setupUI()
        requestPermissions()

        // Show profile dialog on first launch
        if (!prefs.isProfileConfigured) {
            showProfileDialog()
        } else {
            connectToServer()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        wsManager.disconnect()
        stopLocationService()
    }

    // ── WebSocket Setup ──────────────────────────────────────────

    private fun setupWebSocket() {
        wsManager = WebSocketManager(
            onConnected = { teamId ->
                remoteTeamId = teamId
                prefs.remoteUserId = teamId
                runOnUiThread {
                    binding.connectionDot.setBackgroundResource(R.drawable.dot_green)
                    binding.connectionStatus.text = "Connected"
                    binding.connectionStatus.setTextColor(
                        ContextCompat.getColor(this, R.color.green_400)
                    )
                    showSnackbar("Connected to command center", R.color.green_400)
                }
            },
            onNewAlert = { alertData ->
                runOnUiThread { showAlertCard(alertData) }
            },
            onAlertAccepted = { alertId, teamId ->
                Log.d(TAG, "Alert $alertId accepted by $teamId")
            },
            onAlertResolved = { alertId, teamId ->
                Log.d(TAG, "Alert $alertId resolved by $teamId")
            },
            onError = { message ->
                runOnUiThread {
                    showSnackbar("Error: $message", R.color.red_400)
                }
            },
            onDisconnected = {
                runOnUiThread {
                    binding.connectionDot.setBackgroundResource(R.drawable.dot_red)
                    binding.connectionStatus.text = "Disconnected"
                    binding.connectionStatus.setTextColor(
                        ContextCompat.getColor(this, R.color.red_400)
                    )
                }
            }
        )
    }

    private fun connectToServer() {
        if (prefs.teamId.isNotBlank() && prefs.passkey.isNotBlank()) {
            wsManager.connect(prefs.serverUrl, prefs.teamId, prefs.passkey)
            startLocationService()
        }
    }

    // ── UI Setup ─────────────────────────────────────────────────

    private fun setupUI() {
        // Top bar user info
        binding.userName.text = prefs.userName
        binding.userTeamId.text = "ID: ${prefs.teamId}"

        // Status toggle
        binding.statusSwitch.isChecked = isAvailable
        updateStatusUI()

        binding.statusSwitch.setOnCheckedChangeListener { _, isChecked ->
            isAvailable = isChecked
            updateStatusUI()
            wsManager.sendStatus(isAvailable, activeAlertId)
        }

        // Profile button
        binding.btnProfile.setOnClickListener { showProfileDialog() }

        // Empty state
        showEmptyAlerts()
    }

    private fun updateStatusUI() {
        if (isAvailable) {
            binding.statusText.text = "AVAILABLE"
            binding.statusText.setTextColor(ContextCompat.getColor(this, R.color.green_400))
            binding.statusDot.setBackgroundResource(R.drawable.dot_green)
        } else {
            binding.statusText.text = "BUSY / ON MISSION"
            binding.statusText.setTextColor(ContextCompat.getColor(this, R.color.red_400))
            binding.statusDot.setBackgroundResource(R.drawable.dot_red)
        }
    }

    // ── Alert Handling ───────────────────────────────────────────

    private fun showAlertCard(alertData: JsonObject) {
        activeAlertId = alertData.get("id")?.asString

        val lat = alertData.get("alert_lat")?.asString ?: "N/A"
        val lng = alertData.get("alert_lng")?.asString ?: "N/A"
        val status = alertData.get("status")?.asString ?: "Emergency"
        val deviceInfo = alertData.getAsJsonObject("device")
        val deviceUser = deviceInfo?.get("user_name")?.asString ?: "Unknown"

        // Vibrate
        @Suppress("DEPRECATION")
        val vibrator = getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator
        vibrator.vibrate(longArrayOf(0, 500, 200, 500), -1)

        // Show alert UI
        binding.emptyAlertsContainer.visibility = View.GONE
        binding.alertCardContainer.visibility = View.VISIBLE
        binding.missionActiveContainer.visibility = View.GONE

        binding.alertCoordinates.text = "Coordinates: $lat, $lng"
        binding.alertType.text = "Type: $status"
        binding.alertDeviceUser.text = "Person: $deviceUser"

        binding.btnAcceptAlert.setOnClickListener {
            activeAlertId?.let { id ->
                wsManager.acceptAlert(id)
                showMissionActive(id)
                isAvailable = false
                binding.statusSwitch.isChecked = false
                updateStatusUI()
            }
        }

        binding.btnDismissAlert.setOnClickListener {
            binding.alertCardContainer.visibility = View.GONE
            showEmptyAlerts()
            activeAlertId = null
        }
    }

    private fun showMissionActive(alertId: String) {
        binding.alertCardContainer.visibility = View.GONE
        binding.emptyAlertsContainer.visibility = View.GONE
        binding.missionActiveContainer.visibility = View.VISIBLE

        binding.btnResolveAlert.setOnClickListener {
            wsManager.completeAlert(alertId)
            binding.missionActiveContainer.visibility = View.GONE
            activeAlertId = null
            isAvailable = true
            binding.statusSwitch.isChecked = true
            updateStatusUI()
            showEmptyAlerts()
            showSnackbar("Mission completed! Ready for next.", R.color.green_400)
        }
    }

    private fun showEmptyAlerts() {
        binding.emptyAlertsContainer.visibility = View.VISIBLE
        binding.alertCardContainer.visibility = View.GONE
        binding.missionActiveContainer.visibility = View.GONE
    }

    // ── Profile Dialog ───────────────────────────────────────────

    private fun showProfileDialog() {
        val dialogBinding = DialogProfileBinding.inflate(layoutInflater)

        dialogBinding.editName.setText(prefs.userName)
        dialogBinding.editTeamId.setText(prefs.teamId)
        dialogBinding.editPasskey.setText(prefs.passkey)
        dialogBinding.editPhone.setText(prefs.userPhone)
        dialogBinding.editServerUrl.setText(prefs.serverUrl)

        val dialog = MaterialAlertDialogBuilder(this, R.style.Theme_EmergencyResponse_Dialog)
            .setTitle("Profile & Connection")
            .setView(dialogBinding.root)
            .setPositiveButton("Save & Connect", null) // Set to null first, override later
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            val positiveBtn = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            positiveBtn.setOnClickListener {
                val name = dialogBinding.editName.text.toString().trim()
                val teamId = dialogBinding.editTeamId.text.toString().trim()
                val passkey = dialogBinding.editPasskey.text.toString().trim()
                val phone = dialogBinding.editPhone.text.toString().trim()
                val serverUrl = dialogBinding.editServerUrl.text.toString().trim()

                // Validate
                if (teamId.isBlank()) {
                    dialogBinding.editTeamId.error = "Required"
                    return@setOnClickListener
                }
                if (passkey.isBlank()) {
                    dialogBinding.editPasskey.error = "Required"
                    return@setOnClickListener
                }
                if (serverUrl.isBlank()) {
                    dialogBinding.editServerUrl.error = "Required"
                    return@setOnClickListener
                }

                // Save
                prefs.userName = name
                prefs.teamId = teamId
                prefs.passkey = passkey
                prefs.userPhone = phone
                prefs.serverUrl = serverUrl

                // Update UI
                binding.userName.text = name
                binding.userTeamId.text = "ID: $teamId"

                // Reconnect
                apiClient.updateBaseUrl(serverUrl)
                wsManager.disconnect()
                connectToServer()

                dialog.dismiss()
            }
        }

        dialog.show()
    }

    // ── Location Service ─────────────────────────────────────────

    private fun startLocationService() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val intent = Intent(this, LocationService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        // Bind to get location callbacks
        bindService(intent, locationServiceConnection, BIND_AUTO_CREATE)
    }

    private fun stopLocationService() {
        try {
            unbindService(locationServiceConnection)
        } catch (_: Exception) { }
        stopService(Intent(this, LocationService::class.java))
    }

    private val locationServiceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            // LocationService uses onLocationUpdate callback set via static/global reference
            // For simplicity, we use a broadcast or direct reference approach
            Log.d(TAG, "Location service bound")
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            Log.d(TAG, "Location service unbound")
        }
    }

    // ── Permissions ──────────────────────────────────────────────

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (!locationGranted) {
            showSnackbar("Location permission required for tracking", R.color.amber_400)
        }
    }

    private fun requestPermissions() {
        val permissionsNeeded = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        permissionLauncher.launch(permissionsNeeded.toTypedArray())
    }

    // ── Helpers ───────────────────────────────────────────────────

    private fun showSnackbar(message: String, colorRes: Int) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT)
            .setBackgroundTint(ContextCompat.getColor(this, colorRes))
            .setTextColor(ContextCompat.getColor(this, R.color.white))
            .show()
    }
}
