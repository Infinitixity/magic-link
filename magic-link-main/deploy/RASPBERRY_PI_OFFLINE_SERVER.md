# Raspberry Pi Offline Server

You do not need home Wi-Fi or internet for Magic Link. Make the Raspberry Pi create its own Wi-Fi network, connect your phone/laptop to that network, then open the app from the Pi.

This is called hotspot or access point mode.

## What You Get

- Raspberry Pi Wi-Fi name: `MagicLink-Pi`
- Raspberry Pi address: `http://10.42.0.1`
- Nginx can keep serving the app normally
- No router, home Wi-Fi, or internet required

## 1. Copy the App to the Pi

Put the app somewhere like:

```bash
/home/pi/magic-link
```

Install dependencies:

```bash
cd /home/pi/magic-link
npm install
```

## 2. Run the App

For a quick test:

```bash
npm start
```

The Node server listens on all interfaces, so the Pi can serve other devices on the hotspot network.

For a permanent setup, run it with a service manager such as `systemd` or `pm2`.

## 3. Create the Pi Hotspot

On Raspberry Pi OS Bookworm, NetworkManager is the default networking tool. Raspberry Pi's official docs show hotspot setup through `nmcli`.

Run:

```bash
cd /home/pi/magic-link
sudo bash deploy/setup-pi-hotspot.sh MagicLink-Pi magiclink123
```

You can change the Wi-Fi name and password:

```bash
sudo bash deploy/setup-pi-hotspot.sh MyServerWiFi mystrongpassword
```

The password must be at least 8 characters.

## 4. Nginx Config

If your Node app runs on port `3000`, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 5. Use It

1. On your phone/laptop, connect to Wi-Fi `MagicLink-Pi`.
2. Enter the password.
3. Open:

```text
http://10.42.0.1
```

## Troubleshooting

Check hotspot status:

```bash
nmcli connection show --active
ip addr show wlan0
```

Restart the hotspot:

```bash
sudo nmcli connection down MagicLink-Hotspot
sudo nmcli connection up MagicLink-Hotspot
```

If the site opens but chat does not work, make sure the Nginx config includes the `Upgrade` and `Connection` headers. Socket.IO needs those for realtime WebSocket connections.

## Source

Raspberry Pi's current documentation says Raspberry Pi OS Bookworm uses NetworkManager by default and supports creating a hotspot with `nmcli`.
