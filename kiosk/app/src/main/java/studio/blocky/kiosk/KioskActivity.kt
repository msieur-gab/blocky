package studio.blocky.kiosk

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
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
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
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

    // Load-failure fallback: one retry from the HTTP cache, then a quiet page.
    private var triedCache = false
    private var mainFrameFailed = false
    private val retryLoad = Runnable { loadCurrentUrl() }

    // Web permissions go only to the origin blocky was loaded from.
    private var trustedOrigin: String? = null
    private var awaitingLanding = false
    private var pendingWebPermission: PermissionRequest? = null
    private var permissionDialogActive = false

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

    override fun onDestroy() {
        cornerHandler.removeCallbacks(retryLoad)
        super.onDestroy()
    }

    private fun loadCurrentUrl() {
        cornerHandler.removeCallbacks(retryLoad)
        loadedUrl = config.getUrl()
        trustedOrigin = originOf(loadedUrl)
        awaitingLanding = true
        triedCache = false
        webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
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
            permissionDialogActive = true
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), PERM_REQ)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        permissionDialogActive = false
        pendingWebPermission?.let { resolveWebPermission(it) }
        pendingWebPermission = null
    }

    // Grant the page only camera/mic, only on the trusted origin, and only once
    // the matching Android permission is held. Until then the web request stays
    // pending, so getUserMedia waits for the operator's answer instead of failing.
    private fun handleWebPermission(request: PermissionRequest) {
        val origin = originOf(request.origin?.toString())
        if (origin == null || origin != trustedOrigin) {
            Log.w(TAG, "web permission denied: origin $origin is not $trustedOrigin")
            request.deny()
            return
        }
        val needed = androidPermissionsFor(request)
        if (needed.isEmpty()) {
            Log.w(TAG, "web permission denied: ${request.resources.joinToString()}")
            request.deny()
            return
        }
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            resolveWebPermission(request)
            return
        }
        pendingWebPermission?.deny()
        pendingWebPermission = request
        if (!permissionDialogActive) {
            permissionDialogActive = true
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), PERM_REQ)
        }
    }

    private fun resolveWebPermission(request: PermissionRequest) {
        val granted = request.resources.filter { res ->
            WEB_TO_ANDROID[res]?.let {
                ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
            } == true
        }
        if (granted.isEmpty()) {
            Log.w(TAG, "web permission denied: Android permission not held")
            request.deny()
        } else {
            request.grant(granted.toTypedArray())
        }
    }

    private fun androidPermissionsFor(request: PermissionRequest): List<String> =
        request.resources.mapNotNull { WEB_TO_ANDROID[it] }

    private fun originOf(url: String?): String? {
        val uri = Uri.parse(url ?: return null)
        val scheme = uri.scheme ?: return null
        if (scheme == "file") return "file"
        val host = uri.host ?: return null
        val port = if (uri.port != -1) uri.port else if (scheme == "https") 443 else 80
        return "$scheme://$host:$port"
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
        wv.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                mainFrameFailed = false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                if (mainFrameFailed || url == null || url.startsWith("about:")) return
                // The cache mode exists only to get blocky up without a network.
                // Back to normal once a page is really up.
                wv.settings.cacheMode = WebSettings.LOAD_DEFAULT
                if (awaitingLanding) {
                    // The configured URL may redirect (http -> https); trust where it landed.
                    awaitingLanding = false
                    originOf(url)?.let { trustedOrigin = it }
                }
            }

            override fun onReceivedError(
                view: WebView?, request: WebResourceRequest?, error: WebResourceError?
            ) {
                if (request?.isForMainFrame != true) return
                mainFrameFailed = true
                Log.w(TAG, "main-frame load failed: ${request.url} code=${error?.errorCode} ${error?.description}")
                if (!triedCache) {
                    // First failure of a live load: retry once from the HTTP cache.
                    triedCache = true
                    wv.settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
                    wv.loadUrl(loadedUrl)
                    return
                }
                // Nothing cached either: show a quiet screen instead of the browser's
                // error page, and try the network again shortly.
                wv.loadDataWithBaseURL(null, QUIET_PAGE, "text/html", "utf-8", null)
                cornerHandler.removeCallbacks(retryLoad)
                cornerHandler.postDelayed(retryLoad, RETRY_MS)
            }
        }
        wv.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { handleWebPermission(request) }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                if (pendingWebPermission === request) pendingWebPermission = null
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
        private const val TAG = "BlockyKiosk"
        private const val RETRY_MS = 15_000L
        private const val QUIET_PAGE =
            "<html><body style=\"margin:0;background:#000\"></body></html>"
        private val WEB_TO_ANDROID = mapOf(
            PermissionRequest.RESOURCE_VIDEO_CAPTURE to Manifest.permission.CAMERA,
            PermissionRequest.RESOURCE_AUDIO_CAPTURE to Manifest.permission.RECORD_AUDIO,
        )
    }
}
