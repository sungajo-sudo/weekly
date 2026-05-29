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

// 숨겨지지 않은 시트 중 가장 왼쪽(첫 번째 visible) 시트 이름 반환
export async function getFirstSheetName() {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
  const visible = meta.data.sheets.find(s => !s.properties.hidden);
  return visible?.properties?.title || null;
}

export async function fetchRows(sheetName) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${sheetName}!A:I`,  // 카테고리 컬럼 추가로 I열까지
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
    // A:팀원 B:프로젝트 C:카테고리 D:업무내용 E:구분 F:팀원 G:프로젝트 H:카테고리 I:업무내용
    const [prevName, prevProject, prevCategory, prevContent, , thisName, thisProject, thisCategory, thisContent] = row;

    if (prevName?.trim()) {
      const name = prevName.trim();
      if (!memberMap[name]) memberMap[name] = { name, prevWeek: [], thisWeek: [] };
      if (prevProject?.trim() || prevContent?.trim()) {
        memberMap[name].prevWeek.push({
          project: prevProject?.trim() || '',
          category: prevCategory?.trim() || '',
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
          category: thisCategory?.trim() || '',
          content: thisContent?.trim() || '',
        });
      }
    }
  }
  return Object.values(memberMap);
}
