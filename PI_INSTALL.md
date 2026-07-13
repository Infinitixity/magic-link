# Magic Link Raspberry Pi Install Guide

This guide installs Magic Link on a Raspberry Pi and runs it as a server with Nginx and PM2.

It assumes:

- Raspberry Pi OS is installed.
- SSH is enabled.
- You can SSH into the Pi from your laptop.
- Your Pi username is `infinixity`.

If your username is different, replace `infinixity` in the commands with your own Pi username.

## 1. SSH Into The Pi

From your laptop:

```bash
ssh infinixity@192.168.1.43
```

If the Pi is in hotspot mode, use:

```bash
ssh infinixity@10.42.0.1
```

## 2. Update The Pi

```bash
sudo apt update
sudo apt upgrade -y
```

## 3. Install Needed Software

```bash
sudo apt install -y git nodejs npm nginx
sudo npm install -g pm2
```

Check that Node and npm are installed:

```bash
node -v
npm -v
```

## 4. Download Magic Link

If this is a fresh Pi:

```bash
cd ~
git clone https://github.com/Infinitixity/magic-link.git
cd magic-link
```

If the repo is already on the Pi:

```bash
cd ~/magic-link
git pull
```

## 5. Choose The App Folder

Run:

```bash
ls
```

If you see `server.js` and `package.json`, stay in this folder.

If you only see a folder called `magic-link-main`, go into it:

```bash
cd magic-link-main
```

You should now be in the folder that contains:

```text
server.js
package.json
public/
```

## 6. Install App Packages

```bash
npm install
```

## 7. Test The App

```bash
npm start
```

You should see something like:

```text
Magic Link radar chat running on http://0.0.0.0:3000
```

Open this from another device on the same network:

```text
http://YOUR_PI_IP:3000
```

For example:

```text
http://192.168.1.43:3000
```

Stop the test server with:

```bash
Ctrl + C
```

## 8. Start Magic Link With PM2

PM2 keeps the app running after you close SSH.

Use a private admin token. Change the example token below:

```bash
ADMIN_TOKEN="change-this-to-your-own-secret" pm2 start server.js --name magic-link
pm2 save
```

Make PM2 start automatically when the Pi turns on:

```bash
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u infinixity --hp /home/infinixity
```

If PM2 prints another command after that, copy and run the command it shows.

Then run:

```bash
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs magic-link
pm2 restart magic-link
pm2 stop magic-link
pm2 start magic-link
```

## 9. Connect Nginx To The Node App

Nginx will use port `80`, so people can open the app without typing `:3000`.

Edit the Nginx default site:

```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the main `server { ... }` block with this:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit:

- Press `Ctrl + O`
- Press `Enter`
- Press `Ctrl + X`

Test Nginx:

```bash
sudo nginx -t
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

Now open:

```text
http://YOUR_PI_IP
```

Example:

```text
http://192.168.1.43
```

## 10. Open The Admin Panel

Open:

```text
http://YOUR_PI_IP/admin.html
```

Example:

```text
http://192.168.1.43/admin.html
```

Use the same admin token you set in PM2.

## 11. Update The Pi After GitHub Changes

Whenever you push new changes to GitHub, update the Pi like this:

```bash
ssh infinixity@YOUR_PI_IP
cd ~/magic-link
git pull
```

If your app files are inside `magic-link-main`, run:

```bash
cd magic-link-main
```

Then:

```bash
npm install
pm2 restart magic-link --update-env
```

## 12. Optional: Pi Hotspot Mode

If you want the Pi to create its own Wi-Fi network instead of using home Wi-Fi, use the hotspot guide:

```text
magic-link-main/deploy/RASPBERRY_PI_OFFLINE_SERVER.md
```

If the helper commands are installed, you can use:

```bash
hotspot-on
hotspot-off
hotspot-status
```

When hotspot mode is on, the app is usually available at:

```text
http://10.42.0.1
```

## Troubleshooting

Check whether Magic Link is running:

```bash
pm2 status
```

Read the app logs:

```bash
pm2 logs magic-link
```

Check Nginx:

```bash
sudo systemctl status nginx
sudo nginx -t
```

Restart everything:

```bash
pm2 restart magic-link
sudo systemctl restart nginx
```

If the default Nginx page still appears, the Nginx config is still pointing at `/var/www/html` instead of forwarding to the Node app.

If the app works on `http://YOUR_PI_IP:3000` but not `http://YOUR_PI_IP`, the problem is Nginx.

If neither one works, the problem is probably the Node app or PM2.
