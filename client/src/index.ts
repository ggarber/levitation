import { Command } from 'commander';
import process from 'process';
import WebSocket from 'ws';
import { spawn } from 'child_process';
import {
    EnumerateWorkspaces,
    GetAllCascadeTrajectoriesData,
    GetAllWorkflowsData,
    StartCascadeData,
    SendUserCascadeMessageData,
    GetWorkspaceInfosData,
    StreamCascadeReactiveUpdatesData,
    GetCascadeTrajectoryData,
    CancelCascadeInvocationData
} from './commands.js';
import zlib from 'zlib';
import crypto from 'crypto';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import os from 'os';
import path from 'path';


// Suppress the 'NODE_TLS_REJECT_UNAUTHORIZED' warning
const originalEmit = process.emit;
(process as any).emit = function (name: string, data: any, ...args: any[]) {
    if (
        name === 'warning' &&
        typeof data === 'object' &&
        data.message &&
        data.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')
    ) {
        return false;
    }
    return originalEmit.apply(process, [name, data, ...args] as any);
};

const DEFAULT_CONNECT_URL = 'ws://server.levitation.studio:9999';
const CONFIG_DIR = path.join(os.homedir(), '.levitation');
const PID_FILE = path.join(CONFIG_DIR, 'client.pid');
const LOG_FILE = path.join(CONFIG_DIR, 'client.log');

if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

const program = new Command();

program
    .name('levitation')
    .description('A basic CLI tool for levitation')
    .version('1.0.0');

program
    .option('--EnumerateWorkspaces', 'Search for workspaces from language_* processes')
    .option('--GetAllCascadeTrajectories', 'Execute GetAllCascadeTrajectories request')
    .option('--GetAllWorkflows', 'Execute GetAllWorkflows request')
    .option('--GetWorkspaceInfos', 'Execute GetWorkspaceInfos request')
    .option('--StartCascade', 'Start a new cascade and get an ID')
    .option('--SendUserCascadeMessage', 'Send a message to a cascade')
    .option('--StreamCascadeReactiveUpdates', 'Execute StreamCascadeReactiveUpdates request')
    .option('--GetCascadeTrajectory', 'Execute GetCascadeTrajectory request')
    .option('--text <text>', 'Text for the cascade message')
    .option('--cascade <id>', 'Cascade ID to use for the message')
    .option('--port <number>', 'Specify the port to use for the request')
    .option('-v, --verbose', 'Log full body of requests and responses')
    .option('--connect <url>', 'Connect to a WebSocket server for remote commands')
    .action(async (options) => {
        if (options.connect) {
            await connectWebSocket(options.connect, options.verbose);
        } else if (options.EnumerateWorkspaces) {
            const enrichedWorkspaces = await EnumerateWorkspaces(options.verbose);
            printWorkspaces(enrichedWorkspaces as any[]);
        } else if (options.GetAllCascadeTrajectories) {
            const data = await GetAllCascadeTrajectoriesData(options.port, options.verbose);
            printTrajectories(data);
        } else if (options.GetAllWorkflows) {
            const data = await GetAllWorkflowsData(options.port, options.verbose);
            printWorkflows(data);
        } else if (options.GetWorkspaceInfos) {
            const data = await GetWorkspaceInfosData(options.port, options.verbose);
            printWorkspaceInfos(data);
        } else if (options.StartCascade) {
            const data = await StartCascadeData(options.port, options.verbose);
            console.log('Cascade Started:', JSON.stringify(data, null, 2));
        } else if (options.SendUserCascadeMessage) {
            if (!options.text) {
                console.error('Error: --text is required for --SendUserCascadeMessage');
                return;
            }
            let cascadeId = options.cascade;
            if (!cascadeId) {
                console.log('No cascade ID provided, starting a new one...');
                const startData = await StartCascadeData(options.port, options.verbose);
                cascadeId = startData.cascadeId;
                if (!cascadeId) {
                    console.error('Failed to start cascade and get an ID.');
                    return;
                }
                console.log(`Started new cascade: ${cascadeId}`);
            }
            const data = await SendUserCascadeMessageData(options.text, cascadeId, options.port, options.verbose);
            console.log('Message Sent:', JSON.stringify(data, null, 2));
        } else if (options.StreamCascadeReactiveUpdates) {
            if (!options.cascade) {
                console.error('Error: --cascade is required for --StreamCascadeReactiveUpdates');
                return;
            }
            const data = await StreamCascadeReactiveUpdatesData(options.cascade, options.port, options.verbose);
            console.log('Updates Received:', JSON.stringify(data, null, 2));
        } else if (options.GetCascadeTrajectory) {
            if (!options.cascade) {
                console.error('Error: --cascade is required for --GetCascadeTrajectory');
                return;
            }
            const data = await GetCascadeTrajectoryData(options.cascade, options.port, options.verbose);
            console.log('Trajectory Received:', JSON.stringify(data, null, 2));
        } else if (!process.argv.slice(2).some(arg => ['start', 'stop', 'logs'].includes(arg))) {
            program.help();
        }
    });

