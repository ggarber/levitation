# Levitation Project

This project consists of two main components: a client CLI and a server dashboard.

## Project Structure

- **`client/`**: A TypeScript CLI tool (`levitation`) that searches for language server processes and can execute commands via parameters or a WebSocket connection.
- **`server/`**: A TypeScript server that provides:
  - A Web Server (Port 10000) serving a dashboard UI.
  - A WebSocket Server (Port 9999) for relaying commands between the dashboard and connected clients.

## Getting Started

### Prerequisites
- Node.js
- pnpm

### Installation

```bash
# Install dependencies for all projects
pnpm install -r
```

### Running the Project

#### 1. Start the Server
```bash
cd server
pnpm dev
```
The dashboard will be available at `http://localhost:10000`.

#### 2. Start the Client (WebSocket Mode)
```bash
cd client
pnpm build
node bin/levitation.js --connect ws://localhost:9999
```

#### 3. Start the Client (CLI Mode)
```bash
cd client
pnpm build
node bin/levitation.js --EnumerateProcesses
node bin/levitation.js --GetAllCascadeTrajectories
```

## Dashboard Features
- **Status**: Visual indicator of the WebSocket connection.
- **Send Message**: Send JSON-formatted commands (like `EnumerateProcessesRequest` or `GetAllCascadeTrajectoriesRequest`) to connected clients.
- **Activity Log**: Real-time view of all WebSocket traffic.
