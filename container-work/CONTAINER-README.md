# Apex God's Eye View — native container

Native Android container for the Apex fork of God's Eye View
(Bilawal Sidhu, MIT — see `../LICENSE`; the license text also ships inside
the app bundle as `LICENSE.txt`, with a credits page at `credits.html`
reachable from a "Credits · MIT" pill in the app).

- **App label:** Apex God's Eye View
- **Package:** `com.apexairsolutions.godseye`
- **Version:** 1.0 (code 1), minSdk 26, targetSdk 35

## Routes

1. **Capacitor (primary):** `capacitor.config.ts` + `android/`, webDir
   `dist`. `npm run build && npx cap sync android`, then build in Android
   Studio / Gradle. Launcher icons are derived from the app's own
   `public/icons/icon-512.png`.
2. **SDK-pipeline fallback (what produced the first shipped APK):**
   `native-fallback/` — a minimal WebView container whose Java loopback
   HTTP server serves the bundled web build from assets, because the app
   references assets by absolute path and file:// breaks them. Build with
   `native-fallback/build.sh` (aapt2 → javac → d8 → zipalign → apksigner,
   house debug keystore). Used where the Gradle daemon cannot run.

The web assets are bundled into the APK (offline-capable shell); live
layers fetch their data over the network at runtime, as designed.
