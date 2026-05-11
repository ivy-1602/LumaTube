const express = require("express");
const cors = require("cors");
const path = require("path");
const { getVideoInfo, downloadMedia } = require("./ytService");
const { cleanupTempFiles } = require("./tempManager");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Run cleanup every 10 minutes
setInterval(cleanupTempFiles, 10 * 60 * 1000);

// ── Routes ──────────────────────────────────────────────

// POST /api/info — fetch video metadata (no download)
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const info = await getVideoInfo(url.trim());
    res.json(info);
  } catch (err) {
    console.error("[/api/info]", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch video info" });
  }
});

// POST /api/download — stream file back to browser
app.post("/api/download", async (req, res) => {
  const { url, format, quality } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const { filePath, filename, mimeType } = await downloadMedia(url.trim(), format, quality);

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").trim() || "download";
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.setHeader("Content-Type", mimeType);

    const fs = require("fs");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on("end", () => {
      // Delete temp file after stream ends
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Could not delete temp file:", filePath);
      });
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).end();
    });
  } catch (err) {
    console.error("[/api/download]", err.message);
    res.status(500).json({ error: err.message || "Download failed" });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎬  YT Downloader running at http://localhost:${PORT}\n`);
});