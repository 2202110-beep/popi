import { useNavigate } from 'react-router-dom';

const layoutStyles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1rem'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    borderRadius: '24px',
    padding: '2.5rem',
    background: 'rgba(15, 23, 42, 0.85)',
    boxShadow: '0 30px 60px -20px rgba(14,165,233,0.35)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(148, 163, 184, 0.15)'
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: '#38bdf8'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#cbd5f5',
    marginBottom: '2rem'
  }
};

function AuthLayout({ title, subtitle, children, backTo = null, backLabel = 'Volver' }) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (backTo) return navigate(backTo);
    if (window.history.length > 1) return navigate(-1);
    return navigate('/');
  };
  return (
    <div style={layoutStyles.container}>
      <div style={layoutStyles.card}>
        <div style={layoutStyles.topRow}>
          <button
            type="button"
            onClick={handleBack}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(2,6,23,0.45)', color: '#e2e8f0', cursor: 'pointer' }}
          >
            ← {backLabel}
          </button>
        </div>
        <h1 style={layoutStyles.title}>{title}</h1>
        {subtitle && <p style={layoutStyles.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
