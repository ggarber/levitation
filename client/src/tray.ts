import SysTray from 'systray2';
import open from 'open';
import path from 'path';
import os from 'os';

const ICON_CONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAADEUlEQVRIDb1WzU4bMRAee0O5lIqfcksoEtcSgniMIrXKIzRPUXiCNg3lXEqb12gieIdwB+WHA4dWqtoeQKLrfuNZnLW9oRGCrlYbz8w33zf22AZFpRIZ4kfZb/4Dv+eEIdA86MbnIS2AsSYhrUjFQZ/i7pbSnFtU1t05/cySb96rZdfFzuBeacdkdmEeUsBK/R+Bh9tERGhyRA9Haij9k61mMnkjAHl9ncG0JtmTYiNke6ColJAJNMzjubmNatUYMxqORqOhl5nx2cLStLyyslKpKKV6Jye/f/4KjxQT4yTjRZnu1Xrx6TKIIdDpdBRKS5JxVGCckiD0tdPhOs7PF5eXuQ5H4mAFAkgmarZayLy6uqpubnLR+UypiQghAAB739oLMbcJIEa0Xtu8vLy0ya0w+UYAvAAAVq3ZInhauTeDyU8QsNPvdLvIH46G84tLvLgOgxSt4USDAOh2u9kyFglMuIuUMmn6pd1G7ZVyZXv7BRn/pkpTOCvlMgCf222Aw/byrOWJZyCVKv1kYWEwGKDGo+MjpXHvulajvcnR8TFCAADG7Q3KB4kwFzRZBBAmettsggWdrG1tcT0SIoIp7X3XbGb+yQJJgbjoEz3fqEmr9/Y/5AX29vchjND6Rm3sF3n3FUk+aLF4BsKyaBwFcF1cXFRWV5kLXXm2ChPOcXsdaTxggdgLD1TxEr2s18GFB2e10Wi8bjR6vZ54XtXrLFiYLk5mmCSQpSU6ST4eHAhj/vvp8BChXOdzJ8BJ/lsACK1nHs2+2dnp9/upffqDwc7u7szsLEK3lQ+ZUqnwsuN5e49JKU3nl5bW1tbgPz09+/H9G7Pnr08vYWxEAnKx+qcqg+MCl+OGU40zMc0D+hAm1JCJNaYk9RlzfzKl9ltm4GdOZRnKCUhGXDj8ojoVpQ/CWvoOa4HOzcaNY1yhauD0ZhDULtBCZyzmPAGe4hmA14Fk4Mx8CIzOj3FQuNPzdpEDxQNH4UKOwg2CEOTZo7BNFY4L9rc1pS78v+3yMqCzLcKFcXfcJPIvT4o9ikf8NeYvmvwju4yZrZMAAAAASUVORK5CYII=';

// Same icon but desaturated/grayed out for disconnected status
const ICON_DISCONNECTED_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAAArjS9YAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAwUExURf///8DAwICAgP///8DAwICAgP///8DAwICAgP///8DAwICAgP///8DAwICAgP///5ve7mYAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAedEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPR6HzUAAAC5SURBVBhXY2AAATHmAsYIAsZ9YIKZgZ0BA5iBgwEDmIGDAQOYgYMBA5iBgwEDmIGDAQOYgYMBA5iBgwEDmIGDAQOYgYMBA5iBgwEDmIGDAQOYgYMBA5iBgwEDmIGDAZ0BGxjAyIDMgA0MYGRAZsAGBjAyIDNgAwMYGZAZsIEBjAzIDNjAAEah79+fR6MAn6NRgM/RTIAu9On789EoQNAn6NOn6BMBunpA69OnT9Angp56AAIDMvQJIDAgQw8pBwB8fWIdM2tFfAAAAABJRU5ErkJggg==';

export function setupTray(deviceId: string, stopCallback: () => void) {
    const baseUrl = 'https://levitation.studio';
    const connectUrl = `${baseUrl}?instance=${deviceId}`;

    const menu = {
        icon: ICON_DISCONNECTED_BASE64,
        title: 'Levitation',
        tooltip: 'Levitation Client (Disconnected)',
        items: [
            {
                title: 'Open Web Interface',
                tooltip: 'Open the management UI in your browser',
                checked: false,
                enabled: true,
                click: () => {
                    open(connectUrl);
                }
            },
            {
                title: 'Copy Connection URL',
                tooltip: 'Copy the connection URL to clipboard',
                checked: false,
                enabled: true,
                click: () => {
                    // We can't easily copy to clipboard in a headles process without extra packages
                    // But we can at least log it
                    console.log(`Connection URL: ${connectUrl}`);
                }
            },
            {
                title: '---',
                tooltip: '',
                checked: false,
                enabled: true,
            },
            {
                title: 'Stop Client',
                tooltip: 'Stop the background process',
                checked: false,
                enabled: true,
                click: () => {
                    stopCallback();
                }
            },
            {
                title: 'Exit Tray',
                tooltip: 'Close the tray icon',
                checked: false,
                enabled: true,
                click: () => {
                    systray.kill();
                }
            }
        ]
    };

    const systray = new (SysTray as any)({
        menu: menu,
        debug: false,
        copyDir: true, // copy binary to a temporary directory
    });

    systray.onClick((action: any) => {
        if (action.item.click) {
            action.item.click();
        }
    });

    systray.onReady(() => {
        console.log('System tray icon is ready');
    });

    return {
        updateStatus: (connected: boolean) => {
            menu.icon = connected ? ICON_CONNECTED_BASE64 : ICON_DISCONNECTED_BASE64;
            menu.tooltip = connected ? 'Levitation Client (Connected)' : 'Levitation Client (Disconnected)';
            systray.sendAction({
                type: 'update-menu',
                menu: menu
            });
        },
        kill: () => systray.kill()
    };
}
