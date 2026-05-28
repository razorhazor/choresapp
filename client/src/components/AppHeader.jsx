import { useAuth } from '../auth/AuthContext.jsx';

export default function AppHeader({ title, subtitle }) {
  const { user, logout } = useAuth();
  return (
    <header className="app-header">
      <div className="app-header-text">
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {user && (
        <button className="btn btn-ghost" onClick={logout} aria-label="Log out">
          Log out
        </button>
      )}
    </header>
  );
}
