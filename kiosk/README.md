# blocky kiosk launcher

A small Kotlin Android app that pins a donated phone to blocky. Nothing more.

This is the lock that holds blocky on a child's screen until a nurse types a PIN. The companion piece is blocky itself, which lives next door in `../app/`.

---

## What it does

1. Boots straight into blocky in a fullscreen WebView (no chrome, no system bars).
2. Blocks the back button, home button, recents, and notifications via Android Lock Task Mode (Device Owner).
3. Hidden gesture (long-press top-right corner for 5s) opens a PIN-protected maintenance screen.
4. Maintenance screen has three actions: **Wipe** (clear blocky's memory and return to kiosk), **Change PIN**, **Exit kiosk** (advanced — for installing updates over USB).

That's the whole app. Auditable in one sitting.

---

## One-time setup per phone

You need: a donated Android phone (8.0+ / API 26+), a USB cable, ADB, and the built APK.

```sh
# 1. On the phone: factory reset, skip Google account, enable USB debugging.

# 2. From your laptop:
adb install -r app/build/outputs/apk/release/app-release.apk

# 3. Promote the kiosk to Device Owner (must run while no Google account exists):
adb shell dpm set-device-owner studio.blocky.kiosk/.KioskDeviceAdminReceiver

# 4. Open the kiosk app once. It will prompt you to set the 6-digit PIN.
#    After setting, it auto-launches on boot as the HOME launcher.

# 5. Reboot. The phone boots straight into blocky.
adb reboot
```

If `dpm set-device-owner` fails with "Not allowed to set the device owner", the phone has accounts on it. Factory-reset and skip Google again. Some OEM builds (Samsung One UI 6+) close the device-owner window ~60s after first boot — be quick.

---

## Building

Open this folder (`kiosk/`) in Android Studio (Hedgehog or newer). It will sync Gradle and let you build a debug or release APK.

For release signing, generate a keystore and add a `signingConfigs` block to `app/build.gradle.kts`. Keep the keystore safe — the same key is needed for every update.

---

## Replacing the placeholder

`app/src/main/assets/blocky/index.html` is a placeholder. Drop the built blocky PWA into that folder (the whole thing — `js/`, `assets/`, `index.html`). The kiosk loads `file:///android_asset/blocky/index.html`.

If you'd rather host blocky on a local server (Flask transmitter, future), edit `KioskActivity.BLOCKY_URL` to point at `http://127.0.0.1:8000` and rebuild.

---

## Between-patient cleaning

1. Long-press the top-right corner of the screen for 5 seconds.
2. Enter the 6-digit PIN.
3. Tap **Wipe and return to service**.
4. Confirm.
5. The WebView clears all storage (cookies, localStorage, IndexedDB, cache) and reloads blocky.
6. The phone returns to its clean kiosk view, ready for the next child.

---

## When the page can't load

If blocky is loaded from a URL and the network is down, the kiosk retries once from the WebView's HTTP cache. If nothing is cached it shows a plain black screen instead of the browser's error page, and tries the network again every 15 seconds.

---

## Security notes

- Camera and microphone are granted to the page only on the origin blocky was loaded from (the configured URL, or where it redirected to on load). Any other origin, and any other resource, is denied and logged to logcat under `BlockyKiosk`. On a phone that is not Device Owner, the page's request waits for the Android permission prompt instead of failing.

- PIN: 6 digits, PBKDF2-HMAC-SHA256 (120k iterations), 256-bit derived key. Salt + hash stored in `EncryptedSharedPreferences` (hardware-backed Keystore on API 23+). Lockout after 3 / 6 / 9 failed attempts (30s / 5min / 1h).
- No network calls of any kind from the kiosk launcher itself. The WebView does whatever blocky does.
- No Play Services, no Firebase, no analytics, no crash reporting.
- Backup is disabled. The PIN cannot be exfiltrated via cloud backup or device transfer.

---

## Layout

```
kiosk/
├── app/
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/studio/blocky/kiosk/
│       │   ├── KioskActivity.kt              # WebView host + lock task + corner gesture
│       │   ├── MaintenanceActivity.kt        # PIN entry/setup + maintenance menu
│       │   ├── KioskDeviceAdminReceiver.kt   # required for Device Owner
│       │   └── PinManager.kt                 # PBKDF2 + lockout + encrypted storage
│       ├── assets/blocky/                    # drop blocky PWA here
│       └── res/                              # layouts, strings, theme, icon
├── build.gradle.kts
└── settings.gradle.kts
```

---

## What this does NOT do

- No fleet management, no remote updates, no enrollment server.
- No OEM debloat — if a hospital wants Bixby gone, do it via `pm disable-user` before the kiosk install.
- No Termux / local-server integration. If blocky later needs a Flask server, that's a separate setup step.

The kiosk is the lock. That's all.
