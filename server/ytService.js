const { execFile, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const TEMP_DIR = path.join(__dirname, "../temp");

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ── Helpers ─────────────────────────────────────────────

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile("yt-dlp", args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        // Extract clean error message from yt-dlp output
        const msg = stderr || err.message || "yt-dlp failed";
        const clean = msg.split("\n").find((l) => l.includes("ERROR")) || msg;
        return reject(new Error(clean.replace(/^.*ERROR:\s*/, "").trim()));
      }
      resolve(stdout.trim());
    });
  });
}

function formatDuration(seconds) {
  if (!seconds) return "Unknown";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function estimateSize(bitrate, durationSeconds, multiplier = 1) {
  // rough estimate: bitrate(kbps) * duration(s) / 8 = bytes
  if (!bitrate || !durationSeconds) return null;
  const bytes = (bitrate * 1000 * durationSeconds * multiplier) / 8;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── getVideoInfo ─────────────────────────────────────────

async function getVideoInfo(url) {
  const raw = await runYtDlp([
    "--dump-json",
    "--no-playlist",
    "--no-warnings",
    url,
  ]);

  const data = JSON.parse(raw);

  // Build quality options from available formats
  const targetHeights = [144, 240, 360, 480, 720, 1080];
  const seenHeights = new Set();
  const qualities = [];

  const videoFormats = (data.formats || [])
    .filter((f) => f.vcodec && f.vcodec !== "none" && f.height)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const f of videoFormats) {
    const h = f.height;
    if (targetHeights.includes(h) && !seenHeights.has(h)) {
      seenHeights.add(h);
      qualities.push({
        label: `${h}p`,
        height: h,
        formatId: f.format_id,
        estimatedSize: estimateSize(f.tbr || f.vbr, data.duration, 1.1),
      });
    }
  }

  // Sort ascending
  qualities.sort((a, b) => a.height - b.height);

  // MP3 estimate (audio-only, ~128kbps)
  const audioFormat = (data.formats || [])
    .filter((f) => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"))
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  const mp3EstimatedSize = estimateSize(128, data.duration);

  return {
    title: data.title,
    thumbnail: data.thumbnail,
    duration: formatDuration(data.duration),
    durationSeconds: data.duration,
    channel: data.uploader || data.channel,
    viewCount: data.view_count
      ? Number(data.view_count).toLocaleString()
      : null,
    qualities,
    mp3: {
      estimatedSize: mp3EstimatedSize,
    },
  };
}

// ── downloadMedia ─────────────────────────────────────────

async function downloadMedia(url, format = "mp4", quality = "720") {
  const id = uuidv4();

  // Sanitize quality input
  const height = parseInt(quality, 10) || 720;

  let outputPath, filename, mimeType, ytArgs;

  if (format === "mp3") {
    filename = `audio_${id}.mp3`;
    outputPath = path.join(TEMP_DIR, filename);
    mimeType = "audio/mpeg";
    ytArgs = [
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "--embed-thumbnail",          // album art
      "--embed-metadata",           // title, artist, album
      "--add-metadata",
      "--parse-metadata", "%(uploader)s:%(meta_artist)s",  // map uploader → artist tag
      "-o", outputPath,
      "--no-playlist",
      "--no-warnings",
      url,
    ];
  } else {
    filename = `video_${id}.mp4`;
    outputPath = path.join(TEMP_DIR, filename);
    mimeType = "video/mp4";
    ytArgs = [
      "-f", `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
      "--merge-output-format", "mp4",
      "--embed-thumbnail",          // thumbnail as cover art
      "--embed-metadata",           // title, uploader, etc.
      "--add-metadata",
      "-o", outputPath,
      "--no-playlist",
      "--no-warnings",
      url,
    ];
  }

  await runYtDlp(ytArgs);

  // Check file actually exists
  if (!fs.existsSync(outputPath)) {
    throw new Error("Downloaded file not found. Conversion may have failed.");
  }

  // Build a clean filename from the actual video title
    const info = await runYtDlp(["--print", "title", "--no-playlist", "--no-warnings", url]);
  const ext = format === "mp3" ? "mp3" : "mp4";
  const safeTitle = info
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "download";
  const namedFilename = `${safeTitle}.${ext}`;

  return { filePath: outputPath, filename: namedFilename, mimeType };
}

module.exports = { getVideoInfo, downloadMedia };