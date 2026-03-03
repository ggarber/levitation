'use client';

import React from 'react';
import { RefreshCcw, LayoutGrid, Zap, Terminal, ChevronDown, ChevronUp, ChevronRight, MessageSquare } from 'lucide-react';
import { useClient } from '@/hooks/useClient';
import { cn } from '@/lib/utils';

export function Sidebar({
    isVisible
}: {
    isVisible: boolean
}) {
    const {
        workspaces,
        selectedWorkspace,
        setSelectedWorkspace,
        refreshWorkspaces,
        connectionStatus,
        cascadesByPort,
        getCascadeTrajectory,
        clearCascadeTimeline,
        isCascadeInProgress,
        isLoadingWorkspaces
    } = useClient();
    const [expandedWorkspaces, setExpandedWorkspaces] = React.useState<Record<number, boolean>>({});
    const [showingAllCascades, setShowingAllCascades] = React.useState<Record<number, boolean>>({});

    React.useEffect(() => {
        if (selectedWorkspace) {
            setExpandedWorkspaces(prev => ({
                ...prev,
                [selectedWorkspace.port]: true
            }));
        }
    }, [selectedWorkspace]);

    const toggleShowAll = (port: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowingAllCascades(prev => ({
            ...prev,
            [port]: !prev[port]
        }));
    };

    const toggleWorkspaceExpanded = (port: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedWorkspaces(prev => ({
            ...prev,
            [port]: !prev[port]
        }));
    };

    if (!isVisible) return null;

    return (
        <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden transition-all duration-300 border-r border-slate-200 dark:border-slate-800">
            <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-6 group">
                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                        Workspaces
                    </h2>
                    <button
                        onClick={refreshWorkspaces}
                        disabled={connectionStatus !== 'connected'}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-all active:rotate-180"
                    >
                        <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-12rem)] pr-0">
                    {isLoadingWorkspaces || (workspaces.length === 0 && connectionStatus === 'connecting') ? (
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl transition-all">
                            <RefreshCcw className="w-6 h-6 mx-auto mb-3 text-blue-500 animate-spin" />
                            <p className="text-[11px] font-medium leading-relaxed italic text-slate-400 dark:text-slate-600">
                                {isLoadingWorkspaces ? 'Fetching workspaces...' : 'Establishing connection...'}
                            </p>
                        </div>
                    ) : workspaces.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl transition-all">
                            <Terminal className="w-6 h-6 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                            <p className="text-[11px] font-medium leading-relaxed italic text-slate-400 dark:text-slate-600">
                                {connectionStatus === 'connected'
                                    ? 'No active workspaces'
                                    : 'Connect to explore workspaces'}
                            </p>
                        </div>
                    ) : (
                        workspaces.map((ws, i) => {
                            const isActive = selectedWorkspace?.port === ws.port;
                            const cascades = [...(cascadesByPort[ws.port] || [])]
                                .filter(cascade =>
                                    !ws.workspaceUri ||
                                    cascade.workspaces?.some((w: any) => w.workspaceFolderAbsoluteUri === ws.workspaceUri)
                                )
                                .sort((a, b) => {
                                    const timeA = new Date(a.createdTime || a.lastModifiedTime || 0).getTime();
                                    const timeB = new Date(b.createdTime || b.lastModifiedTime || 0).getTime();
                                    return timeB - timeA;
                                });

                            return (
                                <div key={i} className="flex flex-col items-start w-full">
                                    <button
                                        onClick={() => {
                                            setSelectedWorkspace(ws);
                                            clearCascadeTimeline();
                                        }}
                                        className="flex items-center w-full py-2 pl-1 pr-0 rounded-lg text-left transition-all relative group"
                                    >
                                        <div
                                            onClick={(e) => toggleWorkspaceExpanded(ws.port, e)}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors mr-1 cursor-pointer"
                                        >
                                            {expandedWorkspaces[ws.port] ? (
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                        <span className="text-base font-bold tracking-tight text-slate-600 dark:text-slate-400 truncate">
                                            {ws.workspaceName}
                                        </span>
                                    </button>

                                    {expandedWorkspaces[ws.port] && cascades.length > 0 && (
                                        <div className="w-full mt-1 flex flex-col gap-1 pl-7 pr-0">
                                            <div className="flex flex-col gap-1 w-full text-sm">
                                                {(showingAllCascades[ws.port] ? cascades : cascades.slice(0, 3)).map((cascade) => (
                                                    <div
                                                        key={cascade.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedWorkspace(ws);
                                                            getCascadeTrajectory(cascade.id, ws.port);
                                                        }}
                                                        className="flex items-center py-1 group/item"
                                                    >
                                                        <span className="text-slate-700 dark:text-slate-300 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors truncate cursor-pointer flex-1">
                                                            {cascade.summary || 'Untitled Session'}
                                                        </span>
                                                        {cascade.hasChanges && (
                                                            <div className="ml-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {cascades.length > 3 && (
                                                <button
                                                    onClick={(e) => toggleShowAll(ws.port, e)}
                                                    className="mt-1 text-sm font-bold text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400 flex items-center gap-1 transition-colors"
                                                >
                                                    {showingAllCascades[ws.port] ? (
                                                        <>Show less <ChevronUp className="w-3 h-3" /></>
                                                    ) : (
                                                        <>See all ({cascades.length}) <ChevronDown className="w-3 h-3" /></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

        </aside>
    );
}
