import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { post } from '../api/apiClient';
import { validateEmail, validatePassword } from '../utils/validation';
import type { RegisterResponse } from '../types/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { addToast } = useToast();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    const newErrors: { email?: string; password?: string } = {};

    if (!emailResult.valid) newErrors.email = emailResult.error;
    if (!passwordResult.valid) newErrors.password = passwordResult.error;

    setErrors(newErrors);
    return emailResult.valid && passwordResult.valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await post<RegisterResponse>('/auth/register', { email, password });
      addToast('success', 'Registration successful! Please sign in.');
      navigate('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Create Account</h1>
        <p style={subtitleStyle}>Get started with QuickInvoice</p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
            {errors.email && <p style={inlineErrorStyle}>{errors.email}</p>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={loading}
            />
            {errors.password && <p style={inlineErrorStyle}>{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={submitButtonStyle}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={linkTextStyle}>
          Already have an account?{' '}
          <Link to="/login" style={linkStyle}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: 'var(--color-bg)',
  padding: '1rem',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: '2rem',
  boxShadow: 'var(--shadow-md)',
  maxWidth: '420px',
  width: '100%',
};

const headingStyle: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 'var(--font-bold)' as unknown as number,
  color: 'var(--color-text)',
  marginBottom: '0.25rem',
  textAlign: 'center',
};

const subtitleStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-sm)',
  textAlign: 'center',
  marginBottom: '1.5rem',
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

const inlineErrorStyle: React.CSSProperties = {
  color: 'var(--color-error)',
  fontSize: 'var(--font-xs)',
  marginTop: '0.25rem',
  margin: 0,
  marginBlockStart: '0.25rem',
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 1rem',
  backgroundColor: 'var(--color-primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-base)',
  fontWeight: 500,
  cursor: 'pointer',
};

const linkTextStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 'var(--font-sm)',
  color: 'var(--color-text-secondary)',
  marginTop: '1rem',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--color-primary)',
  fontWeight: 500,
};
