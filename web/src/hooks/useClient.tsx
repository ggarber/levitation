'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { LevitationClient, ConnectionStatus } from '@/lib/client';

export interface Workspace {
    workspaceName: string;
    port: number;
    workspaceUri?: string;
}

interface Cascade {
    id: string;
    createdTime?: string;
    lastModifiedTime?: string;
    summary?: string;
    hasChanges?: boolean;
    workspaces?: { folderName: string; workspaceFolderAbsoluteUri: string }[];
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
    isStartingNewCascade: boolean;
    isCascadeInProgress: (cascadeId: string) => boolean;
    sendMessage: (text: string) => void;
    sendCascadeMessage: (text: string, cascadeId: string) => void;
    streamCascadeReactiveUpdates: (cascadeId: string, port: number) => string | null;
    getCascadeTrajectory: (cascadeId: string, port: number) => string | null;
    clearCascadeTimeline: () => void;
    cascadeTimeline: any;
    clientVersion: string | null;
    isPolling: boolean;
    isLoadingTimeline: boolean;
    isLoadingWorkspaces: boolean;
    showLogs: boolean;
    setShowLogs: (show: boolean) => void;
    cancelCascade: (cascadeId: string) => void;
    handleCascadeUserInteraction: (cascadeId: string, interaction: any) => void;
    markCascadeAsRead: (cascadeId: string, port: number) => void;
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
    const [isStartingNewCascade, setIsStartingNewCascade] = useState(false);
    const [sendingCascadeIds, setSendingCascadeIds] = useState<Record<string, boolean>>({});
    const [activeCascades, setActiveCascades] = useState<Record<string, number>>({}); // cascadeId -> port
    const [cascadeTimeline, setCascadeTimeline] = useState<any>(null);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [clientVersion, setClientVersion] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRequestsRef = useRef<Map<string, string>>(new Map());
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const cascadesByPortRef = useRef<Record<string, Cascade[]>>({});
    const lastKnownStepsRef = useRef<Record<string, { count: number, time: string }>>({});
    const workspacesRef = useRef<Workspace[]>([]);
    const handleMessageRef = useRef<(msg: any) => void>(() => { });

    useEffect(() => {
        workspacesRef.current = workspaces;
    }, [workspaces]);

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

    const refreshWorkspaces = useCallback(() => {
        setIsLoadingWorkspaces(true);
        sendCommand('EnumerateWorkspacesRequest');
    }, [sendCommand]);

