import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { IncomingMessage, createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Duplex } from 'stream';
import fs from 'fs';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEB_PORT = parseInt(process.env.WEB_PORT || '10000');
const WS_PORT = parseInt(process.env.WS_PORT || '9999');

// SSL Configuration
const SSL_KEY_PATH = process.env.SSL_KEY;
const SSL_CERT_PATH = process.env.SSL_CERT;
const isSSLEnabled = !!(SSL_KEY_PATH && SSL_CERT_PATH);

let sslOptions: any = null;
if (isSSLEnabled) {
    try {
        sslOptions = {
            key: fs.readFileSync(SSL_KEY_PATH!),
            cert: fs.readFileSync(SSL_CERT_PATH!)
        };
        console.log(`\x1b[32m[SSL]\x1b[0m SSL enabled with key: ${SSL_KEY_PATH}, cert: ${SSL_CERT_PATH}`);
    } catch (err: any) {
        console.error(`\x1b[31m[SSL]\x1b[0m Failed to load SSL certificates: ${err.message}`);
        process.exit(1);
    }
}

const isVerbose = process.argv.includes('--verbose');

const app = express();

// Serve static files from the 'static' folder
const staticPath = path.join(__dirname, '../static');
app.use(express.static(staticPath));

// Store connections
const clients = new Map<string, WebSocket>();
const managers = new Map<string, WebSocket>();

interface ConnectionStats {
    instanceId: string;
    mode: 'client' | 'manager';
    ip: string;
    connectedAt: Date;
    messagesReceived: number;
    messagesSent: number;
    version?: string;
}
const connectionStats = new Map<WebSocket, ConnectionStats>();

// Store request ID mappings: requestId -> { managerWs, timeoutId }
const requestMappings = new Map<string, { managerWs: WebSocket, timeoutId: NodeJS.Timeout }>();

app.get('/stats', (req, res) => {
    let html = `
    <html>
    <head>
        <title>Levitation Stats</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; line-height: 1.5; background: #f4f7f6; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
            th { background-color: #0070f3; color: white; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .mode-client { color: #d9480f; font-weight: bold; }
            .mode-manager { color: #0070f3; font-weight: bold; }
        </style>
        <meta http-equiv="refresh" content="5">
    </head>
    <body>
        <h1>Levitation Server Statistics</h1>
        <table>
            <thead>
                <tr>
                    <th>Mode</th>
                    <th>Instance ID</th>
                    <th>IP Address</th>
                    <th>Connected At</th>
                    <th>Uptime</th>
                    <th>Recv</th>
                    <th>Sent</th>
                </tr>
            </thead>
            <tbody>
    `;

    const now = new Date();
    connectionStats.forEach((stats) => {
        const uptime = Math.floor((now.getTime() - stats.connectedAt.getTime()) / 1000);
        const formatUptime = (s: number) => {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            return `${h}h ${m}m ${sec}s`;
        };

        html += `
            <tr>
                <td class="mode-${stats.mode}">${stats.mode.toUpperCase()}</td>
                <td><code>${stats.instanceId}</code></td>
                <td>${stats.ip}</td>
                <td>${stats.connectedAt.toLocaleString()}</td>
                <td>${formatUptime(uptime)}</td>
                <td>${stats.messagesReceived}</td>
                <td>${stats.messagesSent}</td>
            </tr>
        `;
    });

    if (connectionStats.size === 0) {
        html += `<tr><td colspan="7" style="text-align: center; color: #666;">No active connections</td></tr>`;
    }

    html += `
            </tbody>
        </table>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">Auto-refreshing every 5 seconds</p>
    </body>
    </html>
    `;
    res.send(html);
});

const webServer = isSSLEnabled
    ? createHttpsServer(sslOptions, app)
    : createHttpServer(app);

webServer.listen(WEB_PORT, () => {
    console.log(`Web server listening on ${isSSLEnabled ? 'https' : 'http'}://localhost:${WEB_PORT}`);
});

const server = isSSLEnabled
    ? createHttpsServer(sslOptions)
    : createHttpServer();

