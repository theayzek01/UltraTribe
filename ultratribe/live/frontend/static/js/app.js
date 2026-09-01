/**
 * Clinical Neuro-Workstation Client Logic (fMRI BOLD Telemetry)
 */
let brainViewer = null;
let socket = null;
const waveHistory = {
  v1: [],
  a1: [],
  wernicke: [],
  social: [],
  amygdala: [],
};
const MAX_HISTORY = 70;

document.addEventListener("DOMContentLoaded", () => {
  brainViewer = new Brain3DViewer("brain-canvas-container");
  initWebSocket();
  setupEventListeners();
  initWaveformCanvas();
});

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/cortex`;

  socket = new WebSocket(wsUrl);

  const statusDot = document.getElementById("ws-status-dot");
  const statusText = document.getElementById("ws-status-text");

  socket.onopen = () => {
    statusDot.classList.add("active");
    statusText.textContent = "Bağlantı Aktif (10 Hz)";
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "cortex_frame") {
        updateClinicalUI(data);
      }
    } catch (err) {
      console.error("Frame parse error:", err);
    }
  };

  socket.onclose = () => {
    statusDot.classList.remove("active");
    statusText.textContent = "Bağlantı Kesildi (Yeniden bağlanıyor...)";
    setTimeout(initWebSocket, 2000);
  };
}

function updateClinicalUI(frameData) {
  const { activations, explanations, sensory, chat, timestamp } = frameData;

  // 1. Update 3D Parcellated Transparent Brain Mesh
  if (brainViewer) {
    brainViewer.updateActivations(activations);
  }

  // 2. Update Sensory Meters
  document.getElementById("val-motion").textContent = `${sensory.motion_level}%`;
  document.getElementById("bar-motion").style.width = `${sensory.motion_level}%`;

  document.getElementById("val-faces").textContent = `${sensory.face_count}`;
  document.getElementById("bar-faces").style.width = `${Math.min(sensory.face_count * 50, 100)}%`;

  document.getElementById("val-scene").textContent = `${sensory.scene_complexity}%`;
  document.getElementById("bar-scene").style.width = `${sensory.scene_complexity}%`;

  document.getElementById("val-audio").textContent = `${sensory.audio_loudness} dB`;
  document.getElementById("bar-audio").style.width = `${sensory.audio_loudness}%`;

  document.getElementById("val-speech").textContent = `${sensory.speech_intensity}%`;
  document.getElementById("bar-speech").style.width = `${sensory.speech_intensity}%`;

  document.getElementById("stream-timestamp").textContent = `${timestamp.toFixed(1)}s`;

  // 3. Update Real-Time Chat Telemetry
  if (chat) {
    updateChatLog(chat);
  }

  // 4. Update Multi-Channel BOLD Oscilloscope
  updateWaveform(activations);

  // 5. Update Clinical Regional Findings
  renderFindings(explanations);
}

function updateChatLog(chat) {
  const feed = document.getElementById("chat-feed");
  const hypeLbl = document.getElementById("chat-hype-label");
  const moodLbl = document.getElementById("chat-dominant-mood");
  const posLbl = document.getElementById("chat-pos-val");

  if (hypeLbl) hypeLbl.textContent = `Hız: ${chat.velocity_per_min || 0} msg/dk`;
  if (moodLbl) moodLbl.textContent = chat.sentiment.dominant_emotion;
  if (posLbl) posLbl.textContent = `${chat.sentiment.positivity}%`;

  if (feed) {
    if (chat.messages && chat.messages.length > 0) {
      feed.innerHTML = chat.messages
        .map(
          (m) => `
          <div class="chat-log-line">
            <span class="chat-user">[${escapeHtml(m.time)}] ${escapeHtml(m.author)}:</span>
            <span>${escapeHtml(m.message)}</span>
          </div>`
        )
        .join("");
      feed.scrollTop = feed.scrollHeight;
    } else {
      feed.innerHTML = `<div class="chat-log-line" style="color: var(--med-text-muted);">Canlı YouTube mesajları bekleniyor...</div>`;
    }
  }
}

function updateWaveform(act) {
  waveHistory.v1.push(act["V1_V2"] || 20);
  waveHistory.a1.push(act["A1_STG"] || 20);
  waveHistory.wernicke.push(act["Wernicke"] || 20);
  waveHistory.social.push(act["TPJ_Social"] || 20);
  waveHistory.amygdala.push(act["Amygdala"] || 20);

  if (waveHistory.v1.length > MAX_HISTORY) {
    waveHistory.v1.shift();
    waveHistory.a1.shift();
    waveHistory.wernicke.shift();
    waveHistory.social.shift();
    waveHistory.amygdala.shift();
  }

  drawClinicalWaveform();
}

function initWaveformCanvas() {
  const canvas = document.getElementById("fmri-wave-canvas");
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth - 24;
  canvas.height = 80;
}

function drawClinicalWaveform() {
  const canvas = document.getElementById("fmri-wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Medical oscilloscope grid
  ctx.strokeStyle = "rgba(30, 41, 59, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 0; y <= h; y += 20) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  for (let x = 0; x <= w; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  ctx.stroke();

  const channels = [
    { data: waveHistory.v1, color: "#0ea5e9", label: "Ch1:V1" },
    { data: waveHistory.a1, color: "#14b8a6", label: "Ch2:A1" },
    { data: waveHistory.wernicke, color: "#8b5cf6", label: "Ch3:BA22" },
    { data: waveHistory.social, color: "#ec4899", label: "Ch4:TPJ" },
    { data: waveHistory.amygdala, color: "#f43f5e", label: "Ch5:Limbik" },
  ];

  channels.forEach((ch) => {
    if (ch.data.length < 2) return;
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    const step = w / (MAX_HISTORY - 1);
    for (let i = 0; i < ch.data.length; i++) {
      const x = i * step;
      const y = h - (ch.data[i] / 100.0) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

function renderFindings(explanations) {
  const container = document.getElementById("explanation-list");
  if (!container) return;

  container.innerHTML = explanations
    .map((item) => {
      const isHigh = item.score > 60;
      const isMid = item.score > 35 && item.score <= 60;
      const cardClass = isHigh ? "high-act" : "";
      const badgeClass = isHigh ? "high" : (isMid ? "mid" : "");

      return `
        <div class="clinical-roi-card ${cardClass}">
          <div class="roi-card-header">
            <span class="roi-title">${item.name}</span>
            <span class="roi-badge ${badgeClass}">${item.score}% BOLD</span>
          </div>
          <p class="roi-finding-text">${item.reason}</p>
          <div class="roi-meta-footer">
            <span>Anatomik Kategori: ${item.category}</span>
            <span>Uyarılma Düzeyi: ${item.status}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function setupEventListeners() {
  const urlInput = document.getElementById("stream-url-input");
  const startBtn = document.getElementById("btn-start-stream");

  startBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (url) startClinicalSession(url);
  });

  const presets = {
    news: "https://www.youtube.com/watch?v=sample_news",
    science: "https://www.youtube.com/watch?v=sample_science",
    music: "https://www.youtube.com/watch?v=sample_music",
    gaming: "https://www.youtube.com/watch?v=sample_gaming",
  };

  document.querySelectorAll(".btn-preset-med").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-preset");
      const url = presets[type];
      urlInput.value = url;
      startClinicalSession(url);
    });
  });

  // Anatomical Planes
  const planeButtons = [
    { id: "btn-view-3d", plane: "3d" },
    { id: "btn-view-axial", plane: "axial" },
    { id: "btn-view-coronal", plane: "coronal" },
    { id: "btn-view-sagittal-l", plane: "sagittal_l" },
    { id: "btn-view-sagittal-r", plane: "sagittal_r" },
  ];

  planeButtons.forEach(({ id, plane }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        planeButtons.forEach((b) => document.getElementById(b.id)?.classList.remove("active"));
        btn.classList.add("active");
        brainViewer.setPlaneView(plane);
      });
    }
  });

  const rotateBtn = document.getElementById("btn-toggle-rotate");
  if (rotateBtn) {
    rotateBtn.addEventListener("click", () => {
      const isRot = brainViewer.toggleAutoRotate();
      rotateBtn.classList.toggle("active", isRot);
    });
  }

  // Parcellated Exploded Lobes Toggle
  const explodeBtn = document.getElementById("btn-toggle-explode");
  if (explodeBtn) {
    explodeBtn.addEventListener("click", () => {
      const isExploded = brainViewer.toggleExplodeView();
      explodeBtn.classList.toggle("active", isExploded);
    });
  }

  window.addEventListener("resize", () => initWaveformCanvas());
}

function startClinicalSession(url) {
  fetch("/api/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Clinical telemetry session started:", data);
      embedYouTubeVideo(url);
    })
    .catch((err) => console.error("Start session error:", err));
}

function embedYouTubeVideo(url) {
  const container = document.getElementById("video-embed-container");
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);

  if (match && match[1]) {
    const videoId = match[1];
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    container.innerHTML = `
      <div style="color: var(--med-text-muted); font-size: 11px; text-align: center; padding: 15px;">
        <span>Doğrudan Video/İşitsel fMRI Veri Akışı Bağlandı</span>
      </div>`;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
