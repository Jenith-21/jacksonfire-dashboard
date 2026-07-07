const { execSync } = require("child_process");

const PORTS = [3001, 5173, 5174, 5175, 5176];

for (const port of PORTS) {
  try {
    const output = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    if (!output) continue;
    for (const pid of output.split("\n")) {
      if (!pid) continue;
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // process already gone
      }
    }
  } catch {
    // nothing listening on this port
  }
}
