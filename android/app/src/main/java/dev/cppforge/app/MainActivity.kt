package dev.cppforge.app

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

private const val VERSION_URL =
    "https://raw.githubusercontent.com/glistglistovich228eshkere-afk/cppforge/main/version.json"
private const val DEVICE_URL = "https://oauth2.googleapis.com/device/code"
private const val TOKEN_URL = "https://oauth2.googleapis.com/token"
private const val USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

class MainActivity : Activity() {

    private lateinit var web: WebView
    private val prefs by lazy { getSharedPreferences("cppforge", MODE_PRIVATE) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0B12"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(Bridge(), "AndroidBridge")
        }

        setContentView(web)
        web.loadUrl("file:///android_asset/index.html")
        Thread { checkForUpdate(manual = false) }.start()
    }

    // Exposed to the page as window.AndroidBridge
    inner class Bridge {
        @JavascriptInterface
        fun signIn() {
            Thread { signInFlow() }.start()
        }

        @JavascriptInterface
        fun signOut() {
            prefs.edit().clear().apply()
            pushAccount(null)
        }

        @JavascriptInterface
        fun checkUpdate() {
            Thread { checkForUpdate(manual = true) }.start()
        }

        @JavascriptInterface
        fun getVersion(): String = BuildConfig.VERSION_NAME
    }

    // Google device sign-in: show a code, the user approves it on google.com/device, we poll for tokens.
    private fun signInFlow() {
        val clientId = BuildConfig.GOOGLE_CLIENT_ID
        val secret = BuildConfig.GOOGLE_CLIENT_SECRET
        if (clientId.isEmpty() || secret.isEmpty()) {
            return pushError("Google sign-in isn't set up in this build yet.")
        }
        try {
            val dev = postForm(DEVICE_URL, mapOf("client_id" to clientId, "scope" to "openid email profile"))
            if (dev.has("error")) {
                return pushError(dev.optString("error_description", dev.optString("error")))
            }
            pushAccount(
                JSONObject().put("status", "waiting")
                    .put("code", dev.getString("user_code"))
                    .put("url", dev.getString("verification_url"))
            )

            val deviceCode = dev.getString("device_code")
            var intervalMs = dev.optLong("interval", 5) * 1000
            val deadline = System.currentTimeMillis() + dev.optLong("expires_in", 1800) * 1000

            while (System.currentTimeMillis() < deadline) {
                Thread.sleep(intervalMs)
                val tok = postForm(
                    TOKEN_URL,
                    mapOf(
                        "client_id" to clientId,
                        "client_secret" to secret,
                        "device_code" to deviceCode,
                        "grant_type" to "urn:ietf:params:oauth:grant-type:device_code"
                    )
                )
                if (tok.has("access_token")) {
                    val info = getJson(USERINFO_URL, tok.getString("access_token"))
                    prefs.edit()
                        .putString("name", info.optString("name"))
                        .putString("email", info.optString("email"))
                        .putString("refresh_token", tok.optString("refresh_token"))
                        .apply()
                    return pushAccount(null)
                }
                when (tok.optString("error")) {
                    "authorization_pending" -> {}
                    "slow_down" -> intervalMs += 5000
                    else -> return pushError(tok.optString("error_description", "Sign-in failed."))
                }
            }
            pushError("Sign-in timed out. Try again.")
        } catch (e: Exception) {
            pushError(e.message ?: "Network error during sign-in.")
        }
    }

    private fun pushAccount(override: JSONObject?) {
        val state = override ?: JSONObject().apply {
            val name = prefs.getString("name", null)
            if (name != null) {
                put("name", name)
                put("email", prefs.getString("email", ""))
            }
        }
        runOnUiThread { web.evaluateJavascript("window.setAccount(" + state.toString() + ")", null) }
    }

    private fun pushError(message: String) {
        pushAccount(JSONObject().put("status", "error").put("message", message))
    }

    private fun postForm(url: String, params: Map<String, String>): JSONObject {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
        val body = params.entries.joinToString("&") {
            URLEncoder.encode(it.key, "UTF-8") + "=" + URLEncoder.encode(it.value, "UTF-8")
        }
        conn.outputStream.use { it.write(body.toByteArray()) }
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return JSONObject(stream.bufferedReader().use { it.readText() })
    }

    private fun getJson(url: String, token: String? = null): JSONObject {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 6000
        conn.readTimeout = 6000
        if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
        return JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
    }

    private fun toast(message: String) {
        runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
    }

    // Checks version.json on GitHub. Auto checks stay quiet; manual checks always report a result.
    private fun checkForUpdate(manual: Boolean) {
        try {
            val json = getJson(VERSION_URL)
            val remoteCode = json.getInt("android_versionCode")
            if (remoteCode > BuildConfig.VERSION_CODE) {
                val name = json.optString("version", "new")
                val notes = json.optString("notes", "Improvements and fixes.")
                val apkUrl = json.getString("apk_url")
                runOnUiThread {
                    if (!isFinishing) {
                        AlertDialog.Builder(this)
                            .setTitle("Update available: $name")
                            .setMessage(notes)
                            .setPositiveButton("Download") { _, _ ->
                                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl)))
                            }
                            .setNegativeButton("Later", null)
                            .show()
                    }
                }
            } else if (manual) {
                toast("You're on the latest version (${BuildConfig.VERSION_NAME}).")
            }
        } catch (_: Exception) {
            if (manual) toast("Couldn't check for updates. Check your connection.")
        }
    }
}
