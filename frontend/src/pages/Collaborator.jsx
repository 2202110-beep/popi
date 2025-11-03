import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import PlacePicker from '../components/PlacePicker.jsx';
import { applyCollaboratorBusiness } from '../api/partner.js';

const stepButtonStyle = {
  marginTop: '1.5rem',
  display: 'flex',
  justifyContent: 'space-between'
};

const primaryButton = {
  padding: '0.9rem 1.6rem',
  borderRadius: '14px',
  border: 'none',
  background: 'linear-gradient(135deg, #38bdf8, #22d3ee)',
  color: '#0f172a',
  fontWeight: 700,
  cursor: 'pointer'
};

const secondaryButton = {
  padding: '0.9rem 1.6rem',
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'transparent',
  color: '#e2e8f0',
  fontWeight: 600,
  cursor: 'pointer'
};

const sectionTitle = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#bae6fd',
  marginBottom: '1rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const gridTwo = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
};

const fileFieldContainer = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
  borderRadius: '14px',
  border: '1px dashed rgba(148,163,184,0.4)',
  background: 'rgba(15,23,42,0.45)'
};

const fileLabel = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: '#e2e8f0'
};

const fileInputStyle = {
  padding: '0.6rem',
  borderRadius: '10px',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(15,23,42,0.75)',
  color: '#e2e8f0'
};

const helperText = {
  fontSize: '0.75rem',
  color: '#94a3b8'
};

const fileErrorStyle = {
  color: '#f87171',
  fontSize: '0.8rem'
};

const initialForm = {
  business_name: '',
  address: '',
  latitude: '',
  longitude: '',
  business_phone: '',
  website: '',
  schedule: '',
  rating: '',
  review_count: '',
  photo_url: '',
  place_types: '',
  place_id: '',
  ine_document: null,
  address_proof_document: null
};

