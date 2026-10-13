#!/bin/sh
# Signing runs after compilation. Private material is supplied by BuildKit
# mounts, never ARG/COPY, and only the allowlisted public outputs are exported.
set +x
set -eu
umask 077

input=${1:?unsigned input directory required}
output=${2:?signed output directory required}
keystore=/run/secrets/android_keystore
: "${ANDROID_KEY_ALIAS:?signing alias required}"
: "${ANDROID_SIGNING_CERT_SHA256:?expected certificate SHA-256 required}"
export MD_ANDROID_STORE_PASSWORD="$(cat /run/secrets/android_store_password)"
export MD_ANDROID_KEY_PASSWORD="$(cat /run/secrets/android_key_password)"
trap 'unset MD_ANDROID_STORE_PASSWORD MD_ANDROID_KEY_PASSWORD' EXIT
tools="${ANDROID_HOME:?Android SDK required}/build-tools/36.0.0"
mkdir -p "$output"

"$tools/zipalign" -P 16 -f 4 "$input/app-release.apk" "$output/app-release.apk"
"$tools/apksigner" sign --ks "$keystore" --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:MD_ANDROID_STORE_PASSWORD --key-pass env:MD_ANDROID_KEY_PASSWORD \
  "$output/app-release.apk"
"$tools/zipalign" -c -P 16 4 "$output/app-release.apk"
"$tools/apksigner" verify --verbose --print-certs "$output/app-release.apk" > "$output/apk-signature.txt"
grep -q '^Number of signers: 1$' "$output/apk-signature.txt"
apk_sha=$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' "$output/apk-signature.txt" | tr '[:upper:]' '[:lower:]')
expected_sha=$(printf '%s' "$ANDROID_SIGNING_CERT_SHA256" | tr '[:upper:]' '[:lower:]' | tr -d ':')
test "$apk_sha" = "$expected_sha" || { echo 'APK signer certificate mismatch' >&2; exit 1; }

cp "$input/app-release.aab" "$output/app-release.aab"
# Expo can generate debug-signed releases. Remove previous JAR signature
# entries before signing the bundle with the production key, not a second key.
if unzip -Z1 "$output/app-release.aab" | grep -Eq '^META-INF/[^/]+\.(SF|RSA|DSA|EC)$'; then
  zip -qd "$output/app-release.aab" 'META-INF/*.SF' 'META-INF/*.RSA' 'META-INF/*.DSA' 'META-INF/*.EC'
fi
jarsigner -keystore "$keystore" -storepass:env MD_ANDROID_STORE_PASSWORD \
  -keypass:env MD_ANDROID_KEY_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 \
  -sigfile MDREL "$output/app-release.aab" "$ANDROID_KEY_ALIAS"
jarsigner -verify -strict -keystore "$keystore" -storepass:env MD_ANDROID_STORE_PASSWORD \
  "$output/app-release.aab" > "$output/aab-signature.txt"
grep -q 'jar verified' "$output/aab-signature.txt"
keytool -printcert -jarfile "$output/app-release.aab" > "$output/aab-certificate.txt"
aab_sha=$(sed -n 's/^[[:space:]]*SHA256: //p' "$output/aab-certificate.txt" | tr -d ':' | tr '[:upper:]' '[:lower:]')
test "$aab_sha" = "$expected_sha" || { echo 'AAB signer certificate mismatch' >&2; exit 1; }
keytool -exportcert -rfc -alias "$ANDROID_KEY_ALIAS" -keystore "$keystore" \
  -storepass:env MD_ANDROID_STORE_PASSWORD -file "$output/android-signing-certificate.pem"
cp "$input/build-metadata.txt" "$output/build-metadata.txt"
printf 'signing_sha256=%s\n' "$expected_sha" >> "$output/build-metadata.txt"
# Bazaar needs this exact AAB and its offline signed digest, not our private key.
# Generate BIN after the final AAB signature; never modify the bundle afterwards.
aab_before=$(sha256sum "$output/app-release.aab" | cut -d ' ' -f 1)
java -Xmx1024m -XX:MaxMetaspaceSize=384m -XX:ActiveProcessorCount=2 \
  -jar /opt/cafebazaar/bundlesigner.jar genbin \
  --bundle "$output/app-release.aab" --bin "$output" \
  --v2-signing-enabled true --v3-signing-enabled false \
  --ks "$keystore" --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:MD_ANDROID_STORE_PASSWORD --key-pass env:MD_ANDROID_KEY_PASSWORD
test -s "$output/app-release.bin"
grep -q '^v2:true,v3:false$' "$output/app-release.bin"
aab_after=$(sha256sum "$output/app-release.aab" | cut -d ' ' -f 1)
test "$aab_before" = "$aab_after" || { echo 'Bazaar AAB changed during BIN generation' >&2; exit 1; }
cp /opt/cafebazaar/tool-metadata.txt "$output/cafebazaar-signing.txt"
printf '%s\n' 'bundle=app-release.aab' 'bin=app-release.bin' "aab_sha256=$aab_after" \
  "signing_certificate_sha256=$expected_sha" 'v2=true' 'v3=false' >> "$output/cafebazaar-signing.txt"
printf '%s\n' 'cafebazaar_bin=app-release.bin' >> "$output/build-metadata.txt"
(cd "$output" && sha256sum app-release.apk app-release.aab app-release.bin > SHA256SUMS)
echo 'APK/AAB production signing and Cafe Bazaar BIN generation completed'
