const fs = require("fs");
const path = require("path");

const TEMP_DIR = path.join(__dirname, "../temp");
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function cleanupTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) return;

  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  let cleaned = 0;

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    } catch {
      // File already gone, skip
    }
  }

  if (cleaned > 0) {
    console.log(`[Cleanup] Removed ${cleaned} stale temp file(s)`);
  }
}

module.exports = { cleanupTempFiles };
