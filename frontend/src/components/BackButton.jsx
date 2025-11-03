import { useNavigate } from 'react-router-dom';

const style = {
  padding: '0.55rem 0.9rem',
  borderRadius: '12px',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(15,23,42,0.35)',
  color: '#e2e8f0',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
};

function BackButton({ to = null, label = 'Volver' }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (to) {
      navigate(to);
      return;
    }
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  return (
    <button type="button" onClick={goBack} style={style}>
      ← {label}
    </button>
  );
}

export default BackButton;
