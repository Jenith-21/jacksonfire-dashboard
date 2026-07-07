const express = require("express");
const cors = require("cors");
const { getDashboardData, fetchAllSheets } = require("./sheets");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "1";
    const data = await getDashboardData({ forceRefresh });
    res.json(data);
  } catch (error) {
    console.error("Dashboard error:", error.message);
    res.status(500).json({
      error: "Failed to fetch dashboard data",
      message: error.message,
    });
  }
});

app.get("/api/sheets", async (_req, res) => {
  try {
    const data = await fetchAllSheets();
    res.json(data);
  } catch (error) {
    console.error("Sheets error:", error.message);
    res.status(500).json({
      error: "Failed to fetch sheets",
      message: error.message,
    });
  }
});

module.exports = app;
