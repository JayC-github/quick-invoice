interface LoadingIndicatorProps {
  fullPage?: boolean;
}

export default function LoadingIndicator({ fullPage = false }: LoadingIndicatorProps) {
  return (
    <div style={fullPage ? fullPageStyle : inlineStyle}>
      <div style={spinnerStyle} role="status" aria-label="Loading">
        <span className="sr-only">Loading…</span>
      </div>
      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

const spinnerStyle: React.CSSProperties = {
  width: '2rem',
  height: '2rem',
  border: '3px solid #e2e8f0',
  borderTopColor: '#2563eb',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
};

const fullPageStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100%',
};

const inlineStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};
