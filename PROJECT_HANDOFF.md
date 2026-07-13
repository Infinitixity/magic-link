# Magic Link Project Handoff

This project contains the Magic Link website/server, the main native Android app, and the separate admin Android app.

## Important folders

- `magic-link-main/` - website and Node.js server.
- `magic-link-main/public/index.html` - main website app.
- `magic-link-main/public/admin.html` - admin panel.
- `magic-link-main/public/style.css` - website/admin styling and animations.
- `magic-link-main/server.js` - backend, chat, radio, admin controls.
- `mobile-fixes/` - staged fixes for the main native app at `C:\project\magic-link-main\mobile\native-app`.
- `admin-app/` - separate Magic Link Admin Android app.

## Main APK paths

- Main app APK:
  `C:\project\magic-link-main\mobile\native-app\android\app\build\outputs\apk\release\app-release.apk`

- Admin app APK:
  `C:\project\magic-link-main\mobile\admin-android\app\build\outputs\apk\release\app-release.apk`

## Pi upload paths

Pi project:
`/home/infinixity/magic-link`

Common upload files:

- `magic-link-main/server.js`
- `magic-link-main/public/index.html`
- `magic-link-main/public/admin.html`
- `magic-link-main/public/style.css`
- `magic-link-main/public/logo.png`

Restart on Pi:

```bash
pm2 restart magic-link
```

## Features completed

- Radar chat.
- Radio channels.
- Admin panel.
- Admin radio controls: turn off, mute, ban, unban.
- Separate admin Android app.
- Main native Android app.
- App icons.
- Mobile radio UI fixes.
- Slider fixes.
- Android media volume sync.
- Website and mobile animations.
- Redirect-name import from URL query: `?name=YourName`.

## Build reminders

If Java is wrong before Android builds, run:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

If Android SDK is missing, run:

```powershell
$env:ANDROID_HOME = "C:\Users\Admin\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\Admin\AppData\Local\Android\Sdk"
```

