import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { addUser, ensureFirstAdmin, findUserByEmail, readUsers, writeUsers } from "../services/userStore.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" }
  );
}

// Crea admin por defecto SOLO si users.json está vacío.
// Password por defecto: admin123 (solo local/dev)
router.get("/seed-admin", async (req, res) => {
  ensureFirstAdmin();
  const users = readUsers();

  // si el admin tiene passwordHash null, le ponemos uno
  const admin = users.find((u) => u.role === "admin");
  if (admin && !admin.passwordHash) {
    admin.passwordHash = await bcrypt.hash("admin123", 10);
    writeUsers(users);
  }

  return res.json({
    message: "Admin listo (solo dev).",
    adminEmail: "admin@myl.local",
    adminPassword: "admin123",
  });
});

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email y password son obligatorios." });
  }

  const exists = findUserByEmail(email);
  if (exists) return res.status(409).json({ message: "Este email ya está registrado." });

  const passwordHash = await bcrypt.hash(password, 10);
  const users = readUsers();
  const nextId = users.length ? Math.max(...users.map((u) => Number(u.id))) + 1 : 1;

  const user = {
    id: nextId,
    email,
    name: name || "",
    role: "user",
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  addUser(user);

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email y password son obligatorios." });
  }

  const user = findUserByEmail(email);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Credenciales inválidas." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Credenciales inválidas." });

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
});

export default router;
