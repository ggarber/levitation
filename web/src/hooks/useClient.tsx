'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { LevitationClient, ConnectionStatus } from '@/lib/client';

interface Workspace {
    workspaceName: string;
    port: number;
}

interface Cascade {
    id: string;
    [key: string]: any;
}

interface ClientContextType {
    connectionStatus: ConnectionStatus;
    instanceId: string;
    logs: string[];
    workspaces: Workspace[];
    cascadesByPort: Record<string, Cascade[]>;
    selectedWorkspace: Workspace | null;
    connect: (id: string | null) => void;
    disconnect: () => void;
    sendCommand: (type: string, body?: any) => string | null;
    setSelectedWorkspace: (ws: Workspace | null) => void;
    clearLogs: () => void;
    refreshWorkspaces: () => void;
    isSending: boolean;
    sendMessage: (text: string) => void;
    sendCascadeMessage: (text: string, cascadeId: string) => void;
    streamCascadeReactiveUpdates: (cascadeId: string, port: number) => string | null;
    getCascadeTrajectory: (cascadeId: string, port: number) => string | null;
    clearCascadeTimeline: () => void;
    cascadeTimeline: any;
    clientVersion: string | null;
    isPolling: boolean;
    isLoadingTimeline: boolean;
    showLogs: boolean;
    setShowLogs: (show: boolean) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const clientRef: { current: LevitationClient | null } = { current: null };

export function ClientProvider({ children }: { children: React.ReactNode }) {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [instanceId, setInstanceId] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [cascadesByPort, setCascadesByPort] = useState<Record<string, Cascade[]>>({});
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [cascadeTimeline, setCascadeTimeline] = useState<any>(null);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [clientVersion, setClientVersion] = useState<string | null>(null);
    const [pollingCascadeId, setPollingCascadeId] = useState<string | null>(null);
    const [pollingPort, setPollingPort] = useState<number | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRequestsRef = useRef<Map<string, string>>(new Map());
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const cascadesByPortRef = useRef<Record<string, Cascade[]>>({});
    const handleMessageRef = useRef<(msg: any) => void>(() => { });

    useEffect(() => {
        selectedWorkspaceRef.current = selectedWorkspace;
    }, [selectedWorkspace]);

    useEffect(() => {
        cascadesByPortRef.current = cascadesByPort;
    }, [cascadesByPort]);

    const addLog = useCallback((msg: string) => {
        setLogs((prev) => [msg, ...prev].slice(0, 100));
    }, []);

    const sendCommand = useCallback((type: string, body: any = {}): string | null => {
        return clientRef.current?.sendCommand(type, body) || null;
    }, []);

    const handleMessage = useCallback((message: any) => {
        if (message.type === 'EnumerateWorkspacesResponse') {
            const newWorkspaces = message.body || [];
            setWorkspaces(newWorkspaces);
            newWorkspaces.forEach((ws: Workspace) => {
                sendCommand('GetAllCascadeTrajectoriesRequest', { port: ws.port });
            });
        } else if (message.type === 'GetAllCascadeTrajectoriesResponse') {
            const port = message.body?.port;
            const trajectories = message.body?.trajectorySummaries || {};
            const cascadeList = Object.keys(trajectories).map(id => ({
                id,
                ...trajectories[id]
            }));
            if (port) {
                setCascadesByPort(prev => ({ ...prev, [port]: cascadeList }));
            }
        } else if (message.type === 'StartCascadeResponse') {
            const cascadeId = message.body?.cascadeId;
            const port = message.body?.port;
            const requestId = message.id;
            const pendingMessage = requestId ? pendingRequestsRef.current.get(requestId) : null;

            if (cascadeId && selectedWorkspaceRef.current) {
                // Optimistically add to sidebar if we have a port
                if (port) {
                    const newCascade = {
                        id: cascadeId,
                        summary: pendingMessage || 'New Cascade',
                        lastModifiedTime: new Date().toISOString(),
                        stepCount: 1
                    };
                    setCascadesByPort(prev => ({
                        ...prev,
                        [port]: [newCascade, ...(prev[port] || [])]
                    }));
                }

                // Switch to this cascade immediately in the main area
                getCascadeTrajectory(cascadeId, port || selectedWorkspaceRef.current.port);

                if (pendingMessage) {
                    sendCommand('SendUserCascadeMessageRequest', {
                        text: pendingMessage,
                        cascade: cascadeId,
                        port: selectedWorkspaceRef.current.port
                    });
                }

                if (requestId) pendingRequestsRef.current.delete(requestId);
                setIsSending(false);

                // Refresh cascades list (to get actual summary from server)
                if (port) {
                    sendCommand('GetAllCascadeTrajectoriesRequest', { port });
                }

                // Start polling immediately
                if (port || selectedWorkspaceRef.current.port) {
                    setPollingCascadeId(cascadeId);
                    setPollingPort(port || selectedWorkspaceRef.current.port);
                }
            } else if (requestId) {
                pendingRequestsRef.current.delete(requestId);
                setIsSending(false);
            }
        } else if (message.type === 'SendUserCascadeMessageResponse') {
            addLog('Message sent successfully');
            setIsSending(false);
            const port = message.body?.port;
            const cascadeId = message.body?.cascade;
            if (port) {
                sendCommand('GetAllCascadeTrajectoriesRequest', { port });
                if (cascadeId) {
                    sendCommand('GetCascadeTrajectoryRequest', { cascadeId, port });
                    setPollingCascadeId(cascadeId);
                    setPollingPort(port);
                }
            }
        } else if (message.type === 'StreamCascadeReactiveUpdatesResponse') {
            setCascadeTimeline(message.body);
            addLog('Stream cascade reactive updates received');
        } else if (message.type === 'GetCascadeTrajectoryResponse') {
            setCascadeTimeline(message.body);
            setIsLoadingTimeline(false);
            addLog('Cascade trajectory received');
            const status = message.body?.trajectory?.status;
            // Only stop polling if it's explicitly IDLE/completed and we aren't waiting for a task to finish
            if (status === 'CASCADE_RUN_STATUS_IDLE' || status === 'CASCADE_RUN_STATUS_DONE' || status === 'CASCADE_RUN_STATUS_FAILED') {
                if (pollingCascadeId === message.body?.trajectory?.cascadeId) {
                    // We might want to keep polling for a bit more or just stop
                    setPollingCascadeId(null);
                    setPollingPort(null);
                }
            } else {
                // Keep polling or start polling if not already
                const port = message.body?.port || selectedWorkspaceRef.current?.port;
                const cascadeId = message.body?.trajectory?.cascadeId;
                if (port && cascadeId) {
                    setPollingCascadeId(cascadeId);
                    setPollingPort(port);
                }
            }
        } else if (message.type === 'error') {
            addLog(`Error: ${message.body}${message.description ? ` (${message.description})` : ''}`);
            setIsSending(false);
            setPollingCascadeId(null);
            setPollingPort(null);
            if (message.id) pendingRequestsRef.current.delete(message.id);
        } else if (message.type === 'ClientInfo') {
            setClientVersion(message.body?.version || null);
            addLog(`Client version: ${message.body?.version}`);
        }
    }, [addLog, sendCommand]);

    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    useEffect(() => {
        if (pollingPort) {
            const interval = setInterval(() => {
                sendCommand('GetAllCascadeTrajectoriesRequest', { port: pollingPort });
                if (pollingCascadeId) {
                    sendCommand('GetCascadeTrajectoryRequest', {
                        cascadeId: pollingCascadeId,
                        port: pollingPort
                    });
                }
            }, 2000);
            pollingIntervalRef.current = interval;
            return () => {
                clearInterval(interval);
                pollingIntervalRef.current = null;
            };
        }
    }, [pollingPort, pollingCascadeId, sendCommand]);

    useEffect(() => {
        if (!clientRef.current) {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9999';
            clientRef.current = new LevitationClient(
                wsUrl,
                (status) => setConnectionStatus(status),
                (msg) => addLog(msg),
                (msg) => handleMessageRef.current(msg)
            );
        }

        const storedId = clientRef.current.getInstanceId();
        if (storedId) {
            setInstanceId(storedId);
        }
    }, [addLog]);
    const connect = useCallback((id: string | null) => {
        const finalId = id || instanceId;
        if (finalId) {
            setInstanceId(finalId);
            clientRef.current?.saveInstanceId(finalId);
            clientRef.current?.connect(finalId);
        }
    }, [instanceId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const urlInstance = urlParams.get('instance');
            if (urlInstance) {
                console.log(`Auto-connecting to instance: ${urlInstance}`);
                connect(urlInstance);
                // Clear the instance from the URL to avoid reconnecting on refresh
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('instance');
                window.history.replaceState({}, '', newUrl.toString());
            }
        }
    }, [connect]);

