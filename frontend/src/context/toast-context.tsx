import { createContext, useContext, useMemo, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const value = useMemo(
    () => ({
      pushToast: (toast: Omit<ToastItem, 'id'>) => {
        const id = crypto.randomUUID();
        const nextToast = { ...toast, id };
        setToasts((current) => [...current, nextToast]);

        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 4200);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <article key={toast.id} className={`toast-card toast-card--${toast.tone}`}>
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};
