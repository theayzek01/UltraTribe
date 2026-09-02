/**
 * UltraTribe Anti-AI Minimalist Workstation Client (Manrope / OLED True Dark)
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
const MAX_HISTORY = 65;

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
    statusText.textContent = "Bağlantı Aktif";
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "cortex_frame") {
        updateUI(data);
      }
    } catch (err) {
      console.error("Frame parse error:", err);
    }
  };

  socket.onclose = () => {
    statusDot.classList.remove("active");
    statusText.textContent = "Bağlantı Kesildi";
    setTimeout(initWebSocket, 2000);
  };
}

function updateUI(frameData) {
  const { activations, explanations, sensory, chat, timestamp } = frameData;

  // 1. Update 3D Brain Mesh
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

  // 3. Update Real YouTube Chat Feed
  if (chat) {
    updateChatUI(chat);
  }

  // 4. Update Oscilloscope
  updateWaveform(activations);

  // 5. Update ROI Explanations
  renderExplanations(explanations);
}

function updateChatUI(chat) {
  const feed = document.getElementById("chat-feed");
  const hypeLbl = document.getElementById("chat-hype-label");
  const moodLbl = document.getElementById("chat-dominant-mood");
  const posLbl = document.getElementById("chat-pos-val");

  if (hypeLbl) hypeLbl.textContent = `${chat.velocity_per_min || 0} msg/dk`;
  if (moodLbl) moodLbl.textContent = chat.sentiment.dominant_emotion;
  if (posLbl) posLbl.textContent = `${chat.sentiment.positivity}%`;

  if (feed) {
    if (chat.messages && chat.messages.length > 0) {
      feed.innerHTML = chat.messages
        .map(
          (m) => `
          <div class="chat-entry">
            <span class="chat-author">${escapeHtml(m.author)}:</span>
            <span>${escapeHtml(m.message)}</span>
          </div>`
        )
        .join("");
      feed.scrollTop = feed.scrollHeight;
    } else {
      feed.innerHTML = `<div class="chat-entry" style="color: var(--text-tertiary);">Canlı YouTube mesajları bekleniyor...</div>`;
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

  drawWaveform();
}

function initWaveformCanvas() {
  const canvas = document.getElementById("fmri-wave-canvas");
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth - 32;
  canvas.height = 65;
}

function drawWaveform() {
  const canvas = document.getElementById("fmri-wave-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  const channels = [
    { data: waveHistory.v1, color: "#C5A880" },
    { data: waveHistory.a1, color: "#D4AF37" },
    { data: waveHistory.wernicke, color: "#a29bfe" },
    { data: waveHistory.social, color: "#E0564C" },
    { data: waveHistory.amygdala, color: "#ff7675" },
  ];

  channels.forEach((ch) => {
    if (ch.data.length < 2) return;
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    const step = w / (MAX_HISTORY - 1);
    for (let i = 0; i < ch.data.length; i++) {
      const x = i * step;
      const y = h - (ch.data[i] / 100.0) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

function renderExplanations(explanations) {
  const container = document.getElementById("explanation-list");
  if (!container) return;

  container.innerHTML = explanations
    .map((item) => {
      const isHigh = item.score > 60;
      const isMid = item.score > 35 && item.score <= 60;
      const cardClass = isHigh ? "active-high" : (isMid ? "active-mid" : "");
      const badgeClass = isHigh ? "high" : (isMid ? "mid" : "");

      return `
        <div class="roi-card ${cardClass}">
          <div class="roi-card-top">
            <span class="roi-name">${item.name}</span>
            <span class="roi-badge ${badgeClass}">${item.score}% BOLD</span>
          </div>
          <p class="roi-text">${item.reason}</p>
          <div class="roi-footer">
            <span>Kategori: ${item.category}</span>
            <span>Aktivasyon: ${item.status}</span>
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
    if (url) startStream(url);
  });

  const presets = {
    news: "https://www.youtube.com/watch?v=sample_news",
    science: "https://www.youtube.com/watch?v=sample_science",
    music: "https://www.youtube.com/watch?v=sample_music",
    gaming: "https://www.youtube.com/watch?v=sample_gaming",
  };

  document.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-preset");
      const url = presets[type];
      urlInput.value = url;
      startStream(url);
    });
  });

  // Camera Views
  const views = [
    { id: "btn-view-reset", view: "reset" },
    { id: "btn-view-left", view: "left" },
    { id: "btn-view-right", view: "right" },
    { id: "btn-view-top", view: "top" },
  ];

  views.forEach(({ id, view }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        views.forEach((v) => document.getElementById(v.id)?.classList.remove("active"));
        btn.classList.add("active");
        brainViewer.setCameraView(view);
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

  window.addEventListener("resize", () => initWaveformCanvas());
}

function startStream(url) {
  fetch("/api/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Stream started:", data);
      embedYouTubeVideo(url);
    })
    .catch((err) => console.error("Start stream error:", err));
}

function embedYouTubeVideo(url) {
  const container = document.getElementById("video-embed-container");
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);

  if (match && match[1]) {
    const videoId = match[1];
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    container.innerHTML = `
      <div style="color: var(--text-tertiary); font-size: 12px; font-weight: 600; text-align: center; padding: 20px;">
        <span>Doğrudan Video/Ses Akışı Bağlandı</span>
      </div>`;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
