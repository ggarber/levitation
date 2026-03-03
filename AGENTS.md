# Levitation AGENTS Guide

This document provides technical details for developers and AI agents working on the Levitation project.

## Architecture Overview

Levitation is a cross-platform tool for managing and monitoring Google Antigravity language server processes. It uses a hub-and-spoke model:

1.  **Server (`/server`)**: A Node.js application that acts as a central relay.
    -   **Web Server**: Serves the React-based dashboard (via the `/web` build).
    -   **WebSocket Server**: Relays JSON messages between connected CLI clients and the web dashboard.
2.  **Web Dashboard (`/web`)**: A modern Next.js/React application for visualizing and interacting with clients.
    -   Displays active workspaces and cascades.
    -   Provides real-time log monitoring.
    -   Allows triggering commands like process enumeration.
3.  **Client CLI (`/client`)**: A TypeScript-based agent that runs on the target machine.
    -   Connects to the server via WebSocket.
    -   Executes commands (e.g., searching for workspace files, enumerating processes).
    -   Reports status and logs back to the server.
4.  **Mobile App (`/mobile`)**: A React Native application (Experimental) for remote monitoring.

## Common Workflows

### Adding a New Command
To implement a new feature that requires client-side execution:
1.  **Define Request/Response types** in `client/src/index.ts`.
2.  **Implement handler** in `client/src/index.ts` within the WebSocket message listener.
3.  **Update Web Dashboard** in `web/src/hooks/useClient.tsx` to include a function to trigger the command and handle the response state.
4.  **Update UI** in `web/src/components/` to provide a way to trigger the new command.

### Protocol Specification
All communication happens over WebSockets using stringified JSON messages.
-   **Client Identifiers**: Clients identify themselves with a unique `instanceId`.
-   **Workspace/Cascade Logic**: The dashboard organizes data by workspace. Each workspace can have multiple "cascades" (trajectories of actions).

## Development Guidelines
-   **Package Management**: Use `pnpm`. Run `pnpm install` from the root.
-   **UI Design**: Follow the established sleek, dark-mode friendly design system in `/web`. Use `lucide-react` for icons and `tailwind-merge` for style management.
-   **Error Handling**: Always handle WebSocket disconnections gracefully. The client should attempt to reconnect or report its status clearly.
-   **Git Guidelines**:
    -   Use [Conventional Commits](https://www.conventionalcommits.org/).
    -   Use short, descriptive commit messages.
    -   Keep commits small with a single responsibility.

## Key Files
-   `web/src/hooks/useClient.tsx`: The heart of the web application's state management and communication logic.
-   `client/src/index.ts`: The main entry point for the client-side logic.
-   `server/src/index.ts`: The WebSocket relay logic.
