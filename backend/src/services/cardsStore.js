// backend/src/services/cardsStore.js
import fs from "fs";
import path from "path";
import csv from "csv-parser";

const DEFAULT_HEADERS = [
  "id",
  "card_id",
  "name",
  "name_slug",
  "description",
  "ability",
  "cost",
  "strength",
  "type",
  "type_slug",
  "rarity",
  "rarity_slug",
  "is_unique",
  "race",
  "race_slug",
  "image_url",
  "image_custom_url",
  "image_url_raw",
  "image_url_source",
  "illustrator",
  "edition",
  "edition_id",
  "created_at",
  "updated_at",
  "is_deleted",
];

function cleanStr(v) {
  if (v == null) return "";
  let s = String(v);
  s = s.replace(/^\uFEFF/, ""); // BOM
  s = s.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  s = s.trim();
  const low = s.toLowerCase();
  if (low === "null" || low === "none" || low === "undefined") return "";
  if (low === "n/d" || low === "nd" || low === "n/a" || low === "na") return "";
  if (low === "sin dato" || low === "sin datos") return "";
  return s;
}

function toNum(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseIntLike(v) {
  const s = cleanStr(v);
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d+\.0+$/.test(s)) return Number(s);
  return null;
}

function parseBool(v) {
  const s = cleanStr(v).toLowerCase();
  if (!s) return false;
  return s === "true" || s === "1" || s === "si" || s === "yes" || s === "y";
}

function normalizeHeader(h) {
  return String(h || "").replace(/^\uFEFF/, "").trim();
}

function normalizeRowKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    const key = normalizeHeader(k);
    out[key] = v;
  }
  return out;
}

function ensureHeaders(baseHeaders = []) {
  const seen = new Set();
  const headers = [];
  for (const h of baseHeaders) {
    const key = normalizeHeader(h);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    headers.push(key);
  }
  for (const h of DEFAULT_HEADERS) {
    if (!seen.has(h)) {
      seen.add(h);
      headers.push(h);
    }
  }
  return headers;
}

