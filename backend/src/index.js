// backend/src/index.js
import express from "express";
import cors from "cors";
import http from "http";
import https from "https";
import { URL } from "url";
import { loadCardsFromCsv, createCardsStore } from "./services/cardsStore.js";
import authRoutes from "./routes/auth.routes.js";
import { requireAdmin, requireAuth } from "./middlewares/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

let store;

async function boot() {
  const { cards, headers } = await loadCardsFromCsv("Base_MYL.csv");
  store = createCardsStore(cards, { csvPath: "Base_MYL.csv", csvHeaders: headers });

  console.log("✅ CSV cargado OK. Total:", store.list().length);
  console.log("✅ Ejemplo primera carta:", store.list()[0]);
}

await boot();

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;

  const ipMatch = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipMatch) return false;

  const a = Number(ipMatch[1]);
  const b = Number(ipMatch[2]);

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT

  return false;
}

function proxyImage(url, res, redirects = 0) {
  const client = url.protocol === "https:" ? https : http;

  const req = client.get(
    url,
    {
      headers: {
        "User-Agent": "MYL-Image-Proxy/1.0",
        Accept: "image/*,*/*;q=0.8",
        "Accept-Encoding": "identity",
      },
    },
    (upstream) => {
      const status = upstream.statusCode || 502;

      if (status >= 300 && status < 400 && upstream.headers.location && redirects < 3) {
        try {
          const next = new URL(upstream.headers.location, url);
          return proxyImage(next, res, redirects + 1);
        } catch {
          res.status(502).json({ message: "Redirección inválida." });
          return;
        }
      }

      if (status >= 400) {
        res.status(status).json({ message: "No se pudo obtener la imagen." });
        return;
      }

      res.statusCode = status;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");
      if (upstream.headers["content-type"]) {
        res.setHeader("Content-Type", upstream.headers["content-type"]);
      }
      if (upstream.headers["content-encoding"]) {
        res.setHeader("Content-Encoding", upstream.headers["content-encoding"]);
      }
      if (upstream.headers["content-length"]) {
        res.setHeader("Content-Length", upstream.headers["content-length"]);
      }
      upstream.pipe(res);
    }
  );

  req.on("error", () => {
    res.status(502).json({ message: "Error conectando al servidor de imagen." });
  });
}

app.get("/api/cards/meta", (req, res) => {
  res.json(store.meta());
});

app.get("/api/cards", (req, res) => {
  const {
    q = "",
    type = "",
    rarity = "",
    edition = "",
    sort = "name_asc",
    page = 1,
    pageSize = 40,
    requireName = "1",
    onlyWithImage = "1",
    includeStats = "0",
  } = req.query;

  const result = store.query({
    q,
    type,
    rarity,
    edition,
    sort,
    page,
    pageSize,
    requireName: requireName === "1" || requireName === "true",
    onlyWithImage: onlyWithImage === "1" || onlyWithImage === "true",
  });
  if (includeStats === "1" || includeStats === "true") {
    return res.json({ ...result, stats: store.stats() });
  }
  res.json(result);
});

app.get("/api/cards/:id", (req, res) => {
  const card = store.getById(req.params.id);
  if (!card) return res.status(404).json({ message: "Carta no encontrada" });
  res.json(card);
});

app.get("/api/image", (req, res) => {
  const target = String(req.query.url || "").trim();
  if (!target) return res.status(400).json({ message: "Falta url." });

  let url;
  try {
    url = new URL(target);
  } catch {
    return res.status(400).json({ message: "URL inválida." });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return res.status(400).json({ message: "Protocolo no permitido." });
  }

  if (isPrivateHost(url.hostname)) {
    return res.status(403).json({ message: "Host bloqueado." });
  }

  return proxyImage(url, res);
});

app.post("/api/cards", async (req, res) => {
  try {
    const created = store.create(req.body || {});
    await store.saveToCsv();
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: "Error guardando en CSV." });
  }
});

app.put("/api/cards/:id", async (req, res) => {
  try {
    const updated = store.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ message: "Carta no encontrada" });
    await store.saveToCsv();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Error guardando en CSV." });
  }
});

app.delete("/api/cards/:id", async (req, res) => {
  try {
    const ok = store.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: "Carta no encontrada" });
    await store.saveToCsv();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Error guardando en CSV." });
  }
});

// Rutas admin (protegidas)
app.get("/api/admin/cards", requireAuth, requireAdmin, (req, res) => {
  const {
    q = "",
    type = "",
    rarity = "",
    edition = "",
    sort = "name_asc",
    page = 1,
    pageSize = 40,
    includeDeleted = false,
    requireName = false,
    onlyWithImage = false,
    all = "0",
  } = req.query;

  const includeDeletedFlag = includeDeleted === "1" || includeDeleted === "true";

  if (all === "1" || all === "true") {
    const items = store.list({ includeDeleted: includeDeletedFlag });
    return res.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    });
  }

  const result = store.query({
    q,
    type,
    rarity,
    edition,
    sort,
    page,
    pageSize,
    includeDeleted: includeDeletedFlag,
    requireName: requireName === "1" || requireName === "true",
    onlyWithImage: onlyWithImage === "1" || onlyWithImage === "true",
  });
  res.json(result);
});

app.post("/api/admin/cards", requireAuth, requireAdmin, async (req, res) => {
  try {
    const created = store.create(req.body || {});
    await store.saveToCsv();
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: "Error guardando en CSV." });
  }
});

app.put("/api/admin/cards/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = store.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ message: "Carta no encontrada" });
    await store.saveToCsv();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Error guardando en CSV." });
  }
});

app.delete("/api/admin/cards/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const ok = store.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: "Carta no encontrada" });
    await store.saveToCsv();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Error guardando en CSV." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
