import { useToast } from '../contexts/ToastContext';
import type { Toast } from '../contexts/ToastContext';

const typeStyles: Record<Toast['type'], React.CSSProperties> = {
  success: {
    backgroundColor: '#dcfce7',
    borderLeft: '4px solid #16a34a',
    color: '#166534',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderLeft: '4px solid #dc2626',
    color: '#991b1b',
  },
  info: {
    backgroundColor: '#dbeafe',
    borderLeft: '4px solid #2563eb',
    color: '#1e40af',
  },
};

export default function ToastNotification() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '400px',
        width: '100%',
      }}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            ...typeStyles[toast.type],
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.5rem',
            animation: 'slideIn 0.2s ease-out',
          }}
          role="alert"
        >
          <span style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.5 }}>
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              fontSize: '1.125rem',
              lineHeight: 1,
              color: 'inherit',
              opacity: 0.7,
              flexShrink: 0,
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
