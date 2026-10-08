/**
 * PulseWave Studio - Web Audio API Synthesis, 16-Step Sequencer & Visualizer Engine.
 */

// -------------------------------------------------------------
// Global Audio Engine State
// -------------------------------------------------------------
let audioCtx = null;
let masterGain = null;
let analyser = null;
let delayNode = null;
let delayFeedback = null;
let distortionNode = null;
let isPlaying = false;
let currentStep = 0;
let timerId = null;
let bpm = 120;
let baseOctave = 4;
let activeWaveform = "sawtooth";
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];

// Track Configurations
const TRACKS = ["kick", "snare", "hihat", "openhat", "bass", "lead"];
const TRACK_NAMES = {
  kick: "🥁 808 Kick",
  snare: "🥁 Snare",
  hihat: "🔔 Closed Hat",
  openhat: "🔔 Open Hat",
  bass: "🔊 Acid Bass",
  lead: "🎹 Cyber Lead",
};

// Track Mute/Solo/Volume State
const trackState = {
  kick: { muted: false, soloed: false, vol: 0.9 },
  snare: { muted: false, soloed: false, vol: 0.8 },
  hihat: { muted: false, soloed: false, vol: 0.6 },
  openhat: { muted: false, soloed: false, vol: 0.6 },
  bass: { muted: false, soloed: false, vol: 0.85 },
  lead: { muted: false, soloed: false, vol: 0.8 },
};

// Sequencer Grid Data (6 tracks x 16 steps)
let grid = {
  kick:    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  snare:   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  hihat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  openhat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  bass:    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  lead:    [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
};

// Notes for melodic tracks (16 steps)
const bassNotes = ["A1", "A1", "A1", "A1", "F1", "F1", "F1", "F1", "G1", "G1", "G1", "G1", "E1", "E1", "E1", "E1"];
const leadNotes = ["A4", "C5", "E5", "G5", "F4", "A4", "C5", "E5", "G4", "B4", "D5", "F5", "E4", "G4", "B4", "D5"];

// Note frequencies map
const NOTE_FREQS = {
  "C1": 32.70, "C#1": 34.65, "D1": 36.71, "D#1": 38.89, "E1": 41.20, "F1": 43.65, "F#1": 46.25, "G1": 49.00, "G#1": 51.91, "A1": 55.00, "A#1": 58.27, "B1": 61.74,
  "C2": 65.41, "C#2": 69.30, "D2": 73.42, "D#2": 77.78, "E2": 82.41, "F2": 87.31, "F#2": 92.50, "G2": 98.00, "G#2": 103.83, "A2": 110.00, "A#2": 116.54, "B2": 123.47,
  "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56, "E3": 164.81, "F3": 174.61, "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00, "A#3": 233.08, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
  "C6": 1046.50
};

// -------------------------------------------------------------
// Audio Context Initialization
// -------------------------------------------------------------
function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  // Master Gain & Analyser
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.8, audioCtx.currentTime);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  // Delay & Echo Rack
  delayNode = audioCtx.createDelay();
  delayNode.delayTime.setValueAtTime(0.25, audioCtx.currentTime);
  delayFeedback = audioCtx.createGain();
  delayFeedback.gain.setValueAtTime(0.3, audioCtx.currentTime);

  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);

  // Distortion / Drive Shaper
  distortionNode = audioCtx.createWaveShaper();
  distortionNode.curve = makeDistortionCurve(10);
  distortionNode.oversample = "4x";

  // Connect Master Chain
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function makeDistortionCurve(amount) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// -------------------------------------------------------------
// Synthesizer Sound Design
// -------------------------------------------------------------
function playKick(time) {
  if (!shouldPlayTrack("kick")) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  // Pitch drop 150Hz down to 40Hz
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

  const vol = trackState.kick.vol;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(time);
  osc.stop(time + 0.35);
}

function playSnare(time) {
  if (!shouldPlayTrack("snare")) return;
  // Noise wire component
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 1000;

  const noiseGain = audioCtx.createGain();
  const vol = trackState.snare.vol;
  noiseGain.gain.setValueAtTime(vol * 0.8, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  // Tonal body component
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);

  oscGain.gain.setValueAtTime(vol * 0.6, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  osc.connect(oscGain);
  oscGain.connect(masterGain);

  noise.start(time);
  osc.start(time);
  noise.stop(time + 0.2);
  osc.stop(time + 0.15);
}

function playHiHat(openHat = false, time = null) {
  const track = openHat ? "openhat" : "hihat";
  if (!shouldPlayTrack(track)) return;
  const t = time || audioCtx.currentTime;

  const bufferSize = audioCtx.sampleRate * (openHat ? 0.3 : 0.05);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7500;

  const gain = audioCtx.createGain();
  const vol = trackState[track].vol * 0.5;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (openHat ? 0.28 : 0.05));

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  noise.start(t);
  noise.stop(t + (openHat ? 0.28 : 0.05));
}

