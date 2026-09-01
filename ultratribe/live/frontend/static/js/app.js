/**
 * UltraTribe Live Stream Analyzer Frontend Application Logic
 */
let brainViewer = null;
let socket = null;
let currentSource = "Simülasyon";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize 3D Brain Viewer
  brainViewer = new Brain3DViewer("brain-canvas-container");

  // Connect WebSocket
  initWebSocket();

  // Setup UI event listeners
  setupEventListeners();
});

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/cortex`;

  socket = new WebSocket(wsUrl);

  const statusDot = document.getElementById("ws-status-dot");
  const statusText = document.getElementById("ws-status-text");

  socket.onopen = () => {
    statusDot.classList.add("active");
    statusText.textContent = "Canlı Akış Bağlı";
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
    statusText.textContent = "Bağlantı Kesildi (Yeniden deneniyor...)";
    setTimeout(initWebSocket, 2000);
  };
}

function updateUI(frameData) {
  const { activations, explanations, sensory, timestamp } = frameData;

  // 1. Update 3D Brain Heatmap
  if (brainViewer) {
    brainViewer.updateActivations(activations);
  }

  // 2. Update Sensory Meters
  document.getElementById("val-motion").textContent = `${sensory.motion_level}%`;
  document.getElementById("bar-motion").style.width = `${sensory.motion_level}%`;

  document.getElementById("val-faces").textContent = `${sensory.face_count} Yüz`;
  document.getElementById("bar-faces").style.width = `${Math.min(sensory.face_count * 50, 100)}%`;

  document.getElementById("val-scene").textContent = `${sensory.scene_complexity}%`;
  document.getElementById("bar-scene").style.width = `${sensory.scene_complexity}%`;

  document.getElementById("val-audio").textContent = `${sensory.audio_loudness} dB`;
  document.getElementById("bar-audio").style.width = `${sensory.audio_loudness}%`;

  document.getElementById("val-speech").textContent = `${sensory.speech_intensity}%`;
  document.getElementById("bar-speech").style.width = `${sensory.speech_intensity}%`;

  document.getElementById("stream-timestamp").textContent = `${timestamp.toFixed(1)}s`;

  // 3. Update Cognitive Explanations List ("Neden Çalışıyor?")
  renderExplanations(explanations);
}

function renderExplanations(explanations) {
  const container = document.getElementById("explanation-list");
  if (!container) return;

  container.innerHTML = explanations
    .map((item) => {
      const isHigh = item.score > 60;
      const isMed = item.score > 35 && item.score <= 60;
      const cardClass = isHigh ? "high-activation" : (isMed ? "medium-activation" : "");
      const badgeClass = isHigh ? "high" : (isMed ? "medium" : "");
      const barColor = isHigh ? "#ff5e57" : (isMed ? "#d4af37" : "#00d2d3");

      return `
        <div class="region-card ${cardClass}">
          <div class="region-header">
            <span class="region-name">${item.name}</span>
            <span class="region-score-badge ${badgeClass}">${item.score}% Uyarılma</span>
          </div>
          <div class="region-bar-bg">
            <div class="region-bar-fill" style="width: ${item.score}%; background: ${barColor};"></div>
          </div>
          <p class="region-reason">${item.reason}</p>
          <div class="region-meta">
            <span>Kategori: ${item.category}</span>
            <span>•</span>
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
    if (url) {
      startAnalysis(url);
    }
  });

  // Presets
  const presets = {
    news: "https://www.youtube.com/watch?v=sample_news",
    science: "https://www.youtube.com/watch?v=sample_science",
    music: "https://www.youtube.com/watch?v=sample_music",
    gaming: "https://www.youtube.com/watch?v=sample_gaming",
  };

  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-preset");
      const url = presets[type];
      urlInput.value = url;
      startAnalysis(url);
    });
  });

  // 3D Viewport Controls
  document.getElementById("btn-view-reset").addEventListener("click", () => brainViewer.setCameraView("reset"));
  document.getElementById("btn-view-left").addEventListener("click", () => brainViewer.setCameraView("left"));
  document.getElementById("btn-view-right").addEventListener("click", () => brainViewer.setCameraView("right"));
  document.getElementById("btn-view-top").addEventListener("click", () => brainViewer.setCameraView("top"));

  const rotateBtn = document.getElementById("btn-toggle-rotate");
  rotateBtn.addEventListener("click", () => {
    const isRotating = brainViewer.toggleAutoRotate();
    rotateBtn.classList.toggle("active", isRotating);
  });
}

function startAnalysis(url) {
  fetch("/api/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Analysis stream started:", data);
      embedYouTubeVideo(url);
    })
    .catch((err) => console.error("Start analysis error:", err));
}

function embedYouTubeVideo(url) {
  const container = document.getElementById("video-embed-container");
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);

  if (match && match[1]) {
    const videoId = match[1];
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    container.innerHTML = `
      <div style="color: var(--text-secondary); text-align:center; padding: 20px;">
        <p style="font-size: 13px; font-weight: 600; color: var(--accent-gold);">Yapay Zeka Nöral Simülasyon Akışı</p>
        <p style="font-size: 11px; margin-top: 6px;">Multimodal video/ses özellikleri canlı fMRI modeline besleniyor</p>
      </div>`;
  }
}
