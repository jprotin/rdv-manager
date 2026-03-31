import { createContext, useContext, useState, useEffect, useRef } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const notify = (type, message, duration = 3500) => {
    clearTimeout(timerRef.current);
    setNotification({ type, message });
    timerRef.current = setTimeout(() => setNotification(null), duration);
  };

  return (
    <AppContext.Provider value={{ isOnline, notify }}>
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
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs text-center`}>
      {message}
    </div>
  );
}
