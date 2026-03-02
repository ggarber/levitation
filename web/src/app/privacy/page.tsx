import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans p-6 md:p-12 selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-100">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <Link href="/" className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-2 mb-8 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="group-hover:-translate-x-1 transition-transform" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                        </svg>
                        Back to Home
                    </Link>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Privacy Policy</h1>
                </div>

                <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                    <section className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">1. Data Storage</h2>
                        <p>No data is stored on our servers. This application acts as a client-side interface to your own server or workspace, and all communication happens directly between your browser and the specified WebSocket server.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">2. Tracking and Cookies</h2>
                        <p>We do not use tracking cookies or analytics that collect personal information. Local storage may be used to remember your connection settings for your convenience.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">3. Third Party Services</h2>
                        <p>No third-party scripts or trackers are intentionally included that would compromise your privacy. The service is strictly for managing your own infrastructure.</p>
                    </section>
                </div>

                <div className="pt-12 border-t border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
                    Last updated: March 2026
                </div>
            </div>
        </div>
    );
}
