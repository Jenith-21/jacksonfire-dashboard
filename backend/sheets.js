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

function parseServiceAccountJson(raw) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Vercel env vars sometimes store JSON with escaped newlines as literal \\n
    return JSON.parse(trimmed.replace(/\\n/g, "\n"));
  }
}

function getGoogleAuth() {
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (rawCredentials) {
    const credentials = parseServiceAccountJson(rawCredentials);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  }

  if (process.env.VERCEL) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set in Vercel. Add the full service account JSON in Project Settings → Environment Variables."
    );
  }

  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function formatSheetsError(error) {
  const message = error?.message || "Unknown Google Sheets error";

  if (/Requested entity was not found/i.test(message)) {
    return [
      "Google Sheet not found or not shared with the service account.",
      `Spreadsheet ID: ${SPREADSHEET_ID}`,
      "Share the sheet with: googlesheets@pod-digital-reporting.iam.gserviceaccount.com",
      "Then confirm SPREADSHEET_ID in Vercel matches the sheet URL.",
    ].join(" ");
  }

  if (/Unable to parse/i.test(message) || /Unexpected token/i.test(message)) {
    return "GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON. Paste the full service account file contents into Vercel env vars.";
  }

  return message;
}

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
    throw new Error(formatSheetsError(error));
  }
}

module.exports = {
  fetchAllSheets,
  fetchSheetData,
  getDashboardData,
};
