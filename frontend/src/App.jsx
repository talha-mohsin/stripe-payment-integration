import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { RequireAdmin } from "./components/RouteGuards";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import SuccessPage from "./pages/SuccessPage";
import CancelPage from "./pages/CancelPage";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Goodform<span className="brand-period">.</span></span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link to="/">Store</Link>
          {!loading && user && (
            <>
              {user.role === "admin" && <Link to="/admin">Admin</Link>}
              <span className="header-user">{user.name}</span>
              <button type="button" className="nav-button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="nav-signup" to="/signup">Create account</Link>
            </>
          )}
          <span className="mode-badge"><span className="status-dot" /> Demo store</span>
        </nav>
      </header>

      <main>
        {logoutError && <div className="global-error error-box" role="alert">{logoutError}</div>}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/cancel" element={<CancelPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}
