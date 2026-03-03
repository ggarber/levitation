# Levitation Server 🛰️

The Levitation Server is a Node.js-based WebSocket relay that connects remote agent clients to the web management dashboard.

## 🔒 SSL Configuration

Levitation supports secure connections (HTTPS and WSS) for both the web dashboard and the WebSocket relay server.

### 1. Configure the Server

To enable SSL, set the following environment variables when starting the server:

- `SSL_KEY`: Path to your private key file (e.g., `privkey.pem`).
- `SSL_CERT`: Path to your fullchain certificate file (e.g., `fullchain.pem`).
- `WEB_PORT`: (Optional) The port for the web dashboard (default: `10000`).
- `WS_PORT`: (Optional) The port for the WebSocket server (default: `9999`).

Example:
```bash
SSL_KEY=/etc/letsencrypt/live/domain.com/privkey.pem \
SSL_CERT=/etc/letsencrypt/live/domain.com/fullchain.pem \
pnpm dev
```

### 2. Generate certificates with Let's Encrypt

We recommend using [Certbot](https://certbot.eff.org/) for generating free SSL certificates.

#### **On Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install certbot
# Use --standalone if you don't have a web server running on port 80
sudo certbot certonly --standalone -d your-domain.com
```

#### **On GCP (Compute Engine) / RHEL / CentOS:**
GCP instances often run Debian, but if you are using a different distribution or want the recommended approach:

1. **Install Snapd** (if not present):
   ```bash
   sudo yum install snapd # RHEL/CentOS
   sudo systemctl enable --now snapd.socket
   sudo ln -s /var/lib/snapd/snap /snap
   ```
2. **Install Certbot via Snap**:
   ```bash
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

> **💡 GCP Tip:** Ensure your **VPC Firewall rules** allow incoming traffic on port `80` (for Let's Encrypt validation) and port `9999` / `10000` (for Levitation). You can do this in the GCP Console under *VPC Network > Firewall*.

Your certificates will be stored in `/etc/letsencrypt/live/your-domain.com/`.

### 3. Client Connection

When SSL is enabled, update your client connection URL to use `wss://` when connecting from the CLI:

```bash
node bin/levitation.js --connect wss://your-domain.com:9999
```
