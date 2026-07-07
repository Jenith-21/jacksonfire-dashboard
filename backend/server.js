const app = require("./app");

const PORT = process.env.PORT || 3001;

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const server = app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Run: npm run dev`);
    process.exit(1);
  }
  throw err;
});
