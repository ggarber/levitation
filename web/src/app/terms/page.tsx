import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
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
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Terms of Service</h1>
                </div>

                <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                    <section className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">1. Acceptance of Terms</h2>
                        <p>Using this page implies accepting terms of service. By accessing or using Levitation Web, you agree to be bound by these terms.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">2. No Guarantee</h2>
                        <p>No guarantee is provided that the service will work or be free of issues. The service is provided "as is" and "as available" without any warranty of any kind.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">3. User Responsibility</h2>
                        <p>You use this service under your own responsibility. We are not liable for any direct or indirect damages resulting from the use or inability to use this service.</p>
                    </section>
                </div>

                <div className="pt-12 border-t border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
                    Last updated: March 2026
                </div>
            </div>
        </div>
    );
}
