# Agent Information

## Project Structure
The detailed project structure and setup instructions are documented in the [README.md](./README.md).

## Development Guidelines
- **Package Manager**: Use `pnpm` for all dependency management and building.
- **Project Type**: This is a monorepo containing a `client` (CLI), a `server` (Web/WS server), and a `mobile` (React Native App).
- **Client**: Located in `client/`, written in TypeScript.
- **Server**: Located in `server/`, written in TypeScript using Express and `ws`.
- **Mobile**: Located in `mobile/`, a React Native application.

## Adding New Messages
When adding new message types or commands, you **MUST** update the following three components:
1.  **Client (`client/src/commands.ts` & `client/src/index.ts`)**: Implement the logic to handle the command.
2.  **Server (`server/src/index.ts`)**: Ensure any unique logging or routing for the message type is handled (though most are currently generic).
3.  **Web Dashboard (`server/static/index.html`)**: Add the new message type to the dropdown menu and provide a reasonable JSON body example in `BODY_EXAMPLES`.
