import { Navigate, useLocation } from 'react-router-dom';

function RequireAuth({ children }) {
  const location = useLocation();
  let user = null;
  try {
    const raw = localStorage.getItem('popi_user');
    user = raw ? JSON.parse(raw) : null;
  } catch (_) {
    user = null;
  }

  const isAdminPath = location.pathname.startsWith('/admin');
  const isAdmin = !!(user && (user.is_staff || user.is_superuser));

  if (!user) {
    return <Navigate to="/login" replace state={{ next: location.pathname + location.search }} />;
  }

  // Non-admin attempting to access admin paths
  if (!isAdmin && isAdminPath) {
    return <Navigate to="/login" replace state={{ message: 'No eres administrador.', next: '/admin/panel' }} />;
  }

  // Admin should stay within admin panel; redirect away from non-admin routes
  if (isAdmin && !isAdminPath) {
    return <Navigate to="/admin/panel" replace />;
  }
  return children;
}

export default RequireAuth;
