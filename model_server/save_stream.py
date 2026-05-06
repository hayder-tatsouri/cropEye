"""Record a live video stream to an MP4 file.

The recorder stops automatically when the stream ends or becomes unavailable.
"""

from __future__ import annotations

import time
from pathlib import Path

import cv2


STREAM_URL = "http://192.168.0.179:5000/video"
OUTPUT_FILE = "recorded_detection.mp4"
DEFAULT_FPS = 10.0
DEFAULT_WIDTH = 640
DEFAULT_HEIGHT = 480


def open_stream(stream_url: str) -> cv2.VideoCapture:
    capture = cv2.VideoCapture(stream_url)
    capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return capture


def main() -> int:
    output_path = Path(OUTPUT_FILE)
    capture = open_stream(STREAM_URL)

    if not capture.isOpened():
        print(f"Unable to open stream: {STREAM_URL}")
        return 1

    fps = capture.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1:
        fps = DEFAULT_FPS

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)) or DEFAULT_WIDTH
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT)) or DEFAULT_HEIGHT

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    if not writer.isOpened():
        capture.release()
        print(f"Unable to open output file: {output_path}")
        return 1

    print(f"Recording stream -> {output_path}")
    print("Recording stops automatically when the stream ends.")

    frames_written = 0
    failure_count = 0
    max_failures = 5

    try:
        while True:
            ret, frame = capture.read()
            if not ret:
                failure_count += 1
                if failure_count >= max_failures:
                    print("Stream ended or became unavailable.")
                    break
                time.sleep(0.2)
                continue

            failure_count = 0

            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height))

            writer.write(frame)
            frames_written += 1

    except KeyboardInterrupt:
        print("\nStopped by user.")

    finally:
        capture.release()
        writer.release()
        print(f"Saved -> {output_path} ({frames_written} frames)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())