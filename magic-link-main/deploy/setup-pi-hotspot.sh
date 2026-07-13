#!/usr/bin/env bash
set -euo pipefail

SSID="${1:-MagicLink-Pi}"
PASSWORD="${2:-magiclink123}"
HOTSPOT_IP="${3:-10.42.0.1/24}"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/setup-pi-hotspot.sh"
  exit 1
fi

if (( ${#PASSWORD} < 8 )); then
  echo "Hotspot password must be at least 8 characters."
  exit 1
fi

if ! command -v nmcli >/dev/null 2>&1; then
  echo "NetworkManager/nmcli is required. Use Raspberry Pi OS Bookworm or install network-manager."
  exit 1
fi

echo "Creating Raspberry Pi hotspot:"
echo "  SSID: $SSID"
echo "  IP:   $HOTSPOT_IP"

nmcli radio wifi on

if nmcli connection show MagicLink-Hotspot >/dev/null 2>&1; then
  nmcli connection delete MagicLink-Hotspot
fi

nmcli connection add \
  type wifi \
  ifname wlan0 \
  con-name MagicLink-Hotspot \
  autoconnect yes \
  ssid "$SSID"

nmcli connection modify MagicLink-Hotspot \
  802-11-wireless.mode ap \
  802-11-wireless.band bg \
  ipv4.method shared \
  ipv4.addresses "$HOTSPOT_IP" \
  ipv6.method disabled \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "$PASSWORD"

nmcli connection up MagicLink-Hotspot

echo
echo "Done."
echo "Connect your phone/laptop to Wi-Fi: $SSID"
echo "Then open: http://10.42.0.1"