const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        clientNoContextTakeover: false,
        serverNoContextTakeover: false,
        serverMaxWindowBits: 15,
        concurrencyLimit: 10,
        threshold: 1024
    }
});

server.listen(WS_PORT, () => {
    console.log(`WebSocket server listening on ${isSSLEnabled ? 'wss' : 'ws'}://localhost:${WS_PORT}`);
});

server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const mode = url.searchParams.get('mode');
    const device = url.searchParams.get('device');

    if (!mode || !device) {
        console.log(`\x1b[31m[WS]\x1b[0m Upgrade rejected: missing mode or device. URL: ${request.url}`);
        socket.write('HTTP/1.1 400 Bad Request\r\n' +
            'Content-Type: text/plain\r\n' +
            'Connection: close\r\n' +
            '\r\n' +
            'Missing mode or device parameter');
        socket.destroy();
        return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const mode = (url.searchParams.get('mode') || 'unknown') as 'client' | 'manager';
    const device = url.searchParams.get('device') || 'unknown';
    const version = url.searchParams.get('version') || undefined;
    const ip = req.socket.remoteAddress || 'unknown';

    console.log(`\x1b[32m[WS]\x1b[0m Connection established: mode=${mode}, device=${device}, ip=${ip}`);

    const stats: ConnectionStats = {
        instanceId: device,
        mode,
        ip,
        connectedAt: new Date(),
        messagesReceived: 0,
        messagesSent: 0,
        version
    };
    connectionStats.set(ws, stats);

    // Wrap send to log outgoing messages and track stats
    const originalSend = ws.send.bind(ws);
    ws.send = function (data: any, optionsOrCb?: any, cb?: any): void {
        stats.messagesSent++;

        if (isVerbose) {
            try {
                const text = data instanceof Buffer ? data.toString() : (typeof data === 'string' ? data : JSON.stringify(data));
                const message = JSON.parse(text);
                const type = message.type || 'unknown';
                const requestId = message.id;
                const length = data.length || data.toString().length;
                console.log(`\x1b[36m[WS]\x1b[0m Sent to ${mode} (${device}): \x1b[1mtype=${type}\x1b[0m (id=${requestId}) (length=${length})`);
            } catch {
                console.log(`\x1b[36m[WS]\x1b[0m Sent to ${mode} (${device}): \x1b[1m(binary or non-json)\x1b[0m`);
            }
        }

        if (typeof optionsOrCb === 'function') {
            originalSend(data, optionsOrCb);
        } else {
            originalSend(data, optionsOrCb, cb);
        }
    } as any;

    if (mode === 'client') {
        const existingClient = clients.get(device);
        if (existingClient) {
            console.log(`\x1b[33m[WS]\x1b[0m Disconnecting previous client with instance id ${device}`);
            existingClient.send(JSON.stringify({ type: 'Error', status: 'Conflict', body: 'Another instance connected' }));
            existingClient.close(1001, 'Another instance connected');
        }
        clients.set(device, ws);
    } else if (mode === 'manager') {
        const existingManager = managers.get(device);
        if (existingManager) {
            console.log(`\x1b[33m[WS]\x1b[0m Disconnecting previous manager with instance id ${device}`);
            existingManager.send(JSON.stringify({ type: 'Error', status: 'Conflict', body: 'Another instance connected' }));
            existingManager.close(1001, 'Another instance connected');
        }
        managers.set(device, ws);

        // Notify this new manager if there's already a client connected
        const clientWs = clients.get(device);
        if (clientWs) {
            const clientStats = connectionStats.get(clientWs);
            if (clientStats && clientStats.version) {
                ws.send(JSON.stringify({ type: 'ClientInfo', body: { version: clientStats.version } }));
            }
        }
    }

    if (mode === 'client' && version) {
        // Notify any active managers that a client has connected with this version
        const managerWs = managers.get(device);
        if (managerWs && managerWs.readyState === WebSocket.OPEN) {
            managerWs.send(JSON.stringify({ type: 'ClientInfo', body: { version } }));
        }
    }

    ws.on('message', (data: Buffer, isBinary: boolean) => {
        stats.messagesReceived++;

        const messageText = data.toString();
        let message: any;
        try {
            message = JSON.parse(messageText);
        } catch (err) {
            if (isVerbose) {
                console.log(`\x1b[34m[WS]\x1b[0m Received from ${mode} (${device}): \x1b[1m(binary or non-json)\x1b[0m`);
            }
            return;
        }

        const type = message.type || 'unknown';
        const requestId = message.id;

        if (isVerbose) {
            console.log(`\x1b[34m[WS]\x1b[0m Received from ${mode} (${device}): \x1b[1mtype=${type}\x1b[0m (id=${requestId}) (length=${data.length}) (isBinary=${isBinary})`);
        }

        if (type === 'Ping') {
            ws.send(JSON.stringify({ type: 'Pong', id: requestId }));
            return;
        }

        if (mode === 'manager') {
            if (requestId) {
                // Store mapping
                const timeoutId = setTimeout(() => {
                    const mapping = requestMappings.get(requestId);
                    if (mapping && mapping.managerWs === ws) {
                        console.log(`\x1b[31m[WS]\x1b[0m Timeout for request ${requestId}`);
                        ws.send(JSON.stringify({
                            type: 'Error',
                            id: requestId,
                            body: 'Request timed out',
                            description: 'timeout'
                        }));
                        requestMappings.delete(requestId);
                    }
                }, 60000);

                requestMappings.set(requestId, { managerWs: ws, timeoutId });
            }

            // Forward to client
            const clientWs = clients.get(device);
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                if (isVerbose) console.log(`\x1b[35m[WS]\x1b[0m Forwarding command to client ${device} (binary=${isBinary})`);
                clientWs.send(data, { binary: isBinary });
            } else {
                if (isVerbose) console.log(`\x1b[31m[WS]\x1b[0m No client connected for device ${device}`);
                if (requestId) {
                    const mapping = requestMappings.get(requestId);
                    if (mapping) {
                        clearTimeout(mapping.timeoutId);
                        requestMappings.delete(requestId);
                    }
                }
                ws.send(JSON.stringify({
                    type: 'Error',
                    id: requestId,
                    body: 'No client connected for this device ID'
                }));
            }
        } else if (mode === 'client') {
            if (requestId) {
                const mapping = requestMappings.get(requestId);
                if (mapping) {
                    if (isVerbose) console.log(`\x1b[35m[WS]\x1b[0m Forwarding response to specific manager for request ${requestId} (binary=${isBinary})`);
                    if (mapping.managerWs.readyState === WebSocket.OPEN) {
                        mapping.managerWs.send(data, { binary: isBinary });
                    }
                    clearTimeout(mapping.timeoutId);
                    requestMappings.delete(requestId);
                } else {
                    if (isVerbose) console.log(`\x1b[33m[WS]\x1b[0m Received response for unknown or expired request ${requestId}`);
                }
            } else {
                // Forward back to the manager for this device
                const managerWs = managers.get(device);
                if (managerWs && managerWs.readyState === WebSocket.OPEN) {
                    if (isVerbose) console.log(`\x1b[35m[WS]\x1b[0m Forwarding broadcast response to manager (binary=${isBinary})`);
                    managerWs.send(data, { binary: isBinary });
                }
            }
        }
    });

    ws.on('close', () => {
        console.log(`\x1b[33m[WS]\x1b[0m Connection closed: mode=${mode}, device=${device}`);
        connectionStats.delete(ws);
        if (mode === 'client') {
            if (clients.get(device) === ws) {
                clients.delete(device);
            }
        } else if (mode === 'manager') {
            if (managers.get(device) === ws) {
                managers.delete(device);
            }
            // Cleanup pending requests for this manager
            for (const [requestId, mapping] of requestMappings.entries()) {
                if (mapping.managerWs === ws) {
                    clearTimeout(mapping.timeoutId);
                    requestMappings.delete(requestId);
                }
            }
        }
    });
});

// WebSocket server is already listening

