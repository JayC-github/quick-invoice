import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get } from '../api/apiClient';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/currency';
import LoadingIndicator from '../components/LoadingIndicator';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import type { InvoiceSummary, Client } from '../types/api';

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [invoiceData, clientData] = await Promise.all([
          get<InvoiceSummary[]>('/invoices'),
          get<Client[]>('/clients'),
        ]);
        if (!cancelled) {
          setInvoices(invoiceData);
          const map: Record<string, string> = {};
          for (const c of clientData) {
            map[c.clientId] = c.name;
          }
          setClientMap(map);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load invoices';
          addToast('error', message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [addToast]);

  if (loading) return <LoadingIndicator />;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Invoices</h1>
        <Link to="/invoices/new" style={newButtonStyle}>New Invoice</Link>
      </div>

      {invoices.length === 0 ? (
        <p style={emptyStyle}>No invoices yet. Create your first invoice to get started.</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  onClick={() => navigate(`/invoices/${inv.invoiceId}`)}
                  style={clickableRowStyle}
                >
                  <td style={numberCell}>{inv.invoiceNumber}</td>
                  <td>{clientMap[inv.clientId] || '—'}</td>
                  <td>{inv.issueDate}</td>
                  <td>{inv.dueDate}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(inv.total)}</td>
                  <td><PaymentStatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: '1100px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 'var(--space-lg)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 'var(--font-bold)' as unknown as number,
};

const newButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-primary)',
  color: '#ffffff',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  textDecoration: 'none',
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
  padding: 'var(--space-2xl) 0',
};

const tableWrapperStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

const clickableRowStyle: React.CSSProperties = {
  cursor: 'pointer',
};

const numberCell: React.CSSProperties = {
  fontWeight: 500,
};