program
    .command('start')
    .description('Start the levitation-client as a background process')
    .option('--connect <url>', 'Connect to a WebSocket server for remote commands', DEFAULT_CONNECT_URL)
    .option('-v, --verbose', 'Log full body of requests and responses')
    .action(async (options) => {
        if (fs.existsSync(PID_FILE)) {
            const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
            if (isProcessRunning(pid)) {
                console.log(`\x1b[33mWarning:\x1b[0m levitation-client is already running (PID: ${pid})`);
                return;
            }
        }

        const logFd = fs.openSync(LOG_FILE, 'a');
        const args = [process.argv[1], '--connect', options.connect];
        if (options.verbose) args.push('--verbose');

        console.log(`Starting levitation-client in background connecting to ${options.connect}...`);
        const child = spawn(process.execPath, args, {
            detached: true,
            stdio: ['ignore', logFd, logFd]
        });

        if (child.pid) {
            fs.writeFileSync(PID_FILE, child.pid.toString());
            child.unref();

            console.log(`\x1b[32mStarted\x1b[0m with PID: ${child.pid}`);
            console.log(`Logs available at: ${LOG_FILE}`);
        } else {
            console.error('\x1b[31mError:\x1b[0m Failed to get PID of the background process.');
        }
    });

program
    .command('stop')
    .description('Stop the background levitation-client process')
    .action(async () => {
        if (!fs.existsSync(PID_FILE)) {
            console.log('\x1b[33mWarning:\x1b[0m No background process found (PID file missing).');
            return;
        }

        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
        if (isProcessRunning(pid)) {
            console.log(`Stopping process ${pid}...`);
            process.kill(pid, 'SIGTERM');
            console.log('\x1b[32mStopped.\x1b[0m');
        } else {
            console.log('\x1b[33mWarning:\x1b[0m Process not running, but PID file exists.');
        }
        fs.unlinkSync(PID_FILE);
    });

program
    .command('logs')
    .description('Show background process logs (tail -f)')
    .action(async () => {
        if (!fs.existsSync(LOG_FILE)) {
            console.error('\x1b[31mError:\x1b[0m Log file not found.');
            return;
        }

        console.log(`Tailing logs from ${LOG_FILE}... (Press Ctrl+C to stop)`);
        const tail = spawn('tail', ['-n', '50', '-f', LOG_FILE], { stdio: 'inherit' });

        process.on('SIGINT', () => {
            tail.kill();
            process.exit();
        });
    });

