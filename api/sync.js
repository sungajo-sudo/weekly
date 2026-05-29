import { getSheetNameByGid, fetchRows, parseWeeklySheet } from './_sheets.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetName = await getSheetNameByGid(process.env.SHEET_GID);
    if (!sheetName) throw new Error(`Sheet GID not found`);

    const rawRows = await fetchRows(sheetName);
    const members = parseWeeklySheet(rawRows);

    res.status(200).json({
      ok: true,
      rows: rawRows.length,
      members: members.length,
      lastSync: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
