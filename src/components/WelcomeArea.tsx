'use client';

import React, { useState } from 'react';
import { Terminal, Shield, Cpu, Activity, Info, AlertTriangle, Play, LayoutGrid, ChevronRight, ChevronDown } from 'lucide-react';
import { useClient } from '@/hooks/useClient';
import { cn } from '@/lib/utils';

function LogEntry({ log, index }: { log: string; index: number }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isError = log.includes('Error:');
    const isSent = log.includes('Sending:');
    const isReceived = log.includes('Received:');

    let arrow = '';
    let label = 'INFO';
    let messageType = '';
    let content = log;

    if (isSent) {
        arrow = '->';
        const jsonStr = log.replace(/^Sending: /, '');
        try {
            const parsed = JSON.parse(jsonStr);
            messageType = parsed.type || 'Unknown';
            content = JSON.stringify(parsed, null, 2);
        } catch (e) {
            content = jsonStr;
            messageType = 'Raw Stream';
        }
    } else if (isReceived) {
        arrow = '<-';
        const jsonStr = log.replace(/^Received: /, '');
        try {
            const parsed = JSON.parse(jsonStr);
            messageType = parsed.type || 'Unknown';
            content = JSON.stringify(parsed, null, 2);
        } catch (e) {
            content = jsonStr;
            messageType = 'Raw Stream';
        }
    } else if (isError) {
        label = 'ALRT';
        content = log.replace(/^Error: /, '');
        messageType = 'Alert Message';
    } else {
        messageType = 'System Event';
    }

    return (
        <div
            className={cn(
                "group/log font-mono text-[13px] leading-relaxed flex flex-col gap-1 p-2 rounded-lg transition-all duration-200 cursor-pointer border border-transparent min-w-0 w-full",
                isExpanded ? "bg-slate-800/50 border-slate-700/50" : "hover:bg-slate-800/30"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center gap-4 pr-4 min-w-0 w-full">
                <div className="flex items-center gap-3 shrink-0">
                    {(isSent || isReceived) ? (
                        <span className={cn(
                            "text-sm font-bold flex items-center gap-2",
                            isSent ? "text-blue-400" : "text-emerald-400"
                        )}>
                            {arrow} <span className="text-slate-300 font-bold uppercase tracking-tight">{messageType}</span>
                        </span>
                    ) : (
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter",
                            isError ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-400"
                        )}>
                            {label}
                        </span>
                    )}
                </div>

                {!isExpanded && (
                    <span className="text-slate-600 text-[11px] truncate flex-1 opacity-40 font-light ml-2">
                        {log.substring(0, 80)}
                    </span>
                )}

                <div className="ml-auto opacity-20 group-hover/log:opacity-100 transition-opacity shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
            </div>

            {isExpanded && (
                <div className="ml-4 mr-4 mt-2 mb-2 overflow-hidden">
                    <pre className="text-[11px] bg-black/40 p-4 rounded-xl text-slate-400 overflow-x-auto border border-white/5 selection:bg-blue-500/30 whitespace-pre scrollbar-hide">
                        {content}
                    </pre>
                </div>
            )}
        </div>
    );
}

export function WelcomeArea() {
    const {
        connectionStatus,
        instanceId,
        logs,
        clearLogs,
        sendCommand,
        refreshWorkspaces,
        showLogs
    } = useClient();

    const filteredLogs = logs.filter(log => {
        const lowerLog = log.toLowerCase();
        // Filter out Ping/Pong messages from the UI
        if (lowerLog.includes('"type":"ping"') || lowerLog.includes('"type":"pong"')) return false;
        if (lowerLog.includes('sending: ping') || lowerLog.includes('received: pong')) return false;
        return true;
    });

    return (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 transition-all duration-300 p-12">
            <div className="max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Hero Section */}
                <div className={cn(
                    "flex flex-col gap-4 max-w-2xl",
                    !showLogs && "mx-auto text-center items-center"
                )}>
                    <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-2xl shadow-blue-500/10 border border-blue-500/10">
                        <Terminal className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter sm:text-5xl leading-tight">
                        Levitation <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Control Center</span>
                    </h2>
                    <p className="text-lg font-medium text-slate-600 dark:text-slate-400 leading-relaxed pr-0 sm:pr-12">
                        This application allows you to manage and interact with your local workspaces and cascade processes. It provides a real-time interface to monitor logs and send commands to your running instances.
                    </p>
                    <div className="mt-4 p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 text-left">
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Getting Started
                        </p>
                        <p className="mt-2 text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                            To begin, ensure you have started the client node locally on the computer where Antigravity is running. Once the node is active, click the <strong>Connect</strong> button in the top right corner to establish a secure link.
                        </p>
                    </div>
                </div>

                {showLogs && (
                    <div className="flex flex-col gap-6 w-full max-w-full">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-3">
                                <Activity className="w-4 h-4 text-blue-500" />
                                System Activity
                            </h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={clearLogs}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 hover:text-blue-500 transition-colors"
                                >
                                    Clear Logs
                                </button>
                            </div>
                        </div>

                        <div className="group relative w-full max-w-full overflow-hidden">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-700" />
                            <div className="relative h-[600px] bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col ring-1 ring-white/5 w-full max-w-full">
                                {/* Log Stream */}
                                <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-1 pt-4 w-full">
                                    {filteredLogs.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                            <Terminal className="w-12 h-12 text-slate-700 mb-6 animate-pulse" />
                                            <span className="text-sm font-mono tracking-tighter text-slate-700">Awaiting connection...</span>
                                        </div>
                                    ) : (
                                        filteredLogs.map((log, i) => (
                                            <LogEntry key={i} log={log} index={filteredLogs.length - 1 - i} />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Note */}
                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold transition-all w-fit">
                    <AlertTriangle className="w-4 h-4 text-amber-500/50" />
                    <span>Connected Instance: {instanceId ? instanceId : 'None'}</span>
                </div>
            </div>
        </div>
    );
}
