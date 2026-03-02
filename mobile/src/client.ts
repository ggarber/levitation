import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTANCE_ID_KEY = '@instance_id';
const WS_URL = 'ws://localhost:9999';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export class LevitationClient {
    private ws: WebSocket | null = null;
    private status: ConnectionStatus = 'disconnected';
    private onMessage: (message: any) => void;
    private onStatusChange: (status: ConnectionStatus) => void;
    private onLog: (msg: string) => void;
    private reconnectAttempts = 0;
    private reconnectTimer: any = null;
    private instanceId: string | null = null;
    private maxReconnectDelay = 30000;
    private heartbeatTimer: any = null;
    private shouldRetry = true;

    constructor(
        onStatusChange: (status: ConnectionStatus) => void,
        onLog: (msg: string) => void,
        onMessage: (message: any) => void
    ) {
        this.onStatusChange = onStatusChange;
        this.onLog = onLog;
        this.onMessage = onMessage;
    }

    async getInstanceId(): Promise<string | null> {
        return await AsyncStorage.getItem(INSTANCE_ID_KEY);
    }

    async saveInstanceId(id: string): Promise<void> {
        await AsyncStorage.setItem(INSTANCE_ID_KEY, id);
    }

    connect(instanceId: string) {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.shouldRetry = true;

        this.instanceId = instanceId;

        if (this.ws) {
            this.ws.close();
        }

        this.status = 'connecting';
        this.onStatusChange(this.status);

        const url = new URL(WS_URL);
        url.searchParams.set('mode', 'manager');
        url.searchParams.set('device', instanceId);

        this.onLog(`Connecting to ${url.toString()}...`);

        try {
            const ws = new WebSocket(url.toString());
            this.ws = ws;

            ws.onopen = () => {
                this.status = 'connected';
                this.onStatusChange(this.status);
                this.onLog(`Connected to server with instance ID: ${this.instanceId}`);
                this.reconnectAttempts = 0;
                this.sendCommand('EnumerateWorkspacesRequest');

                // Start heartbeat
                if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = setInterval(() => {
                    this.sendCommand('Ping');
                }, 30000);
            };

            ws.binaryType = 'blob'; // explicitly set to blob to be consistent
            ws.onmessage = async (e) => {
                let data = e.data;
                if (data instanceof Blob) {
                    data = await data.text();
                } else if (typeof data !== 'string') {
                    data = new TextDecoder().decode(data);
                }

                try {
                    const message = JSON.parse(data);
                    if (message.type === 'Error' && message.status === 'Conflict') {
                        this.onLog(`Conflict: ${message.body || 'Another instance connected'}. Stopping reconnection.`);
                        this.shouldRetry = false;
                        this.ws?.close();
                        return;
                    }
                    if (message.type === 'Pong') {
                        // Heartbeat response
                        return;
                    }
                    this.onLog(`Received: ${data}`);
                    this.onMessage(message);
                } catch (err) {
                    this.onLog(`Received: ${data}`);
                    this.onLog('Failed to parse received message as JSON');
                }
            };

            ws.onerror = (e: any) => {
                this.onLog(`Error: ${e.message || 'WebSocket Error'}`);
                // ws.onclose will be called after onerror, so we handle reconnection there.
            };

            ws.onclose = () => {
                if (this.heartbeatTimer) {
                    clearInterval(this.heartbeatTimer);
                    this.heartbeatTimer = null;
                }
                if (this.status !== 'disconnected') {
                    this.onLog('Disconnected from server');
                    this.status = 'disconnected';
                    this.onStatusChange(this.status);
                    this.scheduleReconnect();
                }
            };
        } catch (e: any) {
            this.onLog(`Error creating WebSocket: ${e.message}`);
            this.scheduleReconnect();
        }
    }

    private getReconnectDelay(attempts: number): number {
        if (attempts === 0) return 0;
        if (attempts >= 7) return 64000;
        return 1000 * Math.pow(2, attempts - 1);
    }

    private scheduleReconnect() {
        if (this.status === 'connected' || !this.instanceId || !this.shouldRetry) return;

        const delay = this.getReconnectDelay(this.reconnectAttempts);
        this.onLog(`Attempting to reconnect in ${delay / 1000} seconds...`);

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            if (this.instanceId) {
                this.connect(this.instanceId);
            }
        }, delay);
    }

    disconnect() {
        this.status = 'disconnected';
        this.instanceId = null;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        if (this.ws) {
            if ('close' in this.ws) {
                this.ws.close();
            }
            this.ws = null;
        }
        this.onStatusChange(this.status);
    }

    sendCommand(type: string, body: any = {}): string | null {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
                ? (crypto as any).randomUUID()
                : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            const message = JSON.stringify({ type, body, id });
            this.onLog(`Sending: ${message}`);
            this.ws.send(message);
            return id;
        } else {
            this.onLog('Error: Not connected');
            return null;
        }
    }
}
