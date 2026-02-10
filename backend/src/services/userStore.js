import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([] , null, 2), "utf-8");
}

export function readUsers() {
  ensureDataDir();
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(raw);
}

export function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function findUserByEmail(email) {
  const users = readUsers();
  return users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase()) || null;
}

export function findUserById(id) {
  const users = readUsers();
  return users.find((u) => Number(u.id) === Number(id)) || null;
}

export function addUser(user) {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  return user;
}

export function ensureFirstAdmin() {
  // Si NO hay usuarios, crea admin por defecto (solo dev)
  const users = readUsers();
  if (users.length > 0) return;

  users.push({
    id: 1,
    email: "admin@myl.local",
    name: "Admin",
    role: "admin",
    passwordHash: null, // se setea en auth.routes.js al iniciar (te explico abajo)
    createdAt: new Date().toISOString(),
  });

  writeUsers(users);
}
