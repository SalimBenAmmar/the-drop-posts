"""Synthesise narration line by line with Kokoro and write timing for captions.

usage: python voice.py script.json out_dir
script.json: {"voice": "bm_george", "speed": 1.0, "lines": [{"text": "...", "gap": 0.15}, ...]}
writes out_dir/voice.wav and out_dir/timing.json with per-line start/end and per-word times.
"""
import json, sys, re
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

KDIR = Path.home() / 'kokoro'


def trim(a, sr, thresh=0.01):
    idx = np.where(np.abs(a) > thresh)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(0.02 * sr))
    e = min(len(a), idx[-1] + int(0.06 * sr))
    return a[s:e]


def main():
    script = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    k = Kokoro(str(KDIR / 'kokoro-v1.0.onnx'), str(KDIR / 'voices-v1.0.bin'))
    voice, speed = script.get('voice', 'bm_george'), script.get('speed', 1.0)
    chunks, timing, t, sr = [], [], script.get('lead_in', 0.15), 24000
    chunks.append(np.zeros(int(t * sr), dtype=np.float32))
    for i, line in enumerate(script['lines']):
        audio, sr = k.create(line['text'], voice=voice, speed=speed, lang='en-gb')
        audio = trim(audio.astype(np.float32), sr)
        dur = len(audio) / sr
        words = re.findall(r"[\w'’£%.,-]+", line['text'])
        weights = [max(1, len(re.sub(r'[^\w]', '', w))) + 1.5 for w in words]
        total, acc, wt = sum(weights), 0.0, []
        for w, wgt in zip(words, weights):
            ws = t + dur * acc / total
            acc += wgt
            wt.append({'w': w, 's': round(ws, 3), 'e': round(t + dur * acc / total, 3)})
        timing.append({'i': i, 'text': line['text'], 's': round(t, 3), 'e': round(t + dur, 3), 'words': wt})
        chunks.append(audio)
        gap = line.get('gap', 0.12)
        chunks.append(np.zeros(int(gap * sr), dtype=np.float32))
        t += dur + gap
    tail = script.get('tail', 0.8)
    chunks.append(np.zeros(int(tail * sr), dtype=np.float32))
    wav = np.concatenate(chunks)
    peak = np.max(np.abs(wav)) or 1
    wav = wav / peak * 0.89
    sf.write(out / 'voice.wav', wav, sr)
    (out / 'timing.json').write_text(json.dumps({'duration': round(len(wav) / sr, 3), 'lines': timing}, indent=1))
    print(f"voice: {len(wav)/sr:.1f}s, {len(timing)} lines")


if __name__ == '__main__':
    main()
