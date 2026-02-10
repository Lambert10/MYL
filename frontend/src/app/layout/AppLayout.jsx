import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function AppLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="shell">
      <header className="header">
        <div className="brand" onClick={() => navigate("/")}>
          <span className="badge">MYL</span>
          <div className="brandText">
            <strong>Card Manager</strong>
            <span>Explorer + Admin</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
            Galería
          </NavLink>
          <NavLink to="/decks" className={({ isActive }) => (isActive ? "active" : "")}>
            Mazos
          </NavLink>

          {!isAuthenticated && (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Registro
              </NavLink>
            </>
          )}

          {isAuthenticated && (
            <>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  Admin
                </NavLink>
              )}

              <button className="linkBtn" onClick={handleLogout}>
                Cerrar sesión
              </button>

              <span className="userTag">
                {user?.email || "Usuario"} {isAdmin ? "· ADMIN" : ""}
              </span>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <span>MYL · React + Node · Auth JWT</span>
      </footer>
    </div>
  );
}
