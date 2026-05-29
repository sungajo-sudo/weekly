import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { fetchSheetData, getSheetNameByGid, fetchRows } from './sheets.js';
import { parseWeeklySheet } from './parser.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// In-memory cache
let cache = { weekly: null, lastSync: null, error: null, sheetName: null };

async function syncFromSheet() {
  try {
    const sheetName = await getSheetNameByGid(process.env.SHEET_GID);
    if (!sheetName) throw new Error(`Sheet GID ${process.env.SHEET_GID} not found`);

    const rawRows = await fetchRows(`${sheetName}!A:G`);
    const members = parseWeeklySheet(rawRows);

    cache = { weekly: members, sheetName, lastSync: new Date().toISOString(), error: null };
    console.log(`[sync] OK — ${members.length} members from "${sheetName}" at ${cache.lastSync}`);
    return cache;
  } catch (err) {
    cache.error = err.message;
    console.error('[sync] ERROR:', err.message);
    throw err;
  }
}

// GET /api/weekly — parsed weekly data
app.get('/api/weekly', async (req, res) => {
  if (!cache.weekly) {
    try { await syncFromSheet(); } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.json({ members: cache.weekly, sheetName: cache.sheetName, lastSync: cache.lastSync });
});

// POST /api/sync — manual trigger
app.post('/api/sync', async (req, res) => {
  try {
    await syncFromSheet();
    res.json({ ok: true, lastSync: cache.lastSync, rows: cache.data.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/status
app.get('/api/status', (_req, res) => {
  res.json({ lastSync: cache.lastSync, error: cache.error, hasData: !!cache.data });
});

// Cron: 매주 금요일 18:00, 월요일 07:00 (Asia/Seoul)
cron.schedule('0 18 * * 5', syncFromSheet, { timezone: 'Asia/Seoul' });
cron.schedule('0 7 * * 1',  syncFromSheet, { timezone: 'Asia/Seoul' });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
  syncFromSheet(); // initial load on startup
});
