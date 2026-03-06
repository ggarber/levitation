# Levitation 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0_beta-blue)](https://github.com/ggarber/levitation)

**Levitation** is an unofficial management suite for Google Antigravity agents. It provides a powerful CLI and a beautiful web-based dashboard to monitor, manage, and interact with your agent workspaces across different environments.

🚀 **Try it now**: Levitation is deployed as a free service at [https://levitation.studio](https://levitation.studio)

![Levitation Banner](https://raw.githubusercontent.com/ggarber/levitation/main/web/public/diagram.png) *(Placeholder for project banner)*

## 🌟 Features

-   **Centralized Control**: Manage multiple client instances through a single dashboard.
-   **Real-time Monitoring**: Stream logs and activity from your agents directly to your browser.
-   **Process Management**: Enumerate and interact with language server processes.
-   **Workspace Tracking**: Deep integration with Antigravity workspace structures and cascades.
-   **Modern Web UI**: A sleek, responsive dashboard built with Next.js, Tailwind CSS, and Lucide icons.
-   **Cross-platform**: Support for macOS, Linux, and Windows clients.
-   **Mobile Access**: Access your dashboard on the go via our Mobile PWA (Progressive Web App). (Note: The standalone React Native app is currently under development and not yet functional).

## 🏗️ Project Structure

-   `web/`: Web Agent Manager (PWA).
-   `client/`: TypeScript CLI tool that runs on agent machines.
-   `server/`: Node.js WebSocket relay server.
-   `mobile/`: (WIP) React Native mobile application.

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (v18 or later)
-   **pnpm** (Recommended) or npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ggarber/levitation.git
cd levitation

# Install dependencies for all packages
pnpm install
```

### Running the Environment

#### 1. Start the Relay Server & Dashboard
```bash
cd server
pnpm dev
```
The websocket server will be available at `ws://localhost:9999` (or the configured port).
The dashboard will be available at `http://localhost:10000` (or the configured port).

#### 2. Start a Client
In a new terminal:
```bash
cd client
pnpm build
node bin/levitation.js --connect ws://localhost:9999
```

#### 3. Development Mode (Web)
To work on the dashboard UI:
```bash
cd web
pnpm dev
```

## 📱 Mobile PWA

While the dedicated mobile app (`mobile/`) is under construction, Levitation is fully optimized as a **Progressive Web App (PWA)**.

To "install" Levitation on your phone:
1. Open the dashboard URL in your mobile browser (Safari on iOS, Chrome on Android).
2. Use the **"Add to Home Screen"** option in your browser menu.
3. Levitation will now appear as a standalone app on your home screen with its own icon and a full-screen, app-like experience.

## 🔒 SSL Configuration

Secure connections (HTTPS/WSS) are supported and recommended for production deployments. Detailed instructions on how to configure SSL and generate certificates with Let's Encrypt can be found in the [Server README](./server/README.md).

## 🛠️ Usage

Once the client is connected, you can use the dashboard to:
-   View connected instances.
-   Browse workspaces.
-   Trigger `EnumerateProcesses` to see active agents.
-   Monitor live logs from the `client` logic.

## 🤝 Contributing

Contributions are welcome! Please see [AGENTS.md](./AGENTS.md) for technical details and development guidelines.

## 📄 License

This project is licensed under the MIT License.

---

*Note: This is an unofficial tool and is not affiliated with Google or the official Antigravity team.*
