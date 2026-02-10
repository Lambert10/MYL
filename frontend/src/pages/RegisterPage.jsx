import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    if (!email.trim()) return "Ingresa tu email.";
    if (!email.includes("@")) return "Email inválido.";
    if (!password.trim()) return "Ingresa tu contraseña.";
    if (password.length < 6) return "Contraseña demasiado corta (min 6).";
    if (confirm !== password) return "Las contraseñas no coinciden.";
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) return setError(msg);

    // MOCK: registro crea un USER (no admin)
    login({
      accessToken: "mock-token-user",
      user: { id: 1, email, role: "USER" },
    });

    navigate("/", { replace: true });
  };

  return (
    <section style={{ maxWidth: 420 }}>
      <h1>Registro</h1>
      <p className="muted">
        Por ahora es mock. Luego lo conectamos al backend (guardando el usuario real).
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <span className="muted">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuemail@correo.com"
            style={inputStyle}
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <span className="muted">Contraseña</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            type="password"
            style={inputStyle}
            autoComplete="new-password"
          />
        </label>

        <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <span className="muted">Confirmar contraseña</span>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="repite tu contraseña"
            type="password"
            style={inputStyle}
            autoComplete="new-password"
          />
        </label>

        {error && (
          <div style={{ ...boxStyle, borderColor: "rgba(244,63,94,.45)" }}>
            {error}
          </div>
        )}

        <button className="btn" type="submit" style={{ width: "100%", marginTop: 8 }}>
          Crear cuenta
        </button>

        <p className="muted" style={{ marginTop: 12 }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>

        <div style={{ ...boxStyle, marginTop: 14 }}>
          <strong>Nota:</strong> por diseño, el registro crea usuarios <strong>USER</strong>.
          Los <strong>ADMIN</strong> los habilitaremos luego desde el backend (panel admin).
        </div>
      </form>
    </section>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(15,23,42,.7)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 12,
  padding: "0.65rem 0.75rem",
  outline: "none",
};

const boxStyle = {
  border: "1px solid var(--border)",
  background: "rgba(15,23,42,.5)",
  borderRadius: 12,
  padding: "0.75rem 0.85rem",
};