function escapeCsv(value) {
  if (value == null) return "";
  let s = String(value);
  if (s.includes('"')) s = s.replace(/"/g, '""');
  if (/[;\n\r]/.test(s)) return `"${s}"`;
  return s;
}

function toCsvNum(n) {
  if (n === null || n === undefined || n === "") return "";
  return String(n);
}

function nowIso() {
  return new Date().toISOString();
}

function makeCardFromRow(row, allocateId) {
  const normalized = normalizeRowKeys(row);
  const csvRow = {};
  for (const [k, v] of Object.entries(normalized)) {
    csvRow[k] = cleanStr(v);
  }

  const rawId = csvRow.id || csvRow.card_id;
  const id = allocateId ? allocateId(rawId) : cleanStr(rawId);
  csvRow.id = id || "";

  const isDeleted = parseBool(csvRow.is_deleted || csvRow.deleted || csvRow.hidden);
  if ("is_deleted" in csvRow) csvRow.is_deleted = isDeleted ? "true" : "";

  return {
    // id unico dentro del CSV (si no viene, se asigna)
    id: csvRow.id || "",
    card_id: csvRow.card_id || "",

    // datos CSV
    name: cleanStr(csvRow.name),
    name_slug: cleanStr(csvRow.name_slug),
    description: cleanStr(csvRow.description),
    ability: cleanStr(csvRow.ability),
    cost: toNum(csvRow.cost),
    strength: toNum(csvRow.strength),
    type: cleanStr(csvRow.type),
    type_slug: cleanStr(csvRow.type_slug),
    race: cleanStr(csvRow.race),
    race_slug: cleanStr(csvRow.race_slug),
    rarity: cleanStr(csvRow.rarity),
    rarity_slug: cleanStr(csvRow.rarity_slug),
    edition: cleanStr(csvRow.edition),
    is_unique: cleanStr(csvRow.is_unique),

    image_url: cleanStr(csvRow.image_url),
    image_custom_url: cleanStr(csvRow.image_custom_url),

    is_deleted: isDeleted,
    __csv: csvRow,
  };
}

export async function loadCardsFromCsv(csvRelativePath = "Base_MYL.csv") {
  const csvPath = path.resolve(process.cwd(), csvRelativePath);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV no encontrado en: ${csvPath}`);
  }

  const cards = [];
  let headers = [];
  const usedIds = new Set();
  let nextId = 1;

  const registerId = (raw) => {
    const rawClean = cleanStr(raw);
    if (!rawClean) return false;
    if (usedIds.has(rawClean)) return false;
    usedIds.add(rawClean);
    const parsed = parseIntLike(rawClean);
    if (parsed !== null && parsed >= nextId) nextId = parsed + 1;
    return true;
  };

  const allocateId = (raw) => {
    if (registerId(raw)) return cleanStr(raw);

    while (usedIds.has(String(nextId))) nextId += 1;
    const assigned = String(nextId);
    usedIds.add(assigned);
    nextId += 1;
    return assigned;
  };

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({ separator: ";" }))
      .on("headers", (h) => {
        headers = ensureHeaders(h.map(normalizeHeader));
      })
      .on("data", (row) => {
        try {
          cards.push(makeCardFromRow(row, allocateId));
        } catch {
          // ignoramos filas corruptas
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return { cards, headers: ensureHeaders(headers) };
}

export function createCardsStore(initialCards = [], options = {}) {
  const { csvPath: csvPathInput, csvHeaders: csvHeadersInput } = options;
  const csvPath = csvPathInput ? path.resolve(process.cwd(), csvPathInput) : null;

  let cards = [...initialCards];
  const headers = ensureHeaders(csvHeadersInput || collectHeaders(cards));

  const usedIds = new Set();
  let nextId = 1;

  const registerId = (raw) => {
    const rawClean = cleanStr(raw);
    if (!rawClean) return false;
    if (usedIds.has(rawClean)) return false;
    usedIds.add(rawClean);
    const parsed = parseIntLike(rawClean);
    if (parsed !== null && parsed >= nextId) nextId = parsed + 1;
    return true;
  };

  const allocateId = (raw) => {
    if (registerId(raw)) return cleanStr(raw);
    while (usedIds.has(String(nextId))) nextId += 1;
    const assigned = String(nextId);
    usedIds.add(assigned);
    nextId += 1;
    return assigned;
  };

  function syncCsvRow(card, { isNew = false, touchTimestamps = true } = {}) {
    const row = { ...(card.__csv || {}) };

    row.id = String(card.id ?? "");
    if (row.card_id == null) row.card_id = cleanStr(card.card_id);

    row.name = cleanStr(card.name);
    row.name_slug = cleanStr(card.name_slug);
    row.description = cleanStr(card.description);
    row.ability = cleanStr(card.ability);
    row.cost = toCsvNum(card.cost);
    row.strength = toCsvNum(card.strength);
    row.type = cleanStr(card.type);
    row.type_slug = cleanStr(card.type_slug);
    row.race = cleanStr(card.race);
    row.race_slug = cleanStr(card.race_slug);
    row.rarity = cleanStr(card.rarity);
    row.rarity_slug = cleanStr(card.rarity_slug);
    row.edition = cleanStr(card.edition);
    row.is_unique = cleanStr(card.is_unique);
    row.image_url = cleanStr(card.image_url);
    row.image_custom_url = cleanStr(card.image_custom_url);
    row.is_deleted = card.is_deleted ? "true" : "";

    if (headers.includes("created_at")) {
      if (isNew && !row.created_at) row.created_at = nowIso();
    }
    if (headers.includes("updated_at") && touchTimestamps) {
      row.updated_at = nowIso();
    }

    card.__csv = row;
    return row;
  }

  for (const c of cards) {
    c.id = allocateId(c?.id);
    syncCsvRow(c, { isNew: false, touchTimestamps: false });
  }

  let saveQueue = Promise.resolve();

  async function saveToCsv() {
    if (!csvPath) return;

    const lines = [];
    lines.push(headers.join(";"));
    for (const card of cards) {
      const row = card.__csv || syncCsvRow(card, { isNew: false, touchTimestamps: false });
      const line = headers.map((h) => escapeCsv(row?.[h] ?? "")).join(";");
      lines.push(line);
    }

    const tmpPath = `${csvPath}.tmp`;
    const content = lines.join("\n");

    saveQueue = saveQueue
      .catch(() => {})
      .then(() => fs.promises.writeFile(tmpPath, content, "utf-8"))
      .then(() => fs.promises.rename(tmpPath, csvPath));

    return saveQueue;
  }

  function list({ includeDeleted = true } = {}) {
    if (includeDeleted) return cards;
    return cards.filter((c) => !c.is_deleted);
  }

  function getById(id) {
    const key = String(id ?? "");
    return cards.find((c) => String(c.id ?? "") === key) || null;
  }

  function query({
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
  }) {
    const qq = cleanStr(q).toLowerCase();
    let filtered = includeDeleted ? cards : cards.filter((c) => !c.is_deleted);

    if (requireName) {
      filtered = filtered.filter((c) => !!cleanStr(c.name));
    }
    if (onlyWithImage) {
      filtered = filtered.filter((c) => !!cleanStr(c.image_custom_url || c.image_url));
    }

    if (qq) {
      filtered = filtered.filter((c) => (c.name || "").toLowerCase().includes(qq));
    }
    if (type) filtered = filtered.filter((c) => c.type === type);
    if (rarity) filtered = filtered.filter((c) => c.rarity === rarity);
    if (edition) filtered = filtered.filter((c) => c.edition === edition);

    // sort
    if (sort === "name_desc") {
      filtered = [...filtered].sort((a, b) =>
        (b.name || "").localeCompare(a.name || "", "es", { sensitivity: "base" })
      );
    } else {
      filtered = [...filtered].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })
      );
    }

    const total = filtered.length;
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.max(1, Math.min(200, Number(pageSize) || 40));
    const start = (p - 1) * ps;
    const items = filtered.slice(start, start + ps);

    return { items, total, page: p, pageSize: ps };
  }

  function create(payload) {
    const card = {
      id: allocateId(),
      card_id: cleanStr(payload.card_id),
      name: cleanStr(payload.name),
      name_slug: cleanStr(payload.name_slug),
      description: cleanStr(payload.description),
      ability: cleanStr(payload.ability),
      cost: toNum(payload.cost),
      strength: toNum(payload.strength),
      type: cleanStr(payload.type),
      type_slug: cleanStr(payload.type_slug),
      race: cleanStr(payload.race),
      race_slug: cleanStr(payload.race_slug),
      rarity: cleanStr(payload.rarity),
      rarity_slug: cleanStr(payload.rarity_slug),
      edition: cleanStr(payload.edition),
      is_unique: cleanStr(payload.is_unique),
      image_url: cleanStr(payload.image_url),
      image_custom_url: cleanStr(payload.image_custom_url),
      is_deleted: false,
    };

    syncCsvRow(card, { isNew: true });
    cards = [card, ...cards];
    return card;
  }

  function update(id, patch) {
    const key = String(id ?? "");
    const idx = cards.findIndex((c) => String(c.id ?? "") === key);
    if (idx === -1) return null;

    const current = cards[idx];
    const updated = {
      ...current,
      name: patch.name !== undefined ? cleanStr(patch.name) : current.name,
      name_slug: patch.name_slug !== undefined ? cleanStr(patch.name_slug) : current.name_slug,
      description: patch.description !== undefined ? cleanStr(patch.description) : current.description,
      ability: patch.ability !== undefined ? cleanStr(patch.ability) : current.ability,
      cost: patch.cost !== undefined ? toNum(patch.cost) : current.cost,
      strength: patch.strength !== undefined ? toNum(patch.strength) : current.strength,
      type: patch.type !== undefined ? cleanStr(patch.type) : current.type,
      type_slug: patch.type_slug !== undefined ? cleanStr(patch.type_slug) : current.type_slug,
      race: patch.race !== undefined ? cleanStr(patch.race) : current.race,
      race_slug: patch.race_slug !== undefined ? cleanStr(patch.race_slug) : current.race_slug,
      rarity: patch.rarity !== undefined ? cleanStr(patch.rarity) : current.rarity,
      rarity_slug: patch.rarity_slug !== undefined ? cleanStr(patch.rarity_slug) : current.rarity_slug,
      edition: patch.edition !== undefined ? cleanStr(patch.edition) : current.edition,
      image_url: patch.image_url !== undefined ? cleanStr(patch.image_url) : current.image_url,
      image_custom_url:
        patch.image_custom_url !== undefined ? cleanStr(patch.image_custom_url) : current.image_custom_url,
    };

    syncCsvRow(updated, { isNew: false });
    cards = [...cards.slice(0, idx), updated, ...cards.slice(idx + 1)];
    return updated;
  }

  function remove(id) {
    const key = String(id ?? "");
    const idx = cards.findIndex((c) => String(c.id ?? "") === key);
    if (idx === -1) return false;
    const current = cards[idx];
    if (!current.is_deleted) {
      current.is_deleted = true;
      syncCsvRow(current, { isNew: false });
      cards = [...cards.slice(0, idx), current, ...cards.slice(idx + 1)];
    }
    return true;
  }

  function meta() {
    const active = cards.filter((c) => !c.is_deleted);
    const types = Array.from(new Set(active.map((c) => c.type).filter(Boolean))).sort();
    const rarities = Array.from(new Set(active.map((c) => c.rarity).filter(Boolean))).sort();
    const editions = Array.from(new Set(active.map((c) => c.edition).filter(Boolean))).sort();
    return { types, rarities, editions };
  }

  function stats() {
    const active = cards.filter((c) => !c.is_deleted);
    const totalAll = active.length;
    const totalComplete = active.filter((c) => {
      const hasName = !!cleanStr(c.name);
      const hasImage = !!cleanStr(c.image_custom_url || c.image_url);
      return hasName && hasImage;
    }).length;
    const totalIncomplete = Math.max(0, totalAll - totalComplete);
    return { totalAll, totalComplete, totalIncomplete };
  }

  return { list, getById, query, create, update, remove, meta, stats, saveToCsv };
}

function collectHeaders(cards) {
  const headers = [];
  const seen = new Set();
  for (const c of cards) {
    const row = c?.__csv || {};
    for (const k of Object.keys(row)) {
      const key = normalizeHeader(k);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }
  return headers;
}
