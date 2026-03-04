import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const SERVICE_LABEL = 'com.levitation.client';

export function installService(connectUrl: string) {
    if (os.platform() !== 'darwin') {
        console.warn('\x1b[33mWarning:\x1b[0m install-service is currently only supported on macOS.');
        return;
    }

    const homeDir = os.homedir();
    const plistPath = path.join(homeDir, 'Library/LaunchAgents', `${SERVICE_LABEL}.plist`);
    const configDir = path.join(homeDir, '.levitation');
    const serviceLog = path.join(configDir, 'service.log');

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Try to find the absolute path of the script
    // If we're running via npx or global install, it could be anywhere.
    // We'll assume for now that it's in the current repo if building from source,
    // or we'll try to find it from the executable.

    // In this project context, it's /Users/ggarber/projects/levitation/client/bin/levitation.js
    const scriptPath = path.resolve(process.argv[1]);
    const nodePath = process.execPath;

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${scriptPath}</string>
        <string>--connect</string>
        <string>${connectUrl}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${serviceLog}</string>
    <key>StandardErrorPath</key>
    <string>${serviceLog}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>`;

    try {
        fs.writeFileSync(plistPath, plistContent, 'utf8');
        console.log(`\x1b[32mInstalled launchd service:\x1b[0m ${plistPath}`);

        // Load the service
        try {
            execSync(`launchctl unload ${plistPath}`, { stdio: 'ignore' });
        } catch (e) {
            // Ignore error if service is not currently loaded
        }
        execSync(`launchctl load ${plistPath}`);

        console.log('\x1b[32mService loaded and started.\x1b[0m It will now start automatically upon login.');
        console.log(`Logs available at: ${serviceLog}`);
    } catch (err: any) {
        console.error(`\x1b[31mError writing or loading plist:\x1b[0m ${err.message}`);
    }
}

export function uninstallService() {
    if (os.platform() !== 'darwin') {
        console.warn('\x1b[33mWarning:\x1b[0m uninstall-service is currently only supported on macOS.');
        return;
    }

    const plistPath = path.join(os.homedir(), 'Library/LaunchAgents', `${SERVICE_LABEL}.plist`);

    if (!fs.existsSync(plistPath)) {
        console.log('\x1b[33mWarning:\x1b[0m No service file found.');
        return;
    }

    try {
        execSync(`launchctl unload ${plistPath}`);
        fs.unlinkSync(plistPath);
        console.log('\x1b[32mService uninstalled successfully.\x1b[0m');
    } catch (err: any) {
        console.error(`\x1b[31mError uninstalling service:\x1b[0m ${err.message}`);
    }
}
