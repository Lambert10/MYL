import express from "express";
import { createCustomCard, deleteCard, readOverrides, upsertOverride } from "../services/cardStore.js";

const router = express.Router();

// Crear carta custom
router.post("/", (req, res) => {
  const payload = req.body || {};

  // id nuevo: max id de overrides o base lo calculamos simple con overrides
  const overrides = readOverrides();
  const ids = Object.keys(overrides).map((k) => Number(k)).filter((n) => Number.isFinite(n));
  const nextId = ids.length ? Math.max(...ids) + 1 : 100000; // si no hay nada, parte alto

  const created = createCustomCard(nextId, payload);
  return res.status(201).json({ id: nextId, ...created });
});

// Editar carta (base o custom)
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido." });

  const patch = req.body || {};
  const updated = upsertOverride(id, patch);
  return res.json({ id, ...updated });
});

// Borrar carta
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido." });

  deleteCard(id);
  return res.json({ ok: true });
});

export default router;