    const handleMessage = useCallback((message: any) => {
        if (message.type === 'EnumerateWorkspacesResponse') {
            const newWorkspaces = message.body || [];
            setWorkspaces(newWorkspaces);
            setIsLoadingWorkspaces(false);
            newWorkspaces.forEach((ws: Workspace) => {
                sendCommand('GetAllCascadeTrajectoriesRequest', { port: ws.port });
            });
        } else if (message.type === 'GetAllCascadeTrajectoriesResponse') {
            const port = message.body?.port;
            const trajectories = message.body?.trajectorySummaries || {};
            const cascadeList = Object.keys(trajectories).map(id => {
                const traj = trajectories[id];
                const prev = lastKnownStepsRef.current[id];
                const hasChanges = prev ? (traj.stepCount > prev.count || traj.lastModifiedTime !== prev.time) : false;
                return {
                    id,
                    ...traj,
                    hasChanges
                };
            });
            if (port) {
                setCascadesByPort(prev => ({ ...prev, [port]: cascadeList }));

                // Update activeCascades based on current status
                cascadeList.forEach(c => {
                    const status = c.status;
                    const isFinished = status === 'CASCADE_RUN_STATUS_DONE' || status === 'CASCADE_RUN_STATUS_FAILED' || status === 'CASCADE_RUN_STATUS_IDLE';

                    if (isFinished) {
                        setActiveCascades(prev => {
                            if (!prev[c.id]) return prev;
                            const next = { ...prev };
                            delete next[c.id];
                            return next;
                        });
                    } else if (status) {
                        // If it has a status and it's not finished, it's active
                        setActiveCascades(prev => ({ ...prev, [c.id]: port }));
                    }
                });

                // Sync current trajectory status and summary if it's in the list
                setCascadeTimeline((prev: any) => {
                    if (!prev || !prev.trajectory || !prev.trajectory.cascadeId) return prev;
                    const summary = trajectories[prev.trajectory.cascadeId];
                    if (summary && (prev.trajectory.status !== summary.status || prev.trajectory.summary !== summary.summary)) {
                        return {
                            ...prev,
                            trajectory: {
                                ...prev.trajectory,
                                status: summary.status || prev.trajectory.status,
                                summary: summary.summary || prev.trajectory.summary
                            }
                        };
                    }
                    return prev;
                });
            }
            // Update refs for next comparison
            cascadeList.forEach(c => {
                lastKnownStepsRef.current[c.id] = { count: c.stepCount || 0, time: c.lastModifiedTime || '' };
            });
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
                        createdTime: new Date().toISOString(),
                        lastModifiedTime: new Date().toISOString(),
                        stepCount: 1,
                        workspaces: selectedWorkspaceRef.current?.workspaceUri ? [{
                            workspaceFolderAbsoluteUri: selectedWorkspaceRef.current.workspaceUri
                        }] : []
                    };
                    setCascadesByPort(prev => ({
                        ...prev,
                        [port]: [newCascade, ...(prev[port] || [])]
                    }));
                    lastKnownStepsRef.current[cascadeId] = {
                        count: newCascade.stepCount,
                        time: newCascade.lastModifiedTime
                    };
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
                setIsStartingNewCascade(false);

                // Refresh cascades list (to get actual summary from server)
                if (port) {
                    sendCommand('GetAllCascadeTrajectoriesRequest', { port });
                }

                // Start polling immediately
                if (port || selectedWorkspaceRef.current.port) {
                    const finalPort = port || selectedWorkspaceRef.current.port;
                    if (finalPort) {
                        setActiveCascades(prev => ({ ...prev, [cascadeId]: finalPort }));
                        markCascadeAsRead(cascadeId, finalPort);
                    }
                }
            } else if (requestId) {
                pendingRequestsRef.current.delete(requestId);
                setIsStartingNewCascade(false);
            }
        } else if (message.type === 'SendUserCascadeMessageResponse') {
            addLog('Message sent successfully');
            const port = message.body?.port;
            const cascadeId = message.body?.cascade;
            if (cascadeId) {
                setSendingCascadeIds(prev => {
                    const next = { ...prev };
                    delete next[cascadeId];
                    return next;
                });
                if (port) {
                    setActiveCascades(prev => ({ ...prev, [cascadeId]: port }));
                    sendCommand('GetAllCascadeTrajectoriesRequest', { port });
                    sendCommand('GetCascadeTrajectoryRequest', { cascadeId, port });
                }
            }
        } else if (message.type === 'StreamCascadeReactiveUpdatesResponse') {
            setCascadeTimeline(message.body);
            addLog('Stream cascade reactive updates received');
        } else if (message.type === 'GetCascadeTrajectoryResponse') {
            const prevTimeline = cascadeTimeline;
            setCascadeTimeline(message.body);
            setIsLoadingTimeline(false);
            addLog('Cascade trajectory received');
            const status = message.body?.trajectory?.status;
            const cascadeId = message.body?.trajectory?.cascadeId;
            const summary = message.body?.trajectory?.summary || 'Cascade';

            // Notification logic
            const isFinished = status === 'CASCADE_RUN_STATUS_DONE' || status === 'CASCADE_RUN_STATUS_FAILED' || status === 'CASCADE_RUN_STATUS_IDLE';

            if (isFinished) {
                const prevStatus = prevTimeline?.trajectory?.status;
                // Only notify if it just finished (wasn't finished before)
                if (status && prevStatus && prevStatus !== 'CASCADE_RUN_STATUS_DONE' && prevStatus !== 'CASCADE_RUN_STATUS_FAILED' && prevStatus !== 'CASCADE_RUN_STATUS_IDLE') {
                    if (Notification.permission === 'granted') {
                        new Notification('Cascade Finished', {
                            body: `${summary} has ${status === 'CASCADE_RUN_STATUS_DONE' ? 'completed successfully' : (status === 'CASCADE_RUN_STATUS_IDLE' ? 'reached idle state' : 'failed')}.`,
                            icon: '/icons/icon-192x192.png'
                        });
                    }
                }

                if (cascadeId) {
                    setActiveCascades(prev => {
                        if (!prev[cascadeId]) return prev;
                        const next = { ...prev };
                        delete next[cascadeId];
                        return next;
                    });
                }
            } else {
                // Keep polling or start polling if not already
                const port = message.body?.port || selectedWorkspaceRef.current?.port;
                if (port && cascadeId) {
                    setActiveCascades(prev => ({ ...prev, [cascadeId]: port }));
                }
            }
        } else if (message.type === 'error') {
            addLog(`Error: ${message.body}${message.description ? ` (${message.description})` : ''}`);
            setIsStartingNewCascade(false);
            setSendingCascadeIds({});
            setIsLoadingWorkspaces(false);
            if (message.id) pendingRequestsRef.current.delete(message.id);
        } else if (message.type === 'ClientInfo') {
            setClientVersion(message.body?.version || null);
            addLog(`Client version: ${message.body?.version}`);
            if (workspacesRef.current.length === 0) {
                refreshWorkspaces();
            }
        }
    }, [addLog, sendCommand, refreshWorkspaces]);

    const hasWaitingStep = useCallback((timeline: any) => {
        if (!timeline) return false;
        const steps = timeline.trajectory?.steps || timeline.steps || [];
        return steps.some((s: any) => s.status === 'CORTEX_STEP_STATUS_WAITING');
    }, []);

    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    const lastUpdateTimesRef = useRef<Record<string, number>>({});
    const lastDataHashesRef = useRef<Record<string, string>>({});

    useEffect(() => {
        const activePorts = Array.from(new Set(Object.values(activeCascades)));
        if (activePorts.length > 0) {
            const interval = setInterval(() => {
                activePorts.forEach(port => {
                    sendCommand('GetAllCascadeTrajectoriesRequest', { port });
                });

                // Also poll GetCascadeTrajectoryRequest for the selected one IF it's active
                const currentCascadeId = cascadeTimeline?.trajectory?.cascadeId;
                if (currentCascadeId && activeCascades[currentCascadeId]) {
                    if (!hasWaitingStep(cascadeTimeline)) {
                        sendCommand('GetCascadeTrajectoryRequest', {
                            cascadeId: currentCascadeId,
                            port: activeCascades[currentCascadeId]
                        });
                    }

                    // Check for inactivity
                    const now = Date.now();
                    const lastUpdate = lastUpdateTimesRef.current[currentCascadeId] || 0;
                    if (lastUpdate > 0 && (now - lastUpdate) > 60000) {
                        addLog(`Stopping refresh for ${currentCascadeId} due to inactivity (1 minute)`);
                        setActiveCascades(prev => {
                            const next = { ...prev };
                            delete next[currentCascadeId];
                            return next;
                        });
                    }
                }
            }, 2000);
            pollingIntervalRef.current = interval;
            return () => {
                clearInterval(interval);
                pollingIntervalRef.current = null;
            };
        }
    }, [activeCascades, cascadeTimeline?.trajectory?.cascadeId, sendCommand, addLog]);

    useEffect(() => {
        if (cascadeTimeline?.trajectory?.cascadeId) {
            const cascadeId = cascadeTimeline.trajectory.cascadeId;
            const dataHash = JSON.stringify(cascadeTimeline.trajectory.steps || []);
            if (lastDataHashesRef.current[cascadeId] !== dataHash) {
                lastDataHashesRef.current[cascadeId] = dataHash;
                lastUpdateTimesRef.current[cascadeId] = Date.now();
            }
        }
    }, [cascadeTimeline]);

    useEffect(() => {
        if (!clientRef.current) {
            let defaultWsUrl = 'ws://localhost:9999';
            if (typeof window !== 'undefined') {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                defaultWsUrl = `${protocol}//${window.location.hostname}:9999`;
            }
            let wsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;
            if (typeof window !== 'undefined') {
                const override = localStorage.getItem('WS_URL');
                if (override) {
                    wsUrl = override;
                }
            }
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

        // Request notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
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
        setIsStartingNewCascade(false);
        setSendingCascadeIds({});
        setActiveCascades({});
    }, []);


    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim() || !selectedWorkspace || isStartingNewCascade) return;

        setIsStartingNewCascade(true);
        const requestId = sendCommand('StartCascadeRequest', { port: selectedWorkspace.port });
        if (requestId) {
            pendingRequestsRef.current.set(requestId, text);
        } else {
            setIsStartingNewCascade(false);
        }
    }, [isStartingNewCascade, selectedWorkspace, sendCommand]);

    const sendCascadeMessage = useCallback((text: string, cascadeId: string) => {
        if (!text.trim() || !selectedWorkspace || sendingCascadeIds[cascadeId]) return;

        setSendingCascadeIds(prev => ({ ...prev, [cascadeId]: true }));
        sendCommand('SendUserCascadeMessageRequest', {
            text,
            cascade: cascadeId,
            port: selectedWorkspace.port
        });
    }, [sendingCascadeIds, selectedWorkspace, sendCommand]);

    const streamCascadeReactiveUpdates = useCallback((cascadeId: string, port: number) => {
        setCascadeTimeline(null);
        return sendCommand('StreamCascadeReactiveUpdatesRequest', {
            cascadeId,
            port
        });
    }, [sendCommand]);

    const getCascadeTrajectory = useCallback((cascadeId: string, port: number) => {
        setCascadeTimeline((prev: any) => {
            if (prev?.trajectory?.cascadeId === cascadeId) return prev;
            setIsLoadingTimeline(true);
            return null;
        });
        return sendCommand('GetCascadeTrajectoryRequest', {
            cascadeId,
            port
        });
    }, [sendCommand]);

    const clearCascadeTimeline = useCallback(() => {
        setCascadeTimeline(null);
    }, []);

    const cancelCascade = useCallback((cascadeId: string) => {
        const port = activeCascades[cascadeId] || selectedWorkspaceRef.current?.port;
        if (!port) return;
        sendCommand('CancelCascadeInvocationRequest', {
            cascadeId,
            port
        });
    }, [activeCascades, sendCommand]);

    const handleCascadeUserInteraction = useCallback((cascadeId: string, interaction: any) => {
        const port = activeCascades[cascadeId] || selectedWorkspaceRef.current?.port;
        if (!port) return;

        // Optimistically update the timeline if it's an "Allow" or "Deny" interaction
        const isAllow = interaction.filePermission?.allow === true;
        if (cascadeTimeline?.trajectory?.cascadeId === cascadeId) {
            setCascadeTimeline((prev: any) => {
                if (!prev || !prev.trajectory || !prev.trajectory.steps) return prev;
                const newSteps = [...prev.trajectory.steps];
                if (newSteps[interaction.stepIndex]) {
                    // Mark as DONE to bypass hasWaitingStep
                    newSteps[interaction.stepIndex] = {
                        ...newSteps[interaction.stepIndex],
                        status: 'CORTEX_STEP_STATUS_DONE'
                    };
                }
                const newStatus = isAllow ? 'CASCADE_RUN_STATUS_RUNNING' : 'CASCADE_RUN_STATUS_IDLE';
                return {
                    ...prev,
                    trajectory: {
                        ...prev.trajectory,
                        steps: newSteps,
                        status: newStatus
                    }
                };
            });
        }

        if (!isAllow) {
            setActiveCascades(prev => {
                if (!prev[cascadeId]) return prev;
                const next = { ...prev };
                delete next[cascadeId];
                return next;
            });
        }

        sendCommand('HandleCascadeUserInteraction', {
            cascadeId,
            interaction,
            port
        });

        // TRIGGER an immediate refresh to resume the cascade loop if allowed
        if (isAllow) {
            setTimeout(() => {
                sendCommand('GetCascadeTrajectoryRequest', {
                    cascadeId,
                    port
                });
            }, 100);
        }
    }, [activeCascades, sendCommand, cascadeTimeline]);

    const markCascadeAsRead = useCallback(async (cascadeId: string, port: number) => {
        // Optimistically remove blue dot
        setCascadesByPort(prev => {
            const portCascades = prev[port];
            if (!portCascades) return prev;
            return {
                ...prev,
                [port]: portCascades.map(c =>
                    c.id === cascadeId ? { ...c, hasChanges: false } : c
                )
            };
        });

        // Update lastKnownStepsRef so it doesn't reappear on next refresh
        const portCascades = cascadesByPortRef.current[port];
        const cascade = portCascades?.find(c => c.id === cascadeId);
        if (cascade) {
            lastKnownStepsRef.current[cascadeId] = {
                count: cascade.stepCount || 0,
                time: cascade.lastModifiedTime || ''
            };
        }

        sendCommand('UpdateConversationAnnotationsRequest', {
            cascadeId,
            port
        });
    }, [sendCommand]);

    const sortedWorkspaces = React.useMemo(() => {
        return [...workspaces].sort((a, b) => {
            const getLatestCascadeTime = (ws: Workspace) => {
                const cascades = (cascadesByPort[ws.port] || [])
                    .filter(cascade =>
                        !ws.workspaceUri ||
                        cascade.workspaces?.some((w: any) => w.workspaceFolderAbsoluteUri === ws.workspaceUri)
                    );
                if (cascades.length === 0) return 0;
                return Math.max(...cascades.map(c => new Date(c.createdTime || c.lastModifiedTime || 0).getTime()));
            };
            return getLatestCascadeTime(b) - getLatestCascadeTime(a);
        });
    }, [workspaces, cascadesByPort]);

    return (
        <ClientContext.Provider value={{
            connectionStatus,
            instanceId,
            logs,
            workspaces: sortedWorkspaces,
            cascadesByPort,
            selectedWorkspace,
            connect,
            disconnect,
            sendCommand,
            setSelectedWorkspace,
            clearLogs,
            refreshWorkspaces,
            isSending: isStartingNewCascade || Object.values(sendingCascadeIds).some(v => v),
            isStartingNewCascade,
            isCascadeInProgress: (id: string) => sendingCascadeIds[id] || activeCascades[id] !== undefined,
            sendMessage,
            sendCascadeMessage,
            streamCascadeReactiveUpdates,
            getCascadeTrajectory,
            clearCascadeTimeline,
            cascadeTimeline,
            clientVersion,
            isPolling: Object.keys(activeCascades).length > 0,
            isLoadingTimeline,
            isLoadingWorkspaces,
            showLogs,
            setShowLogs,
            cancelCascade,
            handleCascadeUserInteraction,
            markCascadeAsRead
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
