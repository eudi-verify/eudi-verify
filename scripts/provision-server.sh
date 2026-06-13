#!/usr/bin/env bash
#
# EUDI Verify - Server Provisioning Script
#
# Run this on a fresh Ubuntu 24.04 server (Hetzner CX22 or similar).
# Prerequisites: SSH key already added to root via Hetzner console.
#
# Usage:
#   ssh root@your-server 'bash -s' < scripts/provision-server.sh
#
# Or copy to server and run:
#   scp scripts/provision-server.sh root@your-server:
#   ssh root@your-server ./provision-server.sh
#
set -euo pipefail

# ============================================================================
# Configuration — edit these
# ============================================================================
DEPLOY_USER="deploy"
DOMAIN="demo.eudi-verify.eu"
REPO_URL="https://github.com/eudi-verify/eudi-verify"

# ============================================================================
# 1. Create deploy user
# ============================================================================
echo "→ Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    
    # Copy SSH keys from root to deploy user
    mkdir -p /home/$DEPLOY_USER/.ssh
    cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    chmod 700 /home/$DEPLOY_USER/.ssh
    chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
    
    # Allow sudo without password (for deploy scripts)
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
    chmod 440 /etc/sudoers.d/$DEPLOY_USER
fi

# ============================================================================
# 2. SSH hardening
# ============================================================================
echo "→ Hardening SSH..."
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl reload sshd

# ============================================================================
# 3. Firewall
# ============================================================================
echo "→ Configuring firewall..."
apt-get update -qq
apt-get install -y -qq ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ============================================================================
# 4. Install Node.js 22
# ============================================================================
echo "→ Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y -qq nodejs

# Enable pnpm
corepack enable
corepack prepare pnpm@latest --activate

# ============================================================================
# 5. Install nginx + certbot
# ============================================================================
echo "→ Installing nginx and certbot..."
apt-get install -y -qq nginx certbot python3-certbot-nginx

# ============================================================================
# 6. Clone and build application
# ============================================================================
echo "→ Cloning application..."
APP_DIR="/opt/eudi-verify"
if [ ! -d "$APP_DIR" ]; then
    git clone "$REPO_URL" "$APP_DIR"
    chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"
fi

cd "$APP_DIR"
sudo -u $DEPLOY_USER pnpm install
sudo -u $DEPLOY_USER pnpm build

# ============================================================================
# 7. Create environment file
# ============================================================================
echo "→ Creating environment file..."
ENV_FILE="$APP_DIR/examples/html-vanilla/.env"
if [ ! -f "$ENV_FILE" ]; then
    TOKEN_SECRET=$(openssl rand -base64 32)
    cat > "$ENV_FILE" << EOF
TOKEN_SECRET=$TOKEN_SECRET
PORT=3000
NODE_ENV=production
BASE_URL=https://$DOMAIN/api/eudi
EOF
    chown $DEPLOY_USER:$DEPLOY_USER "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "   Generated TOKEN_SECRET (saved in $ENV_FILE)"
fi

# ============================================================================
# 8. Create systemd service
# ============================================================================
echo "→ Creating systemd service..."
cat > /etc/systemd/system/eudi-verify.service << EOF
[Unit]
Description=EUDI Verify Demo
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$APP_DIR/examples/html-vanilla
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node --import tsx server.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable eudi-verify
systemctl start eudi-verify

# ============================================================================
# 9. Configure nginx
# ============================================================================
echo "→ Configuring nginx..."

# Main demo site
cat > /etc/nginx/sites-available/eudi-verify << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Root domain redirect (302 temporary)
ROOT_DOMAIN="${DOMAIN#demo.}"  # Strips "demo." prefix → eudi-verify.eu
cat > /etc/nginx/sites-available/eudi-verify-redirect << EOF
server {
    listen 80;
    server_name $ROOT_DOMAIN www.$ROOT_DOMAIN;
    return 302 https://$DOMAIN\$request_uri;
}
EOF

ln -sf /etc/nginx/sites-available/eudi-verify /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/eudi-verify-redirect /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ============================================================================
# Done
# ============================================================================
echo ""
echo "============================================"
echo "  Server provisioned successfully!"
echo "============================================"
ROOT_DOMAIN="${DOMAIN#demo.}"
echo ""
echo "Next steps:"
echo "  1. Point DNS to this server's IP:"
echo "       $DOMAIN → A record"
echo "       $ROOT_DOMAIN → A record"
echo "       www.$ROOT_DOMAIN → A record (or CNAME to $ROOT_DOMAIN)"
echo "  2. Run: sudo certbot --nginx -d $DOMAIN -d $ROOT_DOMAIN -d www.$ROOT_DOMAIN"
echo "  3. Test: curl https://$DOMAIN"
echo ""
echo "SSH access:"
echo "  ssh $DEPLOY_USER@your-server-ip"
echo "  (root SSH is now disabled)"
echo ""
echo "Logs:"
echo "  sudo journalctl -u eudi-verify -f"
echo ""
