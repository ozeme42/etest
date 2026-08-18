import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

let toastListener = null;

export const showToast = (message, type = 'success', duration = 3500) => {
  if (toastListener) {
    toastListener({ message, type, duration, id: Date.now() });
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 3500);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '420px',
        width: 'calc(100% - 32px)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '0.75rem 1rem',
              borderRadius: '14px',
              background: '#ffffff',
              border: isSuccess ? '1.5px solid #86efac' : isError ? '1.5px solid #fca5a5' : '1.5px solid #cbd5e1',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              color: '#0f172a',
              fontSize: '0.86rem',
              fontWeight: 700,
              animation: 'slideInRight 0.25s ease forwards'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {isSuccess ? (
                <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              ) : isError ? (
                <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              ) : (
                <Info size={18} color="#2563eb" style={{ flexShrink: 0 }} />
              )}
              <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
