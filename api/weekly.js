import { getFirstSheetName, fetchRows, parseWeeklySheet } from './_sheets.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sheetName = await getFirstSheetName();
    if (!sheetName) throw new Error('시트를 찾을 수 없습니다');

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
