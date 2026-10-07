package studio.blocky.kiosk

import android.content.Context

class KioskConfig(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    fun getUrl(): String = prefs.getString(KEY_URL, DEFAULT_URL) ?: DEFAULT_URL

    fun setUrl(url: String) {
        prefs.edit().putString(KEY_URL, url).apply()
    }

    companion object {
        const val DEFAULT_URL = "http://soniq.local"
        private const val FILE_NAME = "kiosk_config"
        private const val KEY_URL = "url"

        fun isValidUrl(s: String): Boolean {
            val t = s.trim()
            if (t.contains(' ')) return false
            return t.startsWith("http://") ||
                t.startsWith("https://") ||
                t.startsWith("file://")
        }
    }
}
