import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncAll } from '../services/db.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState(null);
  const notifTimer = useRef(null);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAll();
    } catch (err) {
      console.warn('Sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for SW sync requests
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SYNC_REQUESTED') triggerSync();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  const notify = useCallback((type, message, duration = 3500) => {
    clearTimeout(notifTimer.current);
    setNotification({ type, message });
    notifTimer.current = setTimeout(() => setNotification(null), duration);
  }, []);

  return (
    <AppContext.Provider value={{ isOnline, isSyncing, notify, triggerSync }}>
      {children}
      {notification && <Toast type={notification.type} message={notification.message} />}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

function Toast({ type, message }) {
  const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-gray-800';
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in max-w-xs text-center`}
    >
      {message}
    </div>
  );
}
