package studio.blocky.kiosk

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class KioskActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var config: KioskConfig
    private var loadedUrl: String = ""

    private val cornerHandler = Handler(Looper.getMainLooper())
    private val openMaintenance = Runnable {
        startActivity(Intent(this, MaintenanceActivity::class.java))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        setContentView(R.layout.activity_kiosk)

        config = KioskConfig(this)
        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KioskDeviceAdminReceiver::class.java)
        ensureRuntimePermissions()
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
        webView = findViewById(R.id.webview)
        configureWebView(webView)
        loadCurrentUrl()

        if (dpm.isDeviceOwnerApp(packageName)) {
            dpm.setLockTaskPackages(adminComponent, arrayOf(packageName))
            tryStartLockTask()
        }

        findViewById<View>(R.id.corner_trigger).setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    cornerHandler.postDelayed(openMaintenance, CORNER_HOLD_MS)
                    true
                }
                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL,
                MotionEvent.ACTION_OUTSIDE -> {
                    cornerHandler.removeCallbacks(openMaintenance)
                    true
                }
                else -> true
            }
        }

        if (intent.getBooleanExtra(EXTRA_WIPE, false)) {
            wipeBlocky()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra(EXTRA_WIPE, false)) {
            wipeBlocky()
        }
    }

    override fun onResume() {
        super.onResume()
        if (dpm.isDeviceOwnerApp(packageName)) tryStartLockTask()
        if (config.getUrl() != loadedUrl) loadCurrentUrl()
    }

    private fun loadCurrentUrl() {
        loadedUrl = config.getUrl()
        webView.loadUrl(loadedUrl)
    }

    private fun ensureRuntimePermissions() {
        val perms = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        if (dpm.isDeviceOwnerApp(packageName)) {
            // Auto-grant silently — kiosk operator should never see permission dialogs.
            for (p in perms) {
                try {
                    dpm.setPermissionGrantState(
                        adminComponent, packageName, p,
                        DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                    )
                } catch (_: SecurityException) { /* ignore */ }
            }
            return
        }
        val missing = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), PERM_REQ)
        }
    }

    @Deprecated("Back button is intentionally disabled.")
    override fun onBackPressed() {
        // No-op. Back is not an exit path.
    }

    private fun tryStartLockTask() {
        try {
            startLockTask()
        } catch (_: IllegalStateException) {
            // Already in lock task or not allowed; safe to ignore.
        }
    }

    private fun configureWebView(wv: WebView) {
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            useWideViewPort = true
            loadWithOverviewMode = true
        }
        wv.webViewClient = WebViewClient()
        wv.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }

            override fun onConsoleMessage(msg: ConsoleMessage): Boolean {
                val tag = "BlockyJS"
                val line = "${msg.message()}  (${msg.sourceId()}:${msg.lineNumber()})"
                when (msg.messageLevel()) {
                    ConsoleMessage.MessageLevel.ERROR -> Log.e(tag, line)
                    ConsoleMessage.MessageLevel.WARNING -> Log.w(tag, line)
                    ConsoleMessage.MessageLevel.DEBUG -> Log.d(tag, line)
                    else -> Log.i(tag, line)
                }
                return true
            }
        }
    }

    private fun wipeBlocky() {
        webView.clearCache(true)
        webView.clearHistory()
        webView.clearFormData()
        WebStorage.getInstance().deleteAllData()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        loadCurrentUrl()
    }

    companion object {
        const val EXTRA_WIPE = "wipe"
        private const val CORNER_HOLD_MS = 5_000L
        private const val PERM_REQ = 1
    }
}
