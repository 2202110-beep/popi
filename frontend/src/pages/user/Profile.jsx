import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../api/auth.js';

const cardStyle = {
  maxWidth: '720px',
  margin: '2rem auto',
  borderRadius: '20px',
  background: 'rgba(15,23,42,0.85)',
  border: '1px solid rgba(148,163,184,0.2)',
  padding: '1.5rem',
  color: '#e2e8f0',
  boxShadow: '0 20px 50px -30px rgba(8,145,178,0.45)'
};

const rowStyle = { display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem', marginBottom: '0.85rem' };

function Profile() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('popi_user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  }, []);

  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) {}
    localStorage.removeItem('popi_user');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: 'radial-gradient(circle at top, rgba(56,189,248,0.12), rgba(15,23,42,0.95))' }}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: '1rem', color: '#38bdf8' }}>Tu perfil</h1>
        {!currentUser && <p>No hay sesion activa.</p>}
        {currentUser && (
          <div>
            <div style={rowStyle}><strong>Nombre</strong><span>{`${currentUser.first_name ?? ''} ${currentUser.last_name ?? ''}`.trim() || currentUser.email}</span></div>
            <div style={rowStyle}><strong>Correo</strong><span style={{ color: '#38bdf8' }}>{currentUser.email}</span></div>
            <div style={rowStyle}><strong>Rol</strong><span>{currentUser.role_effective ?? currentUser.role ?? (currentUser.is_staff ? 'admin' : 'cliente')}</span></div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => navigate('/app')}
                style={{
                  padding: '0.7rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.45)',
                  background: 'rgba(56,189,248,0.18)', color: '#38bdf8', fontWeight: 600, cursor: 'pointer'
                }}
              >Volver al mapa</button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '0.7rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.45)',
                  background: 'rgba(239,68,68,0.18)', color: '#fecaca', fontWeight: 600, cursor: 'pointer'
                }}
              >Cerrar sesion</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
