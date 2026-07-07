const { google } = require("googleapis");
const path = require("path");
const { buildDashboardPayload } = require("./analytics");

const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID ||
  "1fDY22Lci5gC5Z4pU-vxX5Nv3eFnQDz0CvSWZ0CL5K_w";

const CREDENTIALS_PATH =
  process.env.GOOGLE_CREDENTIALS_PATH ||
  path.join(__dirname, "..", "pod-digital-reporting-010a22a020c0.json");

const SHEET_NAMES = ["lead", "service_quote", "defect_quote"];
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedPayload = null;
let cacheTimestamp = 0;

function rowsToObjects(rows) {
  if (!rows?.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

function getGoogleAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  }

  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: "v4", auth });
}

async function fetchSheetData(sheetName) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'`,
  });
  return rowsToObjects(response.data.values || []);
}

async function fetchAllSheets() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges: SHEET_NAMES.map((name) => `'${name}'`),
  });

  const result = {};
  (response.data.valueRanges || []).forEach((valueRange, index) => {
    result[SHEET_NAMES[index]] = rowsToObjects(valueRange.values || []);
  });
  return result;
}

async function fetchFreshDashboardData() {
  const data = await fetchAllSheets();
  return buildDashboardPayload(
    data.service_quote || [],
    data.defect_quote || [],
    data.lead || []
  );
}

async function getDashboardData({ forceRefresh = false } = {}) {
  const now = Date.now();
  const cacheValid = cachedPayload && now - cacheTimestamp < CACHE_TTL_MS;

  if (!forceRefresh && cacheValid) {
    return {
      ...cachedPayload,
      cached: true,
      cacheAgeSeconds: Math.round((now - cacheTimestamp) / 1000),
    };
  }

  try {
    const payload = await fetchFreshDashboardData();
    cachedPayload = payload;
    cacheTimestamp = now;
    return { ...payload, cached: false };
  } catch (error) {
    if (cachedPayload) {
      return {
        ...cachedPayload,
        stale: true,
        staleMessage: error.message,
        cached: true,
        cacheAgeSeconds: Math.round((now - cacheTimestamp) / 1000),
      };
    }
    throw error;
  }
}

module.exports = {
  fetchAllSheets,
  fetchSheetData,
  getDashboardData,
};