function playSynthTone(freq, duration = 0.3, isBass = false, time = null) {
  const track = isBass ? "bass" : "lead";
  if (!shouldPlayTrack(track)) return;
  const t = time || audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  const wave = isBass ? "sawtooth" : activeWaveform;
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);

  // Filter setup
  const cutoffSlider = document.getElementById("cutoffSlider");
  const resonanceSlider = document.getElementById("resSlider");
  const baseCutoff = cutoffSlider ? parseFloat(cutoffSlider.value) : 2500;
  const resonance = resonanceSlider ? parseFloat(resonanceSlider.value) : 3;

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(isBass ? Math.min(baseCutoff, 1200) : baseCutoff, t);
  filter.Q.setValueAtTime(resonance, t);

  // ADSR settings
  const a = parseFloat(document.getElementById("attackSlider")?.value || 0.01);
  const d = parseFloat(document.getElementById("decaySlider")?.value || 0.08);
  const s = parseFloat(document.getElementById("sustainSlider")?.value || 0.6);
  const r = parseFloat(document.getElementById("releaseSlider")?.value || 0.15);

  const vol = trackState[track].vol * (isBass ? 0.65 : 0.5);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + a);
  gain.gain.exponentialRampToValueAtTime(vol * s, t + a + d);
  gain.gain.setValueAtTime(vol * s, t + duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + r);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  // Delay send for lead
  if (!isBass) {
    const delaySend = audioCtx.createGain();
    const delayAmt = parseFloat(document.getElementById("delaySlider")?.value || 0.3);
    delaySend.gain.setValueAtTime(delayAmt, t);
    gain.connect(delaySend);
    delaySend.connect(delayNode);
    delayNode.connect(masterGain);
  }

  osc.start(t);
  osc.stop(t + duration + r + 0.05);
}

function shouldPlayTrack(trackName) {
  const isAnySolo = Object.values(trackState).some((s) => s.soloed);
  if (isAnySolo) {
    return trackState[trackName].soloed;
  }
  return !trackState[trackName].muted;
}

// -------------------------------------------------------------
// Step Sequencer Clock
// -------------------------------------------------------------
function step() {
  if (!isPlaying) return;
  const t = audioCtx.currentTime;

  // Trigger active instruments for current step
  if (grid.kick[currentStep]) playKick(t);
  if (grid.snare[currentStep]) playSnare(t);
  if (grid.hihat[currentStep]) playHiHat(false, t);
  if (grid.openhat[currentStep]) playHiHat(true, t);

  if (grid.bass[currentStep]) {
    const note = bassNotes[currentStep % bassNotes.length];
    const freq = NOTE_FREQS[note] || 55.0;
    playSynthTone(freq, 0.18, true, t);
  }

  if (grid.lead[currentStep]) {
    const note = leadNotes[currentStep % leadNotes.length];
    const freq = NOTE_FREQS[note] || 440.0;
    playSynthTone(freq, 0.22, false, t);
  }

  // Update UI LED indicators
  updateStepUI(currentStep);

  currentStep = (currentStep + 1) % 16;
}

function startSequencer() {
  initAudio();
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  isPlaying = true;
  document.getElementById("btnPlay").classList.add("playing");
  document.getElementById("btnPlay").innerHTML = "⏸ Pause";

  const stepTimeMs = (60000 / bpm) / 4;
  timerId = setInterval(step, stepTimeMs);
}

function stopSequencer() {
  isPlaying = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  currentStep = 0;
  document.getElementById("btnPlay").classList.remove("playing");
  document.getElementById("btnPlay").innerHTML = "▶ Play";
  updateStepUI(-1);
}

function togglePlay() {
  if (isPlaying) {
    isPlaying = false;
    if (timerId) clearInterval(timerId);
    document.getElementById("btnPlay").classList.remove("playing");
    document.getElementById("btnPlay").innerHTML = "▶ Resume";
  } else {
    startSequencer();
  }
}

