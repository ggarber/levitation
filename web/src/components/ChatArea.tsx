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
    File as LucideFile,
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
    FileCode,
    Copy,
    Check,
    LayoutGrid,
    ChevronDown,
    AlertCircle,
    Globe,
    Square
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
        isStartingNewCascade,
        isCascadeInProgress,
        cascadesByPort,
        cascadeTimeline,
        getCascadeTrajectory,
        clearCascadeTimeline,
        isLoadingTimeline,
        cancelCascade,
        handleCascadeUserInteraction
    } = useClient();
    const [chatText, setChatText] = useState('');
    const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [copiedCascades, setCopiedCascades] = useState(false);
    const workspaceMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
                setIsWorkspaceMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleWorkspaceSelect = (ws: any) => {
        setSelectedWorkspace(ws);
        clearCascadeTimeline();
        setIsWorkspaceMenuOpen(false);
    };

    const currentCascadeId = cascadeTimeline?.trajectory?.cascadeId;
    const cascadeFromList = currentCascadeId && selectedWorkspace
        ? (cascadesByPort[selectedWorkspace.port] || []).find(c => c.id === currentCascadeId)
        : null;
    const trajectoryStatus = cascadeTimeline?.trajectory?.status;
    const isFinished = trajectoryStatus === 'CASCADE_RUN_STATUS_DONE' ||
        trajectoryStatus === 'CASCADE_RUN_STATUS_FAILED' ||
        trajectoryStatus === 'CASCADE_RUN_STATUS_IDLE';
    const isCurrentInProgress = (currentCascadeId ? isCascadeInProgress(currentCascadeId) : isStartingNewCascade) && !isFinished;

    const handleSend = () => {
        if (!chatText.trim()) {
            if (isCurrentInProgress && cascadeTimeline?.trajectory?.cascadeId) {
                cancelCascade(cascadeTimeline.trajectory.cascadeId);
            }
            return;
        }

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

    const handleCopyJSON = () => {
        if (!cascadeTimeline) return;
        navigator.clipboard.writeText(JSON.stringify(cascadeTimeline, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCascadesJSON = () => {
        if (!selectedWorkspace) return;
        const cascades = cascadesByPort[selectedWorkspace.port];
        if (!cascades) return;
        navigator.clipboard.writeText(JSON.stringify(cascades, null, 2));
        setCopiedCascades(true);
        setTimeout(() => setCopiedCascades(false), 2000);
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

    const lastCascadeIdRef = useRef<string | null>(null);
    useEffect(() => {
        const currentId = cascadeTimeline?.trajectory?.cascadeId;
        if (currentId && currentId !== lastCascadeIdRef.current) {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
            lastCascadeIdRef.current = currentId;
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
                if (step.plannerResponse?.modifiedResponse) {
                    icon = <Sparkles className="w-4 h-4 text-blue-400" />;
                    content = (
                        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {step.plannerResponse.modifiedResponse}
                        </div>
                    );
                    break;
                }
                return null;
            case 'CORTEX_STEP_TYPE_RUN_COMMAND':
                icon = <Terminal className="w-4 h-4 text-slate-400" />;
                content = <span className="text-slate-700 dark:text-slate-300 font-medium">Ran command: {step.runCommand?.comandLine}</span>;
                break;
            case 'CORTEX_STEP_TYPE_COMMAND_STATUS':
                icon = <Clock className="w-4 h-4 text-slate-400" />;
                content = <span className="text-slate-700 dark:text-slate-300 font-medium">Checked command status</span>;
                break;
            case 'CORTEX_STEP_TYPE_LIST_DIRECTORY':
                icon = <Folder className="w-4 h-4 text-slate-400" />;
                content = (
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Analyzed</span>
                        <span className="text-slate-500">{getRelativePath(step.listDirectory?.directoryPathUri)}</span>
                    </div>
                );
                break;
            case 'CORTEX_STEP_TYPE_GREP_SEARCH':
                icon = <Search className="w-4 h-4 text-slate-400" />;
                content = (
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Searching....</span>
                        <span className="text-slate-500">{step.grepSearch?.query}</span>
                    </div>
                );
                break;
            case 'CORTEX_STEP_TYPE_VIEW_FILE':
                icon = <LucideFile className="w-4 h-4 text-slate-400" />;
                const viewPath = step.viewFile?.absolutePathUri || '';

                content = (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-200">Analyzed</span>
                            <div className="flex items-center gap-1 shrink-0">
                                {isReactFile(viewPath) && <ReactLogo />}
                                <span className="font-bold text-slate-800 dark:text-slate-100">{getFileName(viewPath)}</span>
                            </div>
                            <span className="text-slate-400 shrink-0">
                                #L1{(() => {
                                    const end = step.viewFile?.numLines || step.viewFile?.endLine;
                                    return end > 1 ? `-${end}` : '';
                                })()}
                            </span>
                        </div>
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
            case 'CORTEX_STEP_TYPE_CODE_ACTION':
                const isEditAction = step.codeAction?.actionSpec?.command?.isEdit;
                const actionPath = step.codeAction?.actionSpec?.command?.absolutePathUri || '';
                icon = <FileCode className="w-4 h-4 text-slate-400" />;
                if (isEditAction) {
                    content = (
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                            <span className="font-bold text-slate-700 dark:text-slate-200">Edited</span>
                            <div className="flex items-center gap-1 shrink-0">
                                {isReactFile(actionPath) && <ReactLogo />}
                                <span className="font-bold text-slate-800 dark:text-slate-100">{getFileName(actionPath)}</span>
                            </div>
                        </div>
                    );
                } else {
                    content = <span className="font-bold text-slate-700 dark:text-slate-200">Coded</span>;
                }
                break;
            case 'CORTEX_STEP_TYPE_CHECKPOINT':
                icon = <Flag className="w-4 h-4 text-slate-400" />;
                content = <span className="font-bold text-slate-700 dark:text-slate-200">{step.checkpoint?.userIntent?.split('\n')[0] || 'Checkpoint'}</span>;
                break;
            case 'CORTEX_STEP_TYPE_EPHEMERAL_MESSAGE':
                return null;
            case 'CORTEX_STEP_TYPE_ERROR_MESSAGE':
                icon = <AlertCircle className="w-4 h-4 text-slate-400" />;
                content = (
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Error</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {step.errorMessage?.error?.userErrorMessage || 'An error occurred'}
                        </span>
                    </div>
                );
                break;

            case 'CORTEX_STEP_TYPE_BROWSER_SUBAGENT':
                icon = <Globe className="w-4 h-4 text-slate-400" />;
                content = (
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Opened URL in Browser</span>
                        {step.browserSubagent?.url && (
                            <span className="text-slate-500 ml-1">{step.browserSubagent.url}</span>
                        )}
                    </div>
                );
                break;

            default:
                content = <span className="text-slate-500 text-xs italic">{step.type.replace('CORTEX_STEP_TYPE_', '').replace(/_/g, ' ').toLowerCase()}</span>;
        }

        if (step.description &&
            step.type !== 'CORTEX_STEP_TYPE_USER_INPUT' &&
            step.type !== 'CORTEX_STEP_TYPE_RUN_COMMAND' &&
            step.type !== 'CORTEX_STEP_TYPE_BROWSER_SUBAGENT' &&
            step.type !== 'CORTEX_STEP_TYPE_PLANNER_RESPONSE' &&
            step.type !== 'CORTEX_STEP_TYPE_ERROR_MESSAGE') {
            content = <span className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{step.description}</span>;
        }

        const isExpanded = expandedSteps[idx];
        const isWaiting = step.status === 'CORTEX_STEP_STATUS_WAITING';

        const renderInteractionUI = () => {
            if (!isWaiting) return null;

            // Find permission request in any sub-object
            const subObjects = Object.values(step).filter(v => v && typeof v === 'object');
            let permissionRequest: any = null;
            for (const sub of subObjects) {
                if ((sub as any).filePermissionRequest) {
                    permissionRequest = (sub as any).filePermissionRequest;
                    break;
                }
            }

            return (
                <div className="mt-2 ml-10 flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                        {permissionRequest ? (
                            <>Allow access to <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[12px]">{permissionRequest.absolutePathUri}</code>?</>
                        ) : (
                            <>Allow this action?</>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const cascadeId = step.metadata?.sourceTrajectoryStepInfo?.cascadeId;
                                if (cascadeId) {
                                    handleCascadeUserInteraction(cascadeId, {
                                        trajectoryId: step.metadata.sourceTrajectoryStepInfo.trajectoryId,
                                        stepIndex: step.metadata.sourceTrajectoryStepInfo.stepIndex,
                                        filePermission: {
                                            allow: false,
                                            absolutePathUri: permissionRequest?.absolutePathUri || ''
                                        }
                                    });
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            Deny
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const cascadeId = step.metadata?.sourceTrajectoryStepInfo?.cascadeId;
                                if (cascadeId) {
                                    handleCascadeUserInteraction(cascadeId, {
                                        trajectoryId: step.metadata.sourceTrajectoryStepInfo.trajectoryId,
                                        stepIndex: step.metadata.sourceTrajectoryStepInfo.stepIndex,
                                        filePermission: {
                                            allow: true,
                                            scope: 'PERMISSION_SCOPE_ONCE',
                                            absolutePathUri: permissionRequest?.absolutePathUri || ''
                                        }
                                    });
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
                        >
                            Allow Once
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const cascadeId = step.metadata?.sourceTrajectoryStepInfo?.cascadeId;
                                if (cascadeId) {
                                    handleCascadeUserInteraction(cascadeId, {
                                        trajectoryId: step.metadata.sourceTrajectoryStepInfo.trajectoryId,
                                        stepIndex: step.metadata.sourceTrajectoryStepInfo.stepIndex,
                                        filePermission: {
                                            allow: true,
                                            scope: 'PERMISSION_SCOPE_CONVERSATION',
                                            absolutePathUri: permissionRequest?.absolutePathUri || ''
                                        }
                                    });
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
                        >
                            Allow This Conversation
                        </button>
                    </div>
                </div>
            );
        };

        return (
            <div key={idx} className="flex flex-col mb-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <div
                    onClick={() => setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    className={cn(
                        "flex items-center gap-5 py-2 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-all group cursor-pointer border border-transparent",
                        isExpanded && "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800",
                        isWaiting && "bg-slate-50/50 dark:bg-slate-900/20 border-blue-100/30 dark:border-blue-900/20"
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

                {renderInteractionUI()}

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

    const steps = (cascadeTimeline?.trajectory?.steps || cascadeTimeline?.steps || []).filter((s: any) => s.type !== 'CORTEX_STEP_TYPE_CONVERSATION_HISTORY' && s.type !== 'CORTEX_STEP_TYPE_PLANNER_RESPONSE');

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 transition-all duration-300 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Header with Title and Actions */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 min-h-[64px]">
                    <div className="flex-1 min-w-0">
                        {cascadeTimeline && (
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">
                                {cascadeTimeline.trajectory?.summary && cascadeTimeline.trajectory.summary !== 'Unknown Session'
                                    ? cascadeTimeline.trajectory.summary
                                    : (cascadeFromList?.summary || 'Untitled Session')}
                            </h3>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!cascadeTimeline && (
                            <button
                                onClick={handleCopyCascadesJSON}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-sm"
                            >
                                {copiedCascades ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedCascades ? 'Copied!' : 'Copy Cascades JSON'}
                            </button>
                        )}
                        {cascadeTimeline && (
                            <button
                                onClick={handleCopyJSON}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-sm"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy Trajectory JSON'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-20"
                >
                    {isLoadingTimeline ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-slate-500 font-medium">Loading timeline...</p>
                        </div>
                    ) : !cascadeTimeline ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-inner">
                                <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                            </div>
                            <div className="relative">
                                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2 flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
                                    <span>Start new conversation in</span>
                                    <div className="relative" ref={workspaceMenuRef}>
                                        <button
                                            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-blue-600 dark:text-blue-400 group border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                                        >
                                            <LayoutGrid className="w-7 h-7 group-hover:scale-110 transition-transform" />
                                            <span className="truncate max-w-[300px]">{selectedWorkspace.workspaceName}</span>
                                            <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", isWorkspaceMenuOpen && "rotate-180")} />
                                        </button>

                                        {isWorkspaceMenuOpen && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200 text-left">
                                                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Switch Workspace</span>
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto">
                                                    {workspaces.map((ws) => (
                                                        <button
                                                            key={ws.port}
                                                            onClick={() => handleWorkspaceSelect(ws)}
                                                            className={cn(
                                                                "w-full px-4 py-3 text-sm font-bold flex items-center justify-between transition-colors",
                                                                selectedWorkspace.port === ws.port
                                                                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 truncate">
                                                                <LayoutGrid className={cn("w-4 h-4", selectedWorkspace.port === ws.port ? "text-blue-500" : "text-slate-300")} />
                                                                <span className="truncate">{ws.workspaceName}</span>
                                                            </div>
                                                            {selectedWorkspace.port === ws.port && <CheckCircle2 className="w-4 h-4" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-lg">
                                    Select a workspace or choose an existing session from the sidebar to continue your work.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl space-y-2">
                            {steps.map((step: any, idx: number) => renderStep(step, idx))}

                            {isCurrentInProgress && (
                                <div className="flex items-center px-2 py-4">
                                    <div className="text-[14px] font-medium text-slate-400 italic flex items-center">
                                        {steps.some((s: any) => s.status === 'CORTEX_STEP_STATUS_WAITING') ? (
                                            "Waiting for your input..."
                                        ) : cascadeTimeline?.trajectory?.status ? (
                                            cascadeTimeline.trajectory.status
                                        ) : (
                                            <span className="flex items-center">
                                                Generating
                                                <span className="flex ml-1">
                                                    <span className="animate-[bounce_1s_infinite_0ms]">.</span>
                                                    <span className="animate-[bounce_1s_infinite_200ms] mx-0.5">.</span>
                                                    <span className="animate-[bounce_1s_infinite_400ms]">.</span>
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Chat Input Area */}
                <div className="p-8 pt-0 sticky bottom-0 bg-gradient-to-t from-white dark:from-slate-950 via-white dark:via-slate-950 to-transparent z-10">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-slate-50 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col p-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                            <textarea
                                ref={textareaRef}
                                className="w-full bg-transparent p-3 text-base font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-none min-h-[60px] max-h-[400px] leading-relaxed"
                                placeholder="Ask anything"
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
                                    disabled={!chatText.trim() && !isCurrentInProgress}
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg shrink-0",
                                        (!chatText.trim() && !isCurrentInProgress)
                                            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                                            : (isCurrentInProgress && !chatText.trim())
                                                ? "bg-slate-200 dark:bg-slate-800 text-red-500 shadow-none hover:bg-slate-300 dark:hover:bg-slate-700"
                                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/40"
                                    )}
                                >
                                    {isCurrentInProgress && !chatText.trim() ? (
                                        <Square className="w-3.5 h-3.5 fill-current" />
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
