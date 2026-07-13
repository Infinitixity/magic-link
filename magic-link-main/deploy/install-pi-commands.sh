#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/home/infinixity/magic-link}"
BIN_DIR="/usr/local/bin"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/install-pi-commands.sh"
  exit 1
fi

write_command() {
  local name="$1"
  local body="$2"

  cat > "$BIN_DIR/$name" <<EOF
#!/usr/bin/env bash
set -euo pipefail
$body
EOF

  chmod +x "$BIN_DIR/$name"
}

write_command "magic-start" "cd \"$APP_DIR\"
pm2 start server.js --name magic-link"

write_command "magic-stop" "pm2 stop magic-link"

write_command "magic-restart" "cd \"$APP_DIR\"
pm2 restart magic-link --update-env"

write_command "magic-status" "pm2 status magic-link
echo
echo \"Health:\"
curl -fsS http://127.0.0.1:3000/health || true
echo"

write_command "magic-logs" "pm2 logs magic-link"

write_command "hotspot-on" "nmcli connection up MagicLink-Hotspot"

write_command "hotspot-off" "nmcli connection down MagicLink-Hotspot"

write_command "hotspot-status" "nmcli connection show --active
echo
ip addr show wlan0 | sed -n '1,12p'"

echo "Installed Magic Link helper commands:"
echo "  magic-start"
echo "  magic-stop"
echo "  magic-restart"
echo "  magic-status"
echo "  magic-logs"
echo "  hotspot-on"
echo "  hotspot-off"
echo "  hotspot-status"