function printWorkspaces(results: any[]) {
    if (results.length === 0) {
        console.log('\x1b[33m%s\x1b[0m', 'No workspaces found.');
    } else {
        console.log(`\x1b[1m\x1b[34m${'PID'.padEnd(10)} ${'PORT'.padEnd(10)} ${'WORKSPACE'.padEnd(25)} ${'NAME'.padEnd(30)}\x1b[0m`);
        console.log('\x1b[90m---------- ---------- ------------------------- ------------------------------\x1b[0m');
        results.forEach((res) => {
            const workspaceName = res.workspaceName || 'unknown';
            console.log(`${res.pid.padEnd(10)} ${res.port.padEnd(10)} ${workspaceName.padEnd(25)} ${res.name.padEnd(30)}`);
        });
    }
}

function printTrajectories(data: any) {
    if (data.trajectorySummaries) {
        const summaries = data.trajectorySummaries;
        const ids = Object.keys(summaries);

        if (ids.length === 0) {
            console.log('No trajectories found.');
        } else {
            console.log(`\n\x1b[1m\x1b[34m${'ID'.padEnd(12)} ${'WORKSPACE'.padEnd(20)} ${'SUMMARY'.padEnd(50)} ${'STEPS'.padEnd(10)}\x1b[0m`);
            console.log('\x1b[90m------------ -------------------- -------------------------------------------------- ----------\x1b[0m');

            ids.sort((a, b) => {
                const timeA = new Date(summaries[a].lastModifiedTime || 0).getTime();
                const timeB = new Date(summaries[b].lastModifiedTime || 0).getTime();
                return timeB - timeA;
            });

            ids.forEach(id => {
                const traj = summaries[id];
                const summaryText = traj.summary || 'No summary';
                const stepCount = traj.stepCount || 0;
                const workspaces = traj.workspaces || [];
                const workspaceUri = workspaces[0]?.workspaceFolderAbsoluteUri || '';
                const workspaceName = workspaceUri.split('/').filter(Boolean).pop() || 'unknown';

                const shortId = id.split('-')[0] || id;
                const idCol = shortId.padEnd(12);
                const workspaceCol = workspaceName.padEnd(20);
                const summaryCol = (summaryText.length > 47 ? summaryText.substring(0, 47) + '...' : summaryText).padEnd(50);
                const stepsCol = stepCount.toString().padEnd(10);

                console.log(`${idCol} ${workspaceCol} ${summaryCol} ${stepsCol}`);
            });
        }
    } else {
        console.log('Response Body (unrecognized format):');
        console.log(JSON.stringify(data, null, 2));
    }
}

function printWorkflows(data: any) {
    if (data.workflows) {
        const workflows = data.workflows;
        const keys = Object.keys(workflows);

        if (keys.length === 0) {
            console.log('No workflows found.');
        } else {
            console.log(`\n\x1b[1m\x1b[34m${'ID'.padEnd(12)} ${'NAME'.padEnd(50)}\x1b[0m`);
            console.log('\x1b[90m------------ --------------------------------------------------\x1b[0m');

            keys.forEach(key => {
                const wf = workflows[key];
                const name = wf.name || 'Unnamed Workflow';
                const shortId = key.split('-')[0] || key;

                console.log(`${shortId.padEnd(12)} ${name.padEnd(50)}`);
            });
        }
    } else {
        console.log('Workflows Response:');
        console.log(JSON.stringify(data, null, 2));
    }
}

function printWorkspaceInfos(data: any) {
    if (data.workspaceInfos) {
        const infos = data.workspaceInfos;
        console.log(`\n\x1b[1m\x1b[34m${'URI'.padEnd(60)} ${'ID'.padEnd(20)}\x1b[0m`);
        console.log('\x1b[90m------------------------------------------------------------ --------------------\x1b[0m');

        infos.forEach((info: any) => {
            const uri = info.workspaceUri || 'unknown';
            const gitRoot = info.gitRootUri || 'unknown';
            console.log(`${uri.padEnd(60)} ${gitRoot.padEnd(20)}`);
        });
    } else {
        console.log('Workspace Infos Response:');
        console.log(JSON.stringify(data, null, 2));
    }
}

