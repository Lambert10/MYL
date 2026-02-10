import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "No autorizado (sin token)." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = payload; // { id, email, role }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token inválido o expirado." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "No autorizado." });
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Prohibido (solo admin)." });
  }
  next();
}