    const disconnect = useCallback(() => {
        clientRef.current?.disconnect();
        setWorkspaces([]);
        setCascadesByPort({});
        setSelectedWorkspace(null);
        setCascadeTimeline(null);
        setClientVersion(null);
    }, []);

    const refreshWorkspaces = useCallback(() => {
        sendCommand('EnumerateWorkspacesRequest');
    }, [sendCommand]);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim() || !selectedWorkspace || isSending) return;

        setIsSending(true);
        const requestId = sendCommand('StartCascadeRequest', { port: selectedWorkspace.port });
        if (requestId) {
            pendingRequestsRef.current.set(requestId, text);
        } else {
            setIsSending(false);
        }
    }, [isSending, selectedWorkspace, sendCommand]);

    const sendCascadeMessage = useCallback((text: string, cascadeId: string) => {
        if (!text.trim() || !selectedWorkspace || isSending) return;

        setIsSending(true);
        sendCommand('SendUserCascadeMessageRequest', {
            text,
            cascade: cascadeId,
            port: selectedWorkspace.port
        });
    }, [isSending, selectedWorkspace, sendCommand]);

    const streamCascadeReactiveUpdates = useCallback((cascadeId: string, port: number) => {
        setCascadeTimeline(null);
        return sendCommand('StreamCascadeReactiveUpdatesRequest', {
            cascadeId,
            port
        });
    }, [sendCommand]);

    const getCascadeTrajectory = useCallback((cascadeId: string, port: number) => {
        setCascadeTimeline(null);
        setIsLoadingTimeline(true);
        return sendCommand('GetCascadeTrajectoryRequest', {
            cascadeId,
            port
        });
    }, [sendCommand]);

    const clearCascadeTimeline = useCallback(() => {
        setCascadeTimeline(null);
    }, []);

    return (
        <ClientContext.Provider value={{
            connectionStatus,
            instanceId,
            logs,
            workspaces,
            cascadesByPort,
            selectedWorkspace,
            connect,
            disconnect,
            sendCommand,
            setSelectedWorkspace,
            clearLogs,
            refreshWorkspaces,
            isSending,
            sendMessage,
            sendCascadeMessage,
            streamCascadeReactiveUpdates,
            getCascadeTrajectory,
            clearCascadeTimeline,
            cascadeTimeline,
            clientVersion,
            isPolling: pollingCascadeId !== null,
            isLoadingTimeline,
            showLogs,
            setShowLogs
        }}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
}
