#!/usr/bin/env bash
# Apex God's Eye View — native container fallback build.
#
# The Capacitor/Gradle route (../capacitor.config.ts, ../android/) is the
# primary container. On machines where the Gradle daemon cannot run, this
# script builds the same container — a WebView over a loopback HTTP server
# serving the bundled web build — with the Android SDK pipeline alone.
#
# Prereqs: JDK, Android SDK build-tools 35.0.0 + platform android-35,
# the house debug keystore, and a fresh web build in ../dist/.
set -euo pipefail

BT="${ANDROID_BUILD_TOOLS:-/home/hatch/tools/sdk/build-tools/35.0.0}"
AJ="${ANDROID_JAR:-/home/hatch/tools/sdk/platforms/android-35/android.jar}"
export JAVA_HOME="${JAVA_HOME:-/home/hatch/tools/jdk}"
export PATH="$JAVA_HOME/bin:$PATH"
KS="${HOUSE_KEYSTORE:-$HOME/workspace/apex-wifi-analyzer/keystore/house-debug.keystore}"
OUT="${1:-$HOME/workspace/gods-eye-apex/apex-gods-eye-view.apk}"
cd "$(dirname "$0")"

# Refresh the bundled web build (includes LICENSE.txt + credits.html).
rm -rf assets/www
mkdir -p assets
cp -r ../dist assets/www

"$BT/aapt2" compile --dir res -o res.zip
"$BT/aapt2" link -o app-unsigned.apk -I "$AJ" --manifest AndroidManifest.xml \
    -A assets --min-sdk-version 26 --target-sdk-version 35 \
    --version-code 1 --version-name 1.0 res.zip
mkdir -p classes dex
javac -source 17 -target 17 -cp "$AJ" -d classes src/com/apexairsolutions/godseye/*.java
"$BT/d8" --release --lib "$AJ" --output dex classes/com/apexairsolutions/godseye/*.class
cp app-unsigned.apk app-withdex.apk
zip -q app-withdex.apk dex/classes.dex
"$BT/zipalign" -f -p 4 app-withdex.apk app-aligned.apk
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android \
    --out "$OUT" app-aligned.apk
"$BT/apksigner" verify "$OUT"
"$BT/aapt2" dump badging "$OUT" | head -3
echo "Built: $OUT"
