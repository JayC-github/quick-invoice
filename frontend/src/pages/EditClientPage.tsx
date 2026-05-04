import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, put } from '../api/apiClient';
import { useToast } from '../contexts/ToastContext';
import { validateRequired, validateEmail } from '../utils/validation';
import LoadingIndicator from '../components/LoadingIndicator';
import type { Client } from '../types/api';

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function fetchClient() {
      try {
        const client = await get<Client>(`/clients/${id}`);
        if (!cancelled) {
          setName(client.name);
          setEmail(client.email);
          setCompanyName(client.companyName || '');
          setAddress(client.address || '');
          setPhone(client.phone || '');
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load client';
          addToast('error', message);
          navigate('/clients');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchClient();
    return () => { cancelled = true; };
  }, [id, addToast, navigate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const nameResult = validateRequired(name, 'Name');
    if (!nameResult.valid) newErrors.name = nameResult.error!;
    const emailResult = validateEmail(email);
    if (!emailResult.valid) newErrors.email = emailResult.error!;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await put(`/clients/${id}`, {
        name: name.trim(),
        email: email.trim(),
        companyName: companyName.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      addToast('success', 'Client updated successfully');
      navigate('/clients');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update client';
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  if (loading) return <LoadingIndicator />;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Edit Client</h1>

      <div style={cardStyle}>
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label htmlFor="name" style={labelStyle}>Name *</label>
            <input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError('name'); }}
              placeholder="Client name"
              disabled={saving}
            />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="email" style={labelStyle}>Email *</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
              placeholder="client@example.com"
              disabled={saving}
            />
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="companyName" style={labelStyle}>Company Name</label>
            <input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name (optional)"
              disabled={saving}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="address" style={labelStyle}>Address</label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address (optional)"
              disabled={saving}
              rows={2}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="phone" style={labelStyle}>Phone</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number (optional)"
              disabled={saving}
            />
          </div>

          <div style={buttonRowStyle}>
            <button type="button" onClick={() => navigate('/clients')} style={cancelButtonStyle} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={submitButtonStyle}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: '600px',
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

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  marginBottom: '0.25rem',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--color-error)',
  fontSize: 'var(--font-xs)',
  marginTop: '0.25rem',
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
