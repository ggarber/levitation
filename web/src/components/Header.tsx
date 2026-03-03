'use client';

import React from 'react';
import { Menu, Power, LogOut, Terminal, Github, Settings } from 'lucide-react';
import { useClient } from '@/hooks/useClient';
import { cn } from '@/lib/utils';

export function Header({
    toggleSidebar,
    onOpenConnect
}: {
    toggleSidebar: () => void;
    onOpenConnect: () => void;
}) {
    const { connectionStatus, connect, disconnect, setSelectedWorkspace, instanceId, clientVersion, showLogs, setShowLogs } = useClient();

    const handleConnectClick = () => {
        if (connectionStatus === 'connected') {
            disconnect();
        } else {
            if (!instanceId) {
                onOpenConnect();
            } else {
                connect(null);
            }
        }
    };

    const getStatusConfig = () => {
        switch (connectionStatus) {
            case 'connecting':
                return { text: 'Connecting', color: 'bg-amber-500', isConnecting: true };
            case 'connected':
                return { text: 'Connected', color: 'bg-emerald-500', isConnecting: false };
            case 'disconnected':
            default:
                return { text: 'Connect', color: 'bg-blue-500', isConnecting: false };
        }
    };

    const config = getStatusConfig();

    return (
        <header className="h-16 px-6 flex items-center justify-between transition-all duration-300 backdrop-blur-md bg-slate-50/95 dark:bg-slate-900/95 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 -ml-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div
                    className="flex items-baseline gap-2 cursor-pointer"
                    onClick={() => {
                        setSelectedWorkspace(null);
                        setShowLogs(false);
                    }}
                >
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        Levitation
                    </h1>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">v0.1 Beta</span>
                </div>

                <button
                    onClick={() => {
                        setSelectedWorkspace(null);
                        setShowLogs(!showLogs);
                    }}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 ml-4 text-xs font-semibold rounded-lg transition-all uppercase tracking-wide group",
                        connectionStatus !== 'connected' && "hidden",
                        showLogs
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                >
                    <Terminal className={cn("w-3.5 h-3.5 transition-colors", showLogs ? "text-white" : "group-hover:text-blue-500")} />
                    Console
                </button>
            </div>

            <div className="flex items-center gap-3">
                {clientVersion && (
                    <span
                        title={instanceId ? `Connected to: ${instanceId}` : undefined}
                        className="hidden sm:block text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 cursor-help"
                    >
                        Client v{clientVersion}
                    </span>
                )}

                <button
                    onClick={handleConnectClick}
                    disabled={connectionStatus === 'connecting'}
                    title={instanceId ? `Connected to: ${instanceId}` : undefined}
                    className={cn(
                        "h-10 px-6 rounded-full flex items-center gap-2 text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                        config.color,
                        connectionStatus === 'connecting' && "opacity-80"
                    )}
                >
                    {connectionStatus === 'connecting' && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span>{config.text}</span>
                </button>

                <button
                    onClick={onOpenConnect}
                    title="Settings"
                    className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </button>

                <a
                    href="https://github.com/ggarber/levitation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                    <Github className="w-5 h-5" />
                </a>
            </div>
        </header>
    );
}
