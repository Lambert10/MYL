import fs from 'fs';
import csv from 'csv-parser';
import { pickHeader } from './utils/inferMapping.js';

export async function loadCards(csvPath, mappingHints = {}) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const headersSeen = new Set();

    fs.createReadStream(csvPath)
      .once('error', reject)
      .pipe(csv({ separator: ';' }))
      .on('headers', (headers) => { headers.forEach(h => headersSeen.add(h)); })
      .on('data', (row) => rows.push(row))
      .on('end', () => {
        const headers = [...headersSeen];
        const imageKey   = mappingHints.imageKey   || pickHeader(headers, process.env.IMAGE_COL);
        const nameKey    = mappingHints.nameKey    || pickHeader(headers, process.env.NAME_COL);
        const editionKey = mappingHints.editionKey || pickHeader(headers, process.env.EDITION_COL);
        const typeKey    = mappingHints.typeKey    || pickHeader(headers, process.env.TYPE_COL);
        const factionKey = mappingHints.factionKey || pickHeader(headers, process.env.FACTION_COL);

        const data = rows.map((r, i) => ({
          id: r.id || r.ID || String(i + 1),
          name: nameKey ? r[nameKey] : r.name || r.nombre || '',
          image: imageKey ? r[imageKey] : r.image || r.img || r.url || '',
          edition: editionKey ? r[editionKey] : r.edicion || r.edition || '',
          type: typeKey ? r[typeKey] : r.tipo || r.type || '',
          faction: factionKey ? r[factionKey] : r.faccion || r.faction || ''
        })).filter(x => x.image);

        resolve({ headers, data, mapping: { imageKey, nameKey, editionKey, typeKey, factionKey } });
      });
  });
}
