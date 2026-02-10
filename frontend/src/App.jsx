import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import AppLayout from "./app/layout/AppLayout";
import GalleryPage from "./pages/GalleryPage";
import DecksPage from "./pages/DecksPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminDashboard from "./pages/admin/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Layout general */}
          <Route element={<AppLayout />}>
            {/* Públicas */}
            <Route path="/" element={<GalleryPage />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protegidas: cualquier usuario logueado */}
            {/* Ejemplo futuro: /profile, /favorites, /deckbuilder */}

            {/* Protegidas: solo ADMIN */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
