# ⚡ PulseWave Studio

> **Cyberpunk Web DAW & Algorithmic Music Synthesis Lab**  
> Pure Web Audio API + 100% Python Standard Library. Zero external dependencies.

---

## 🎛️ Overview

**PulseWave Studio** is an all-in-one music workstation designed for quick beatmaking, sound synthesis, and music theory exploration. It bridges high-speed browser-based sound design with a standalone Python algorithmic rendering engine.

```
                  ┌────────────────────────────────────────┐
                  │          PULSEWAVE STUDIO              │
                  ├───────────────────┬────────────────────┤
                  │  Web DAW & Synth  │   Python CLI Lab   │
                  ├───────────────────┼────────────────────┤
                  │ • 16-Step Grid    │ • Algorithmic WAV  │
                  │ • Canvas Visuals  │ • Music Theory Lab │
                  │ • Live WAV Rec    │ • Native Audio Play│
                  └───────────────────┴────────────────────┘
```

---

## ✨ Features

- **🎛️ 16-Step Multi-Track Sequencer**:
  - **4 Drum Tracks**: 808 Kick, Snappy Snare, Closed Hi-Hat, Open Hi-Hat.
  - **2 Synth Tracks**: Sub / Acid Bass, Polyphonic Cyber Lead.
  - Per-track **Mute (M)**, **Solo (S)**, and volume levels.
  - 4-beat visual grouping and dynamic glowing LED step markers.

- **🎹 Modular Synthesizer**:
  - Waveform selector: Sawtooth, Square, Triangle, Sine.
  - Low-pass Filter with Cutoff Frequency & Resonance ($Q$).
  - ADSR Envelope generator (Attack, Decay, Sustain, Release).
  - Stereo Echo & Delay rack with feedback control.

- **🌊 Real-Time Sound-Reactive Visualizer**:
  - **Neon Spectrum Bars**: Multi-band frequency equalizer with gradient glow.
  - **Electric Oscilloscope**: Real-time waveform analyzer.
  - **Radial Pulse Portal**: Circular reactive mandala that pulses with the kick drum.

- **🎼 Built-In Preset Grooves & Randomizer**:
  - *🌆 Synthwave Sunset* (124 BPM)
  - *⚡ Cyberpunk 2088* (135 BPM)
  - *☕ Lo-Fi Midnight* (84 BPM)
  - *👾 8-Bit Arcade* (140 BPM)
  - *🎲 Algorithmic Randomize*: Generates scale-quantized musical patterns with one click.

- **⏺️ Live WAV Recording**:
  - Record your jam sessions directly from the browser with zero loss.
  - Exports standard `.wav` files directly to your downloads.

- **📚 Music Theory Core (`theory.py`)**:
  - Calculates note-to-frequency mappings ($f = 440 \times 2^{(n-69)/12}$).
  - Scale explorer: Major, Natural Minor, Dorian, Mixolydian, Pentatonic, Blues.
  - Harmonic chord progression generator (Pop anthems, Synthwave progressions, etc.).

---

## 🚀 Quickstart

### 1. Launch the Interactive Studio
```bash
cd /Users/gaurav/ProjectIdeas/antigravity-projects/PulseWave
./pulsewave studio
# Or: python3 main.py studio
```
*Opens `http://localhost:6060` in your default browser.*

---

### 2. Render Beats Directly from Terminal (CLI)
Render high-fidelity 16-bit WAV audio directly from the terminal:
```bash
# Render 2 bars of Synthwave to WAV
./pulsewave render synthwave --bpm 124 --bars 2 -o my_beat.wav

# Render and immediately listen using macOS afplay
./pulsewave render lofi --bpm 84 --bars 2 --play
```

---

### 3. Instant Terminal Preview
Listen to algorithmic music without opening the browser:
```bash
./pulsewave play synthwave
./pulsewave play lofi
./pulsewave play techno
```

---

### 4. Terminal Music Theory Cheatsheet
Look up scale notes, frequencies, and harmonically matched chord progressions:
```bash
./pulsewave theory A minor
./pulsewave theory C major
./pulsewave theory E dorian
```

---

## ⌨️ Playable Keyboard Mapping

You can play the synth live using your computer keyboard:

| Note | Key | Note | Key |
|---|---|---|---|
| **C4** | `A` | **C#4** | `W` |
| **D4** | `S` | **D#4** | `E` |
| **E4** | `D` | | |
| **F4** | `F` | **F#4** | `T` |
| **G4** | `G` | **G#4** | `Y` |
| **A4** | `H` | **A#4** | `U` |
| **B4** | `J` | | |
| **C5** | `K` | **C#5** | `O` |
| **D5** | `L` | | |

- **Spacebar**: Toggle Play / Pause.

---

## 🛠️ Architecture

- **`main.py` / `pulsewave`**: CLI entrypoint and orchestrator.
- **`synth_engine.py`**: Mathematical audio synthesis (sine, square, saw, noise, ADSR, drums).
- **`theory.py`**: Note frequencies, scales, and chord algorithms.
- **`web_server.py`**: Native Python HTTP server with JSON API.
- **`static/`**:
  - `index.html`: Responsive cyber-synth DAW layout.
  - `style.css`: Ableton/FL-inspired neon dark UI.
  - `app.js`: Web Audio API graph, step sequencer timer, and Canvas visualizer.

---

## 📄 License
MIT. Built with pair-programming on Google Antigravity.
