'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, ArrowRight, Activity, Terminal, Key } from 'lucide-react';
import { useClient } from '@/hooks/useClient';
import { cn } from '@/lib/utils';

export function ConnectModal({
    isOpen,
    onClose
}: {
    isOpen: boolean,
    onClose: () => void
}) {
    const { connect, connectionStatus, instanceId } = useClient();
    const [tempId, setTempId] = useState('');

    useEffect(() => {
        if (instanceId) setTempId(instanceId);
    }, [instanceId]);

    if (!isOpen) return null;

    const handleConnect = () => {
        if (tempId.trim()) {
            connect(tempId.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-700">
                {/* Glow Effects */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] opacity-30 blur-2xl animate-pulse" />

                <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-10 sm:p-14 flex flex-col gap-10">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 transition-transform hover:scale-110">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Security <span className="text-blue-500">Gateway</span></h2>
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                            Connect to your unique instance of Levitation. Please enter your terminal GUID to verify access.
                        </p>
                    </div>

                    {/* Form */}
                    <div className="flex flex-col gap-6">
                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 group-focus-within:text-blue-500 transition-colors">
                                <Key className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={tempId}
                                onChange={(e) => setTempId(e.target.value)}
                                placeholder="Terminal instance ID (GUID)"
                                className="w-full h-16 pl-16 pr-8 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-lg font-mono font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 outline-none ring-1 ring-transparent focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={onClose}
                                className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                            >
                                Decline
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={!tempId.trim()}
                                className={cn(
                                    "h-14 rounded-2xl flex items-center justify-center gap-3 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95",
                                    tempId.trim() ? "bg-gradient-to-br from-blue-600 to-indigo-600 hover:scale-[1.02]" : "bg-slate-400 opacity-50 cursor-not-allowed"
                                )}
                            >
                                <span>Connect</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-6 border-t dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            Encrypted Protocol
                        </div>
                        <div className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-help">
                            <Terminal className="w-3.5 h-3.5" />
                            v2.0 Beta Docs
                        </div>
                    </div>

                    {/* Decorative Dots */}
                    <div className="absolute top-10 right-10 flex gap-1.5 opacity-20">
                        <div className="w-1 h-1 rounded-full bg-slate-500" />
                        <div className="w-1 h-1 rounded-full bg-slate-500" />
                        <div className="w-1 h-1 rounded-full bg-slate-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
