import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const em = email.trim();
    const pw = password;

    if (!em || !pw) {
      setError("Debes ingresar email y password.");
      return;
    }

    setLoading(true);
    try {
      await login({ email: em, password: pw });
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No pude iniciar sesión.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ maxWidth: 520 }}>
      <h1 style={{ marginTop: 0 }}>Login</h1>
      <p className="muted">Ingresa con tu cuenta.</p>

      {error ? (
        <div style={{ ...boxStyle, borderColor: "rgba(244,63,94,.45)" }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="admin@myl.local"
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            type="password"
            placeholder="admin123"
            autoComplete="current-password"
          />
        </label>

        <button className="btn" disabled={loading}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <div className="muted" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.4 }}>
        Para pruebas local: <b>admin@myl.local</b> / <b>admin123</b>
      </div>
    </section>
  );
}

const inputStyle = {
  background: "rgba(15,23,42,.7)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 12,
  padding: "0.65rem 0.75rem",
  outline: "none",
  width: "100%",
};

const boxStyle = {
  border: "1px solid var(--border)",
  background: "rgba(15,23,42,.5)",
  borderRadius: 12,
  padding: "0.75rem 0.85rem",
  marginTop: 12,
};
