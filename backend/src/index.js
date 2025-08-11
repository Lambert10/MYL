import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCards } from './csvService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, '..', 'Base_MYL.csv');

let cache = { rows: [], last: 0 };
async function ensureData() {
  const now = Date.now();
  if (!cache.rows.length || now - cache.last > 5 * 60 * 1000) {
    const { data } = await loadCards(CSV_PATH);
    cache = { rows: data, last: now };
  }
  return cache.rows;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/cards', async (req, res) => {
  try {
    const rows = await ensureData();
    const q = (req.query.q || '').toString().toLowerCase();
    const type = (req.query.type || '').toString().toLowerCase();
    const edition = (req.query.edition || '').toString().toLowerCase();

    let filtered = rows;
    if (q) filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(q));
    if (type) filtered = filtered.filter(r => (r.type || '').toLowerCase().includes(type));
    if (edition) filtered = filtered.filter(r => (r.edition || '').toLowerCase().includes(edition));

    const page = parseInt(req.query.page || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize || '40', 10), 100);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    res.json({ page, pageSize, total: filtered.length, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to read CSV' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
