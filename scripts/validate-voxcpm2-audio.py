#!/usr/bin/env python3
"""Fail closed on broken, mismatched, silent, clipped, or implausible audio assets."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import soundfile as sf


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("metadata")
    args = parser.parse_args()
    metadata_path = Path(args.metadata)
    rows = [json.loads(line) for line in metadata_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    ids = set()
    failures = []
    for row in rows:
        path = metadata_path.parent / row["file"]
        if row["id"] in ids:
            failures.append(f"duplicate id: {row['id']}")
        ids.add(row["id"])
        if not path.is_file():
            failures.append(f"missing: {path}")
            continue
        payload = path.read_bytes()
        if hashlib.sha256(payload).hexdigest() != row["sha256"]:
            failures.append(f"hash mismatch: {row['id']}")
        audio, sample_rate = sf.read(path)
        duration = len(audio) / float(sample_rate)
        peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
        rms = float(np.sqrt(np.mean(np.square(audio)))) if len(audio) else 0.0
        if sample_rate != 48000:
            failures.append(f"not 48 kHz: {row['id']} ({sample_rate})")
        if not 0.25 <= duration <= 45:
            failures.append(f"implausible duration: {row['id']} ({duration:.2f}s)")
        if peak >= 0.999:
            failures.append(f"possible clipping: {row['id']} ({peak:.4f})")
        if rms < 0.002:
            failures.append(f"possible silence: {row['id']} ({rms:.5f})")
        if abs(duration - float(row["durationSeconds"])) > 0.01:
            failures.append(f"metadata duration mismatch: {row['id']}")
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Validated {len(rows)} VoxCPM2 clips: unique IDs, hashes, 48 kHz, duration, signal, and clipping checks passed.")


if __name__ == "__main__":
    main()
