import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getPendingSyncSessions, syncPendingSessionsWithServer } from '../offline/syncEngine';
import toast from 'react-hot-toast';

export const NetworkStatusPill: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const checkPending = async () => {
    try {
      const pending = await getPendingSyncSessions();
      setPendingCount(pending.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Internet reconnected. Ready to sync.');
      await handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Operating in Offline Mode. Attendance saved locally.', { icon: '📡' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPending();
    const interval = setInterval(checkPending, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline. Please connect to internet.');
      return;
    }
    setIsSyncing(true);
    const result = await syncPendingSessionsWithServer();
    setIsSyncing(false);
    if (result.syncedCount > 0) {
      toast.success(`Synced ${result.syncedCount} offline attendance sheet(s) with server!`);
      checkPending();
    }
  };

  if (!isOnline || pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
        )}
        <span>
          {isOnline ? 'Online' : 'Offline'} • {pendingCount} Pending Sync
        </span>
        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="ml-1 bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>Online & Synced</span>
    </div>
  );
};
