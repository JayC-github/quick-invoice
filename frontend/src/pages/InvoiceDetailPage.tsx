import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { get, post, del, getBlob } from '../api/apiClient';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, toCents } from '../utils/currency';
import LoadingIndicator from '../components/LoadingIndicator';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Invoice, Client } from '../types/api';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchInvoice() {
      try {
        const inv = await get<Invoice>(`/invoices/${id}`);
        if (cancelled) return;
        setInvoice(inv);

        try {
          const client = await get<Client>(`/clients/${inv.clientId}`);
          if (!cancelled) setClientName(client.name);
        } catch {
          if (!cancelled) setClientName('Unknown Client');
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load invoice';
          addToast('error', message);
          navigate('/invoices');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchInvoice();
    return () => { cancelled = true; };
  }, [id, addToast, navigate]);

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await del(`/invoices/${id}`);
      addToast('success', 'Invoice deleted successfully');
      navigate('/invoices');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete invoice';
      addToast('error', message);
    } finally {
      setActionLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const updated = await post<Invoice>(`/invoices/${id}/send`);
      setInvoice(updated);
      addToast('success', 'Invoice sent successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invoice';
      addToast('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('error', 'Please enter a valid payment amount');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await post<Invoice>(`/invoices/${id}/pay`, {
        paymentAmount: toCents(amount),
      });
      setInvoice(updated);
      addToast('success', 'Invoice marked as paid');
      setShowPayDialog(false);
      setPaymentAmount('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark invoice as paid';
      addToast('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setActionLoading(true);
    try {
      const { blob, filename } = await getBlob(`/invoices/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download PDF';
      addToast('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !invoice) return <LoadingIndicator />;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Invoice {invoice.invoiceNumber}</h1>
          <PaymentStatusBadge status={invoice.status} />
        </div>
        <div style={headerActionsStyle}>
          <button onClick={handleDownloadPdf} style={secondaryButtonStyle} disabled={actionLoading}>
            Download PDF
          </button>
          {invoice.status === 'draft' && (
            <>
              <Link to={`/invoices/${id}/edit`} style={editLinkStyle}>Edit</Link>
              <button onClick={handleSend} style={primaryButtonStyle} disabled={actionLoading}>
                Send
              </button>
              <button onClick={() => setShowDeleteDialog(true)} style={dangerButtonStyle} disabled={actionLoading}>
                Delete
              </button>
            </>
          )}
          {invoice.status === 'viewed' && (
            <button onClick={() => { setPaymentAmount(String(invoice.total / 100)); setShowPayDialog(true); }} style={primaryButtonStyle} disabled={actionLoading}>
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={detailGridStyle}>
          <div style={detailItemStyle}>
            <span style={detailLabelStyle}>Client</span>
            <span style={detailValueStyle}>{clientName}</span>
          </div>
          <div style={detailItemStyle}>
            <span style={detailLabelStyle}>Issue Date</span>
            <span style={detailValueStyle}>{invoice.issueDate}</span>
          </div>
          <div style={detailItemStyle}>
            <span style={detailLabelStyle}>Due Date</span>
            <span style={detailValueStyle}>{invoice.dueDate}</span>
          </div>
        </div>

        <h2 style={sectionTitleStyle}>Line Items</h2>
        <div style={tableWrapperStyle}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.lineItemId}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={totalsStyle}>
          <div style={totalRowStyle}>
            <span style={totalLabelStyle}>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div style={totalRowStyle}>
            <span style={totalLabelStyle}>Tax ({(invoice.taxRate * 100).toFixed(1)}%)</span>
            <span>{formatCurrency(invoice.taxAmount)}</span>
          </div>
          <div style={{ ...totalRowStyle, ...grandTotalStyle }}>
            <span style={totalLabelStyle}>Total</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div style={notesStyle}>
            <h3 style={notesLabelStyle}>Notes</h3>
            <p style={notesTextStyle}>{invoice.notes}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {showPayDialog && (
        <div style={overlayStyle} onClick={() => setShowPayDialog(false)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 style={dialogTitleStyle}>Mark as Paid</h2>
            <p style={dialogMessageStyle}>Enter the payment amount received:</p>
            <div style={dialogFieldStyle}>
              <label htmlFor="paymentAmount" style={dialogLabelStyle}>Amount ($)</label>
              <input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0"
                step="0.01"
                style={dialogInputStyle}
                autoFocus
              />
            </div>
            <div style={dialogActionsStyle}>
              <button onClick={() => setShowPayDialog(false)} style={dialogCancelStyle}>Cancel</button>
              <button onClick={handleMarkPaid} style={dialogConfirmStyle} disabled={actionLoading}>
                {actionLoading ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const pageStyle: React.CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: '900px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 'var(--space-lg)',
  flexWrap: 'wrap',
  gap: '1rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 'var(--font-bold)' as unknown as number,
  marginBottom: '0.5rem',
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-lg)',
  boxShadow: 'var(--shadow-sm)',
};

const detailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
  marginBottom: 'var(--space-lg)',
};

const detailItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-xs)',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const detailValueStyle: React.CSSProperties = {
  fontSize: 'var(--font-base)',
  fontWeight: 500,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-lg)',
  fontWeight: 600,
  marginBottom: 'var(--space-sm)',
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: 'auto',
  marginBottom: 'var(--space-md)',
};

const totalsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '0.375rem',
};

const totalRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '2rem',
  fontSize: 'var(--font-sm)',
};

const totalLabelStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  minWidth: '120px',
  textAlign: 'right',
};

const grandTotalStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  paddingTop: '0.375rem',
  fontSize: 'var(--font-base)',
};

const notesStyle: React.CSSProperties = {
  marginTop: 'var(--space-lg)',
  paddingTop: 'var(--space-md)',
  borderTop: '1px solid var(--color-border)',
};

const notesLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-sm)',
  fontWeight: 600,
  marginBottom: '0.25rem',
};

const notesTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-sm)',
  color: 'var(--color-text-secondary)',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.6,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  cursor: 'pointer',
};

const editLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  textDecoration: 'none',
  cursor: 'pointer',
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#ffffff',
  color: 'var(--color-error)',
  border: '1px solid var(--color-error)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  cursor: 'pointer',
};

// Payment dialog styles
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

const dialogTitleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '0.5rem',
};

const dialogMessageStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#64748b',
  marginBottom: '1rem',
  lineHeight: 1.5,
};

const dialogFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '1.5rem',
};

const dialogLabelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
};

const dialogInputStyle: React.CSSProperties = {
  padding: '0.5rem',
  fontSize: '0.875rem',
  borderRadius: '0.375rem',
  border: '1px solid #e2e8f0',
};

const dialogActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
};

const dialogCancelStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const dialogConfirmStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
};
