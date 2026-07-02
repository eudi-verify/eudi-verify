#!/usr/bin/env bash
#
# Generic Ubuntu 24.04 server bootstrap: deploy user, SSH hardening, firewall,
# optional fail2ban + unattended-upgrades, optional Node.js + nginx.
#
# Project-specific deploy (git clone, systemd, env) belongs in APP_HOOK or a
# separate script — not here.
#
# Prerequisites:
#   - Fresh Ubuntu 24.04 (or similar Debian)
#   - Your SSH public key already in /root/.ssh/authorized_keys
#   - Run as root
#
# Usage:
#   cp scripts/provision-base.conf.example scripts/provision-base.conf
#   # edit provision-base.conf
#   ssh root@SERVER 'bash -s' < scripts/provision-base.sh
#
# Or inline:
#   DOMAINS="app.example.com" INTERACTIVE=1 ssh root@SERVER 'bash -s' < scripts/provision-base.sh
#
set -euo pipefail

# ponytail: config must exist on the server when piping this script via ssh
for _conf in "${PROVISION_CONF:-}" "/root/provision-base.conf" "./provision-base.conf"; do
  if [[ -n "$_conf" && -f "$_conf" ]]; then
    # shellcheck source=/dev/null
    source "$_conf"
    break
  fi
done
unset _conf

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DOMAINS="${DOMAINS:-}"
INSTALL_NODE="${INSTALL_NODE:-false}"
NODE_MAJOR="${NODE_MAJOR:-22}"
INSTALL_NGINX="${INSTALL_NGINX:-true}"
INSTALL_FAIL2BAN="${INSTALL_FAIL2BAN:-true}"
INSTALL_UNATTENDED_UPGRADES="${INSTALL_UNATTENDED_UPGRADES:-true}"
INTERACTIVE="${INTERACTIVE:-0}"
SSH_PORT="${SSH_PORT:-22}"
APP_HOOK="${APP_HOOK:-}"

PRIMARY_DOMAIN="${DOMAINS%% *}"

pause() {
  if [[ "$INTERACTIVE" == "1" ]]; then
    read -r -p "$1 [Enter to continue] " _
  fi
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ "$(id -u)" -eq 0 ]] || die "Run as root on the server."

echo "============================================"
echo "  provision-base.sh"
echo "  deploy user: $DEPLOY_USER"
echo "  domains:     ${DOMAINS:-<none — nginx site skipped>}"
echo "  interactive: $INTERACTIVE"
echo "============================================"
echo ""

# ----------------------------------------------------------------------------
# 1. Deploy user (before any SSH lockdown)
# ----------------------------------------------------------------------------
echo "→ [1/7] Deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"

  mkdir -p "/home/$DEPLOY_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

  # NOPASSWD only for deploy automation; tighten to specific commands in production.
  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$DEPLOY_USER"
  chmod 440 "/etc/sudoers.d/$DEPLOY_USER"
else
  echo "   User $DEPLOY_USER already exists — skipping create."
fi

pause "Open a NEW terminal and verify: ssh ${DEPLOY_USER}@THIS_SERVER_IP"
echo "   (If that fails, do NOT continue — fix keys before SSH hardening.)"

# ----------------------------------------------------------------------------
# 2. SSH hardening
# ----------------------------------------------------------------------------
echo "→ [2/7] SSH hardening..."
SSHD="/etc/ssh/sshd_config"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' "$SSHD"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD"
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD"
sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' "$SSHD"
sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' "$SSHD"
sed -i 's/^#\?LoginGraceTime.*/LoginGraceTime 30/' "$SSHD"

if grep -q '^AllowUsers ' "$SSHD"; then
  sed -i "s/^AllowUsers .*/AllowUsers $DEPLOY_USER/" "$SSHD"
else
  echo "AllowUsers $DEPLOY_USER" >> "$SSHD"
fi

if [[ "$SSH_PORT" != "22" ]]; then
  sed -i "s/^#\?Port .*/Port $SSH_PORT/" "$SSHD"
fi

sshd -t
systemctl reload sshd
echo "   Root SSH disabled; key-only auth for $DEPLOY_USER."

# ----------------------------------------------------------------------------
# 3. Firewall
# ----------------------------------------------------------------------------
echo "→ [3/7] Firewall (ufw)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

apt-get install -y -qq ufw

ufw default deny incoming
ufw default allow outgoing

if [[ "$SSH_PORT" == "22" ]]; then
  ufw limit OpenSSH
else
  ufw allow "${SSH_PORT}/tcp"
fi
ufw allow http
ufw allow https
ufw --force enable

