# Magic Link

Magic Link is a realtime radar-style chat prototype. Users join with a display name, see nearby signals on a radar, invite people into channels, and chat live through Socket.IO.
No use reading anything below use this link to test the website https://magic-link-4nra.onrender.com/

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Install On Raspberry Pi

Use the full step-by-step Pi guide in `PI_INSTALL.md`.

## Raspberry Pi without home Wi-Fi

Use the offline server guide in `magic-link-main/deploy/RASPBERRY_PI_OFFLINE_SERVER.md`. It shows how to make the Raspberry Pi create its own Wi-Fi hotspot so phones/laptops can connect directly to the Pi and open `http://10.42.0.1`.

## What improved

- Cleaner Express and Socket.IO server structure.
- Server-side validation for names, room IDs, and messages.
- Simple rate limiting for joins, invites, and messages.
- Safer rendering on the client without injecting usernames or messages as HTML.
- Room membership checks before chat, invite, kick, or ban actions.
- Responsive desktop and mobile layout.

## Notes

The private invite mode creates a more limited room, but it is not end-to-end encrypted. If this app needs real secure messaging, add browser-side encryption before messages are sent to the server.
