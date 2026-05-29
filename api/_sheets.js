import { google } from 'googleapis';

export function getSheets() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')   // literal \n → real newline
    .replace(/^"|"$/g, '');  // strip surrounding quotes if any

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL?.trim(),
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function getSheetNameByGid(gid) {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
  const sheet = meta.data.sheets.find(
    s => String(s.properties.sheetId) === String(gid)
  );
  return sheet?.properties?.title || null;
}

export async function fetchRows(sheetName) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${sheetName}!A:G`,
  });
  return res.data.values || [];
}

export function parseWeeklySheet(rawRows) {
  const dataRows = rawRows
    .slice(1)
    .filter(r => r[0]?.trim() !== '팀원' && r[4]?.trim() !== '팀원');

  const memberMap = {};
  for (const row of dataRows) {
    const [prevName, prevProject, prevContent, , thisName, thisProject, thisContent] = row;

    if (prevName?.trim()) {
      const name = prevName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (prevProject?.trim() || prevContent?.trim()) {
        memberMap[name].prevWeek.push({
          project: prevProject?.trim() || '',
          content: prevContent?.trim() || '',
        });
      }
    }
    if (thisName?.trim()) {
      const name = thisName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (thisProject?.trim() || thisContent?.trim()) {
        memberMap[name].thisWeek.push({
          project: thisProject?.trim() || '',
          content: thisContent?.trim() || '',
        });
      }
    }
  }
  return Object.values(memberMap);
}
