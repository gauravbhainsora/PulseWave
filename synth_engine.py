"""
Algorithmic Audio Synthesis Engine for PulseWave Studio.
Pure Python Standard Library (math, wave, struct, random).
Generates multi-track WAV audio files and synth patches with zero external packages.
"""

import math
import os
import random
import struct
import subprocess
import wave

SAMPLE_RATE = 44100  # 44.1 kHz CD Quality


def clamp(val, min_val=-1.0, max_val=1.0):
    return max(min_val, min(max_val, val))


class SynthEngine:
    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate

    # -------------------------------------------------------------
    # Oscillators
    # -------------------------------------------------------------
    def osc_sine(self, freq: float, t: float) -> float:
        return math.sin(2.0 * math.pi * freq * t)

    def osc_square(self, freq: float, t: float, duty: float = 0.5) -> float:
        phase = (freq * t) % 1.0
        return 1.0 if phase < duty else -1.0

    def osc_sawtooth(self, freq: float, t: float) -> float:
        phase = (freq * t) % 1.0
        return 2.0 * phase - 1.0

    def osc_triangle(self, freq: float, t: float) -> float:
        phase = (freq * t) % 1.0
        return 4.0 * abs(phase - 0.5) - 1.0

    def osc_noise(self) -> float:
        return random.uniform(-1.0, 1.0)

    # -------------------------------------------------------------
    # ADSR Envelope
    # -------------------------------------------------------------
    def get_adsr_multiplier(
        self,
        t: float,
        duration: float,
        attack: float = 0.01,
        decay: float = 0.05,
        sustain: float = 0.7,
        release: float = 0.1,
    ) -> float:
        """Calculate amplitude multiplier at time t based on ADSR envelope."""
        if t < 0:
            return 0.0

        release_start = duration - release
        if release_start < attack + decay:
            # Short sound adjustment
            release_start = max(0.0, duration * 0.7)
            release = duration - release_start

        if t < attack:
            return t / max(0.001, attack)
        elif t < attack + decay:
            decay_progress = (t - attack) / max(0.001, decay)
            return 1.0 - (1.0 - sustain) * decay_progress
        elif t < release_start:
            return sustain
        elif t <= duration:
            rel_progress = (t - release_start) / max(0.001, release)
            return max(0.0, sustain * (1.0 - rel_progress))
        return 0.0

    # -------------------------------------------------------------
    # Drum Synthesizers (Procedural Sound Design)
    # -------------------------------------------------------------
    def synthesize_kick(self, duration: float = 0.35) -> list[float]:
        """Synthesize punchy 808-style bass drum."""
        num_samples = int(duration * self.sample_rate)
        samples = []
        for i in range(num_samples):
            t = i / self.sample_rate
            # Pitch drops rapidly from 160Hz down to 45Hz
            pitch_envelope = math.exp(-t * 28.0)
            freq = 45.0 + 115.0 * pitch_envelope
            # Amp envelope
            amp = math.exp(-t * 10.0)
            sample = math.sin(2.0 * math.pi * freq * t) * amp
            # Soft saturation/drive
            sample = math.tanh(sample * 1.5)
            samples.append(sample)
        return samples

    def synthesize_snare(self, duration: float = 0.25) -> list[float]:
        """Synthesize snappy snare with tone + noise burst."""
        num_samples = int(duration * self.sample_rate)
        samples = []
        for i in range(num_samples):
            t = i / self.sample_rate
            # Tonal body (180Hz drop to 120Hz)
            body_freq = 120.0 + 60.0 * math.exp(-t * 30.0)
            body = math.sin(2.0 * math.pi * body_freq * t) * math.exp(-t * 18.0) * 0.6
            # Crisp noise snare wires
            noise = random.uniform(-1.0, 1.0) * math.exp(-t * 15.0) * 0.7
            sample = clamp(body + noise)
            samples.append(sample)
        return samples

    def synthesize_hihat(self, open_hat: bool = False, duration: float = None) -> list[float]:
        """Synthesize crisp metallic hi-hat."""
        dur = (0.28 if open_hat else 0.05) if duration is None else duration
        num_samples = int(dur * self.sample_rate)
        samples = []
        decay_factor = 14.0 if open_hat else 80.0
        for i in range(num_samples):
            t = i / self.sample_rate
            # High frequency metallic noise
            noise = random.uniform(-1.0, 1.0)
            amp = math.exp(-t * decay_factor)
            sample = noise * amp * 0.4
            samples.append(sample)
        return samples

    def synthesize_note(
        self,
        freq: float,
        duration: float,
        waveform: str = "sawtooth",
        attack: float = 0.02,
        decay: float = 0.1,
        sustain: float = 0.7,
        release: float = 0.1,
    ) -> list[float]:
        """Synthesize a musical melodic note with chosen oscillator & ADSR."""
        num_samples = int(duration * self.sample_rate)
        samples = []
        osc_map = {
            "sine": self.osc_sine,
            "square": self.osc_square,
            "sawtooth": self.osc_sawtooth,
            "triangle": self.osc_triangle,
        }
        osc_func = osc_map.get(waveform, self.osc_sawtooth)

        for i in range(num_samples):
            t = i / self.sample_rate
            env = self.get_adsr_multiplier(t, duration, attack, decay, sustain, release)
            raw = osc_func(freq, t)
            # Add subtle sub-octave warmth
            sub = self.osc_sine(freq * 0.5, t) * 0.25
            samples.append(clamp((raw * 0.75 + sub) * env))
        return samples

    # -------------------------------------------------------------
    # Song / Beat Sequencer Generator
    # -------------------------------------------------------------
    def render_loop(
        self,
        bpm: int = 120,
        bars: int = 2,
        preset: str = "synthwave",
    ) -> list[float]:
        """Render a complete multi-track musical loop."""
        steps_per_bar = 16
        total_steps = bars * steps_per_bar
        seconds_per_step = (60.0 / bpm) / 4.0
        total_duration = total_steps * seconds_per_step
        total_samples = int(total_duration * self.sample_rate) + int(0.5 * self.sample_rate)
        master_buffer = [0.0] * total_samples

        # Pre-synthesize one-shot drum hits
        kick = self.synthesize_kick()
        snare = self.synthesize_snare()
        hihat_closed = self.synthesize_hihat(open_hat=False)
        hihat_open = self.synthesize_hihat(open_hat=True)

        # Step patterns (16 steps)
        if preset == "synthwave":
            kick_pattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]  # Four on the floor
            snare_pattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]  # Beats 2 and 4
            hat_pattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]   # Offbeat hi-hats
            # Bassline: 8th note driving synthwave bass (A minor: A1, F1, G1, E1)
            bass_notes = [55.0, 55.0, 55.0, 55.0, 43.65, 43.65, 49.0, 49.0]
            lead_melody = [
                (0, 440.0), (3, 523.25), (6, 659.25), (8, 587.33), (12, 523.25)
            ]
        elif preset == "lofi":
            kick_pattern = [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
            snare_pattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
            hat_pattern = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            bass_notes = [65.4, 0, 65.4, 0, 58.27, 0, 43.65, 0]
            lead_melody = [(0, 329.63), (4, 392.0), (8, 440.0), (12, 392.0)]
        else:  # techno
            kick_pattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
            snare_pattern = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
            hat_pattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1]
            bass_notes = [65.4, 65.4, 65.4, 65.4, 65.4, 65.4, 65.4, 65.4]
            lead_melody = [(2, 261.63), (6, 311.13), (10, 392.0), (14, 466.16)]

        def mix_in(buffer, start_idx, sound, gain=1.0):
            for j, s in enumerate(sound):
                dest = start_idx + j
                if dest < len(buffer):
                    buffer[dest] += s * gain

        for bar in range(bars):
            bar_offset_steps = bar * steps_per_bar
            for step in range(steps_per_bar):
                step_idx = bar_offset_steps + step
                sample_start = int(step_idx * seconds_per_step * self.sample_rate)

                # Drums
                if kick_pattern[step % len(kick_pattern)]:
                    mix_in(master_buffer, sample_start, kick, gain=0.85)
                if snare_pattern[step % len(snare_pattern)]:
                    mix_in(master_buffer, sample_start, snare, gain=0.7)
                if hat_pattern[step % len(hat_pattern)]:
                    hat_sound = hihat_open if step % 4 == 2 else hihat_closed
                    mix_in(master_buffer, sample_start, hat_sound, gain=0.35)

                # Bass (every 2 steps / 8th notes)
                if step % 2 == 0:
                    bass_idx = (step // 2) % len(bass_notes)
                    freq = bass_notes[bass_idx]
                    if freq > 0:
                        bass_hit = self.synthesize_note(
                            freq,
                            duration=seconds_per_step * 1.8,
                            waveform="sawtooth",
                            attack=0.01,
                            decay=0.08,
                            sustain=0.4,
                            release=0.05,
                        )
                        mix_in(master_buffer, sample_start, bass_hit, gain=0.45)

                # Melodic Lead
                for lead_step, lead_freq in lead_melody:
                    if step == lead_step:
                        lead_hit = self.synthesize_note(
                            lead_freq,
                            duration=seconds_per_step * 3.5,
                            waveform="square",
                            attack=0.02,
                            decay=0.15,
                            sustain=0.5,
                            release=0.1,
                        )
                        mix_in(master_buffer, sample_start, lead_hit, gain=0.35)

        # Soft clip master buffer
        return [math.tanh(s * 0.9) for s in master_buffer]

    # -------------------------------------------------------------
    # WAV File Exporter
    # -------------------------------------------------------------
    def save_wav(self, samples: list[float], file_path: str):
        """Export floating point audio samples [-1.0, 1.0] to a 16-bit PCM WAV file."""
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        int_samples = [int(clamp(s) * 32767.0) for s in samples]
        packed = struct.pack(f"<{len(int_samples)}h", *int_samples)

        with wave.open(file_path, "wb") as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(self.sample_rate)
            wf.writeframes(packed)
        return file_path


def play_audio_file(file_path: str):
    """Play audio file on macOS using the built-in afplay utility."""
    if os.path.exists(file_path):
        subprocess.run(["afplay", file_path], check=False)
