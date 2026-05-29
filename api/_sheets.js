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

// 항상 가장 왼쪽(첫 번째) 시트 이름 반환
export async function getFirstSheetName() {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
  return meta.data.sheets[0]?.properties?.title || null;
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
  // 헤더 행 건너뜀: '팀원' 또는 '이번 주' 등 컬럼 헤더 행 제외
  const SKIP = ['팀원', '이번 주', '다음 주', '이번주', '다음주'];
  const dataRows = rawRows.filter(r => {
    const c0 = r[0]?.trim() || '';
    return c0 !== '' && !SKIP.some(s => c0.includes(s));
  });

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
