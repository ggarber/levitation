'use client';

import React, { useState, useRef, useEffect } from 'react';

import {
    Send,
    MessageSquare,
    Sparkles,
    User,
    Bot,
    CornerDownRight,
    Terminal,
    Folder,
    File,
    FileText,
    Flag,
    Zap,
    History,
    Search,
    CheckCircle2,
    Clock,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    FileCode
} from 'lucide-react';
import { useClient } from '@/hooks/useClient';
import { cn } from '@/lib/utils';

const ReactLogo = () => (
    <svg viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400 inline-block mr-1 mb-0.5">
        <circle cx="0" cy="0" r="2" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1" fill="none">
            <ellipse rx="10" ry="4.5" />
            <ellipse rx="10" ry="4.5" transform="rotate(60)" />
            <ellipse rx="10" ry="4.5" transform="rotate(120)" />
        </g>
    </svg>
);

export function ChatArea() {
    const {
        selectedWorkspace,
        workspaces,
        setSelectedWorkspace,
        sendMessage,
        sendCascadeMessage,
        isSending,
        isPolling,
        cascadesByPort,
        cascadeTimeline,
        getCascadeTrajectory,
        clearCascadeTimeline,
        isLoadingTimeline
    } = useClient();
    const [chatText, setChatText] = useState('');
    const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (!chatText.trim() || isSending || isPolling) return;

        if (cascadeTimeline?.trajectory?.cascadeId) {
            sendCascadeMessage(chatText, cascadeTimeline.trajectory.cascadeId);
        } else {
            sendMessage(chatText);
        }
        setChatText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [chatText]);

    useEffect(() => {
        setExpandedSteps({});
    }, [cascadeTimeline?.trajectory?.cascadeId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [cascadeTimeline]);

    if (!selectedWorkspace) return null;

    const renderStep = (step: any, idx: number) => {
        let icon = <Terminal className="w-4 h-4 text-slate-400" />;
        let content: React.ReactNode = null;

        const isReactFile = (path: string = '') => path.endsWith('.tsx') || path.endsWith('.jsx');
        const getFileName = (uri: string = '') => {
            const parts = uri.split('/');
            return parts[parts.length - 1];
        };
        const getRelativePath = (uri: string = '') => {
            if (!uri) return '';
            // Very simplified relative path logic
            const marker = '/projects/';
            const index = uri.indexOf(marker);
            if (index !== -1) {
                const sub = uri.substring(index + marker.length);
                const firstSlash = sub.indexOf('/');
                return firstSlash !== -1 ? sub.substring(firstSlash + 1) : sub;
            }
            return uri.split('/').slice(-3).join('/');
        };

        switch (step.type) {
            case 'CORTEX_STEP_TYPE_USER_INPUT':
                icon = <User className="w-4 h-4 text-slate-400" />;
                content = <span className="text-slate-700 dark:text-slate-300 font-medium">{step.userInput?.userResponse || 'User message'}</span>;
                break;
            case 'CORTEX_STEP_TYPE_PLANNER_RESPONSE':
                icon = <ChevronRight className="w-4 h-4 text-slate-400" />;
                const duration = step.metadata?.thinkingDuration ? Math.round(parseFloat(step.metadata.thinkingDuration)) : 1;
                content = <span className="text-slate-500 dark:text-slate-400">Thought for {duration}s</span>;
                break;
            case 'CORTEX_STEP_TYPE_LIST_DIRECTORY':
                icon = <Folder className="w-4 h-4 text-slate-400" />;
                content = (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Analyzed</span>
                        <span className="text-slate-500 truncate">{getRelativePath(step.listDirectory?.directoryPathUri)}</span>
                    </div>
                );
                break;
            case 'CORTEX_STEP_TYPE_VIEW_FILE':
                icon = <File className="w-4 h-4 text-slate-400" />;
                const viewPath = step.viewFile?.absolutePathUri || '';
                content = (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Analyzed</span>
                        <div className="flex items-center gap-1 shrink-0">
                            {isReactFile(viewPath) && <ReactLogo />}
                            <span className="font-bold text-slate-800 dark:text-slate-100">{getFileName(viewPath)}</span>
                        </div>
                        <span className="text-slate-400 shrink-0">#L1-{step.viewFile?.numLines || step.viewFile?.endLine || '...'}</span>
                    </div>
                );
                break;
            case 'CORTEX_STEP_TYPE_REPLACE_FILE_CONTENT':
            case 'CORTEX_STEP_TYPE_WRITE_FILE':
                icon = <FileText className="w-4 h-4 text-slate-400" />;
                const editPath = step.replaceFileContent?.absolutePathUri || step.writeFile?.absolutePathUri || '';
                content = (
                    <div className="flex items-center gap-1.5 w-full min-w-0">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Edited</span>
                        <div className="flex items-center gap-1 shrink-0">
                            {isReactFile(editPath) && <ReactLogo />}
                            <span className="font-bold text-slate-800 dark:text-slate-100">{getFileName(editPath)}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[11px] font-bold text-emerald-500">+2</span>
                            <span className="text-[11px] font-bold text-rose-500">-0</span>
                            <FileCode className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                    </div>
                );
                break;
            case 'CORTEX_STEP_TYPE_CHECKPOINT':
                icon = <Flag className="w-4 h-4 text-slate-400" />;
                content = <span className="font-bold text-slate-700 dark:text-slate-200">{step.checkpoint?.userIntent?.split('\n')[0] || 'Checkpoint'}</span>;
                break;
            case 'CORTEX_STEP_TYPE_EPHEMERAL_MESSAGE':
                icon = <Zap className="w-4 h-4 text-slate-400" />;
                content = <span className="text-slate-500">Processed system event</span>;
                break;
            default:
                content = <span className="text-slate-500 text-xs italic">{step.type.replace('CORTEX_STEP_TYPE_', '').replace(/_/g, ' ').toLowerCase()}</span>;
        }
        const isExpanded = expandedSteps[idx];

        return (
            <div key={idx} className="flex flex-col mb-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <div
                    onClick={() => setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    className={cn(
                        "flex items-center gap-5 py-2 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-all group cursor-pointer border border-transparent",
                        isExpanded && "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                    )}
                >
                    <div className="flex-shrink-0 w-5 flex justify-center">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0 text-[14px]">
                        {content}
                    </div>
                    <div className="flex-shrink-0">
                        <ChevronRight className={cn("w-3.5 h-3.5 text-slate-300 transition-transform duration-200", isExpanded && "rotate-90 text-blue-500")} />
                    </div>
                </div>

                {isExpanded && (
                    <div className="ml-10 mt-1 mb-3 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 text-[12px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
                        <pre className="whitespace-pre-wrap break-words leading-relaxed">
                            {JSON.stringify(step, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    };

    const steps = cascadeTimeline?.trajectory?.steps || cascadeTimeline?.steps || [];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 transition-all duration-300 overflow-hidden">
            {/* Header */}
            <div className="h-16 px-8 flex items-center justify-between sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {!cascadeTimeline ? (
                            <>
                                <span className="text-slate-400 font-medium">New conversation in</span>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                                        className="flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors text-blue-600 dark:text-blue-400"
                                    >
                                        {selectedWorkspace.workspaceName}
                                        <span className="text-[10px] opacity-60 font-mono italic font-normal">⌵</span>
                                    </button>

                                    {isWorkspaceMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsWorkspaceMenuOpen(false)} />
                                            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-40 py-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                                                    Switch Workspace
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {workspaces.map((ws, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setSelectedWorkspace(ws);
                                                                setIsWorkspaceMenuOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                                                                selectedWorkspace.port === ws.port
                                                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold"
                                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                            )}
                                                        >
                                                            {ws.workspaceName}
                                                            <span className="text-[10px] opacity-50 font-mono">{ws.port}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-sm font-black uppercase tracking-widest text-blue-500">Cascade Timeline</span>
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[300px]">
                                    {cascadeTimeline.trajectory.cascadeId}
                                </span>
                            </div>
                        )}
                    </h3>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Main Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-8"
                >
                    {isLoadingTimeline ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-slate-500 font-medium">Loading cascade timeline...</p>
                        </div>
                    ) : !cascadeTimeline ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-inner">
                                <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">How can I help you?</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">
                                    Select a workspace or choose an existing cascade from the sidebar to continue your work.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl space-y-2">
                            {steps.map((step: any, idx: number) => renderStep(step, idx))}

                            {(isSending || isPolling) && (
                                <div className="flex items-center gap-5 px-2 py-4">
                                    <div className="w-5 flex justify-center">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                    </div>
                                    <div className="text-[14px] font-medium text-slate-400 italic">Working...</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat Input Area */}
                <div className="p-8 pt-0 sticky bottom-0 bg-gradient-to-t from-white dark:from-slate-950 via-white dark:via-slate-950 to-transparent">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-slate-50 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col p-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                            <textarea
                                ref={textareaRef}
                                className="w-full bg-transparent p-3 text-base font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-none min-h-[60px] max-h-[400px] leading-relaxed"
                                placeholder={cascadeTimeline ? "Reply to this cascade..." : "Start a new task..."}
                                value={chatText}
                                onChange={(e) => setChatText(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />

                            <div className="flex items-center justify-between mt-1 px-2 pb-1">
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">⏎</kbd> to send
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!chatText.trim() || isSending || isPolling}
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg shrink-0",
                                        (!chatText.trim() || isSending || isPolling)
                                            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/40"
                                    )}
                                >
                                    {isSending || isPolling ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-6 h-6" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
