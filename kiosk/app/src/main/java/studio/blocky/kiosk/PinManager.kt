package studio.blocky.kiosk

import android.content.Context
import android.os.SystemClock
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class PinManager(context: Context) {

    private val prefs = EncryptedSharedPreferences.create(
        FILE_NAME,
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun isPinSet(): Boolean =
        prefs.contains(KEY_HASH) && prefs.contains(KEY_SALT)

    fun setPin(pin: String) {
        require(pin.length == PIN_LENGTH) { "PIN must be $PIN_LENGTH digits" }
        val salt = ByteArray(SALT_BYTES).also { SecureRandom().nextBytes(it) }
        val hash = derive(pin, salt)
        prefs.edit()
            .putString(KEY_SALT, salt.b64())
            .putString(KEY_HASH, hash.b64())
            .remove(KEY_FAIL_COUNT)
            .remove(KEY_LOCKOUT_UNTIL)
            .apply()
    }

    fun verify(pin: String): Boolean {
        if (lockoutRemainingMs() > 0) return false
        val salt = prefs.getString(KEY_SALT, null)?.fromB64() ?: return false
        val expected = prefs.getString(KEY_HASH, null)?.fromB64() ?: return false
        val actual = derive(pin, salt)
        val ok = constantTimeEquals(expected, actual)
        if (ok) {
            prefs.edit().remove(KEY_FAIL_COUNT).remove(KEY_LOCKOUT_UNTIL).apply()
        }
        return ok
    }

    fun recordFailure() {
        val count = prefs.getInt(KEY_FAIL_COUNT, 0) + 1
        val editor = prefs.edit().putInt(KEY_FAIL_COUNT, count)
        val lockoutMs = lockoutForCount(count)
        if (lockoutMs > 0) {
            editor.putLong(KEY_LOCKOUT_UNTIL, SystemClock.elapsedRealtime() + lockoutMs)
        }
        editor.apply()
    }

    fun lockoutRemainingMs(): Long {
        val until = prefs.getLong(KEY_LOCKOUT_UNTIL, 0L)
        if (until == 0L) return 0
        val remaining = until - SystemClock.elapsedRealtime()
        return if (remaining > 0) remaining else 0
    }

    private fun lockoutForCount(count: Int): Long = when {
        count < 3 -> 0
        count < 6 -> 30_000L
        count < 9 -> 5 * 60_000L
        else -> 60 * 60_000L
    }

    private fun derive(pin: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, KEY_BITS)
        return SecretKeyFactory
            .getInstance("PBKDF2WithHmacSHA256")
            .generateSecret(spec)
            .encoded
    }

    private fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
        if (a.size != b.size) return false
        var diff = 0
        for (i in a.indices) diff = diff or (a[i].toInt() xor b[i].toInt())
        return diff == 0
    }

    private fun ByteArray.b64(): String = Base64.encodeToString(this, Base64.NO_WRAP)
    private fun String.fromB64(): ByteArray = Base64.decode(this, Base64.NO_WRAP)

    companion object {
        const val PIN_LENGTH = 6
        private const val FILE_NAME = "kiosk_pin"
        private const val KEY_HASH = "hash"
        private const val KEY_SALT = "salt"
        private const val KEY_FAIL_COUNT = "fails"
        private const val KEY_LOCKOUT_UNTIL = "lockout_until"
        private const val ITERATIONS = 120_000
        private const val KEY_BITS = 256
        private const val SALT_BYTES = 16
    }
}
