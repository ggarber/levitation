'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { WelcomeArea } from '@/components/WelcomeArea';
import { ConnectModal } from '@/components/ConnectModal';
import { Footer } from '@/components/Footer';
import { useClient } from '@/hooks/useClient';
import { cn } from '@/lib/utils';

export default function Home() {
  const { selectedWorkspace, connectionStatus, instanceId } = useClient();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // If we have an instanceId but are disconnected, and the user hasn't dismissed the modal, we might want to show it.
  // In the mobile app, it only shows on button click if ID is missing.

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-white dark:bg-slate-950 font-sans selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-100">
      <Header toggleSidebar={toggleSidebar} onOpenConnect={() => setIsConnectModalOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isVisible={isSidebarVisible} />

        <div className={cn(
          "flex-1 flex flex-col h-full transition-all duration-300 relative",
          !isSidebarVisible && "ml-0"
        )}>
          {selectedWorkspace ? (
            <ChatArea />
          ) : (
            <WelcomeArea />
          )}

          {/* Background Decorative Gradient */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[160px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[140px] -z-10 pointer-events-none -translate-x-1/2 translate-y-1/2" />
        </div>
      </div>

      <Footer />

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Auto-open modal if no instanceId and click connect (handled in header, but we can sync here) */}
      <SyncConnectionModal setOpen={setIsConnectModalOpen} />
    </main>
  );
}

// Small helper to monitor connection status and trigger modal from header logic if needed
function SyncConnectionModal({ setOpen }: { setOpen: (open: boolean) => void }) {
  const { connectionStatus, instanceId } = useClient();

  useEffect(() => {
    // If user clicks "Connect" but no ID, they'll see the modal
    // In our simplified logic, the Header calls connect(null) which uses instanceId or does nothing if missing.
    // We want to trigger the modal if they haven't set an ID.
  }, [connectionStatus, instanceId]);

  return null;
}
