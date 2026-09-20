#!/usr/bin/env python3
"""
Vosk で日本語をずっと聞いて、確定した文だけを 1 行ずつ標準出力に出す。
home-agent の ears.provider: "command" から呼ばれる想定。

  pip install vosk sounddevice
  # 日本語モデルを落として展開（vosk-model-small-ja-0.22 など）
  #   https://alphacephei.com/vosk/models
  python3 tools/vosk_ears.py /path/to/vosk-model-ja

マイクだけあれば動き、音声は一切外に出ない。Raspberry Pi でも回る軽さ。
"""
import json
import queue
import sys

import sounddevice as sd
from vosk import KaldiRecognizer, Model

SAMPLE_RATE = 16000
model_path = sys.argv[1] if len(sys.argv) > 1 else "model"
device = int(sys.argv[2]) if len(sys.argv) > 2 else None

audio = queue.Queue()


def on_audio(indata, _frames, _time, status):
    if status:
        print(status, file=sys.stderr)
    audio.put(bytes(indata))


recognizer = KaldiRecognizer(Model(model_path), SAMPLE_RATE)
print("listening...", file=sys.stderr)

with sd.RawInputStream(
    samplerate=SAMPLE_RATE, blocksize=8000, dtype="int16", channels=1, device=device, callback=on_audio
):
    while True:
        if not recognizer.AcceptWaveform(audio.get()):
            continue  # まだ文の途中
        # Vosk の日本語出力は分かち書きなので、空白を詰めてから渡す
        text = json.loads(recognizer.Result()).get("text", "").replace(" ", "")
        if text:
            print(text, flush=True)
