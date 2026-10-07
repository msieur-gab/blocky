package studio.blocky.kiosk

import android.app.admin.DeviceAdminReceiver

/**
 * Required for Device Owner promotion via:
 *   adb shell dpm set-device-owner studio.blocky.kiosk/.KioskDeviceAdminReceiver
 *
 * Intentionally minimal — Lock Task Mode and the kiosk lifecycle are handled
 * inside [KioskActivity], not here. This class exists so the system has a
 * receiver to bind the device-admin role to.
 */
class KioskDeviceAdminReceiver : DeviceAdminReceiver()
