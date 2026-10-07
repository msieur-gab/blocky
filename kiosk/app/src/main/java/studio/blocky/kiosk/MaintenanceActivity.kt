package studio.blocky.kiosk

import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MaintenanceActivity : AppCompatActivity() {

    private enum class Mode { ENTER, SET, CONFIRM_NEW, CHANGE_OLD, CHANGE_NEW, CHANGE_CONFIRM }

    private lateinit var pin: PinManager
    private lateinit var config: KioskConfig
    private lateinit var pinPanel: View
    private lateinit var menuPanel: View
    private lateinit var urlPanel: View
    private lateinit var pinTitle: TextView
    private lateinit var pinSubtitle: TextView
    private lateinit var pinInput: EditText
    private lateinit var pinSubmit: Button
    private lateinit var urlInput: EditText
    private lateinit var urlSubtitle: TextView

    private val ui = Handler(Looper.getMainLooper())
    private val tickLockout = object : Runnable {
        override fun run() { renderPinPanel() }
    }

    private var mode: Mode = Mode.ENTER
    private var stagedPin: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_maintenance)
        pin = PinManager(this)
        config = KioskConfig(this)

        pinPanel = findViewById(R.id.pin_panel)
        menuPanel = findViewById(R.id.menu_panel)
        urlPanel = findViewById(R.id.url_panel)
        pinTitle = findViewById(R.id.pin_title)
        pinSubtitle = findViewById(R.id.pin_subtitle)
        pinInput = findViewById(R.id.pin_input)
        pinSubmit = findViewById(R.id.pin_submit)
        urlInput = findViewById(R.id.url_input)
        urlSubtitle = findViewById(R.id.url_subtitle)

        pinInput.inputType =
            InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        pinSubmit.setOnClickListener { onPinSubmit() }

        findViewById<Button>(R.id.action_wipe).setOnClickListener { confirmWipe() }
        findViewById<Button>(R.id.action_change_pin).setOnClickListener {
            mode = Mode.CHANGE_OLD
            renderPinPanel()
        }
        findViewById<Button>(R.id.action_change_url).setOnClickListener { showUrlPanel() }
        findViewById<Button>(R.id.action_return).setOnClickListener { returnToKiosk(false) }
        findViewById<Button>(R.id.action_exit_kiosk).setOnClickListener { confirmExitKiosk() }
        findViewById<Button>(R.id.url_save).setOnClickListener { onUrlSave() }
        findViewById<Button>(R.id.url_cancel).setOnClickListener { showMenu() }

        mode = if (pin.isPinSet()) Mode.ENTER else Mode.SET
        renderPinPanel()
    }

    override fun onPause() {
        super.onPause()
        ui.removeCallbacks(tickLockout)
    }

    @Deprecated("Back returns to kiosk explicitly.")
    override fun onBackPressed() {
        returnToKiosk(false)
    }

    private fun renderPinPanel() {
        pinPanel.visibility = View.VISIBLE
        menuPanel.visibility = View.GONE
        urlPanel.visibility = View.GONE
        pinInput.text.clear()
        ui.removeCallbacks(tickLockout)

        val lockoutMs = pin.lockoutRemainingMs()
        if (lockoutMs > 0 && (mode == Mode.ENTER || mode == Mode.CHANGE_OLD)) {
            pinTitle.setText(R.string.pin_locked_out)
            pinSubtitle.text = getString(R.string.pin_locked_subtitle, formatDuration(lockoutMs))
            pinInput.isEnabled = false
            pinSubmit.isEnabled = false
            ui.postDelayed(tickLockout, 1_000)
            return
        }
        pinInput.isEnabled = true
        pinSubmit.isEnabled = true

        when (mode) {
            Mode.ENTER -> {
                pinTitle.setText(R.string.pin_enter_title)
                pinSubtitle.setText(R.string.pin_enter_subtitle)
            }
            Mode.SET -> {
                pinTitle.setText(R.string.pin_set_title)
                pinSubtitle.setText(R.string.pin_set_subtitle)
            }
            Mode.CONFIRM_NEW, Mode.CHANGE_CONFIRM -> {
                pinTitle.setText(R.string.pin_confirm_title)
                pinSubtitle.setText(R.string.pin_confirm_subtitle)
            }
            Mode.CHANGE_OLD -> {
                pinTitle.setText(R.string.pin_change_old_title)
                pinSubtitle.setText(R.string.pin_enter_subtitle)
            }
            Mode.CHANGE_NEW -> {
                pinTitle.setText(R.string.pin_change_new_title)
                pinSubtitle.setText(R.string.pin_set_subtitle)
            }
        }
    }

    private fun onPinSubmit() {
        val entered = pinInput.text.toString()
        if (entered.length != PinManager.PIN_LENGTH) {
            pinSubtitle.setText(R.string.pin_wrong_length)
            return
        }
        when (mode) {
            Mode.ENTER -> {
                if (pin.verify(entered)) showMenu()
                else { pin.recordFailure(); renderPinPanel() }
            }
            Mode.SET -> {
                stagedPin = entered
                mode = Mode.CONFIRM_NEW
                renderPinPanel()
            }
            Mode.CONFIRM_NEW -> {
                if (entered == stagedPin) {
                    pin.setPin(entered); stagedPin = null; showMenu()
                } else {
                    stagedPin = null; mode = Mode.SET; renderPinPanel()
                    pinSubtitle.setText(R.string.pin_mismatch)
                }
            }
            Mode.CHANGE_OLD -> {
                if (pin.verify(entered)) { mode = Mode.CHANGE_NEW; renderPinPanel() }
                else { pin.recordFailure(); renderPinPanel() }
            }
            Mode.CHANGE_NEW -> {
                stagedPin = entered
                mode = Mode.CHANGE_CONFIRM
                renderPinPanel()
            }
            Mode.CHANGE_CONFIRM -> {
                if (entered == stagedPin) {
                    pin.setPin(entered); stagedPin = null; showMenu()
                } else {
                    stagedPin = null; mode = Mode.CHANGE_OLD; renderPinPanel()
                    pinSubtitle.setText(R.string.pin_mismatch)
                }
            }
        }
    }

    private fun showMenu() {
        ui.removeCallbacks(tickLockout)
        pinPanel.visibility = View.GONE
        urlPanel.visibility = View.GONE
        menuPanel.visibility = View.VISIBLE
    }

    private fun showUrlPanel() {
        pinPanel.visibility = View.GONE
        menuPanel.visibility = View.GONE
        urlPanel.visibility = View.VISIBLE
        urlInput.setText(config.getUrl())
        urlSubtitle.setText(R.string.url_subtitle)
    }

    private fun onUrlSave() {
        val entered = urlInput.text.toString().trim()
        if (!KioskConfig.isValidUrl(entered)) {
            urlSubtitle.setText(R.string.url_invalid)
            return
        }
        config.setUrl(entered)
        returnToKiosk(false)
    }

    private fun confirmWipe() {
        AlertDialog.Builder(this)
            .setTitle(R.string.wipe_title)
            .setMessage(R.string.wipe_message)
            .setPositiveButton(R.string.wipe_confirm) { _, _ -> returnToKiosk(true) }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun confirmExitKiosk() {
        AlertDialog.Builder(this)
            .setTitle(R.string.exit_kiosk_title)
            .setMessage(R.string.exit_kiosk_message)
            .setPositiveButton(R.string.exit_kiosk_confirm) { _, _ -> exitKiosk() }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun exitKiosk() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (dpm.isDeviceOwnerApp(packageName)) {
            try { stopLockTask() } catch (_: IllegalStateException) {}
        }
        finish()
    }

    private fun returnToKiosk(wipe: Boolean) {
        val intent = Intent(this, KioskActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(KioskActivity.EXTRA_WIPE, wipe)
        startActivity(intent)
        finish()
    }

    private fun formatDuration(ms: Long): String {
        val s = ms / 1000
        return when {
            s < 60 -> "${s}s"
            s < 3600 -> "${s / 60}m ${s % 60}s"
            else -> "${s / 3600}h ${(s % 3600) / 60}m"
        }
    }
}
