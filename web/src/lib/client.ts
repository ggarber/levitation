export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const INSTANCE_ID_KEY = 'levitation_instance_id';

export class LevitationClient {
    private ws: WebSocket | null = null;
    private status: ConnectionStatus = 'disconnected';
    private onMessage: (message: any) => void;
    private onStatusChange: (status: ConnectionStatus) => void;
    private onLog: (msg: string) => void;
    private reconnectAttempts = 0;
    private reconnectTimer: any = null;
    private instanceId: string | null = null;
    private wsUrl: string;
    private heartbeatTimer: any = null;
    private shouldRetry = true;

    constructor(
        wsUrl: string,
        onStatusChange: (status: ConnectionStatus) => void,
        onLog: (msg: string) => void,
        onMessage: (message: any) => void
    ) {
        this.wsUrl = wsUrl;
        this.onStatusChange = onStatusChange;
        this.onLog = onLog;
        this.onMessage = onMessage;
    }

    getInstanceId(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(INSTANCE_ID_KEY);
    }

    saveInstanceId(id: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(INSTANCE_ID_KEY, id);
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

        try {
            let wsUrl = this.wsUrl;
            if (typeof window !== 'undefined') {
                const override = localStorage.getItem('WS_URL');
                if (override) {
                    wsUrl = override;
                }
            }

            const url = new URL(wsUrl);
            url.searchParams.set('mode', 'manager');
            url.searchParams.set('instance', instanceId);

            this.onLog(`Connecting to ${url.toString()}...`);

            const ws = new WebSocket(url.toString());
            ws.binaryType = 'arraybuffer';
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

            ws.onmessage = async (e) => {
                const data = e.data;
                let messageText: string;

                if (data instanceof ArrayBuffer) {
                    messageText = new TextDecoder().decode(data);
                } else if (typeof data === 'string') {
                    messageText = data;
                } else {
                    this.onLog(`Received unexpected data type: ${typeof data}`);
                    return;
                }

                try {
                    const message = JSON.parse(messageText);
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
                    this.onLog(`Received: ${messageText}`);
                    this.onMessage(message);
                } catch (err) {
                    this.onLog(`Received: ${messageText}`);
                    this.onLog('Failed to parse received message as JSON');
                }
            };

            ws.onerror = (e: any) => {
                this.onLog(`Error: ${e.message || 'WebSocket Error'}`);
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
            this.ws.close();
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

            const message = { type, body, id };
            const json = JSON.stringify(message);
            this.onLog(`Sending: ${json}`);
            // Use TextEncoder to send as binary (ArrayBuffer) to trigger binary frame
            this.ws.send(new TextEncoder().encode(json));
            return id;
        } else {
            this.onLog('Error: Not connected');
            return null;
        }
    }
}
