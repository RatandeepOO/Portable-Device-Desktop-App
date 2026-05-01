package com.emergency.portable.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * HTTP client for REST API calls to the backend server.
 */
class ApiClient(private var baseUrl: String) {

    companion object {
        private const val TAG = "ApiClient"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    fun updateBaseUrl(url: String) {
        baseUrl = url.trimEnd('/')
    }

    /**
     * Update team profile on the server.
     */
    fun updateProfile(
        userId: String,
        name: String,
        phone: String,
        imageUrl: String = "",
        callback: (success: Boolean, error: String?) -> Unit
    ) {
        val body = JsonObject().apply {
            addProperty("name", name)
            addProperty("phone", phone)
            if (imageUrl.isNotBlank()) {
                addProperty("image_url", imageUrl)
            }
        }

        val request = Request.Builder()
            .url("$baseUrl/api/teams/$userId")
            .put(RequestBody.create(jsonMediaType, gson.toJson(body)))
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Update profile failed", e)
                callback(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        callback(true, null)
                    } else {
                        callback(false, "Server returned ${it.code}")
                    }
                }
            }
        })
    }

    /**
     * Upload an image file to the server.
     */
    fun uploadImage(
        file: File,
        callback: (imageUrl: String?, error: String?) -> Unit
    ) {
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "image",
                file.name,
                file.asRequestBody("image/*".toMediaType())
            )
            .build()

        val request = Request.Builder()
            .url("$baseUrl/api/upload")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Upload failed", e)
                callback(null, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        val json = gson.fromJson(it.body?.string(), JsonObject::class.java)
                        val url = json?.get("url")?.asString
                        callback(url, null)
                    } else {
                        callback(null, "Upload failed: ${it.code}")
                    }
                }
            }
        })
    }

    /**
     * Test connection to the server.
     */
    fun testConnection(callback: (success: Boolean) -> Unit) {
        val request = Request.Builder()
            .url("$baseUrl/api/teams")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use { callback(it.isSuccessful) }
            }
        })
    }
}