function updateStepUI(stepIndex) {
  // Step indicator bar
  const indicators = document.querySelectorAll(".step-indicator");
  indicators.forEach((el, idx) => {
    el.classList.toggle("active", idx === stepIndex);
  });

  // Track buttons highlight
  document.querySelectorAll(".step-btn").forEach((btn) => {
    const col = parseInt(btn.dataset.col);
    btn.classList.toggle("current-step", col === stepIndex);
  });
}

// -------------------------------------------------------------
// Interactive Piano Roll Keyboard
// -------------------------------------------------------------
const KEY_NOTE_MAP = {
  KeyA: "C4", KeyW: "C#4", KeyS: "D4", KeyE: "D#4", KeyD: "E4",
  KeyF: "F4", KeyT: "F#4", KeyG: "G4", KeyY: "G#4", KeyH: "A4",
  KeyU: "A#4", KeyJ: "B4", KeyK: "C5", KeyO: "C#5", KeyL: "D5"
};

function triggerNote(noteName) {
  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const freq = NOTE_FREQS[noteName];
  if (freq) {
    playSynthTone(freq, 0.4, false);
    highlightPianoKey(noteName);
  }
}

function highlightPianoKey(noteName) {
  const keyEl = document.querySelector(`.piano-key[data-note="${noteName}"]`);
  if (keyEl) {
    keyEl.classList.add("pressed");
    setTimeout(() => keyEl.classList.remove("pressed"), 200);
  }
}

// Keyboard Listeners
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.target.tagName === "INPUT") return;
  const note = KEY_NOTE_MAP[e.code];
  if (note) {
    triggerNote(note);
  } else if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
});

// -------------------------------------------------------------
// Real-Time Canvas Visualizer
// -------------------------------------------------------------
let visMode = "spectrum";

function initVisualizer() {
  const canvas = document.getElementById("visCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    requestAnimationFrame(draw);
    ctx.fillStyle = "#06070a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!analyser) return;

    if (visMode === "spectrum") {
      drawSpectrum(ctx, canvas.width, canvas.height);
    } else if (visMode === "waveform") {
      drawWaveform(ctx, canvas.width, canvas.height);
    } else if (visMode === "portal") {
      drawPortal(ctx, canvas.width, canvas.height);
    }
  }
  draw();
}

function drawSpectrum(ctx, w, h) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const barWidth = (w / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * h * 0.9;
    const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
    gradient.addColorStop(0, "#00c6ff");
    gradient.addColorStop(0.5, "#9d4edd");
    gradient.addColorStop(1, "#ff007f");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
    x += barWidth;
  }
}

