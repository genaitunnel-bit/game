#!/usr/bin/env bash
# whisper.cpp の stream を回して、認識結果だけを 1 行ずつ出す。
# Vosk より重いが、日本語の精度は上。GPU なしなら small で十分実用になる。
#
#   git clone https://github.com/ggml-org/whisper.cpp && cd whisper.cpp && make stream
#   ./models/download-ggml-model.sh small
#   WHISPER_DIR=~/whisper.cpp tools/whisper_ears.sh
#
# home-agent 側:
#   "ears": { "provider": "command", "command": "tools/whisper_ears.sh" }
set -euo pipefail
WHISPER_DIR="${WHISPER_DIR:-$HOME/whisper.cpp}"
MODEL="${MODEL:-$WHISPER_DIR/models/ggml-small.bin}"

exec stdbuf -oL "$WHISPER_DIR/stream" \
  -m "$MODEL" -l ja -t "${THREADS:-4}" --step 0 --length 6000 -vth "${VAD:-0.6}" 2>/dev/null |
  stdbuf -oL sed -u -e 's/\x1b\[[0-9;]*[A-Za-z]//g' -e 's/\[[^]]*\]//g' -e 's/^[[:space:]]*//' |
  stdbuf -oL grep -v '^$'