function Collaborator() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const msg = (val) => Array.isArray(val) ? val.join(', ') : val || '';
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('popi_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name) => (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (file) {
      const maxSizeMB = 10; // Increased to 10MB for flexibility
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({ 
          ...prev, 
          [name]: `Formato no permitido. Solo se aceptan: JPG, PNG, WEBP o PDF. Tu archivo es tipo: ${file.type}` 
        }));
        event.target.value = ''; // Clear the input
        return;
      }
      
      if (file.size > maxSizeMB * 1024 * 1024) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setErrors((prev) => ({ 
          ...prev, 
          [name]: `Archivo muy grande (${sizeMB}MB). El límite es ${maxSizeMB}MB.` 
        }));
        event.target.value = ''; // Clear the input
        return;
      }
      
      // Clear error if file is valid
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setForm((prev) => ({ ...prev, [name]: file }));
  };

  const handlePlaceSelected = (details) => {
    setForm((prev) => ({
      ...prev,
      business_name: details.business_name || prev.business_name,
      address: details.address || prev.address,
      latitude: details.latitude ?? prev.latitude,
      longitude: details.longitude ?? prev.longitude,
      business_phone: details.business_phone || prev.business_phone,
      website: details.website || prev.website,
      schedule: details.schedule || prev.schedule,
      rating: details.rating ?? prev.rating,
      review_count: details.review_count ?? prev.review_count,
      photo_url: details.photo_url || prev.photo_url,
      place_types: details.place_types || prev.place_types,
      place_id: details.place_id || prev.place_id
    }));
    setErrors((prev) => ({
      ...prev,
      business_name: undefined,
      address: undefined,
      latitude: undefined,
      longitude: undefined,
      place_id: undefined
    }));
  };

  const validateStep = () => {
    const newErrors = {};
    
    // Validar campos requeridos
    if (!form.business_name.trim()) newErrors.business_name = 'Selecciona un negocio desde el mapa.';
    if (!form.address.trim()) newErrors.address = 'Selecciona un negocio desde el mapa.';
    if (!form.latitude) newErrors.latitude = 'Selecciona un negocio desde el mapa.';
    if (!form.longitude) newErrors.longitude = 'Selecciona un negocio desde el mapa.';
    if (!form.place_id.trim()) newErrors.place_id = 'Elige un negocio valido (place ID requerido).';
    
    // Validar archivos
    if (!form.ine_document) {
      newErrors.ine_document = 'Adjunta tu identificacion oficial (INE o INE).';
    }
    if (!form.address_proof_document) {
      newErrors.address_proof_document = 'Adjunta un comprobante de domicilio (recibo de luz, agua, predial, etc.).';
    }
    
    // Validar formato de teléfono si se proporcionó
    if (form.business_phone && !/^\d{10,15}$/.test(form.business_phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.business_phone = 'Formato de telefono invalido. Ejemplo: 3312345678';
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.group('Validación del formulario de colaborador');
      console.table({
        business_name: form.business_name,
        address: form.address,
        latitude: form.latitude,
        longitude: form.longitude,
        place_id: form.place_id,
        ine_document: form.ine_document ? form.ine_document.name : null,
        address_proof_document: form.address_proof_document ? form.address_proof_document.name : null,
      });
      console.log('Errores:', newErrors);
      console.groupEnd();
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('Submit: inicio');
    if (!validateStep()) {
      console.log('Submit: validación falló');
      return;
    }
    console.log('Submit: validación OK, preparando datos');

    const latitude = parseFloat(form.latitude);
    const longitude = parseFloat(form.longitude);
    const rating = form.rating ? parseFloat(form.rating) : null;
    // Normalize decimal precision to match backend DecimalField constraints
    const latitudeStr = Number.isFinite(latitude) ? latitude.toFixed(6) : '';
    const longitudeStr = Number.isFinite(longitude) ? longitude.toFixed(6) : '';
    const ratingStr = rating != null && !Number.isNaN(rating) ? rating.toFixed(2) : null;
    const reviewCount = form.review_count ? Number(form.review_count) : 0;

    const formData = new FormData();
    formData.append('business_name', form.business_name);
    formData.append('address', form.address);
    formData.append('latitude', latitudeStr);
    formData.append('longitude', longitudeStr);
  formData.append('business_phone', form.business_phone || '');
  // Evita errores si el backend aun tiene limite de 500 chars
  const safeWebsite = (form.website || '').slice(0, 480);
  const safePhotoUrl = (form.photo_url || '').slice(0, 480);
  formData.append('website', safeWebsite);
    formData.append('schedule', form.schedule || '');
    if (ratingStr !== null) {
      formData.append('rating', ratingStr);
    }
    formData.append('review_count', String(reviewCount));
  formData.append('photo_url', safePhotoUrl);
    formData.append('place_types', form.place_types || '');
    formData.append('place_id', form.place_id);
    if (form.ine_document) {
      formData.append('ine_document', form.ine_document);
    }
    if (form.address_proof_document) {
      formData.append('address_proof_document', form.address_proof_document);
    }

    try {
      setLoading(true);
      setServerError('');
      console.log('Submit: enviando datos al backend...');
      const response = await applyCollaboratorBusiness(formData);
      console.log('Respuesta exitosa:', response);
      // Redirigir a la página principal tras enviar correctamente
      navigate('/');
    } catch (error) {
      console.error('Error al enviar negocio:', error);
      const payload = error.payload || {};
      const errorMsg = payload.detail || error.message || 'No pudimos completar el registro.';
      setServerError(errorMsg);
      if (payload && typeof payload === 'object') {
        setErrors((prev) => ({ ...prev, ...payload }));
      }
      alert('Error al enviar: ' + errorMsg);
    } finally {
      setLoading(false);
      console.log('Submit: fin');
    }
  };

  return (
    <AuthLayout
      title="Registra tu negocio"
      subtitle="Primero da de alta el negocio. Nuestro equipo verificará la ubicación; después podrás registrar el baño para que aparezca en el mapa."
      backTo="/app"
    >
      {!currentUser && (
        <div style={{
          background: 'rgba(2,6,23,0.65)',
          border: '1px solid rgba(59,130,246,0.35)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#cbd5f5'
        }}>
          Debes iniciar sesion para registrar un negocio.
          <div style={{ marginTop: '0.75rem' }}>
            <button type="button" onClick={() => navigate('/login')} style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.45)', background: 'rgba(59,130,246,0.2)', color: '#bfdbfe', cursor: 'pointer' }}>Iniciar sesion</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {currentUser && (
          <div>
            <p style={sectionTitle}>Ubicacion del negocio</p>
            <PlacePicker
              onPlaceSelected={handlePlaceSelected}
              initialPosition={form.latitude && form.longitude ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) } : undefined}
            />
            {(errors.latitude || errors.longitude || errors.place_id) && (
              <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {msg(errors.latitude) && <div>Latitud: {msg(errors.latitude)}</div>}
                {msg(errors.longitude) && <div>Longitud: {msg(errors.longitude)}</div>}
                {msg(errors.place_id) && <div>Google Place ID: {msg(errors.place_id)}</div>}
              </div>
            )}
            <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
              <FormField label="Nombre del negocio" name="business_name" value={form.business_name} onChange={handleChange} error={msg(errors.business_name)} />
              <FormField label="Direccion completa" name="address" value={form.address} onChange={handleChange} error={msg(errors.address)} />

              <div style={gridTwo}>
                <FormField label="Telefono del negocio" name="business_phone" value={form.business_phone} onChange={handleChange} placeholder="523312345678" error={msg(errors.business_phone)} />
                <FormField label="Sitio web" name="website" value={form.website} onChange={handleChange} placeholder="https://ejemplo.com" error={msg(errors.website)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                  Horario de atencion
                </label>
                <input
                  type="text"
                  name="schedule"
                  value={form.schedule}
                  onChange={handleChange}
                  placeholder="Ejemplo: Lunes a Viernes 9:00-18:00, Sabado 10:00-14:00"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(15,23,42,0.75)', color: '#e2e8f0', fontSize: '0.9rem' }}
                />
                <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Escribe el horario como mejor te acomode (opcional)
                </span>
                {msg(errors.schedule) && (
                  <span style={{ display: 'block', marginTop: '0.35rem', color: '#fca5a5', fontSize: '0.8rem' }}>{msg(errors.schedule)}</span>
                )}
              </div>

              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', background: 'rgba(15,23,42,0.35)', borderRadius: '14px', padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#7dd3fc', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Coordenadas</span>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5f5' }}>{form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : 'Selecciona tu ubicacion en el mapa'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#7dd3fc', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Identificador Google</span>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5f5' }}>{form.place_id || 'Por asignar'}</span>
                </div>
              </div>

              <input type="hidden" name="latitude" value={form.latitude} />
              <input type="hidden" name="longitude" value={form.longitude} />
              <input type="hidden" name="place_id" value={form.place_id} />
              <input type="hidden" name="place_types" value={form.place_types} />
              <input type="hidden" name="photo_url" value={form.photo_url} />
              <input type="hidden" name="rating" value={form.rating} />
              <input type="hidden" name="review_count" value={form.review_count} />

              <div style={fileFieldContainer}>
                <span style={fileLabel}>INE o identificación oficial (imagen o PDF)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange('ine_document')}
                  style={fileInputStyle}
                />
                <span style={helperText}>Asegurate de que ambos lados sean legibles. Max 10MB. JPG, PNG, WEBP o PDF.</span>
                {form.ine_document && <span style={helperText}>✓ Archivo seleccionado: {form.ine_document.name}</span>}
                {errors.ine_document && <span style={fileErrorStyle}>{errors.ine_document}</span>}
              </div>

              <div style={fileFieldContainer}>
                <span style={fileLabel}>Comprobante de domicilio (imagen o PDF)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange('address_proof_document')}
                  style={fileInputStyle}
                />
                <span style={helperText}>Recibo de luz, agua, gas, predial o telefono (no mayor a 3 meses). Max 10MB.</span>
                {form.address_proof_document && <span style={helperText}>✓ Archivo seleccionado: {form.address_proof_document.name}</span>}
                {errors.address_proof_document && <span style={fileErrorStyle}>{errors.address_proof_document}</span>}
              </div>
            </div>
          </div>
        )}

        {serverError && (
          <div style={{
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            padding: '0.9rem 1rem',
            marginTop: '1.5rem'
          }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Error:</strong>
            {serverError}
            {Object.keys(errors).length > 0 && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(248,113,113,0.2)' }}>
                <strong style={{ fontSize: '0.85rem' }}>Detalles:</strong>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                  {Object.entries(errors).map(([field, messages]) => (
                    <li key={field}>
                      <strong>{field}:</strong> {Array.isArray(messages) ? messages.join(', ') : messages}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(134,239,172,0.12)',
            border: '1px solid rgba(134,239,172,0.35)',
            borderRadius: '12px',
            color: '#bbf7d0',
            padding: '0.9rem 1rem',
            marginTop: '1.5rem'
          }}>
            {successMessage}
          </div>
        )}

        {currentUser && (
          <div style={stepButtonStyle}>
            <span />
            <button type="submit" style={{ ...primaryButton, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}

export default Collaborator;
