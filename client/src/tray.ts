import SysTrayOriginal from 'systray2';
const SysTray = (SysTrayOriginal as any).default || SysTrayOriginal;
import open from 'open';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const ICON_CONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAIAAABL1vtsAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAARGVYSWZNTQAqAAAACAABh2kABAAAAAEAAAAaAAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAAWoAMABAAAAAEAAAAWAAAAABwhM1oAAAHJaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4zMjwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4zMjwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqWsr5jAAAB90lEQVQ4EaVUzU7CQBCebetJE6sxRk/G6EGRA4niVV5AifJYylnp2Z+EB4AErvoM1ugzSEQhIZau3+y22y3WC06a7fx9387MbivI80gSCcpkxswCVJBJ0iVHkBAcm1OEx8C58ap2Z869NUzt/T8KRaQaQT2ml+mUDUzHcWcLjKckkSfIzYUwTodkeh4y3trerlQq49F4PBoxkREZr62vV4+PMf6PwSALcQoOFY+rHqLzi8Z3FF01m4xFIdqvtr1sNqMoumg0OJT4FTZPIVZWVp/Dl9e3t43NzSyVCCacYRgigUvQFGr7/Dg9dzB4b7fbuzs7J7UaU6QCE06EkDAzi3wj4CaxVyoNh8NOt+vA5F5cKJ1uB06E1DjTxvUQco0ojLewcHv/MJlMDqtHuojDahXm3f0DQtaA1CDAQp6bjVN3SHRar0spr1stTXF904J5Vq+zqXPslSlsG7oQy77/+PQEWBAErSCAAtP3/WyQBpJUYWyjEJUOyr1eD2BIv98/KJeLS/A8wVWYq6Xr1us0Wlxa2tvfhxU+h6OvTy62SH5R2Jc9jknGjBIOX+JCAUHiN0jzsSDAsD+Qhk4aCu2yvgl22HRmDwNOlXQTO9sGz5CmMPttNWK7NdJeES2m4x+fwLC4ZmTgaJI8bWvWRMfpcpD/AFDVW2k/vYmisbCj7V4AAAAASUVORK5CYIIo';
const ICON_DISCONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAIAAABL1vtsAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAARGVYSWZNTQAqAAAACAABh2kABAAAAAEAAAAaAAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAAWoAMABAAAAAEAAAAWAAAAABwhM1oAAAHJaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4zMjwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4zMjwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqWsr5jAAAB90lEQVQ4EaVUzU7CQBCebetJE6sxRk/G6EGRA4niVV5AifJYylnp2Z+EB4AErvoM1ugzSEQhIZau3+y22y3WC06a7fx9387MbivI80gSCcpkxswCVJBJ0iVHkBAcm1OEx8C58ap2Z869NUzt/T8KRaQaQT2ml+mUDUzHcWcLjKckkSfIzYUwTodkeh4y3trerlQq49F4PBoxkREZr62vV4+PMf6PwSALcQoOFY+rHqLzi8Z3FF01m4xFIdqvtr1sNqMoumg0OJT4FTZPIVZWVp/Dl9e3t43NzSyVCCacYRgigUvQFGr7/Dg9dzB4b7fbuzs7J7UaU6QCE06EkDAzi3wj4CaxVyoNh8NOt+vA5F5cKJ1uB06E1DjTxvUQco0ojLewcHv/MJlMDqtHuojDahXm3f0DQtaA1CDAQp6bjVN3SHRar0spr1stTXF904J5Vq+zqXPslSlsG7oQy77/+PQEWBAErSCAAtP3/WyQBpJUYWyjEJUOyr1eD2BIv98/KJeLS/A8wVWYq6Xr1us0Wlxa2tvfhxU+h6OvTy62SH5R2Jc9jknGjBIOX+JCAUHiN0jzsSDAsD+Qhk4aCu2yvgl22HRmDwNOlXQTO9sGz5CmMPttNWK7NdJeES2m4x+fwLC4ZmTgaJI8bWvWRMfpcpD/AFDVW2k/vYmisbCj7V4AAAAASUVORK5CYIIo';

