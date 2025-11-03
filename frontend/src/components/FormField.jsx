const baseStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  marginBottom: '1.25rem'
};

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: '#e2e8f0',
  letterSpacing: '0.02em'
};

const inputStyle = {
  padding: '0.85rem 1rem',
  borderRadius: '14px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(15, 23, 42, 0.65)',
  color: '#f8fafc',
  fontSize: '0.95rem',
  transition: 'border-color 0.2s ease, transform 0.2s ease'
};

const errorStyle = {
  marginTop: '0.35rem',
  color: '#fca5a5',
  fontSize: '0.8rem'
};

function FormField({ label, error, ...props }) {
  return (
    <label style={baseStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        style={{
          ...inputStyle,
          borderColor: error ? '#f87171' : inputStyle.border,
          boxShadow: error ? '0 0 0 1px rgba(248,113,113,0.35)' : 'none'
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </label>
  );
}

export default FormField;
