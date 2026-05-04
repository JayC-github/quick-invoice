import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api/apiClient';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/currency';
import LoadingIndicator from '../components/LoadingIndicator';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import type { DashboardData, PaymentStatus } from '../types/api';

const statusLabels: Record<PaymentStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      try {
        const result = await get<DashboardData>('/dashboard');
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load dashboard';
          addToast('error', message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, [addToast]);

  if (loading || !data) return <LoadingIndicator />;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Dashboard</h1>

      <div style={metricsGridStyle}>
        <div style={{ ...metricCardStyle, borderTopColor: 'var(--color-primary)' }}>
          <span style={metricLabelStyle}>Total Outstanding</span>
          <span style={metricValueStyle}>{formatCurrency(data.totalOutstanding)}</span>
        </div>
        <div style={{ ...metricCardStyle, borderTopColor: '#16a34a' }}>
          <span style={metricLabelStyle}>Total Paid</span>
          <span style={metricValueStyle}>{formatCurrency(data.totalPaid)}</span>
        </div>
        <div style={{ ...metricCardStyle, borderTopColor: '#dc2626' }}>
          <span style={metricLabelStyle}>Overdue</span>
          <span style={metricValueStyle}>{formatCurrency(data.overdueAmount)}</span>
        </div>
      </div>

      <div style={statusGridStyle}>
        {(Object.keys(statusLabels) as PaymentStatus[]).map((status) => (
          <div key={status} style={statusCardStyle}>
            <span style={statusCountStyle}>{data.statusCounts[status] ?? 0}</span>
            <PaymentStatusBadge status={status} />
          </div>
        ))}
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Recent Invoices</h2>
        {data.recentInvoices.length === 0 ? (
          <p style={emptyStyle}>No invoices yet.</p>
        ) : (
          <div style={invoiceListStyle}>
            {data.recentInvoices.map((inv) => (
              <div
                key={inv.invoiceId}
                style={invoiceRowStyle}
                onClick={() => navigate(`/invoices/${inv.invoiceId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/invoices/${inv.invoiceId}`); }}
              >
                <div style={invoiceInfoStyle}>
                  <span style={invoiceNumberStyle}>{inv.invoiceNumber}</span>
                  <span style={invoiceDateStyle}>{inv.issueDate}</span>
                </div>
                <div style={invoiceRightStyle}>
                  <span style={invoiceTotalStyle}>{formatCurrency(inv.total)}</span>
                  <PaymentStatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: '1000px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 'var(--font-bold)' as unknown as number,
  marginBottom: 'var(--space-lg)',
};

const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 'var(--space-md)',
  marginBottom: 'var(--space-lg)',
};

const metricCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-lg)',
  boxShadow: 'var(--shadow-sm)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  borderTop: '3px solid transparent',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-xs)',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 700,
};

const statusGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 'var(--space-sm)',
  marginBottom: 'var(--space-lg)',
};

const statusCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-md)',
  boxShadow: 'var(--shadow-sm)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.375rem',
};

const statusCountStyle: React.CSSProperties = {
  fontSize: 'var(--font-xl)',
  fontWeight: 700,
};

const sectionStyle: React.CSSProperties = {};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-lg)',
  fontWeight: 600,
  marginBottom: 'var(--space-sm)',
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
  padding: 'var(--space-lg) 0',
};

const invoiceListStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

const invoiceRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'var(--space-md) var(--space-lg)',
  borderBottom: '1px solid var(--color-border)',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
};

const invoiceInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
};

const invoiceNumberStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: 'var(--font-sm)',
};

const invoiceDateStyle: React.CSSProperties = {
  fontSize: 'var(--font-xs)',
  color: 'var(--color-text-secondary)',
};

const invoiceRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const invoiceTotalStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 'var(--font-sm)',
};