export function setupTray(deviceId: string, stopCallback: () => void) {
    if (os.platform() === 'win32') {
        console.log('\x1b[33mWarning:\x1b[0m System tray is not supported on Windows. Skipping.');
        return null;
    }

    const baseUrl = 'https://levitation.studio';
    const connectUrl = `${baseUrl}?instance=${deviceId}`;

    const menu = {
        icon: ICON_DISCONNECTED_BASE64,
        title: '',
        tooltip: 'Levitation Client (Disconnected)',
        isTemplateIcon: true,
        items: [
            {
                title: 'Open Agent Manager',
                tooltip: 'Open the management UI in your browser',
                checked: false,
                enabled: true,
                click: () => {
                    open(connectUrl);
                }
            },
            {
                title: (SysTray as any).separator ? (SysTray as any).separator.title : '---',
                tooltip: '',
                checked: false,
                enabled: false,
            },
            {
                title: 'Stop Client',
                tooltip: 'Stop the background process',
                checked: false,
                enabled: true,
                click: () => {
                    stopCallback();
                }
            }
        ]
    };

    let systray: any;
    let isReady = false;
    let lastConnectedStatus: boolean | null = null;

    try {
        if (os.platform() === 'darwin') {
            try {
                const systrayDir = path.dirname(require.resolve('systray2/package.json'));
                const binPath = path.join(systrayDir, 'traybin', 'tray_darwin_release');
                if (fs.existsSync(binPath)) {
                    fs.chmodSync(binPath, 0o755);
                }
            } catch (e) { /* ignore */ }
        }

        systray = new (SysTray as any)({
            menu: menu,
            debug: false,
            copyDir: false,
        });

        const readyPromise = typeof (systray as any).ready === 'function' ? (systray as any).ready() : (systray as any)._ready;

        if (readyPromise) {
            readyPromise.then(() => {
                isReady = true;
                console.log('\x1b[32m[Tray] System tray is ready\x1b[0m');

                // If we got a status update before we were ready, apply it now
                if (lastConnectedStatus !== null) {
                    applyStatus(lastConnectedStatus);
                }

                if (systray?._process) {
                    systray._process.on('error', (err: any) => {
                        console.warn('[Tray] Process error:', err.message);
                    });
                    if (systray._process.stderr) {
                        systray._process.stderr.on('data', (data: any) => {
                            console.warn('[Tray] Binary stderr:', data.toString());
                        });
                    }
                    systray._process.on('exit', (code: number) => {
                        console.warn('[Tray] Binary exited with code:', code);
                    });
                }

                systray.onClick((action: any) => {
                    try {
                        if (action.item.click) {
                            action.item.click();
                        }
                    } catch (e) {
                        console.error('[Tray] Click error:', e);
                    }
                });
            }).catch((err: any) => {
                console.warn('[Tray] Initialization failed:', err instanceof Error ? err.message : String(err));
            });
        }
    } catch (err) {
        console.warn('[Tray] Construction failed:', err instanceof Error ? err.message : String(err));
        return null;
    }

    function applyStatus(connected: boolean) {
        if (!systray || !systray._process || !isReady) return;

        // Note: Currently both icons are the same, but we update the tooltip
        menu.icon = connected ? ICON_CONNECTED_BASE64 : ICON_DISCONNECTED_BASE64;
        menu.title = '';
        menu.tooltip = connected ? 'Levitation Client (Connected)' : 'Levitation Client (Disconnected)';
        (menu as any).isTemplateIcon = true;

        try {
            systray.sendAction({
                type: 'update-menu',
                menu: menu
            });
        } catch (e) { /* ignore */ }
    }

    return {
        updateStatus: (connected: boolean) => {
            lastConnectedStatus = connected;
            applyStatus(connected);
        },
        kill: () => {
            if (systray) systray.kill();
        }
    };
}