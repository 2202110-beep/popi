import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminOverview, decideCollaborator } from "../../api/admin.js";
import { logoutUser, fetchMe } from "../../api/auth.js";

const containerStyle = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, rgba(56,189,248,0.12), rgba(15,23,42,0.95))",
  color: "#e2e8f0",
  padding: "2rem 1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const sectionCardStyle = {
  background: "rgba(15,23,42,0.75)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: "20px",
  padding: "1.5rem",
  boxShadow: "0 25px 55px -30px rgba(8,145,178,0.45)",
  backdropFilter: "blur(12px)",
};

const gridStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const metricStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  padding: "1.25rem",
  borderRadius: "16px",
  background: "rgba(8,47,73,0.55)",
  border: "1px solid rgba(51,65,85,0.45)",
};

const tableWrapperStyle = {
  overflowX: "auto",
  marginTop: "1rem",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "720px",
};

const headerCellStyle = {
  textAlign: "left",
  padding: "0.65rem",
  borderBottom: "1px solid rgba(148,163,184,0.2)",
  fontSize: "0.8rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#60a5fa",
};

const cellStyle = {
  padding: "0.7rem 0.65rem",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
  fontSize: "0.9rem",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function AdminPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("popi_user");
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.warn("No pudimos leer el usuario almacenado", err);
      return null;
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminOverview();
      setData(response);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "No pudimos cargar la informacion del panel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ensure = async () => {
      try {
        const me = await fetchMe();
        if (me?.user) localStorage.setItem("popi_user", JSON.stringify(me.user));
      } catch (_) {
        localStorage.removeItem("popi_user");
      }
    };
    ensure();

    if (!currentUser) {
      setError("Debes iniciar sesion como administrador.");
      setLoading(false);
      return;
    }
    if (!currentUser.is_staff && !currentUser.is_superuser) {
      setError("No tienes permisos para acceder al panel de administracion.");
      setLoading(false);
      return;
    }

    loadData();
  }, [currentUser]);

  const handleGoHome = () => navigate("/");
  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) {}
    localStorage.removeItem("popi_user");
    navigate("/login");
  };

  const handleDecision = async (applicationId, action) => {
    if (!["approve", "reject"].includes(action)) return;
    setActionLoading(true);
    setError(""); // Clear previous errors
    try {
      const response = await decideCollaborator(applicationId, action);
      console.log('Decisión aplicada:', response);
      await loadData();
    } catch (requestError) {
      const errorMsg = requestError.message || "No pudimos actualizar la solicitud.";
      console.error('Error en handleDecision:', errorMsg, requestError);
      setError(`Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser || (!currentUser.is_staff && !currentUser.is_superuser)) {
    return (
      <div style={containerStyle}>
        <div style={sectionCardStyle}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "#f87171" }}>Acceso restringido</h1>
          <p style={{ color: "#cbd5f5", marginBottom: "1.5rem" }}>{error || "Este panel es exclusivo para el personal administrador."}</p>
          <button
            type="button"
            onClick={handleGoHome}
            style={{
              padding: "0.85rem 1.4rem",
              borderRadius: "12px",
              border: "1px solid rgba(56,189,248,0.4)",
              background: "rgba(30,64,175,0.45)",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            Volver al inicio
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
          onClick={() => navigate('/')}
          style={{ padding: '0.6rem 0.9rem', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(2,6,23,0.45)', color: '#e2e8f0', cursor: 'pointer', marginBottom: '0.75rem' }}
        >
          ← Volver al inicio
        </button>
      </div>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.35em", textTransform: "uppercase", color: "#60a5fa" }}>
          Panel administrativo
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: "2.1rem", color: "#f8fafc", margin: 0 }}>Vision general de Popi</h1>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(248,113,113,0.4)',
              background: 'rgba(127,29,29,0.35)',
              color: '#fecaca',
              cursor: 'pointer'
            }}
          >
            Cerrar sesion
          </button>
        </div>
        <p style={{ color: "#cbd5f5", maxWidth: "720px" }}>
          Monitorea usuarios, colaboradores y solicitudes en revision. Aqui encontraras un resumen de actividad reciente y herramientas de seguimiento.
        </p>
      </header>

      <section style={sectionCardStyle}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Indicadores generales</h2>
        <div style={gridStyle}>
          {[
            { label: "Usuarios totales", value: data?.totals?.users ?? "-" },
            { label: "Clientes", value: data?.totals?.customers ?? "-" },
            { label: "Colaboradores aprobados", value: data?.totals?.collaborators ?? "-" },
            { label: "Solicitudes pendientes", value: data?.totals?.pending_collaborators ?? "-" },
            { label: "Solicitudes rechazadas", value: data?.totals?.rejected_collaborators ?? "-" },
            { label: "Equipo interno", value: data?.totals?.staff ?? "-" },
            { label: "Altas semana (usuarios)", value: data?.totals?.new_users_week ?? "-" },
            { label: "Altas semana (colaboradores)", value: data?.totals?.new_collaborators_week ?? "-" },
          ].map((metric) => (
            <div key={metric.label} style={metricStyle}>
              <span style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7dd3fc" }}>
                {metric.label}
              </span>
              <strong style={{ fontSize: "1.7rem", color: "#f8fafc" }}>{metric.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionCardStyle}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Usuarios recientes</h2>
            <p style={{ color: "#cbd5f5", fontSize: "0.9rem" }}>
              Ultimos registros y su rol dentro de la plataforma.
            </p>
          </div>
        </header>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["ID", "Nombre", "Correo", "Rol", "Staff", "Fecha alta"].map((header) => (
                  <th key={header} style={headerCellStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td style={{ ...cellStyle, color: "#94a3b8" }} colSpan={6}>Cargando usuarios...</td>
                </tr>
              )}
              {!loading && data?.users?.length === 0 && (
                <tr>
                  <td style={{ ...cellStyle, color: "#94a3b8" }} colSpan={6}>No hay registros disponibles.</td>
                </tr>
              )}
              {data?.users?.map((user) => (
                <tr key={user.id}>
                  <td style={cellStyle}>#{user.id}</td>
                  <td style={cellStyle}>{user.name || "-"}</td>
                  <td style={{ ...cellStyle, color: "#38bdf8" }}>{user.email}</td>
                  <td style={cellStyle}>{user.role}</td>
                  <td style={cellStyle}>{user.is_staff ? "Si" : "No"}</td>
                  <td style={cellStyle}>{formatDate(user.date_joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sectionCardStyle}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Solicitudes de colaboradores</h2>
            <p style={{ color: "#cbd5f5", fontSize: "0.9rem" }}>
              Revisa la informacion enviada por los aplicantes y aprueba o rechaza segun corresponda.
            </p>
          </div>
        </header>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Colaborador", "Negocio", "Direccion", "Comprobante", "INE/Comprobante", "Contacto", "Calificacion", "Alta", "Estado", "Acciones"].map((header) => (
                  <th key={header} style={headerCellStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td style={{ ...cellStyle, color: "#94a3b8" }} colSpan={8}>Cargando solicitudes...</td>
                </tr>
              )}
              {!loading && data?.collaborators?.length === 0 && (
                <tr>
                  <td style={{ ...cellStyle, color: "#94a3b8" }} colSpan={8}>No hay solicitudes registradas.</td>
                </tr>
              )}
              {data?.collaborators?.map((item) => {
                const isPending = item.status === "pending";
                return (
                  <tr key={item.application_id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{item.name || "-"}</span>
                        <span style={{ color: "#38bdf8", fontSize: "0.85rem" }}>{item.email}</span>
                      </div>
                    </td>
                    <td style={cellStyle}>{item.business_name}</td>
                    <td style={{ ...cellStyle, maxWidth: "220px" }}>{item.address}</td>
                    <td style={{ ...cellStyle, maxWidth: "260px" }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5f5' }}>{item.address_proof_text || '-'}</span>
                      </div>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {item.ine_document_url ? (
                          <a href={item.ine_document_url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', fontSize: '0.85rem' }}>Ver INE</a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sin INE</span>
                        )}
                        {item.address_proof_document_url ? (
                          <a href={item.address_proof_document_url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd', fontSize: '0.85rem' }}>Ver comprobante</a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sin comprobante</span>
                        )}
                      </div>
                    </td>
                    <td style={cellStyle}>{item.phone_number || "-"}</td>
                    <td style={cellStyle}>{item.rating != null ? `${item.rating} pts (${item.review_count})` : "-"}</td>
                    <td style={cellStyle}>{formatDate(item.created_at)}</td>
                    <td style={cellStyle}>{item.status}</td>
                    <td style={{ ...cellStyle, minWidth: "180px" }}>
                      {isPending ? (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleDecision(item.application_id, "approve")}
                            style={{
                              padding: "0.4rem 0.75rem",
                              borderRadius: "10px",
                              border: "1px solid rgba(34,197,94,0.4)",
                              background: "rgba(34,197,94,0.2)",
                              color: "#bbf7d0",
                              cursor: actionLoading ? "wait" : "pointer",
                            }}
                            disabled={actionLoading}
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision(item.application_id, "reject")}
                            style={{
                              padding: "0.4rem 0.75rem",
                              borderRadius: "10px",
                              border: "1px solid rgba(248,113,113,0.35)",
                              background: "rgba(248,113,113,0.2)",
                              color: "#fecaca",
                              cursor: actionLoading ? "wait" : "pointer",
                            }}
                            disabled={actionLoading}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Sin acciones</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <div style={{ ...sectionCardStyle, borderColor: "rgba(248,113,113,0.35)", color: "#fecaca" }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;





