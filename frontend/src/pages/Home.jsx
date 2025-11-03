import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { logoutUser } from '../api/auth.js';

const containerStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '2rem'
};

const cardStyle = {
  maxWidth: '520px',
  width: '100%',
  borderRadius: '28px',
  background: 'rgba(15,23,42,0.78)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  padding: '3rem',
  textAlign: 'center',
  boxShadow: '0 30px 60px -25px rgba(8,145,178,0.55)',
  backdropFilter: 'blur(16px)'
};

const ctaStyle = {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  marginTop: '2.5rem',
  flexWrap: 'wrap'
};

const buttonStyle = {
  padding: '0.95rem 1.65rem',
  borderRadius: '999px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textDecoration: 'none'
};

function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    // Always start with a clean session on the landing page
    (async () => {
      try { await logoutUser(); } catch (_) {}
      localStorage.removeItem('popi_user');
    })();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.35em', fontSize: '0.75rem', color: '#bae6fd', marginBottom: '1rem' }}>
          bienvenido a popi
        </p>
  <h1 style={{ fontSize: '2.4rem', margin: 0, color: '#38bdf8' }}>Encuentra un baño perfecto en segundos</h1>
        <p style={{ marginTop: '1.5rem', color: '#e2e8f0', lineHeight: 1.6 }}>
          Explora baños cercanos, conoce su limpieza, amenidades y precio. Los negocios aliados pueden registrarse y
          comenzar a recibir visitantes en minutos.
        </p>
        <div style={ctaStyle}>
          <Link style={{ ...buttonStyle, background: '#0ea5e9', color: '#0f172a' }} to="/register">
            Crear cuenta
          </Link>
          <Link style={{ ...buttonStyle, border: '1px solid rgba(148,163,184,0.35)', color: '#e2e8f0' }} to="/login">
            Ya tengo cuenta
          </Link>
          <Link
            style={{
              ...buttonStyle,
              background: 'rgba(56,189,248,0.18)',
              color: '#38bdf8',
              border: '1px solid rgba(56,189,248,0.4)'
            }}
            to="/login"
            state={{ next: '/colaborar' }}
          >
            Trabaja con nosotros
          </Link>
          <Link
            style={{
              ...buttonStyle,
              border: '1px solid rgba(59,130,246,0.45)',
              color: '#93c5fd',
              background: 'rgba(30,64,175,0.25)'
            }}
            to="/login"
            state={{ next: '/admin/panel' }}
          >
            Panel administrador
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
