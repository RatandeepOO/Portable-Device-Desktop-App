package com.emergency.portable.data

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * Manages all local user preferences / settings.
 */
class PrefsManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("emergency_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_TEAM_ID = "team_id"
        private const val KEY_PASSKEY = "passkey"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_USER_IMAGE = "user_image"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_REMOTE_USER_ID = "remote_user_id"

        private const val DEFAULT_SERVER_URL = "http://192.168.29.202:8000"
    }

    var teamId: String
        get() = prefs.getString(KEY_TEAM_ID, null)
            ?: "MobileResp-${UUID.randomUUID().toString().take(8).uppercase()}".also { teamId = it }
        set(value) = prefs.edit().putString(KEY_TEAM_ID, value).apply()

    var passkey: String
        get() = prefs.getString(KEY_PASSKEY, "") ?: ""
        set(value) = prefs.edit().putString(KEY_PASSKEY, value).apply()

    var userName: String
        get() = prefs.getString(KEY_USER_NAME, "Mobile User") ?: "Mobile User"
        set(value) = prefs.edit().putString(KEY_USER_NAME, value).apply()

    var userPhone: String
        get() = prefs.getString(KEY_USER_PHONE, "") ?: ""
        set(value) = prefs.edit().putString(KEY_USER_PHONE, value).apply()

    var userImage: String
        get() = prefs.getString(KEY_USER_IMAGE, "") ?: ""
        set(value) = prefs.edit().putString(KEY_USER_IMAGE, value).apply()

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value).apply()

    var remoteUserId: String
        get() = prefs.getString(KEY_REMOTE_USER_ID, "") ?: ""
        set(value) = prefs.edit().putString(KEY_REMOTE_USER_ID, value).apply()

    val isProfileConfigured: Boolean
        get() = passkey.isNotBlank() && teamId.isNotBlank()
}
