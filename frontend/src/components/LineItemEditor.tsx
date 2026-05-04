import { formatCurrency, toCents } from '../utils/currency';

export interface LineItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface LineItemEditorProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  taxRate: number;
}

let nextId = 1;
export function createEmptyRow(): LineItemRow {
  return { id: `li-${nextId++}`, description: '', quantity: '1', unitPrice: '' };
}

function parseNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export default function LineItemEditor({ items, onChange, taxRate }: LineItemEditorProps) {
  const handleChange = (index: number, field: keyof LineItemRow, value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onChange(updated);
  };

  const addRow = () => {
    onChange([...items, createEmptyRow()]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  // Calculate totals in cents for display
  const subtotalCents = items.reduce((sum, item) => {
    const qty = parseNum(item.quantity);
    const priceCents = toCents(parseNum(item.unitPrice));
    return sum + qty * priceCents;
  }, 0);

  const taxAmountCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxAmountCents;

  return (
    <div>
      <div style={tableWrapperStyle}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={descThStyle}>Description</th>
              <th style={numThStyle}>Qty</th>
              <th style={numThStyle}>Unit Price ($)</th>
              <th style={numThStyle}>Amount</th>
              <th style={actionThStyle}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const qty = parseNum(item.quantity);
              const priceCents = toCents(parseNum(item.unitPrice));
              const amountCents = qty * priceCents;

              return (
                <tr key={item.id}>
                  <td>
                    <input
                      value={item.description}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                      style={inputStyle}
                      aria-label={`Line item ${index + 1} description`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                      min="0"
                      step="1"
                      style={{ ...inputStyle, ...numInputStyle }}
                      aria-label={`Line item ${index + 1} quantity`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleChange(index, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ ...inputStyle, ...numInputStyle }}
                      aria-label={`Line item ${index + 1} unit price`}
                    />
                  </td>
                  <td style={amountCellStyle}>
                    {formatCurrency(amountCents)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={items.length <= 1}
                      style={removeButtonStyle}
                      aria-label={`Remove line item ${index + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} style={addButtonStyle}>
        + Add Line Item
      </button>

      <div style={totalsStyle}>
        <div style={totalRowStyle}>
          <span style={totalLabelStyle}>Subtotal</span>
          <span>{formatCurrency(subtotalCents)}</span>
        </div>
        <div style={totalRowStyle}>
          <span style={totalLabelStyle}>Tax ({(taxRate * 100).toFixed(1)}%)</span>
          <span>{formatCurrency(taxAmountCents)}</span>
        </div>
        <div style={{ ...totalRowStyle, ...grandTotalStyle }}>
          <span style={totalLabelStyle}>Total</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(totalCents)}</span>
        </div>
      </div>
    </div>
  );
}

const tableWrapperStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const descThStyle: React.CSSProperties = {
  minWidth: '200px',
};

const numThStyle: React.CSSProperties = {
  width: '120px',
  textAlign: 'right',
};

const actionThStyle: React.CSSProperties = {
  width: '50px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.375rem 0.5rem',
  fontSize: 'var(--font-sm)',
};

const numInputStyle: React.CSSProperties = {
  textAlign: 'right',
};

const amountCellStyle: React.CSSProperties = {
  textAlign: 'right',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const removeButtonStyle: React.CSSProperties = {
  color: 'var(--color-error)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 'var(--font-base)',
  padding: '0.25rem',
};

const addButtonStyle: React.CSSProperties = {
  marginTop: 'var(--space-sm)',
  padding: '0.375rem 0.75rem',
  backgroundColor: 'transparent',
  color: 'var(--color-primary)',
  border: '1px dashed var(--color-primary)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  cursor: 'pointer',
};

const totalsStyle: React.CSSProperties = {
  marginTop: 'var(--space-md)',
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
