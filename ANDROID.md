# cppforge for Android (and Xiaomi / MIUI)

The Android version is the same lessons in a native app shell (a WebView). It runs offline
after the first launch and saves progress on the device.

## Get the APK (no Android Studio needed)

1. Open the repo on GitHub and go to the **Actions** tab.
2. Open the latest **Build APK** run (it runs automatically on every push to `main`).
3. Download **cppforge-debug-apk** from the bottom of the run page.
4. Unzip it to get `app-debug.apk`, and copy it to your phone.

## Install on Xiaomi / MIUI

1. Open the APK with the file manager and tap **Install**.
2. If MIUI blocks it, allow **Install unknown apps** for that file manager when prompted.
3. If you see a security scan warning, tap **Install anyway**. It appears because the APK is
   not from the Play Store. You built it from this repo.

## Build it yourself

```bash
cd android
gradle :app:assembleDebug
# output: app/build/outputs/apk/debug/app-debug.apk
```

Or open the `android/` folder in Android Studio and press Run.

## Where the lessons live

The lesson content and the typing animation are in `android/app/src/main/assets/index.html`.
Edit that file and push to rebuild the APK automatically.
