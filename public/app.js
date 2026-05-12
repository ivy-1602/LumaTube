/* ── State ───────────────────────────────────────────── */
const state = {
  videoInfo: null,
  selectedFormat: "mp4",
  selectedQuality: null,
  history: [], // { title, channel, thumbnail, format, quality, time }
};

const $ = (id) => document.getElementById(id);

/* ── API Base URL ────────────────────────────────────── */
const API_BASE = "https://ruckus-straw-backwash.ngrok-free.dev";

/* ── DOM ─────────────────────────────────────────────── */
const urlInput       = $("urlInput");
const fetchBtn       = $("fetchBtn");
const loadingCard    = $("loadingCard");
const errorCard      = $("errorCard");
const infoCard       = $("infoCard");
const errorText      = $("errorText");
const retryBtn       = $("retryBtn");
const inputHint      = $("inputHint");
const ambientLayer   = $("ambientLayer");

const thumbnail      = $("thumbnail");
const videoTitle     = $("videoTitle");
const videoChannel   = $("videoChannel");
const videoViews     = $("videoViews");
const durationBadge  = $("durationBadge");
const qualityGrid    = $("qualityGrid");
const qualitySection = $("qualitySection");
const downloadBtn    = $("downloadBtn");
const downloadLabel  = $("downloadLabel");
const dlSize         = $("dlSize");
const progressWrap   = $("progressWrap");
const progressFill   = $("progressFill");

const downloadView   = $("downloadView");
const historyView    = $("historyView");
const historyList    = $("historyList");

const navDownload    = $("navDownload");
const navHistory     = $("navHistory");
const navOpenYT      = $("navOpenYT");

/* ── Nav ─────────────────────────────────────────────── */
navDownload.addEventListener("click", (e) => {
  e.preventDefault();
  showView("download");
});

navHistory.addEventListener("click", (e) => {
  e.preventDefault();
  showView("history");
  renderHistory();
});

navOpenYT.addEventListener("click", (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (url) {
    window.open(url, "_blank", "noopener");
  } else {
    urlInput.focus();
    inputHint.textContent = "⚠ Paste a YouTube URL first, then click Open in YouTube";
    inputHint.style.color = "var(--red)";
    showView("download");
    setTimeout(() => {
      inputHint.textContent = "Supports youtube.com and youtu.be links";
      inputHint.style.color = "";
    }, 3000);
  }
});

function showView(view) {
  if (view === "download") {
    downloadView.classList.remove("hidden");
    historyView.classList.add("hidden");
    navDownload.classList.add("active");
    navHistory.classList.remove("active");
  } else {
    downloadView.classList.add("hidden");
    historyView.classList.remove("hidden");
    navHistory.classList.add("active");
    navDownload.classList.remove("active");
  }
}

