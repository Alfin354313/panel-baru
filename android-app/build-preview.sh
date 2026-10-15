#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
sdk_dir="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$sdk_dir" ]]; then echo 'Set ANDROID_SDK_ROOT to your Android SDK directory.' >&2; exit 1; fi
build_tools="$sdk_dir/build-tools/35.0.0"
android_jar="$sdk_dir/platforms/android-35/android.jar"
mkdir -p build/compiled build/generated build/classes build/dex
"$build_tools/aapt2" compile --dir app/src/main/res -o build/resources.zip
python3 -c 'from pathlib import Path; p=Path("app/src/main/AndroidManifest.xml"); Path("build/AndroidManifest.xml").write_text(p.read_text().replace("<manifest ","<manifest package=\"id.jeniusedu.app\" ",1))'
"$build_tools/aapt2" link -o build/unsigned.apk -I "$android_jar" --manifest build/AndroidManifest.xml --java build/generated -A app/src/main/assets build/resources.zip
mapfile -t java_sources < <(find app/src/main/java build/generated -name '*.java')
javac -encoding UTF-8 --release 8 -classpath "$android_jar" -d build/classes "${java_sources[@]}"
mapfile -t class_files < <(find build/classes -name '*.class')
"$build_tools/d8" --lib "$android_jar" --min-api 26 --output build/dex "${class_files[@]}"
(cd build/dex && zip -q -u ../unsigned.apk classes.dex)
"$build_tools/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
if [[ ! -f build/preview.keystore ]]; then
 keytool -genkeypair -keystore build/preview.keystore -storepass android -keypass android -alias androiddebugkey -dname 'CN=Jenius Edu Preview,O=Jenius Edu,C=ID' -keyalg RSA -keysize 2048 -validity 3650 -noprompt
fi
"$build_tools/apksigner" sign --ks build/preview.keystore --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --out build/Jenius-Edu-0.1.0-preview.apk build/aligned.apk
"$build_tools/apksigner" verify --verbose build/Jenius-Edu-0.1.0-preview.apk
"$build_tools/aapt2" dump badging build/Jenius-Edu-0.1.0-preview.apk
