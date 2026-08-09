import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from './Icon';

type ToastTone = 'success' | 'danger' | 'default';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = 'default') => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.tone !== 'default' ? ` toast--${t.tone}` : ''}`}>
            <Icon name={t.tone === 'danger' ? 'alert' : 'check'} size={16} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