/* ── History render ──────────────────────────────────── */
function renderHistory() {
  if (state.history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style="margin-bottom:10px;opacity:0.3">
          <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 10v7M16 20v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No downloads yet this session.</p>
      </div>`;
    return;
  }

  historyList.innerHTML = state.history.map(item => `
    <div class="history-item">
      <img class="hi-thumb" src="${item.thumbnail}" alt="" onerror="this.style.opacity='0'" />
      <div class="hi-info">
        <p class="hi-title">${item.title}</p>
        <p class="hi-meta">${item.channel} · ${item.time}</p>
      </div>
      <span class="hi-badge ${item.format}">${item.format.toUpperCase()} ${item.quality ? item.quality + 'p' : ''}</span>
    </div>
  `).reverse().join(""); // newest first
}

function addToHistory(format, quality) {
  if (!state.videoInfo) return;
  const now = new Date();
  state.history.push({
    title:     state.videoInfo.title,
    channel:   state.videoInfo.channel,
    thumbnail: state.videoInfo.thumbnail,
    format,
    quality,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

/* ── Fetch stage cycling ─────────────────────────────── */
let stageTimer = null, stageIdx = 0;

function startStages() {
  stageIdx = 0; setStage(0);
  stageTimer = setInterval(() => {
    if (stageIdx < 3) { doneSt(stageIdx); stageIdx++; setStage(stageIdx); }
  }, 1000);
}
function stopStages() { clearInterval(stageTimer); }
function setStage(i) {
  for (let j = 0; j < 4; j++) {
    const el = $(`st${j}`); if (!el) continue;
    el.classList.remove("active","done");
    if (j < i) el.classList.add("done");
    if (j === i) el.classList.add("active");
  }
}
function doneSt(i) { const el=$(`st${i}`); if(el){el.classList.remove("active");el.classList.add("done");} }
function resetStages() { for(let i=0;i<4;i++){const el=$(`st${i}`);if(el)el.classList.remove("active","done");} }

/* ── Download stage cycling ──────────────────────────── */
let dlStTimer = null, dlStIdx = 0;

function startDlStages() {
  dlStIdx = 0; setDlStage(0);
  dlStTimer = setInterval(() => {
    if (dlStIdx < 3) { doneDlSt(dlStIdx); dlStIdx++; setDlStage(dlStIdx); }
  }, 1800);
}
function stopDlStages() { clearInterval(dlStTimer); }
function setDlStage(i) {
  for (let j = 0; j < 4; j++) {
    const el = $(`pc${j}`); if (!el) continue;
    el.classList.remove("active","done");
    if (j < i) el.classList.add("done");
    if (j === i) el.classList.add("active");
  }
}
function doneDlSt(i) { const el=$(`pc${i}`); if(el){el.classList.remove("active");el.classList.add("done");} }
function resetDlStages() { for(let i=0;i<4;i++){const el=$(`pc${i}`);if(el)el.classList.remove("active","done");} }

/* ── UI helpers ──────────────────────────────────────── */
function showOnly(...els) {
  [loadingCard, errorCard, infoCard].forEach(c => c.classList.add("hidden"));
  els.forEach(c => c && c.classList.remove("hidden"));
}

function setAmbient(imgUrl) {
  if (!imgUrl) return;
  ambientLayer.style.backgroundImage = `url(${imgUrl})`;
  requestAnimationFrame(() => ambientLayer.classList.add("show"));
}

/* ── Fetch ───────────────────────────────────────────── */
async function fetchVideoInfo(url) {
  showOnly(loadingCard);
  fetchBtn.disabled = true;
  resetStages(); startStages();

  try {
    const res = await fetch(`${API_BASE}/api/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ url }),
    });
    stopStages();
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch video info");
    state.videoInfo = data;
    renderInfo(data);
    showOnly(infoCard);
  } catch (err) {
    stopStages();
    errorText.textContent = err.message || "Could not fetch. Check the link.";
    showOnly(errorCard);
  } finally {
    fetchBtn.disabled = false;
  }
}

/* ── Render ──────────────────────────────────────────── */
function renderInfo(info) {
  thumbnail.src = info.thumbnail || "";
  videoTitle.textContent = info.title || "Unknown";
  videoChannel.textContent = info.channel || "";
  videoViews.textContent = info.viewCount ? `${info.viewCount} views` : "";
  durationBadge.textContent = info.duration || "0:00";
  setAmbient(info.thumbnail);

  qualityGrid.innerHTML = "";
  const qs = info.qualities || [];
  if (!qs.length) {
    qualityGrid.innerHTML = `<span style="font-size:0.75rem;color:var(--t3)">No formats available</span>`;
  }
  qs.forEach((q) => {
    const btn = document.createElement("button");
    btn.className = "q-chip";
    btn.dataset.height = q.height;
    btn.dataset.size = q.estimatedSize || "";
    btn.innerHTML = `<span class="qc-res">${q.label}</span>${q.estimatedSize ? `<span class="qc-sz">~${q.estimatedSize}</span>` : ""}`;
    btn.addEventListener("click", () => selectQuality(btn, q));
    qualityGrid.appendChild(btn);
  });

  if (qs.length) {
    const last = qualityGrid.querySelector(".q-chip:last-child");
    if (last) selectQuality(last, qs[qs.length - 1]);
  }

  selectFormat("mp4");
  resetDownload();
}

