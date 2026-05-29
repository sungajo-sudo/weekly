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

// Fetch raw rows from a named range or A1 notation
export async function fetchRows(range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

// Get sheet name from GID
export async function getSheetNameByGid(gid) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => String(s.properties.sheetId) === String(gid));
  return sheet?.properties?.title || null;
}

// Return all rows with first row as header
export async function fetchSheetData(sheetName) {
  const rows = await fetchRows(`${sheetName}!A:Z`);
  if (!rows.length) return { headers: [], rows: [] };
  const [headers, ...data] = rows;
  return { headers, rows: data };
}
