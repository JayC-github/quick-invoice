import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api/apiClient';
import { useToast } from '../contexts/ToastContext';
import { toCents } from '../utils/currency';
import { validateRequired, validateDateRange, validateLineItems } from '../utils/validation';
import LoadingIndicator from '../components/LoadingIndicator';
import LineItemEditor, { createEmptyRow, type LineItemRow } from '../components/LineItemEditor';
import type { Client, Invoice } from '../types/api';

export default function CreateInvoicePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRateInput, setTaxRateInput] = useState('0');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemRow[]>([createEmptyRow()]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function fetchClients() {
      try {
        const data = await get<Client[]>('/clients');
        if (!cancelled) setClients(data);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load clients';
          addToast('error', message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchClients();
    return () => { cancelled = true; };
  }, [addToast]);

  const taxRateDecimal = parseFloat(taxRateInput) / 100 || 0;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const clientResult = validateRequired(clientId, 'Client');
    if (!clientResult.valid) newErrors.clientId = clientResult.error!;

    if (!issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }

    const dateResult = validateDateRange(issueDate, dueDate);
    if (!dateResult.valid) newErrors.dueDate = dateResult.error!;

    const parsedItems = lineItems.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
    }));
    const itemsResult = validateLineItems(parsedItems);
    if (!itemsResult.valid) newErrors.lineItems = itemsResult.error!;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        clientId,
        issueDate,
        dueDate,
        taxRate: taxRateDecimal,
        notes: notes.trim() || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity),
          unitPrice: toCents(parseFloat(item.unitPrice)),
        })),
      };

      const invoice = await post<Invoice>('/invoices', payload);
      addToast('success', 'Invoice created successfully');
      navigate(`/invoices/${invoice.invoiceId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invoice';
      addToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  if (loading) return <LoadingIndicator />;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>New Invoice</h1>

      <div style={cardStyle}>
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label htmlFor="clientId" style={labelStyle}>Client *</label>
            <select
              id="clientId"
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); clearError('clientId'); }}
              disabled={submitting}
              style={selectStyle}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>{c.name}</option>
              ))}
            </select>
            {errors.clientId && <p style={errorStyle}>{errors.clientId}</p>}
          </div>

          <div style={rowStyle}>
            <div style={{ ...fieldStyle, flex: 1 }}>
              <label htmlFor="issueDate" style={labelStyle}>Issue Date *</label>
              <input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); clearError('issueDate'); }}
                disabled={submitting}
              />
              {errors.issueDate && <p style={errorStyle}>{errors.issueDate}</p>}
            </div>

            <div style={{ ...fieldStyle, flex: 1 }}>
              <label htmlFor="dueDate" style={labelStyle}>Due Date *</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); clearError('dueDate'); }}
                disabled={submitting}
              />
              {errors.dueDate && <p style={errorStyle}>{errors.dueDate}</p>}
            </div>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="taxRate" style={labelStyle}>Tax Rate (%)</label>
            <input
              id="taxRate"
              type="number"
              value={taxRateInput}
              onChange={(e) => setTaxRateInput(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              disabled={submitting}
              style={{ maxWidth: '120px' }}
            />
          </div>

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Line Items</h2>
            <LineItemEditor
              items={lineItems}
              onChange={(items) => { setLineItems(items); clearError('lineItems'); }}
              taxRate={taxRateDecimal}
            />
            {errors.lineItems && <p style={errorStyle}>{errors.lineItems}</p>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="notes" style={labelStyle}>Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              disabled={submitting}
              rows={3}
            />
          </div>

          <div style={buttonRowStyle}>
            <button type="button" onClick={() => navigate('/invoices')} style={cancelButtonStyle} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={submitButtonStyle}>
              {submitting ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: '900px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 'var(--font-bold)' as unknown as number,
  marginBottom: 'var(--space-lg)',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-lg)',
  boxShadow: 'var(--shadow-sm)',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  marginBottom: '0.25rem',
};

const selectStyle: React.CSSProperties = {
  padding: '0.5rem',
  fontSize: 'var(--font-sm)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--color-error)',
  fontSize: 'var(--font-xs)',
  marginTop: '0.25rem',
};

const sectionStyle: React.CSSProperties = {
  marginTop: '0.5rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-lg)',
  fontWeight: 600,
  marginBottom: 'var(--space-sm)',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: '0.5rem',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  cursor: 'pointer',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  cursor: 'pointer',
};
