import { google } from 'googleapis';
import 'dotenv/config';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 날짜 파싱 헬퍼: "M/D", "MM/DD", "M월D일" 등 다양한 형식 지원 → Date 반환
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

// 숨겨지지 않은 시트 중 가장 최신 날짜 시트 이름 반환
// (날짜 파싱 불가 시 마지막 visible 시트로 폴백)
export async function getLatestSheetName() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const visibleSheets = meta.data.sheets.filter(s => !s.properties.hidden);
  if (!visibleSheets.length) return null;

  const dated = visibleSheets
    .map(s => ({ title: s.properties.title, date: parseSheetDate(s.properties.title) }))
    .filter(s => s.date !== null)
    .sort((a, b) => b.date - a.date);

  const latest = dated[0]?.title || visibleSheets[visibleSheets.length - 1]?.properties?.title || null;
  console.log('[sheets] visible sheets:', visibleSheets.map(s => s.properties.title));
  console.log('[sheets] latest sheet selected:', latest);
  return latest;
}

// Get sheet name from GID (하위 호환 유지)
export async function getSheetNameByGid(gid) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => String(s.properties.sheetId) === String(gid));
  return sheet?.properties?.title || null;
}

// Fetch raw rows from a named range or A1 notation
export async function fetchRows(range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

// Return all rows with first row as header
export async function fetchSheetData(sheetName) {
  const rows = await fetchRows(`${sheetName}!A:Z`);
  if (!rows.length) return { headers: [], rows: [] };
  const [headers, ...data] = rows;
  return { headers, rows: data };
}
