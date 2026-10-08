"""
Music Theory Core for PulseWave Studio.
Handles note-to-frequency conversions, scales, chords, and progression generation.
100% Python Standard Library.
"""

import math

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Scale intervals in semitones
SCALE_PATTERNS = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "harmonic_minor": [0, 2, 3, 5, 7, 8, 11],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "pentatonic_minor": [0, 3, 5, 7, 10],
    "pentatonic_major": [0, 2, 4, 7, 9],
    "blues": [0, 3, 5, 6, 7, 10],
    "synthwave": [0, 2, 3, 5, 7, 8, 10],  # Natural minor / aeolian
}

# Chord intervals in semitones
CHORD_FORMULAS = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "7": [0, 4, 7, 10],
    "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
}

# Diatonic chord types for Major and Minor
DIATONIC_CHORDS_MAJOR = ["maj", "min", "min", "maj", "maj", "min", "dim"]
DIATONIC_CHORDS_MINOR = ["min", "dim", "maj", "min", "min", "maj", "maj"]


def note_to_midi(note_str: str) -> int:
    """Convert note name like 'C4', 'A#3', 'Db5' to MIDI note number (C4 = 60)."""
    note_str = note_str.strip().capitalize()
    accidental = ""
    if len(note_str) >= 2 and note_str[1] in ("#", "b"):
        accidental = note_str[1]
        letter = note_str[0]
        octave_str = note_str[2:]
    else:
        letter = note_str[0]
        octave_str = note_str[1:]

    octave = int(octave_str) if octave_str else 4

    # Handle flats
    flats = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}
    combined = letter + accidental
    if combined in flats:
        combined = flats[combined]

    semitone = NOTE_NAMES.index(combined)
    return (octave + 1) * 12 + semitone


def midi_to_note(midi_num: int) -> str:
    """Convert MIDI number (60) to note name ('C4')."""
    semitone = midi_num % 12
    octave = (midi_num // 12) - 1
    return f"{NOTE_NAMES[semitone]}{octave}"


def midi_to_freq(midi_num: int) -> float:
    """Convert MIDI number to frequency in Hz (A4 = 69 -> 440 Hz)."""
    return 440.0 * (2.0 ** ((midi_num - 69) / 12.0))


def note_to_freq(note_str: str) -> float:
    """Convert note string like 'C4' or 'A4' to frequency in Hz."""
    return midi_to_freq(note_to_midi(note_str))


def get_scale_notes(root: str, scale_type: str = "minor", octave: int = 4) -> list[str]:
    """Return all note names in a given scale starting from root."""
    root_clean = root.capitalize().strip()
    if root_clean in {"Db", "Eb", "Gb", "Ab", "Bb"}:
        flats = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}
        root_clean = flats[root_clean]

    root_midi = note_to_midi(f"{root_clean}{octave}")
    intervals = SCALE_PATTERNS.get(scale_type.lower(), SCALE_PATTERNS["minor"])
    return [midi_to_note(root_midi + interval) for interval in intervals]


def get_chord_notes(root: str, chord_type: str = "maj", octave: int = 4) -> list[str]:
    """Return note names for a given chord."""
    root_clean = root.capitalize().strip()
    root_midi = note_to_midi(f"{root_clean}{octave}")
    intervals = CHORD_FORMULAS.get(chord_type.lower(), [0, 4, 7])
    return [midi_to_note(root_midi + interval) for interval in intervals]


def generate_progression(key: str = "A", mode: str = "minor") -> list[dict]:
    """Generate a cohesive musical chord progression."""
    mode_lower = mode.lower()
    diatonic = DIATONIC_CHORDS_MINOR if mode_lower == "minor" else DIATONIC_CHORDS_MAJOR
    scale_notes = get_scale_notes(key, mode_lower, octave=3)

    # Popular progression degrees (1-indexed)
    if mode_lower == "minor":
        degrees = [1, 6, 3, 7]  # i - VI - III - VII (classic Synthwave / Rock)
    else:
        degrees = [1, 5, 6, 4]  # I - V - vi - IV (Pop anthem)

    progression = []
    for deg in degrees:
        idx = deg - 1
        root_note = scale_notes[idx % len(scale_notes)]
        # Extract base letter without octave
        root_name = "".join([c for c in root_note if not c.isdigit()])
        chord_type = diatonic[idx % len(diatonic)]
        notes = get_chord_notes(root_name, chord_type, octave=3)
        progression.append({
            "degree": deg,
            "root": root_name,
            "chord_type": chord_type,
            "symbol": f"{root_name}{'' if chord_type == 'maj' else chord_type}",
            "notes": notes,
            "frequencies": [round(note_to_freq(n), 2) for n in notes]
        })

    return progression


def format_theory_summary(key: str = "C", scale: str = "major") -> str:
    """Format a terminal-friendly summary of musical key and theory."""
    scale_notes = get_scale_notes(key, scale, octave=4)
    progression = generate_progression(key, "minor" if "minor" in scale else "major")
    
    lines = [
        f"\n🎵 MUSIC THEORY LAB: {key.upper()} {scale.upper()}",
        "=" * 50,
        f"🎹 Scale Notes: {' -> '.join(scale_notes)}",
        f"🎼 Frequencies:  {', '.join([f'{note_to_freq(n):.1f}Hz' for n in scale_notes])}",
        "\n🎸 Suggested Chord Progression:",
    ]
    for step in progression:
        notes_str = ", ".join(step["notes"])
        lines.append(f"   [{step['symbol']:<6}] (Degree {step['degree']}): {notes_str}")
    lines.append("=" * 50)
    return "\n".join(lines)


if __name__ == "__main__":
    print(format_theory_summary("A", "minor"))
