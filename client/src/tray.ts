import SysTrayOriginal from 'systray2';
const SysTray = (SysTrayOriginal as any).default || SysTrayOriginal;
import open from 'open';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const ICON_CONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAIAAABL1vtsAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAFqADAAQAAAABAAAAFgAAAAAcITNaAAAB40lEQVQ4EZ1Uu27CQBA8m4AISgcCJB4lLURJC3QgUZO4dSj5hODa+QWQoMP8RFzTgQJKGj4AIToeAiFkOwOLFseKFMVXWLM3O3N7e74TQoh4PK7rb7ZtO46D758DaZZl67oOIeQiFolsNJhPM+hgQQh54bbWfKvWT2f9HIpGwLEuybUuS5P/LrwpZkqRr5AvdOI4gE/QCe1sul+Hb8OPDYyQS8RjudrvRaLTf79HFfD5/XRv9p0au1+t0Ok2yUqm0Wq3cDUZYLpeJTaVSaxcr2AJAURReudvtui16vR5TivLMKuRcLRCYpsnlFYtFdJtcAFAXWSDBNN/d7j8sDofD/X2BUoPBIHZOqePxGCHNFwoFpLktcJwOVxgKhVRVpfB4PPb7fcKGYSAk/KKqSCN8+bp3Be/5fB6NRonLZDKbzWa73WazWZoBhQR3CcA/NkJco9HgRQyjPxgMOATl0ZPFpWfMDYdDWb78r3fnQRaYBMVpDFCF1wJcs9nklRlgkmVu8LsFeq5prctdPr8GmqZ5DoJdcM1s/hd4QQKLxWI2mwHncrlkMulhOZRgxoE/IE+nU39KUn19folKpcK78gGq1aoIBALtdtuHGJJOpwP5qRy0s1arfZxfUHT3zwExXhZI6By+AZRD1SOBHcw1AAAAAElFTkSuQmCC';
const ICON_DISCONNECTED_BASE64 = ICON_CONNECTED_BASE64;

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