async function handleCommand(type: string, body: any, verbose: boolean): Promise<any> {
    console.log(`Executing command type: ${type}`);
    switch (type) {
        case 'EnumerateWorkspacesRequest':
            return { type: 'EnumerateWorkspacesResponse', body: await EnumerateWorkspaces(verbose) };
        case 'GetAllCascadeTrajectoriesRequest': {
            const port = body?.port;
            try {
                const data = await GetAllCascadeTrajectoriesData(port, verbose);
                return { type: 'GetAllCascadeTrajectoriesResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'GetAllWorkflowsRequest': {
            const port = body?.port;
            try {
                const data = await GetAllWorkflowsData(port, verbose);
                return { type: 'GetAllWorkflowsResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'GetWorkspaceInfosRequest': {
            const port = body?.port;
            try {
                const data = await GetWorkspaceInfosData(port, verbose);
                return { type: 'GetWorkspaceInfosResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'StartCascadeRequest': {
            const port = body?.port;
            try {
                const data = await StartCascadeData(port, verbose);
                return { type: 'StartCascadeResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'SendUserCascadeMessageRequest': {
            const port = body?.port;
            const text = body?.text;
            let cascadeId = body?.cascade;

            if (!text) {
                return { type: 'Error', body: 'text is required' };
            }

            try {
                if (!cascadeId) {
                    console.log('No cascade ID in WS message, starting a new one...');
                    const startData = await StartCascadeData(port, verbose);
                    cascadeId = startData.cascadeId;
                    if (!cascadeId) {
                        return { type: 'Error', body: 'Failed to start cascade and get an ID' };
                    }
                    console.log(`Started new cascade for WS request: ${cascadeId}`);
                }
                const data = await SendUserCascadeMessageData(text, cascadeId, port, verbose);
                return { type: 'SendUserCascadeMessageResponse', body: { ...data, cascadeIdUsed: cascadeId, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'StreamCascadeReactiveUpdatesRequest': {
            const port = body?.port;
            const cascadeId = body?.cascadeId || body?.cascade;

            if (!cascadeId) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type}: cascadeId is required`);
                return { type: 'Error', body: 'cascadeId is required' };
            }

            try {
                const data = await StreamCascadeReactiveUpdatesData(cascadeId, port, verbose);
                console.log(`StreamCascadeReactiveUpdatesResponse: ${JSON.stringify(data, null, 2)}`);
                return { type: 'StreamCascadeReactiveUpdatesResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed for cascade ${cascadeId}:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'GetCascadeTrajectoryRequest': {
            const port = body?.port;
            const cascadeId = body?.cascadeId || body?.cascade;

            if (!cascadeId) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type}: cascadeId is required`);
                return { type: 'Error', body: 'cascadeId is required' };
            }

            try {
                const data = await GetCascadeTrajectoryData(cascadeId, port, verbose);
                console.log(`GetCascadeTrajectoryResponse: ${JSON.stringify(data, null, 2)}`);
                return { type: 'GetCascadeTrajectoryResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed for cascade ${cascadeId}:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        case 'CancelCascadeInvocationRequest': {
            const port = body?.port;
            const cascadeId = body?.cascadeId || body?.cascade;

            if (!cascadeId) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type}: cascadeId is required`);
                return { type: 'Error', body: 'cascadeId is required' };
            }

            try {
                const data = await CancelCascadeInvocationData(cascadeId, port, verbose);
                console.log(`CancelCascadeInvocationResponse: ${JSON.stringify(data, null, 2)}`);
                return { type: 'CancelCascadeInvocationResponse', body: { ...data, port } };
            } catch (err: any) {
                console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m ${type} failed for cascade ${cascadeId}:`, err.message);
                return { type: 'Error', body: err.message };
            }
        }
        default:
            console.error(`\x1b[31m[COMMAND ERROR]\x1b[0m Unknown command type: ${type}`);
            return { type: 'Error', body: `Unknown command type: ${type}` };
    }
}

function getOrGenerateDeviceID(): string {
    const configDir = path.join(os.homedir(), '.levitation');
    const configPath = path.join(configDir, 'device_id');

    if (fs.existsSync(configPath)) {
        return fs.readFileSync(configPath, 'utf8').trim();
    }

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const deviceId = crypto.randomUUID();
    fs.writeFileSync(configPath, deviceId, 'utf8');
    return deviceId;
}

async function connectWebSocket(url: string, verbose: boolean) {
    const deviceId = getOrGenerateDeviceID();
    const wsUrl = new URL(url);
    wsUrl.searchParams.set('mode', 'client');
    wsUrl.searchParams.set('device', deviceId);
    wsUrl.searchParams.set('version', '0.0.1');

    let reconnectAttempts = 0;
    let shouldRetry = true;

    function getReconnectDelay(attempts: number): number {
        if (attempts === 0) return 0;
        if (attempts >= 7) return 64000;
        return 1000 * Math.pow(2, attempts - 1);
    }

    function connect() {
        if (!shouldRetry) return;

        console.log(`Connecting to WebSocket at ${wsUrl.toString()}...`);
        const ws = new WebSocket(wsUrl.toString(), {
            perMessageDeflate: {
                clientNoContextTakeover: false,
                serverNoContextTakeover: false
            }
        });

        ws.on('open', () => {
            console.log(`Connected with instance ID: ${deviceId}`);

            console.log('\nScan this QR code or visit the URL below to open the web management interface:');
            const baseUrl = 'https://levitation.studio';
            const connectUrl = `${baseUrl}?instance=${deviceId}`;
            qrcode.generate(connectUrl, { small: true });
            console.log(`\x1b[36m${connectUrl}\x1b[0m\n`);

            reconnectAttempts = 0; // Reset attempts on successful connection

            const send = (msg: any) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const json = JSON.stringify(msg);
                    ws.send(Buffer.from(json));
                }
            };

            // Start heartbeat
            const heartbeatInterval = setInterval(() => {
                send({ type: 'Ping', id: crypto.randomUUID() });
            }, 30000);

            ws.on('close', () => {
                clearInterval(heartbeatInterval);
            });
        });

        ws.on('unexpected-response', (req, res) => {
            if (res.statusCode === 400) {
                console.error(`\x1b[31mError:\x1b[0m Connection failed with status 400 (Bad Request). This usually means invalid parameters. Not retrying.`);
                shouldRetry = false;
            }
        });

        ws.on('message', async (data: Buffer, isBinary: boolean) => {
            try {
                const messageText = data.toString();
                const message = JSON.parse(messageText);

                if (message.type === 'Pong') {
                    return;
                }
                if (message.type === 'Error' && message.status === 'Conflict') {
                    console.error(`\x1b[31mError:\x1b[0m ${message.body || 'Connection conflict detected'}. Not retrying.`);
                    shouldRetry = false;
                    ws.close();
                    return;
                }
                if (message.type) {
                    const requestId = message.id;
                    const response = await handleCommand(message.type, message.body, verbose);

                    const json = JSON.stringify({ ...response, id: requestId });
                    ws.send(Buffer.from(json));
                }
            } catch (err) {
                console.error('Failed to process message:', err);
                try {
                    const messageText = data.toString();
                    const message = JSON.parse(messageText);
                    const requestId = message?.id;
                    const json = JSON.stringify({ type: 'Error', id: requestId, body: 'Invalid message format' });
                    ws.send(Buffer.from(json));
                } catch {
                    // Fallback if we can't even parse the original message ID
                }
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error.message);
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed.');
            if (shouldRetry) {
                const delay = getReconnectDelay(reconnectAttempts);
                console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);

                setTimeout(() => {
                    reconnectAttempts++;
                    connect();
                }, delay);
            }
        });
    }

    connect();
}

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
