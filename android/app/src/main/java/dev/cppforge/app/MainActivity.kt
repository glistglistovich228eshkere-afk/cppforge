package dev.cppforge.app

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val VERSION_URL =
    "https://raw.githubusercontent.com/glistglistovich228eshkere-afk/cppforge/main/version.json"

class MainActivity : Activity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0B12"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
        }

        setContentView(web)
        web.loadUrl("file:///android_asset/index.html")

        Thread { checkForUpdate() }.start()
    }

    // Checks version.json on GitHub. If a newer APK exists, asks the user before opening the download.
    private fun checkForUpdate() {
        try {
            val conn = URL(VERSION_URL).openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            val remoteCode = json.getInt("android_versionCode")
            if (remoteCode > BuildConfig.VERSION_CODE && !isFinishing) {
                val name = json.optString("version", "new")
                val notes = json.optString("notes", "Improvements and fixes.")
                val apkUrl = json.getString("apk_url")
                runOnUiThread {
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
        } catch (_: Exception) {
            // Offline or server unreachable: stay silent and keep working.
        }
    }
}
