# Magic Link

Magic Link is a realtime radar-style chat prototype. Users join with a display name, see nearby signals on a radar, invite people into channels, and chat live through Socket.IO.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Raspberry Pi without home Wi-Fi

Use the offline server guide in `deploy/RASPBERRY_PI_OFFLINE_SERVER.md`. It shows how to make the Raspberry Pi create its own Wi-Fi hotspot so phones/laptops can connect directly to the Pi and open `http://10.42.0.1`.

## Admin panel

Open `/admin.html` to view online users, active rooms, uptime, and clear stuck rooms. Admin API calls require `ADMIN_TOKEN`.

Example:

```bash
ADMIN_TOKEN="your-private-token" npm start
```

When using PM2 on the Raspberry Pi:

```bash
ADMIN_TOKEN="your-private-token" pm2 restart magic-link --update-env
pm2 save
```

## Pi helper commands

Install short commands on the Raspberry Pi:

```bash
cd ~/magic-link
sudo bash deploy/install-pi-commands.sh
```

After that you can use:

```bash
magic-start
magic-stop
magic-restart
magic-status
magic-logs
hotspot-on
hotspot-off
hotspot-status
```

Quick server check:

```text
http://10.42.0.1/health
```

## Native mobile app

A true native React Native app lives in `mobile/native-app/`. It mirrors the website UI and connects to your Cloudflare URL or Pi hotspot through Socket.IO. See `mobile/native-app/README.md`.

The older `mobile/android` folder is a WebView wrapper only.

## What improved

- Cleaner Express and Socket.IO server structure.
- Server-side validation for names, room IDs, and messages.
- Simple rate limiting for joins, invites, and messages.
- Safer rendering on the client without injecting usernames or messages as HTML.
- Room membership checks before chat, invite, kick, or ban actions.
- Responsive desktop and mobile layout.

## Notes

The private invite mode creates a more limited room, but it is not end-to-end encrypted. If this app needs real secure messaging, add browser-side encryption before messages are sent to the server.
