interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title" style={titleStyle}>{title}</h2>
        <p id="confirm-dialog-message" style={messageStyle}>{message}</p>
        <div style={actionsStyle}>
          <button onClick={onCancel} style={cancelButtonStyle}>
            Cancel
          </button>
          <button onClick={onConfirm} style={confirmButtonStyle}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  maxWidth: '420px',
  width: '100%',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '0.5rem',
};

const messageStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#64748b',
  marginBottom: '1.5rem',
  lineHeight: 1.5,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const confirmButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
};
