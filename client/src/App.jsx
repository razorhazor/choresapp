import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ParentDashboard from './pages/ParentDashboard.jsx';
import ChildrenPage from './pages/ChildrenPage.jsx';
import ChoreForm from './pages/ChoreForm.jsx';
import ChildDashboard from './pages/ChildDashboard.jsx';
import ChildHistory from './pages/ChildHistory.jsx';

// Sends a logged-in user to their home, otherwise to login.
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="centered muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'parent' ? '/parent' : '/child'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/parent"
        element={
          <ProtectedRoute role="parent">
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/children"
        element={
          <ProtectedRoute role="parent">
            <ChildrenPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/chores/new"
        element={
          <ProtectedRoute role="parent">
            <ChoreForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/chores/:id/edit"
        element={
          <ProtectedRoute role="parent">
            <ChoreForm />
          </ProtectedRoute>
        }
      />

      <Route
        path="/child"
        element={
          <ProtectedRoute role="child">
            <ChildDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/child/history"
        element={
          <ProtectedRoute role="child">
            <ChildHistory />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