function selectQuality(btn, q) {
  qualityGrid.querySelectorAll(".q-chip").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  state.selectedQuality = q.height;
  updateSize();
}

function selectFormat(fmt) {
  state.selectedFormat = fmt;
  document.querySelectorAll(".chip[data-format]").forEach(c => {
    c.classList.toggle("active", c.dataset.format === fmt);
  });
  if (fmt === "mp3") {
    qualitySection.classList.add("hidden");
    const sz = state.videoInfo?.mp3?.estimatedSize;
    dlSize.textContent = sz ? `~${sz}` : "";
  } else {
    qualitySection.classList.remove("hidden");
    updateSize();
  }
}

function updateSize() {
  const sel = qualityGrid.querySelector(".q-chip.selected");
  dlSize.textContent = sel?.dataset.size ? `~${sel.dataset.size}` : "";
}

function resetDownload() {
  progressWrap.classList.add("hidden");
  progressFill.style.width = "0%";
  downloadBtn.disabled = false;
  downloadLabel.textContent = "Download";
  resetDlStages();
}

/* ── Download ────────────────────────────────────────── */
async function triggerDownload() {
  if (!state.videoInfo) return;
  const url = urlInput.value.trim();
  const format = state.selectedFormat;
  const quality = state.selectedQuality;

  downloadBtn.disabled = true;
  downloadLabel.textContent = "Preparing…";
  progressWrap.classList.remove("hidden");
  progressFill.style.width = "0%";
  progressFill.style.background = "var(--red)";
  resetDlStages(); startDlStages();

  let fake = 0;
  const progInt = setInterval(() => {
    if (fake < 80) { fake += Math.random() * 5 + 2; progressFill.style.width = `${Math.min(fake,80)}%`; }
  }, 500);

  try {
    const res = await fetch(`${API_BASE}/api/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ url, format, quality }),
    });
    clearInterval(progInt); stopDlStages();
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Download failed"); }

    progressFill.style.width = "95%";
    for (let i = 0; i < 4; i++) doneDlSt(i);

    const blob = await res.blob();
    const oUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const cd = res.headers.get("Content-Disposition") || "";
    const nm = cd.match(/filename="([^"]+)"/);
    a.download = nm ? nm[1] : `download.${format}`;
    a.href = oUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(oUrl);

    // Save to history
    addToHistory(format, quality);

    progressFill.style.width = "100%";
    downloadLabel.textContent = "Download";
    downloadBtn.disabled = false;
    setTimeout(() => progressWrap.classList.add("hidden"), 3000);
  } catch (err) {
    clearInterval(progInt); stopDlStages();
    progressFill.style.width = "0%";
    downloadLabel.textContent = "Download";
    downloadBtn.disabled = false;
    errorText.textContent = err.message;
    showOnly(errorCard, infoCard);
    setTimeout(() => progressWrap.classList.add("hidden"), 4000);
  }
}

/* ── Events ──────────────────────────────────────────── */
fetchBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!url) {
    urlInput.focus();
    inputHint.textContent = "⚠ Paste a YouTube URL first";
    inputHint.style.color = "var(--red)";
    setTimeout(() => { inputHint.textContent = "Supports youtube.com and youtu.be links"; inputHint.style.color = ""; }, 2500);
    return;
  }
  fetchVideoInfo(url);
});

urlInput.addEventListener("keydown", e => { if (e.key === "Enter") fetchBtn.click(); });
urlInput.addEventListener("input", () => { inputHint.textContent = "Supports youtube.com and youtu.be links"; inputHint.style.color = ""; });

retryBtn.addEventListener("click", () => {
  ambientLayer.classList.remove("show");
  showOnly();
  urlInput.focus();
});

downloadBtn.addEventListener("click", triggerDownload);

document.querySelectorAll(".chip[data-format]").forEach(c => {
  c.addEventListener("click", () => selectFormat(c.dataset.format));
});

urlInput.focus();