# ----------------------------------------------------------------------------
# 4. fail2ban
# ----------------------------------------------------------------------------
if [[ "$INSTALL_FAIL2BAN" == "true" ]]; then
  echo "→ [4/7] fail2ban..."
  apt-get install -y -qq fail2ban
  cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3

[sshd]
enabled = true
EOF
  systemctl enable --now fail2ban
else
  echo "→ [4/7] fail2ban skipped."
fi

# ----------------------------------------------------------------------------
# 5. Unattended security upgrades
# ----------------------------------------------------------------------------
if [[ "$INSTALL_UNATTENDED_UPGRADES" == "true" ]]; then
  echo "→ [5/7] unattended-upgrades..."
  apt-get install -y -qq unattended-upgrades apt-listchanges
  dpkg-reconfigure -plow unattended-upgrades || true
else
  echo "→ [5/7] unattended-upgrades skipped."
fi

# ----------------------------------------------------------------------------
# 6. Optional Node.js
# ----------------------------------------------------------------------------
if [[ "$INSTALL_NODE" == "true" ]]; then
  echo "→ [6/7] Node.js ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
  corepack enable
  corepack prepare pnpm@latest --activate
else
  echo "→ [6/7] Node.js skipped."
fi

# ----------------------------------------------------------------------------
# 7. Optional nginx + certbot (HTTP only — HTTPS is manual after DNS)
# ----------------------------------------------------------------------------
if [[ "$INSTALL_NGINX" == "true" ]]; then
  echo "→ [7/7] nginx + certbot packages..."
  apt-get install -y -qq nginx certbot python3-certbot-nginx

  if [[ -n "$DOMAINS" ]]; then
    # Generic placeholder — replace proxy_pass / root in APP_HOOK or manually.
    cat > /etc/nginx/sites-available/app << EOF
server {
    listen 80;
    server_name $DOMAINS;

    location / {
        return 200 'Provisioned — configure app proxy in APP_HOOK or nginx site.\n';
        add_header Content-Type text/plain;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
  else
    echo "   No DOMAINS set — nginx installed but no site block written."
  fi
else
  echo "→ [7/7] nginx skipped."
fi

# ----------------------------------------------------------------------------
# Optional project hook
# ----------------------------------------------------------------------------
if [[ -n "$APP_HOOK" && -f "$APP_HOOK" ]]; then
  pause "About to run APP_HOOK: $APP_HOOK"
  echo "→ Running APP_HOOK as $DEPLOY_USER..."
  chmod +x "$APP_HOOK"
  sudo -u "$DEPLOY_USER" "$APP_HOOK"
elif [[ -n "$APP_HOOK" ]]; then
  echo "WARN: APP_HOOK=$APP_HOOK not found — copy your hook script to the server first."
fi

# ----------------------------------------------------------------------------
# Done — manual steps remain
# ----------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  Base provisioning complete"
echo "============================================"
echo ""
echo "Automated on this run:"
echo "  ✓ $DEPLOY_USER user (sudo, your SSH keys)"
echo "  ✓ SSH: root off, passwords off, AllowUsers $DEPLOY_USER"
echo "  ✓ UFW: deny incoming; SSH${SSH_PORT:+ (port $SSH_PORT)}, 80, 443"
[[ "$INSTALL_FAIL2BAN" == "true" ]] && echo "  ✓ fail2ban (sshd)"
[[ "$INSTALL_UNATTENDED_UPGRADES" == "true" ]] && echo "  ✓ unattended-upgrades"
[[ "$INSTALL_NODE" == "true" ]] && echo "  ✓ Node.js $NODE_MAJOR"
[[ "$INSTALL_NGINX" == "true" ]] && echo "  ✓ nginx (+ certbot CLI)"
echo ""
echo "MANUAL steps (script does NOT pause for these):"
echo ""
if [[ -n "$PRIMARY_DOMAIN" ]]; then
  echo "  1. DNS — point domains to this server IP:"
  for d in $DOMAINS; do echo "       $d → A record"; done
  echo ""
  echo "  2. HTTPS (after DNS propagates):"
  echo "       ssh ${DEPLOY_USER}@SERVER"
  echo "       sudo certbot --nginx -d $(echo "$DOMAINS" | sed 's/ / -d /g')"
  echo ""
fi
echo "  3. Deploy your app (git clone, env, systemd, nginx proxy_pass)."
echo "     Use APP_HOOK or a project-specific script for this."
echo ""
echo "  4. Verify SSH from a new session:"
echo "       ssh ${DEPLOY_USER}@SERVER"
echo "     Root login should fail."
echo ""
echo "Hetzner rescue if locked out: console → Rescue → mount disk → fix sshd_config."
echo ""
