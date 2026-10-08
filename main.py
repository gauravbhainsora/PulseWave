#!/usr/bin/env python3
"""
PulseWave Studio - Cyberpunk Music Workstation & Sound Synthesis Lab.
Pure Python Standard Library.
"""

import argparse
import os
import sys
import webbrowser
from synth_engine import SynthEngine, play_audio_file
from theory import format_theory_summary
from web_server import run_server

BANNER = r"""
  ___      _          _      __               
 | _ \_  _| |___ ___ \ \    / /_ ___ _____ _ 
 |  _/ || | (_-</ -_) \ \/\/ / _` \ V / -_) |
 |_|  \_,_|_/__/\___|  \_/\_/\__,_|\_/\___|_|
   >> CYBERPUNK SYNTHESIZER & MUSIC LAB <<
"""


def cmd_studio(args):
    port = args.port
    print(BANNER)
    print(f"🎛️  Starting PulseWave Studio on http://localhost:{port}")
    print("⚡ Press Ctrl+C in terminal to stop server.\n")

    server = run_server(port)

    if not args.no_browser:
        try:
            webbrowser.open(f"http://localhost:{port}")
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 PulseWave Studio stopped. Keep making beats! 🎧")
        server.server_close()


def cmd_render(args):
    print(BANNER)
    preset = args.preset.lower()
    bpm = args.bpm
    bars = args.bars
    out = args.output or f"pulsewave_{preset}.wav"

    print(f"🎵 Synthesizing {bars} bars of '{preset}' at {bpm} BPM...")
    engine = SynthEngine()
    samples = engine.render_loop(bpm=bpm, bars=bars, preset=preset)
    path = engine.save_wav(samples, out)
    print(f"✅ Rendered WAV saved to: {os.path.abspath(path)} ({len(samples)} samples)")

    if args.play:
        print(f"🔊 Playing {path} ...")
        play_audio_file(path)


def cmd_play(args):
    print(BANNER)
    preset = args.preset.lower()
    bpm = args.bpm
    temp_wav = os.path.join(os.path.dirname(os.path.abspath(__file__)), f".temp_{preset}.wav")

    print(f"🎵 Synthesizing and playing '{preset}' ({bpm} BPM) ...")
    engine = SynthEngine()
    samples = engine.render_loop(bpm=bpm, bars=2, preset=preset)
    engine.save_wav(samples, temp_wav)
    try:
        play_audio_file(temp_wav)
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except OSError:
                pass


def cmd_theory(args):
    key = args.key
    scale = args.scale
    print(format_theory_summary(key, scale))


def main():
    parser = argparse.ArgumentParser(
        description="PulseWave Studio - Cyberpunk Music Workstation & Synthesizer"
    )
    subparsers = parser.add_subparsers(dest="subcommand", help="Available commands")

    # studio
    p_studio = subparsers.add_parser("studio", help="Launch the interactive Web DAW Studio")
    p_studio.add_argument("--port", type=int, default=6060, help="Local port (default: 6060)")
    p_studio.add_argument("--no-browser", action="store_true", help="Don't auto-open browser")

    # render
    p_render = subparsers.add_parser("render", help="Render algorithmic beat to WAV file")
    p_render.add_argument("preset", nargs="?", default="synthwave", choices=["synthwave", "lofi", "techno"])
    p_render.add_argument("--bpm", type=int, default=124, help="Tempo BPM")
    p_render.add_argument("--bars", type=int, default=2, help="Number of bars")
    p_render.add_argument("-o", "--output", help="Output file path")
    p_render.add_argument("--play", action="store_true", help="Play after rendering")

    # play
    p_play = subparsers.add_parser("play", help="Render and immediately play in terminal")
    p_play.add_argument("preset", nargs="?", default="synthwave", choices=["synthwave", "lofi", "techno"])
    p_play.add_argument("--bpm", type=int, default=124, help="Tempo BPM")

    # theory
    p_theory = subparsers.add_parser("theory", help="Music theory scales & chord progression helper")
    p_theory.add_argument("key", nargs="?", default="A", help="Root key (e.g. A, C, F#)")
    p_theory.add_argument("scale", nargs="?", default="minor", help="Scale type (e.g. minor, major, dorian, blues)")

    args = parser.parse_args()

    if args.subcommand == "studio" or args.subcommand is None:
        cmd_studio(args if args.subcommand else argparse.Namespace(port=6060, no_browser=False))
    elif args.subcommand == "render":
        cmd_render(args)
    elif args.subcommand == "play":
        cmd_play(args)
    elif args.subcommand == "theory":
        cmd_theory(args)


if __name__ == "__main__":
    main()
