import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Collaborator from './pages/Collaborator.jsx';
import CollaboratorAccess from './pages/CollaboratorAccess.jsx';
import Dashboard from './pages/user/Dashboard.jsx';
import Profile from './pages/user/Profile.jsx';
import PartnerDashboard from './pages/partner/PartnerDashboard.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';
import RequireAuth from './components/RequireAuth.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/colaborar" element={<RequireAuth><Collaborator /></RequireAuth>} />
      <Route path="/colaborar/access" element={<RequireAuth><CollaboratorAccess /></RequireAuth>} />
      <Route path="/app" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/colaborador/panel" element={<RequireAuth><PartnerDashboard /></RequireAuth>} />
      <Route path="/admin/panel" element={<RequireAuth><AdminPanel /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
