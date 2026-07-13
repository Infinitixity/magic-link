# Magic Link Android

This is a small native Android wrapper for the Magic Link web application.

It provides:

- Native microphone permission for Radio mode.
- A remembered server address.
- Support for the local Pi URL and an HTTPS Cloudflare URL.
- A full-screen WebView experience.

## Open and build

1. Install Android Studio on Windows.
2. Open the `mobile/android` folder as a project.
3. Let Android Studio install the requested Android SDK/Gradle components.
4. Connect an Android phone with USB debugging enabled.
5. Press Run, or use **Build > Build APK(s)**.

The generated debug APK is normally located at:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Server address

The app starts with:

```text
http://10.42.0.1
```

Tap the small **Server** button to switch to your Cloudflare HTTPS URL.

For microphone reliability outside the Pi hotspot, use the HTTPS Cloudflare URL.
