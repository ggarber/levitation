import SysTrayOriginal from 'systray2';
const SysTray = (SysTrayOriginal as any).default || SysTrayOriginal;
import open from 'open';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const ICON_CONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAAAAAAAAQCEeRdzAAACU0lEQVR4nGP89+8fAyMjIwO1AQsD9c2EGkwjgGJwa2srw6FDh4qAwcMaGhramZaWhlfzrFmzGFavXl3OxMT0287Orq+6uhq7wXv27Kk/cOBAA4j94MED+7CwMC8BAQGshn748IGhu7t72507dzxB/F8/f/IBDW7AanBISEgjzGCQhrlz5zIUFxdjNXjevHkMMEPBekNDG5DlUQxOSUlhmDZt2ppr166FgPj79+/PABo8A5vB+/bty4CxtbS01oD04jSYnZ2dITU1NbSwsPA/iP/ixQvDd+/eMQgJCaFoevf+HVgOxgfpAenFaTAIJCYmMkydOnU7yJtnz55NW7BgQXpRURGKmgXzFzCA5EBsFRWV7SA96ADDYH5+foac3Fyvgvx8sKuBBi/JzMyM4eTkBMt///4dLAZTn5OT4wXSQ9BgsKsTEhimTJ4MdvXly5ejly9fHpOUlASWA7IZQGL4XIvTYD4+Pobs7GwvWFhPmDBhSXx8fAyIPXHixMUwdVlZWV4gtUQbDALc3Fxw9tevX8X+//8PZX8RQ6jhxqUdt8FBQcFA101aefXq1fB79+657tixHSx+9+49NxCtra29Mjg4mHSDhYWFGYDhGgFMx+EgfkVF5QpkeZAcSA3JBoNAdHQ0KEyPPHr0yAbkcpi4nJzckejoKHxa8RssLi7OkJ6RbltdVf0fWTw9Pd1WXFyCfINBICU5hWH6tOknnjx5YgHiy8jInEDPvmQZLCYmxlBSUmK5devWEhDf29u7ByRGscEgkJ+fD8I9xKglyWByAM0MBgBZuuSA+pPyqwAAAABJRU5ErkJggg==';
const ICON_DISCONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAAAAAAAAQCEeRdzAAACU0lEQVR4nGP89+8fAyMjIwO1AQsD9c2EGkwjgGJwa2srw6FDh4qAwcMaGhramZaWhlfzrFmzGFavXl3OxMT0287Orq+6uhq7wXv27Kk/cOBAA4j94MED+7CwMC8BAQGshn748IGhu7t72507dzxB/F8/f/IBDW7AanBISEgjzGCQhrlz5zIUFxdjNXjevHkMMEPBekNDG5DlUQxOSUlhmDZt2ppr166FgPj79+/PABo8A5vB+/bty4CxtbS01oD04jSYnZ2dITU1NbSwsPA/iP/ixQvDd+/eMQgJCaFoevf+HVgOxgfpAenFaTAIJCYmMkydOnU7yJtnz55NW7BgQXpRURGKmgXzFzCA5EBsFRWV7SA96ADDYH5+foac3Fyvgvx8sKuBBi/JzMyM4eTkBMt///4dLAZTn5OT4wXSQ9BgsKsTEhimTJ4MdvXly5ejly9fHpOUlASWA7IZQGL4XIvTYD4+Pobs7GwvWFhPmDBhSXx8fAyIPXHixMUwdVlZWV4gtUQbDALc3Fxw9tevX8X+//8PZX8RQ6jhxqUdt8FBQcFA101aefXq1fB79+657tixHSx+9+49NxCtra29Mjg4mHSDhYWFGYDhGgFMx+EgfkVF5QpkeZAcSA3JBoNAdHQ0KEyPPHr0yAbkcpi4nJzckejoKHxa8RssLi7OkJ6RbltdVf0fWTw9Pd1WXFyCfINBICU5hWH6tOknnjx5YgHiy8jInEDPvmQZLCYmxlBSUmK5devWEhDf29u7ByRGscEgkJ+fD8I9xKglyWByAM0MBgBZuuSA+pPyqwAAAABJRU5ErkJggg==';

export function setupTray(deviceId: string, stopCallback: () => void) {
    if (os.platform() === 'win32') {
        console.log('\x1b[33mWarning:\x1b[0m System tray is not supported on Windows. Skipping.');
        return null;
    }

    const baseUrl = 'https://levitation.studio';
    const connectUrl = `${baseUrl}?instance=${deviceId}`;

    // Helper to get current menu state
    const getMenu = (connected: boolean) => ({
        icon: connected ? ICON_CONNECTED_BASE64 : ICON_DISCONNECTED_BASE64,
        title: '',
        tooltip: connected ? 'Levitation Client (Connected)' : 'Levitation Client (Disconnected)',
        isTemplateIcon: true,
        items: [
            {
                id: 1,
                title: connected ? 'Status: Connected' : 'Status: Disconnected',
                tooltip: 'Current connection status',
                checked: false,
                enabled: false, // Make enabled to ensure it updates visually
            },
            {
                id: 2,
                title: (SysTray as any).separator ? (SysTray as any).separator.title : '---',
                tooltip: '',
                checked: false,
                enabled: false,
            },
            {
                id: 3,
                title: 'Open Agent Manager',
                tooltip: 'Open the management UI in your browser',
                checked: false,
                enabled: true,
                click: () => {
                    open(connectUrl);
                }
            },
            {
                id: 4,
                title: (SysTray as any).separator ? (SysTray as any).separator.title : '---',
                tooltip: '',
                checked: false,
                enabled: false,
            },
            {
                id: 5,
                title: 'Stop Client',
                tooltip: 'Stop the background process',
                checked: false,
                enabled: true,
                click: () => {
                    stopCallback();
                }
            }
        ]
    });

    let systray: any;
    let isReady = false;
    let currentConnectedStatus: boolean = false;

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

        const menu = getMenu(false);
        systray = new (SysTray as any)({
            menu,
            debug: false,
            copyDir: false,
        });
        (systray as any).menu = menu;

        const readyPromise = typeof (systray as any).ready === 'function' ? (systray as any).ready() : (systray as any)._ready;

        if (readyPromise) {
            readyPromise.then(() => {
                isReady = true;
                console.log('\x1b[32m[Tray] System tray is ready\x1b[0m');
                applyStatus(currentConnectedStatus, true);

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
                        const menu = getMenu(currentConnectedStatus);
                        const item = menu.items.find((i: any) => i.id === action.item.id || (i.title === action.item.title));
                        if (item && (item as any).click) {
                            (item as any).click();
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

    function applyStatus(connected: boolean, force: boolean = false) {
        if (!systray || !isReady) return;

        const item = systray.menu.items[0];
        item.title = connected ? 'Status: Connected' : 'Status: Disconnected';

        try {
            systray.sendAction({
                type: 'update-item',
                item,
            });
        } catch (e) {
            console.error('[Tray] Failed to send update-menu action:', e);
        }
    }

    return {
        updateStatus: (connected: boolean) => {
            currentConnectedStatus = connected;
            applyStatus(connected);
        },
        refreshStatus: () => {
            applyStatus(currentConnectedStatus, true);
        },
        kill: () => {
            if (systray) systray.kill();
        }
    };
}