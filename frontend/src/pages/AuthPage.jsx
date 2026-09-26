import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { user, loading, login, register, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return <section className="page-container auth-state">Checking your session…</section>;
  }
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await (isSignup ? register({ name: name.trim(), email: email.trim(), password }) : login({ email: email.trim(), password }));
      const destination = location.state?.from?.pathname;
      navigate(destination || (isSignup ? "/" : "/admin"), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-container auth-layout">
      <div className="auth-card">
        <p className="eyebrow">{isSignup ? "Join Goodform" : "Welcome back"}</p>
        <h1>{isSignup ? "Create your account" : "Sign in"}</h1>
        <p className="auth-intro">
          {isSignup ? "Save your details for a smoother shopping experience." : "Sign in to continue to your account."}
        </p>
        {(error || authError) && <div className="error-box" role="alert">{error || authError}</div>}
        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={8}
                maxLength={72}
              />
              <button
                className="password-visibility"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4M6.2 6.2C3.9 7.7 2.8 10 2.5 12c.8 2.3 3.8 7 9.5 7 1.2 0 2.3-.2 3.2-.6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to Goodform?"}{" "}
          <Link to={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>
        </p>
      </div>
    </section>
  );
}
