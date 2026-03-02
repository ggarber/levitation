import React from 'react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm transition-colors text-slate-500 dark:text-slate-400 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Link href="/terms" className="hover:text-blue-500 transition-colors">
                    Terms of Service
                </Link>
                <Link href="/privacy" className="hover:text-blue-500 transition-colors">
                    Privacy Policy
                </Link>
            </div>

            <div className="text-center sm:text-right">
                Using this page implies accepting <Link href="/terms" className="underline hover:text-blue-500 transition-colors">terms of service</Link>
            </div>
        </footer>
    );
}
