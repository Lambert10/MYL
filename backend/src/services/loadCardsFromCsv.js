import fs from "fs";
import path from "path";
import csv from "csv-parser";

function cleanStr(v) {
  if (v == null) return "";
  let s = String(v);
  // quita BOM al inicio del string si viene pegado
  s = s.replace(/^\uFEFF/, "");
  // quita comillas envolventes
  s = s.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  return s.trim();
}

function toNumOrNull(v) {
  if (v === 0 || v === "0") return 0;
  const n = Number(cleanStr(v));
  return Number.isFinite(n) ? n : null;
}

function pick(row, keys) {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }
  return undefined;
}

/**
 * Carga cartas desde un CSV separado por ; (Base_MYL.csv)
 * @param {string} csvFilePath ruta absoluta o relativa al backend
 * @returns {Promise<Array>}
 */
export function loadCardsFromCsv(csvFilePath) {
  return new Promise((resolve, reject) => {
    const cards = [];

    const absolutePath = path.isAbsolute(csvFilePath)
      ? csvFilePath
      : path.resolve(process.cwd(), csvFilePath);

    console.log("Leyendo CSV desde:", absolutePath);

    const stream = fs.createReadStream(absolutePath);

    stream.on("error", (err) => reject(err));

    stream
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        // ✅ id robusto (card_id puede venir con BOM)
        const rawId = pick(row, ["card_id", "\uFEFFcard_id", "﻿card_id", "id"]);
        const id = toNumOrNull(rawId);

        const card = {
          id, // <- ahora NO será null si el CSV trae card_id
          name: cleanStr(row.name),
          name_slug: cleanStr(row.name_slug),
          description: cleanStr(row.description),
          ability: cleanStr(row.ability),
          cost: toNumOrNull(row.cost),
          strength: toNumOrNull(row.strength),
          type: cleanStr(row.type),
          type_slug: cleanStr(row.type_slug),
          race: cleanStr(row.race),
          race_slug: cleanStr(row.race_slug),
          rarity: cleanStr(row.rarity),
          rarity_slug: cleanStr(row.rarity_slug),
          image_url: cleanStr(row.image_url),
          image_custom_url: cleanStr(row.image_custom_url), // por si en el futuro agregas Cloudinary
        };

        cards.push(card);
      })
      .on("end", () => {
        // opcional: eliminar duplicados por id si existieran
        // (por ahora lo dejamos simple)
        resolve(cards);
      });
  });
}
