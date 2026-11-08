"""Builds a soft music bed and scene-change whooshes, mixed under the narration.
usage: python sound.py script.json out_dir  -> out_dir/mix.wav
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf

SR = 24000


def note(f, dur, amp=1.0):
    t = np.arange(int(dur * SR)) / SR
    w = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sin(2 * np.pi * 3 * f * t))
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.8)
    return w * env * amp


def bed(total):
    out = np.zeros(int(total * SR))
    chords = [[110.0, 164.81, 220.0, 261.63], [87.31, 130.81, 174.61, 220.0], [130.81, 196.0, 261.63, 329.63], [98.0, 146.83, 196.0, 246.94]]
    bar = 4.0
    for i in range(int(total / bar) + 1):
        start = int(i * bar * SR)
        for f in chords[i % 4]:
            n = note(f, bar + 0.8, 0.08)
            end = min(len(out), start + len(n))
            out[start:end] += n[: end - start]
    # soft pulse on each beat (90 bpm)
    beat = 60 / 90
    t = np.arange(int(0.12 * SR)) / SR
    kick = np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 40)) * t) * np.exp(-t * 30) * 0.25
    for i in range(int(total / beat)):
        s = int(i * beat * SR)
        e = min(len(out), s + len(kick))
        out[s:e] += kick[: e - s]
    return out


def whoosh():
    n = int(0.45 * SR)
    noise = np.random.default_rng(1).standard_normal(n)
    t = np.arange(n) / SR
    env = np.sin(np.pi * t / t[-1]) ** 2
    # crude low-pass by moving average for a soft swoosh
    k = 40
    smooth = np.convolve(noise, np.ones(k) / k, mode='same')
    return smooth * env * 0.5


def main():
    script = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    voice, sr = sf.read(out / 'voice.wav')
    assert sr == SR
    timing = json.loads((out / 'timing.json').read_text())
    total = len(voice) / SR
    music = bed(total)
    music *= np.minimum(1, np.arange(len(music)) / (SR * 1.0))
    fade = int(1.2 * SR); music[-fade:] *= np.linspace(1, 0, fade)
    sfx = np.zeros_like(music)
    prev = None
    for i, line in enumerate(timing['lines']):
        sc = script['lines'][i]['scene']
        if sc != prev and i > 0:
            s = max(0, int((line['s'] - 0.25) * SR)); w = whoosh(); e = min(len(sfx), s + len(w))
            sfx[s:e] += w[: e - s]
        prev = sc
    # duck music under speech
    env = np.convolve(np.abs(voice), np.ones(2400) / 2400, mode='same')
    duck = 1 - 0.55 * np.clip(env / (env.max() * 0.3 + 1e-9), 0, 1)
    n = min(len(voice), len(music), len(duck), len(sfx))
    mix = voice[:n] * 1.0 + music[:n] * 0.55 * duck[:n] + sfx[:n] * 0.35
    mix = mix / max(1e-9, np.max(np.abs(mix))) * 0.95
    sf.write(out / 'mix.wav', mix.astype(np.float32), SR)
    print(f"mix: {total:.1f}s")


if __name__ == '__main__':
    main()
