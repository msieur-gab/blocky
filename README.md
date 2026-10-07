# blocky

A small creature that keeps a child company on a donated phone. One repository
(`msieur-gab/blocky`, branch `main`), two halves:

| Folder | What it is |
|---|---|
| `app/` | The blocky web app. Open `index.html` through any static server; add `?stt=onnx` for on-device speech (sherpa-onnx). |
| `kiosk/` | The Android lock that pins a phone to blocky (Kotlin, system WebView, Device Owner lock task, PIN, wipe between children). See `kiosk/README.md`. |

## Where this came from (assembled 2026-10-07)

- `app/` is the dev repo at commit `46aa603` plus two files that only existed in the
  deployed copy (`tmp_blocky`) and were never committed: `js/services/ears-onnx.js`
  and `js/services/audio-capture-processor.js`. They resample the microphone to
  16 kHz inside the worklet and resume a suspended `AudioContext`, both needed on
  Android WebView. Committed 2026-10-07 as `ef35b70`.
- `kiosk/` is the `blocky-fleet/kiosk-launcher` source, without its build output and
  without the 265 MB copy of the app that was bundled under `app/src/main/assets/blocky/`.
  It builds here with `./gradlew assembleDebug`. Two behaviours were added on 2026-10-07,
  adapted from the symbios Android wrapper (see `kiosk/README.md`, "When the page can't load"
  and "Security notes"); they compile but have not been run on a phone yet.
- The untouched originals are in `~/dev/archive_blocky/`.
- Speech models under `app/assets/sherpa/asr/`: the engine (`.wasm`) and a 70 MB English
  model (`…-en-kroko.data`, Kroko community model, CC-BY-SA) are meant to be in git so the
  deployed page can hear. The older 190 MB model (`sherpa-onnx-wasm-main-asr.data`) is over
  GitHub's 100 MB limit and stays ignored; `?model=big` uses it where it is present.
- The older branches (`master`, `feature/rps-game`, `v2/architecture`, `v3/face-system`,
  `v3/on-device-stt`) predate the move into `app/` and keep the flat layout.

## Known stale spots

- `kiosk/README.md` still says the kiosk loads `file:///android_asset/blocky/index.html`
  and mentions `KioskActivity.BLOCKY_URL`. The code now reads the URL at runtime from
  `KioskConfig` (maintenance screen, "change URL"), and its default is `http://soniq.local`.
- Related work kept outside this folder: `~/dev/blocky-v2` (server-side speech and intent),
  `~/dev/blocky-voice-lab` (voice alphabet), `~/dev/webdroid` and
  `~/dev/symbios/companion-android` (other Android shells).
