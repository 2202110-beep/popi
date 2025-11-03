import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminOverview } from "../../api/admin.js";
import { listPartnerApplications, createBathroom } from "../../api/partner.js";

const containerStyle = {
  minHeight: "100vh",
  padding: "2rem 1.5rem",
  background: "radial-gradient(circle at top, rgba(56,189,248,0.12), rgba(15,23,42,0.95))",
  color: "#e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const sectionStyle = {
  background: "rgba(15,23,42,0.75)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: "18px",
  padding: "1.5rem",
  boxShadow: "0 24px 60px -32px rgba(8,145,178,0.45)",
};

const gridStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

function PartnerDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("popi_user");
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.warn("No se pudo leer la sesion", err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setError("Debes iniciar sesion como colaborador.");
      setLoading(false);
      return;
    }
    if (currentUser.role !== "collaborator" && !currentUser.is_staff) {
      setError("Este espacio es exclusivo para colaboradores.");
      setLoading(false);
      return;
    }

    const load = async () => {
      // Solo el staff debe consultar el endpoint de overview administrativo
      if (!currentUser?.is_staff) {
        setOverview(null);
        setLoading(false);
        return;
      }
      try {
        const data = await fetchAdminOverview();
        setOverview(data);
      } catch (requestError) {
        setError(requestError.message || "No se pudo cargar la informacion.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  useEffect(() => {
    const loadApps = async () => {
      if (!currentUser) return;
      setAppsLoading(true);
      setAppsError("");
      try {
        const data = await listPartnerApplications();
        setApps(Array.isArray(data?.applications) ? data.applications : []);
      } catch (e) {
        setAppsError(e.message || 'No se pudieron cargar tus negocios.');
      } finally {
        setAppsLoading(false);
      }
    };
    loadApps();
  }, [currentUser]);

  const handleGoToMap = () => navigate("/app");
  const handleGoToAdmin = () => navigate("/admin/panel");
  const handleCreateBathroom = async (applicationId) => {
    try {
      await createBathroom(applicationId);
      const refreshed = await listPartnerApplications();
      setApps(Array.isArray(refreshed?.applications) ? refreshed.applications : []);
      alert('Baño creado y publicado en el mapa.');
    } catch (e) {
      alert(e.message || 'No fue posible registrar el baño.');
    }
  };

  if (!currentUser || (currentUser.role !== "collaborator" && !currentUser.is_staff)) {
    return (
      <div style={containerStyle}>
        <div style={sectionStyle}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "#f87171" }}>Acceso restringido</h1>
          <p style={{ color: "#cbd5f5", marginBottom: "1rem" }}>{error || "No tienes permisos para ver este panel."}</p>
          <button
            type="button"
            onClick={handleGoToMap}
            style={{
              padding: "0.85rem 1.3rem",
              borderRadius: "12px",
              border: "1px solid rgba(56,189,248,0.45)",
              background: "rgba(56,189,248,0.18)",
              color: "#38bdf8",
              cursor: "pointer",
            }}
          >
            Ir al mapa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div>
        <button
          type="button"
          onClick={() => navigate('/app')}
          style={{ padding: '0.6rem 0.9rem', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(2,6,23,0.45)', color: '#e2e8f0', cursor: 'pointer', marginBottom: '0.75rem' }}
        >
          ← Volver al mapa
        </button>
      </div>
      <header>
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#60a5fa" }}>Espacio colaborador</p>
        <h1 style={{ fontSize: "2rem", margin: "0.25rem 0", color: "#f8fafc" }}>Panel de operaciones</h1>
        <p style={{ color: "#cbd5f5", maxWidth: "720px" }}>
          Supervisa tus baños registrados, agrega nuevos negocios y revisa indicadores claves de desempeño.
        </p>
      </header>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.9rem" }}>Acciones rapidas</h2>
        <div style={gridStyle}>
          <button
            type="button"
            onClick={handleGoToMap}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              padding: "1rem",
              borderRadius: "16px",
              border: "1px solid rgba(56,189,248,0.35)",
              background: "rgba(56,189,248,0.12)",
              color: "#e2e8f0",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <strong style={{ fontSize: "1.1rem", color: "#38bdf8" }}>Ver mapa como cliente</strong>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              Revisa cómo se muestran tus espacios en la experiencia pública.
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/colaborar')}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              padding: "1rem",
              borderRadius: "16px",
              border: "1px solid rgba(134,239,172,0.35)",
              background: "rgba(16,185,129,0.18)",
              color: "#e2f9f0",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <strong style={{ fontSize: "1.1rem", color: "#bbf7d0" }}>Registrar nuevo negocio</strong>
            <span style={{ fontSize: "0.85rem", color: "#d1fae5" }}>
              Primero dalo de alta como negocio; tras verificación, podrás registrar su baño.
            </span>
          </button>

          {currentUser?.is_staff && (
            <button
              type="button"
              onClick={handleGoToAdmin}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                padding: "1rem",
                borderRadius: "16px",
                border: "1px solid rgba(96,165,250,0.35)",
                background: "rgba(30,64,175,0.24)",
                color: "#c7d2fe",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <strong style={{ fontSize: "1.1rem", color: "#bfdbfe" }}>Ir al panel administrativo</strong>
              <span style={{ fontSize: "0.85rem", color: "#cbd5f5" }}>
                Gestiona usuarios y solicitudes desde la vista global.
              </span>
            </button>
          )}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Mis negocios</h2>
        {appsLoading && <p style={{ color: '#94a3b8' }}>Cargando negocios...</p>}
        {!appsLoading && appsError && <p style={{ color: '#fca5a5' }}>{appsError}</p>}
        {!appsLoading && !appsError && (
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {apps.length === 0 && (
              <div style={{ color: '#94a3b8' }}>Aun no has registrado negocios.</div>
            )}
            {apps.map((app) => (
              <div key={app.id} style={{
                border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: '14px',
                padding: '0.9rem 1rem',
                background: 'rgba(2,6,23,0.45)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{app.business_name}</strong>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{app.address}</div>
                    <div style={{ color: '#7dd3fc', fontSize: '0.85rem' }}>Estado: {app.status}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {app.status === 'approved' && !app.has_bathroom && (
                      <button
                        type="button"
                        onClick={() => handleCreateBathroom(app.id)}
                        style={{ padding: '0.55rem 0.9rem', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.2)', color: '#bbf7d0', cursor: 'pointer' }}
                      >
                        Registrar baño
                      </button>
                    )}
                    {app.has_bathroom && (
                      <span style={{ color: '#bbf7d0' }}>Baño publicado</span>
                    )}
                    {app.status === 'pending' && (
                      <span style={{ color: '#fcd34d' }}>En revisión</span>
                    )}
                    {app.status === 'rejected' && (
                      <span style={{ color: '#fecaca' }}>Rechazado</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {currentUser?.is_staff && (
        <section style={sectionStyle}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Resumen de la red</h2>
          {loading && <p style={{ color: '#94a3b8' }}>Cargando indicadores...</p>}
          {!loading && error && <p style={{ color: '#fca5a5' }}>{error}</p>}
          {!loading && !error && overview && (
            <div style={gridStyle}>
              <div>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc' }}>Usuarios activos</p>
                <strong style={{ fontSize: '1.8rem', color: '#f8fafc' }}>{overview.totals.users}</strong>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc' }}>Colaboradores</p>
                <strong style={{ fontSize: '1.8rem', color: '#f8fafc' }}>{overview.totals.collaborators}</strong>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc' }}>Pendientes</p>
                <strong style={{ fontSize: '1.8rem', color: '#f8fafc' }}>{overview.totals.pending_collaborators}</strong>
              </div>
            </div>
          )}
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Proximas herramientas</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#94a3b8', display: 'grid', gap: '0.6rem' }}>
          <li>Gestor de negocios y baños con estadísticas detalladas.</li>
          <li>Control de tarifas, horarios y promociones.</li>
          <li>Historial de reservas y reportes descargables.</li>
        </ul>
      </section>
    </div>
  );
}

export default PartnerDashboard;