# Android production build and signing

The Android build follows the `b5-app` mechanism. `build-android` is a manual,
non-blocking job on **germany only**, after `test-production`. PWA build and
automatic deployment are unchanged. `publish-android` remains a separate manual
job on md that publishes the signed APK; it does not rebuild or publish to stores.

## CI/CD variables (this project's protected main branch)

| Variable | Type | Protection |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | File; one-line Base64 JKS | Protected, masked, hidden |
| `ANDROID_KEYSTORE_PASSWORD` | File | Protected, masked, hidden |
| `ANDROID_KEY_PASSWORD` | File | Protected, masked, hidden |
| `ANDROID_KEY_ALIAS` | Variable | Protected |
| `ANDROID_SIGNING_CERT_SHA256` | Variable; public SHA-256 | Protected |

All have scope `*` and variable expansion disabled. File variables are paths,
not inline values. CI decodes the keystore into a restricted temporary directory
and removes it on exit. Private values enter Docker only through BuildKit secret
mounts, never build arguments or copied source. Signing runs without networking.

## Build and outputs

Release APK and AAB are compiled together with clean Expo prebuild. Version code
comes from the project-local `CI_PIPELINE_IID`, increasing between pipelines.
The application ID stays `ir.mydreamapp.app`. Metadata records commit and version.
Before prebuild, `scripts/patch-poolakey-android.cjs` applies a version/source-guarded
compatibility patch to Poolakey 3.1.2: activity access uses
`reactApplicationContext.currentActivity`, compatible with React Native 0.85's
Kotlin module base class. This runs after each fresh install in the Android image,
not against generated native files or PWA dependencies. Review/remove the patch
when updating Poolakey; unexpected versions/source fail early instead of silently
changing billing code.
Gradle has one worker, bounded heap/metaspace, in-process Kotlin, and CMake/Ninja
job pools; Metro also has a bounded heap. The heap override defaults to 1024 MiB.

The aligned APK and AAB are signed using the same production key. Generated AAB
debug signatures are removed before signing. The build checks both certificates
against the pinned fingerprint. Cafe Bazaar bundle-signer **0.1.14** is downloaded
in a separate stage with a pinned SHA-256 and generates BIN from that signed AAB.
No private signing key is uploaded to Bazaar.

Developer-access artifacts expire after 90 days and include APK, AAB, BIN,
public certificate, signature reports, metadata and `SHA256SUMS`. For Bazaar,
upload `app-release.aab` and `app-release.bin` from the **same job**. Store
publication remains manual. Local preview builds use `android-unsigned-artifacts`
and do not require production secrets; they are not production distributions.

## Key continuity and recovery

The independent MyDream key is RSA-3072/SHA256withRSA, valid for 40 years. Preserve
it for every future release; never regenerate per pipeline or reuse Black Five's
key. Its encrypted JKS and Windows-user-bound DPAPI password recovery are outside
Git under `C:\Users\MiKDev\.codex\private\my-dream-app-android\`.
Recovery requires the original Windows user/profile. Arrange a secure independent
backup before public distribution; losing this key can prevent installed app updates.

Previous debug-signed or differently signed APKs cannot update in place with the
new certificate; testers may need to uninstall first. If this application already
has a store signing identity, use that identity instead before publishing updates.

References:

- [BuildKit secrets](https://docs.docker.com/build/building/secrets/)
- [Cafe Bazaar bundle-signer](https://github.com/cafebazaar/bundle-signer#usage)
- [GitLab project variables API](https://docs.gitlab.com/api/project_level_variables/)
