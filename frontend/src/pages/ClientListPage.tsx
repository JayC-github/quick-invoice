import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { get, del } from '../api/apiClient';
import { useToast } from '../contexts/ToastContext';
import LoadingIndicator from '../components/LoadingIndicator';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Client } from '../types/api';

export default function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await del(`/clients/${deleteTarget.clientId}`);
      setClients((prev) => prev.filter((c) => c.clientId !== deleteTarget.clientId));
      addToast('success', 'Client deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete client';
      addToast('error', message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingIndicator />;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Clients</h1>
        <Link to="/clients/new" style={newButtonStyle}>New Client</Link>
      </div>

      {clients.length === 0 ? (
        <p style={emptyStyle}>No clients yet. Create your first client to get started.</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.clientId}>
                  <td style={nameCell}>{client.name}</td>
                  <td>{client.email}</td>
                  <td>{client.companyName || '—'}</td>
                  <td>
                    <div style={actionsStyle}>
                      <Link to={`/clients/${client.clientId}/edit`} style={editLinkStyle}>
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(client)}
                        style={deleteButtonStyle}
                        disabled={deleting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: '960px',
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

const nameCell: React.CSSProperties = {
  fontWeight: 500,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

const editLinkStyle: React.CSSProperties = {
  color: 'var(--color-primary)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  textDecoration: 'none',
};

const deleteButtonStyle: React.CSSProperties = {
  color: 'var(--color-error)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.25rem 0.5rem',
};
