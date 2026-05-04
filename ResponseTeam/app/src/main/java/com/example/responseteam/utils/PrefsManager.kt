package com.example.responseteam.utils

import android.content.Context
import android.content.SharedPreferences
import java.security.MessageDigest
import java.util.UUID

class PrefsManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("response_team_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_TEAM_ID = "team_id"
        private const val KEY_PASSKEY_RAW = "passkey_raw"
        private const val KEY_PASSKEY_HASH = "passkey_hash"
        private const val KEY_IS_AVAILABLE = "is_available"
        private const val KEY_LOCKED = "settings_locked"
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "https://fractious-subimbricately-ivey.ngrok-free.dev") ?: ""
        set(value) = if (!isLocked) prefs.edit().putString(KEY_SERVER_URL, value).apply() else Unit

    var teamId: String
        get() {
            var id = prefs.getString(KEY_TEAM_ID, null)
            if (id == null) {
                id = "MobileResp-${UUID.randomUUID().toString().take(6).uppercase()}"
                prefs.edit().putString(KEY_TEAM_ID, id).apply()
            }
            return id
        }
        set(value) = if (!isLocked) prefs.edit().putString(KEY_TEAM_ID, value).apply() else Unit

    var passkey: String
        get() = prefs.getString(KEY_PASSKEY_RAW, "") ?: ""
        set(value) {
            if (!isLocked) {
                val hash = sha256(value)
                prefs.edit()
                    .putString(KEY_PASSKEY_RAW, value)
                    .putString(KEY_PASSKEY_HASH, hash)
                    .apply()
            }
        }

    var isAvailable: Boolean
        get() = prefs.getBoolean(KEY_IS_AVAILABLE, true)
        set(value) = prefs.edit().putBoolean(KEY_IS_AVAILABLE, value).apply()

    var isLocked: Boolean
        get() = prefs.getBoolean(KEY_LOCKED, false)
        set(value) = prefs.edit().putBoolean(KEY_LOCKED, value).apply()

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