function drawWaveform(ctx, w, h) {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#00f2fe";
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#00f2fe";
  ctx.beginPath();

  const sliceWidth = w / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * h) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPortal(ctx, w, h) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const cx = w / 2;
  const cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.25;

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ff007f";
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ff007f";
  ctx.beginPath();

  for (let i = 0; i < bufferLength; i++) {
    const angle = (i / bufferLength) * Math.PI * 2;
    const amp = (dataArray[i] / 255) * 50;
    const r = baseRadius + amp;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// -------------------------------------------------------------
// Presets Bank
// -------------------------------------------------------------
const PRESETS = {
  synthwave: {
    bpm: 124,
    grid: {
      kick:    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare:   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      openhat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      bass:    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      lead:    [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    }
  },
  cyberpunk: {
    bpm: 135,
    grid: {
      kick:    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare:   [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      openhat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      bass:    [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
      lead:    [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1],
    }
  },
  lofi: {
    bpm: 84,
    grid: {
      kick:    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare:   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat:   [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
      openhat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      bass:    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      lead:    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    }
  },
  chiptune: {
    bpm: 140,
    grid: {
      kick:    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      hihat:   [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
      openhat: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      bass:    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      lead:    [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
    }
  }
};

function loadPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;
  bpm = p.bpm;
  document.getElementById("bpmSlider").value = bpm;
  document.getElementById("bpmValue").textContent = bpm;
  grid = JSON.parse(JSON.stringify(p.grid));
  renderSequencerGrid();

  document.querySelectorAll(".btn-preset").forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`.btn-preset[data-preset="${presetKey}"]`);
  if (btn) btn.classList.add("active");
}

function randomizePattern() {
  TRACKS.forEach((track) => {
    for (let i = 0; i < 16; i++) {
      if (track === "kick") {
        grid[track][i] = i % 4 === 0 ? 1 : Math.random() < 0.15 ? 1 : 0;
      } else if (track === "snare") {
        grid[track][i] = (i === 4 || i === 12) ? 1 : Math.random() < 0.1 ? 1 : 0;
      } else if (track === "hihat") {
        grid[track][i] = Math.random() < 0.65 ? 1 : 0;
      } else if (track === "openhat") {
        grid[track][i] = Math.random() < 0.2 ? 1 : 0;
      } else {
        grid[track][i] = Math.random() < 0.4 ? 1 : 0;
      }
    }
  });
  renderSequencerGrid();
}

// -------------------------------------------------------------
// Live WAV Audio Recording & Export
// -------------------------------------------------------------
function toggleRecording() {
  initAudio();
  const recBtn = document.getElementById("btnRecord");

  if (!isRecording) {
    const dest = audioCtx.createMediaStreamDestination();
    masterGain.connect(dest);

    mediaRecorder = new MediaRecorder(dest.stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pulsewave_recording_${Date.now()}.wav`;
      a.click();
    };

    mediaRecorder.start();
    isRecording = true;
    recBtn.classList.add("recording");
    recBtn.innerHTML = "⏹ Stop & Save";
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recBtn.classList.remove("recording");
    recBtn.innerHTML = "⏺ Record Audio";
  }
}

// -------------------------------------------------------------
// UI Builder & Event Listeners
// -------------------------------------------------------------
function renderSequencerGrid() {
  const container = document.getElementById("sequencerRows");
  container.innerHTML = "";

  TRACKS.forEach((track) => {
    const row = document.createElement("div");
    row.className = "sequencer-row";
    row.dataset.track = track;

    // Track controls header
    const info = document.createElement("div");
    info.className = "track-info";
    info.innerHTML = `
      <span class="track-name">${TRACK_NAMES[track]}</span>
      <div class="track-actions">
        <button class="btn-track-action btn-mute ${trackState[track].muted ? "muted" : ""}" data-track="${track}">M</button>
        <button class="btn-track-action btn-solo ${trackState[track].soloed ? "soloed" : ""}" data-track="${track}">S</button>
      </div>
    `;
    row.appendChild(info);

    // 16 Step buttons
    for (let step = 0; step < 16; step++) {
      const btn = document.createElement("button");
      btn.className = `step-btn ${grid[track][step] ? "active" : ""}`;
      btn.dataset.track = track;
      btn.dataset.col = step;
      btn.addEventListener("click", () => {
        grid[track][step] = grid[track][step] ? 0 : 1;
        btn.classList.toggle("active", Boolean(grid[track][step]));
      });
      row.appendChild(btn);
    }

    container.appendChild(row);
  });

  // Track action listeners
  document.querySelectorAll(".btn-mute").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const track = e.target.dataset.track;
      trackState[track].muted = !trackState[track].muted;
      e.target.classList.toggle("muted", trackState[track].muted);
    });
  });

  document.querySelectorAll(".btn-solo").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const track = e.target.dataset.track;
      trackState[track].soloed = !trackState[track].soloed;
      e.target.classList.toggle("soloed", trackState[track].soloed);
    });
  });
}

function initDOM() {
  renderSequencerGrid();
  initVisualizer();

  // Play / Pause / Stop
  document.getElementById("btnPlay").addEventListener("click", togglePlay);
  document.getElementById("btnStop").addEventListener("click", stopSequencer);
  document.getElementById("btnRecord").addEventListener("click", toggleRecording);

  // BPM
  const bpmSlider = document.getElementById("bpmSlider");
  bpmSlider.addEventListener("input", (e) => {
    bpm = parseInt(e.target.value);
    document.getElementById("bpmValue").textContent = bpm;
    if (isPlaying) {
      clearInterval(timerId);
      timerId = setInterval(step, (60000 / bpm) / 4);
    }
  });

  // Master Volume
  document.getElementById("masterVolSlider").addEventListener("input", (e) => {
    if (masterGain) {
      masterGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
    }
  });

  // Waveform selector
  document.querySelectorAll(".wave-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".wave-btn").forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      activeWaveform = e.target.dataset.wave;
    });
  });

  // Visualizer Mode
  document.getElementById("visModeSelect").addEventListener("change", (e) => {
    visMode = e.target.value;
  });

  // Presets
  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      loadPreset(e.target.dataset.preset);
    });
  });

  document.getElementById("btnRandom").addEventListener("click", randomizePattern);

  // Piano keys click
  document.querySelectorAll(".piano-key").forEach((key) => {
    key.addEventListener("mousedown", (e) => {
      const note = e.target.dataset.note;
      triggerNote(note);
    });
  });
}

window.addEventListener("DOMContentLoaded", initDOM);
