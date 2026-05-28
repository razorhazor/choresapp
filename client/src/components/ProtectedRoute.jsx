import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Guards a route by authentication and (optionally) role.
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="centered muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'parent' ? '/parent' : '/child'} replace />;
  }
  return children;
}
