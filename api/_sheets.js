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

// 날짜 파싱 헬퍼: "M/D", "MM/DD", "M월D일" 등 다양한 형식 지원 → Date 반환 (올해 기준)
function parseSheetDate(title) {
  const year = new Date().getFullYear();
  // 패턴 1: 5/6, 05/06, 5/13 형식
  const slash = title.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slash) {
    const m = parseInt(slash[1], 10);
    const d = parseInt(slash[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(year, m - 1, d);
  }
  // 패턴 2: 5월6일, 5월 6일 형식
  const korean = title.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (korean) {
    const m = parseInt(korean[1], 10);
    const d = parseInt(korean[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(year, m - 1, d);
  }
  // 패턴 3: YYYY-MM-DD, YYYY/MM/DD 형식
  const iso = title.match(/(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  return null;
}

// 숨겨지지 않은 시트 중 날짜가 가장 최신(= 다음 보고 미팅) 시트 이름 반환
// 시트 이름은 보고 미팅 날짜 기준 (예: 6/8 = 6월 8일 미팅)
export async function getFirstSheetName() {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
  const visibleSheets = meta.data.sheets.filter(s => !s.properties.hidden);
  if (!visibleSheets.length) return null;

  const dated = visibleSheets
    .map(s => ({ title: s.properties.title, date: parseSheetDate(s.properties.title) }))
    .filter(s => s.date !== null)
    .sort((a, b) => b.date - a.date); // 내림차순: 가장 최신 날짜 먼저

  const latest = dated[0]?.title || visibleSheets[0]?.properties?.title || null;
  console.log('[sheets] visible sheets:', visibleSheets.map(s => s.properties.title));
  console.log('[sheets] latest sheet selected:', latest);
  return latest;
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
