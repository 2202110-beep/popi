import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { registerUser } from '../api/auth.js';

const buttonStyle = {
  width: '100%',
  padding: '0.95rem',
  borderRadius: '16px',
  border: 'none',
  background: 'linear-gradient(135deg, #38bdf8, #14b8a6)',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'transform 0.2s ease'
};

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'Ingresa tus nombres.';
    if (!form.last_name.trim()) newErrors.last_name = 'Ingresa tus apellidos.';
    if (!/^[0-9]{10}$/.test(form.phone_number)) newErrors.phone_number = 'Introduce un numero de 10 digitos.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Correo no valido.';
    if (form.password.length < 8) newErrors.password = 'La contrasena debe tener al menos 8 caracteres.';
    if (form.password !== form.password_confirmation) newErrors.password_confirmation = 'Las contrasenas no coinciden.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;

    try {
      setLoading(true);
      await registerUser(form);
      navigate('/login', { state: { message: 'Registro exitoso. Inicia sesion para continuar.' } });
    } catch (error) {
      const payload = error.payload || {};
      setServerError(payload.detail || 'No pudimos completar el registro. Intentalo nuevamente.');
      if (payload && typeof payload === 'object') {
        setErrors((prev) => ({ ...prev, ...payload }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Explora baños de confianza y reserva en segundos."
      backTo="/"
    >
      <form onSubmit={handleSubmit}>
        <FormField
          label="Nombres"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          placeholder="Juan Carlos"
          error={errors.first_name}
        />
        <FormField
          label="Apellidos"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          placeholder="Ramirez Lopez"
          error={errors.last_name}
        />
        <FormField
          label="Telefono"
          name="phone_number"
          value={form.phone_number}
          onChange={handleChange}
          placeholder="5512345678"
          error={errors.phone_number}
        />
        <FormField
          label="Correo electronico"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="tu@correo.com"
          error={errors.email}
        />
        <FormField
          label="Contrasena"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Minimo 8 caracteres"
          error={errors.password}
        />
        <FormField
          label="Confirma tu contrasena"
          name="password_confirmation"
          type="password"
          value={form.password_confirmation}
          onChange={handleChange}
          error={errors.password_confirmation}
        />

        {serverError && (
          <div style={{
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem'
          }}>
            {serverError}
          </div>
        )}

        <button type="submit" style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#a5b4fc', textAlign: 'center' }}>
        Ya tienes cuenta?{' '}
        <Link to="/login" style={{ color: '#38bdf8', fontWeight: 600 }}>
          Inicia sesion aqui
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Register;

