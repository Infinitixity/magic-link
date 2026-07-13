# Magic Link Native App

This folder contains a **true native mobile app** for Magic Link. It is **not** a WebView wrapper.

The UI is built with React Native components that mirror the website in `public/index.html`, and the app talks to the same Socket.IO backend as the web client.

## Server connection

By default the app connects to:

```text
https://magic-link-redirector.pages.dev
```

You can change this in **Settings**:

- **Cloudflare** — your public redirector URL (works when the Pi is online and tunneled)
- **Pi hotspot** — `http://10.42.0.1` when connected directly to the Raspberry Pi Wi-Fi

When your Pi is off, the app shows **Server offline** and keeps retrying in the background. That is expected.

## Features

- Native radar screen with animated sweep and user blips
- Channels, members, invites, and realtime chat
- Radio mode UI with channel tuning, active channel list, and push-to-talk signaling
- Settings for display name, theme, compact messages, reduce motion, and server URL
- Saved preferences on device (AsyncStorage)

## Radio voice note

The website uses browser WebRTC for live radio audio. This native build includes the full radio UI and Socket.IO signaling (join channels, PTT status, active channels). Full peer-to-peer voice playback would require adding `react-native-webrtc` in a custom dev build.

## Run locally

Do **not** run `npm audit fix --force` in this folder. It can downgrade Expo and break React Native peer dependencies.

1. Install [Node.js](https://nodejs.org/) 20+.
2. Install the [Expo Go](https://expo.dev/go) app on your phone, or Android Studio for an emulator.

```bash
cd mobile/native-app
rmdir /s /q node_modules
del package-lock.json
npm install
npx expo start
```

Then scan the QR code with Expo Go, or press `a` for Android / `i` for iOS simulator.

## Build an Android APK

```bash
cd mobile/native-app
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Project layout

```text
mobile/
  android/          Existing WebView wrapper (legacy)
  native-app/       New native React Native app
```

Use `native-app` for the native replica. The older `android` folder is still a simple WebView shell.
