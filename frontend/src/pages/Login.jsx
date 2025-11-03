import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { loginUser, logoutUser, fetchMe, request } from '../api/auth.js';

const buttonStyle = {
  width: '100%',
  padding: '0.95rem',
  borderRadius: '16px',
  border: 'none',
  background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer'
};

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);

  // Pre‑warm CSRF cookie so the first POST doesn't race on missing token
  useEffect(() => {
    // Best‑effort; ignore errors
    request('/api/auth/csrf/').catch(() => {});
  }, []);

  // If already logged in, redirect away from login immediately
  useEffect(() => {
    try {
      const raw = localStorage.getItem('popi_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      const destination = (() => {
        if (user?.is_superuser || user?.is_staff) return '/admin/panel';
        if (user?.role === 'collaborator') return '/colaborador/panel';
        return '/app';
      })();
      navigate(destination, { replace: true });
    } catch (_e) {
      // ignore parse errors
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Completa tu correo y contrasena.');
      return;
    }

    try {
      setLoading(true);
  const response = await loginUser(form);
      localStorage.setItem('popi_user', JSON.stringify(response.user));
      // Optionally show a brief success message, but navigate immediately
      if (response.user?.first_name) {
        setSuccess(`Hola de nuevo, ${response.user.first_name}!`);
      }

      // If a next path was provided, prefer it (with simple safety and role checks)
      const requestedNext = location.state?.next;
      const roleDefault = (() => {
        if (response.user.is_superuser || response.user.is_staff) return '/admin/panel';
        if (response.user.role === 'collaborator') return '/colaborador/panel';
        return '/app';
      })();

      // Route users based on role and any requested next path
      const isAdmin = response.user.is_superuser || response.user.is_staff;

      let destination = roleDefault;
      if (typeof requestedNext === 'string' && requestedNext.startsWith('/')) {
        // Non-admins cannot be sent to admin panel
        if (requestedNext.startsWith('/admin') && !isAdmin) {
          destination = roleDefault;
        } else if (isAdmin && !requestedNext.startsWith('/admin')) {
          // Admins logging in from generic /login should still land in admin panel
          destination = '/admin/panel';
        } else {
          destination = requestedNext;
        }
      } else if (isAdmin) {
        // Default admin landing when no next provided
        destination = '/admin/panel';
      }
      // Verify session actually exists server‑side before navigating
      try {
        await fetchMe();
      } catch (_e) {
        // Session cookie didn’t stick (proxy/config issue). Surface a clearer message.
        try { await logoutUser(); } catch (_) {}
        localStorage.removeItem('popi_user');
        setError('No se pudo crear la sesión. Revisa que el servidor esté corriendo en http://localhost:8000 y abre la app con el servidor de Vite (https://localhost:5173).');
        return;
      }

      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'No pudimos iniciar sesion. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bienvenido de vuelta" subtitle="Ingresa los datos con los que te registraste" backTo="/">
      <form onSubmit={handleSubmit}>
        <FormField
          label="Correo electronico"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="tu@correo.com"
        />
        <FormField
          label="Contrasena"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="********"
        />

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(134,239,172,0.12)',
            border: '1px solid rgba(134,239,172,0.35)',
            borderRadius: '12px',
            color: '#bbf7d0',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem'
          }}>
            {success}
          </div>
        )}

        <button type="submit" style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? 'Ingresando...' : 'Iniciar sesion'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#a5b4fc', textAlign: 'center' }}>
        No tienes cuenta?{' '}
        <Link to="/register" style={{ color: '#38bdf8', fontWeight: 600 }}>
          Registrate aqui
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;







