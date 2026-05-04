import type { PaymentStatus } from '../types/api';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const statusConfig: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: 'var(--color-draft-light)', color: 'var(--color-draft)', label: 'Draft' },
  sent: { bg: 'var(--color-sent-light)', color: 'var(--color-sent)', label: 'Sent' },
  viewed: { bg: 'var(--color-viewed-light)', color: 'var(--color-viewed)', label: 'Viewed' },
  paid: { bg: 'var(--color-paid-light)', color: 'var(--color-paid)', label: 'Paid' },
};

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.125rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1.5,
        backgroundColor: config.bg,
        color: config.color,
        textTransform: 'capitalize',
      }}
    >
      {config.label}
    </span>
  );
}
