import { getSheetNameByGid, fetchRows, parseWeeklySheet } from './_sheets.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sheetName = await getSheetNameByGid(process.env.SHEET_GID);
    if (!sheetName) throw new Error(`Sheet GID ${process.env.SHEET_GID} not found`);

    const rawRows = await fetchRows(sheetName);
    const members = parseWeeklySheet(rawRows);

    res.status(200).json({
      members,
      sheetName,
      lastSync: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
