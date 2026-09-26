import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

function AuthLoading() {
  return (
    <section className="page-container auth-state" aria-live="polite">
      <p>Checking your session…</p>
    </section>
  );
}

export function RequireAuth({ children }) {
  const { user, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (error) {
    return (
      <section className="page-container auth-state">
        <div className="error-box" role="alert">
          Could not verify your session: {error}
        </div>
      </section>
    );
  }
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RequireAdmin({ children }) {
  const { user, loading, error } = useAuth();
  if (loading) return <AuthLoading />;
  if (error) {
    return (
      <section className="page-container auth-state">
        <div className="error-box" role="alert">
          Could not verify your session: {error}
        </div>
      </section>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: "/admin" } }} />;
  return user.role === "admin" ? children : <Navigate to="/" replace />;
}
