# 24/7 YouTube Live Streaming Engine — Technical Overview

## 1. Executive Summary

Building a 24/7 YouTube Live streaming engine powered by pre-recorded video files (`.mp4`, `.mkv`, etc.) running on a headless VPS is **moderately easy (3/10 to 4/10)** for a basic looped setup, and **moderate to intermediate (6/10 to 7/10)** for a bulletproof, production-grade engine with hot-swappable playlists, automatic network recovery, and audio/video normalization.

The standout advantage of this architecture is that **you do not need high processing power** if the media is pre-standardized. By leveraging FFmpeg's stream copy mode (`-c copy`), a cheap **$4–$6/month VPS (1 vCPU, 1–2 GB RAM)** can stream 1080p 60FPS continuously 24 hours a day, 365 days a year at less than 5% CPU usage.

---

## 2. Difficulty Breakdown

| Level | Complexity | What It Entails | Difficulty |
| :--- | :--- | :--- | :--- |
| **Level 1: Basic Looper** | Simple bash/PowerShell script calling FFmpeg to loop one or more videos indefinitely. | Suitable for a fixed playlist with identical video specs. | **2/10** |
| **Level 2: Robust Daemon** | Systemd service / Docker container with auto-restart on network drop, logging, and crash recovery. | Handles VPS reboots, YouTube ingest disconnects, and continuous background uptime. | **4/10** |
| **Level 3: True Dynamic Engine** | Background orchestrator (Python/Node.js) with dynamic playlist queue, shuffling, hot file additions without cutting the live stream, and automated media standardization. | Production-grade 24/7 channel (like Lofi Girl or live TV simulator). | **6.5/10** |

### Where the Real Challenges Lie:
1. **Codec / Spec Inconsistencies:**
   If you try to stream two MP4 files with different resolutions (e.g., 720p and 1080p), different framerates (24fps vs 30fps), or different audio sample rates (44.1kHz vs 48kHz) using stream copy (`-c copy`), FFmpeg or the RTMP demuxer will crash or YouTube will reject the stream.
2. **Network Interruptions & RTMP Reconnects:**
   Every live stream occasionally experiences brief network drops. The engine must automatically reconnect without dropping the YouTube broadcast session (using YouTube's persistent stream key).
3. **Queue Updates Without Stopping the Stream:**
   Appending or removing videos on the fly without interrupting the live feed requires feeding FFmpeg via a named pipe (`FIFO`), a local RTMP/SRT relay server, or a concat list demuxer.
4. **YouTube Ingestion Rules:**
   YouTube expects a continuous, constant framerate (CFR) feed with fixed keyframe intervals (GOP size of 2 seconds / 60 frames for 30fps).

---

## 3. Processing Power & Hardware Requirements

Hardware needs depend entirely on **how** you process the video:

### Mode A: Direct Stream Copy (Recommended)
All video files are standardized beforehand to identical specs (e.g., 1080p, H.264 video, AAC audio, 2-second keyframes). FFmpeg merely packages the pre-encoded data into an RTMP stream and sends it to YouTube.

- **CPU Usage:** **2% – 5%** (negligible, handles network I/O only).
- **RAM Usage:** **~100 MB – 300 MB**.
- **Recommended VPS:** 
  - 1 vCPU (AMD/Intel modern shared or dedicated)
  - 1 GB – 2 GB RAM
  - 20 GB – 50 GB NVMe SSD (depends on file library size)
  - **Estimated Cost:** $3.50 – $6.00 / month (e.g., Hetzner, Contabo, OVH, DigitalOcean, Linode).

### Mode B: Real-Time Transcoding (On-the-Fly Encoding)
If files of completely random formats, resolutions, and bitrates must be fed into the engine and re-encoded in real time:

- **CPU Usage:** **60% – 90%** continuous load across multiple cores (using `libx264` preset `veryfast` or `ultrafast`).
- **RAM Usage:** **500 MB – 1.5 GB**.
- **Recommended VPS:**
  - 4 vCPUs (or a dedicated server with Intel QuickSync / NVIDIA NVENC GPU)
  - 4 GB – 8 GB RAM
  - **Estimated Cost:** $20 – $50+ / month.

> **Rule of Thumb:** Always pre-encode library files into a uniform format upon upload. This reduces VPS compute costs by ~80% and eliminates streaming lag.

---

## 4. Bandwidth Requirements

YouTube requires a steady bitrate for a smooth broadcast:

| Quality | Target Bitrate | Bandwidth per Hour | Bandwidth per Month (24/7) |
| :--- | :--- | :--- | :--- |
| **720p @ 30 FPS** | 2,500 kbps | ~1.1 GB / hr | **~800 GB / month** |
| **1080p @ 30 FPS** | 4,500 kbps | ~2.0 GB / hr | **~1.45 TB / month** |
| **1080p @ 60 FPS** | 6,000 kbps | ~2.7 GB / hr | **~1.95 TB / month** |

- **VPS Network Port:** 100 Mbps or 1 Gbps (standard on almost all VPS providers).
- **Traffic Quota:** Ensure the VPS includes at least **3 TB to unmetered monthly outbound bandwidth**.

---

## 5. Architectural Blueprint

```
[ Video Library (Pre-encoded MP4s) ]
                 │
                 ▼
[ Queue Orchestrator / Playlist (JSON / text) ]
                 │
                 ▼
[ FFmpeg Core Engine (-re -c:v copy -c:a copy) ]
                 │
        (RTMP Stream via TLS)
                 │
                 ▼
[ YouTube Ingestion Server (rtmp://a.rtmp.youtube.com/live2/<STREAM_KEY>) ]
                 │
                 ▼
[ YouTube 24/7 Live Broadcast ]
```

### Core Components:
1. **Media Standardizer:** A one-time conversion script that validates and normalizes all incoming videos to H.264 High Profile, AAC 48kHz stereo, constant 30/60 fps, and 2-second GOP (Keyframe every 2s).
2. **Streaming Runner:** FFmpeg executed with:
   - `-re`: Reads input at native frame rate (real-time).
   - `-f concat`: Reads consecutive items from a playlist file.
   - `-c copy`: Streams without CPU encoding overhead.
   - `-flvflags no_duration_filesize`: Optimizes for indefinite live streaming.
3. **Supervisor / Watchdog:** Systemd service or Docker restart policy (`restart: always`) wrapped with an auto-retry loop to handle transient network hiccups.

---

## 6. Your VPS Specifications Evaluation (1 GB RAM / 7 GB Storage)

### A. Is 1 GB RAM Enough or Should You Upgrade to 2 GB?
- **For Streaming (`-c copy` mode):** **1 GB RAM is 100% sufficient.**
  - Debian/Ubuntu minimal consumes ~120 MB RAM.
  - FFmpeg streaming pre-encoded video consumes ~80–150 MB RAM.
  - Total usage is under 300 MB, leaving ~700 MB free.
  - *Pro Tip:* Always enable a 1 GB – 2 GB swap file on the disk as a safety cushion against Out-of-Memory (OOM) crashes.
- **When would 2 GB be needed?** Only if you run a heavy web UI dashboard or perform heavy on-server video transcoding while simultaneously streaming.

### B. What Does "Unmetered CPU" Mean?
- "Unmetered CPU" means your VPS host does not throttle your CPU after prolonged usage (unlike AWS "burstable" T-series instances that throttle when CPU credits run out). 
- However, since we use direct stream copy (`-c copy`), streaming uses only **2% to 4% CPU**. You won't even scratch the CPU limits.

### C. Is 7 GB Storage Enough? (Mathematical Breakdown)
The base Linux OS takes around **1.5 GB to 2.0 GB**, leaving roughly **5.0 GB usable space** for your video library.

| Resolution | Recommended Bitrate | Storage Consumed Per Hour | Total Video Capacity on 5 GB Free Space |
| :--- | :--- | :--- | :--- |
| **720p @ 30fps** | 2,200 kbps (~275 KB/s) | ~1.0 GB / hr | **~5.0 hours of unique video** |
| **1080p @ 30fps** | 4,000 kbps (~500 KB/s) | ~1.8 GB / hr | **~2.7 hours of unique video** |

If your loop library is between 30 minutes to 3–4 hours, **7 GB is plenty**. If your library grows larger in the future, you can upgrade disk space or use external block storage.

---

## 7. Recommended Codec & Resolution Recipe

To prevent any stream cuts, frame drops, or YouTube ingestion issues, all videos must be normalized to:

- **Container:** `.mp4`
- **Video Codec:** `H.264` (`libx264`, High Profile, Level 4.0)
- **Audio Codec:** `AAC` (`aac`, 48000 Hz, Stereo, 128–160 kbps)
- **Framerate:** `30 fps` (Constant Frame Rate / CFR)
- **Keyframe Interval (GOP):** `60 frames` (exactly 2.0 seconds at 30 fps) — **Mandatory for YouTube Live**
- **Pixel Format:** `yuv420p`

### Is 720p Bad for Live Streaming?
**No, 720p is not bad at all.**
- Over 70% of YouTube live viewers watch on mobile phones where 720p is crisp and sharp.
- 720p uses roughly half the storage and bandwidth of 1080p, drastically lowering the risk of network buffering on lower-tier VPS connections.
- **Recommendation:** Use **720p (1280x720)** if maximizing your 7 GB disk storage for more video hours is a priority. Use **1080p (1920x1080)** if your library is short (<2.5 hours) and visual sharpness is top priority.

---

## 8. The Two-Stage "Zero Cut" Production Pipeline

To guarantee 100% uptime with zero buffering, black frames, or cuts between videos:

```
[ Incoming Raw Videos ] 
          │
          ▼
[ Stage 1: Local / Offline Normalizer Script ]
(Converts any video to standard 720p/1080p 30fps GOP=60)
          │
          ▼
[ Uploaded to VPS `library/` folder ]
          │
          ▼
[ Stage 2: 24/7 FFmpeg Concat Broadcaster ]
(Streams seamlessly with `-stream_loop -1` and `-c copy`)
          │
          ▼
[ YouTube RTMP (Flawless, continuous 24/7 broadcast) ]
```

1. **Pre-conversion Script:** Converts any source file to standard parameters before it ever touches the live stream.
2. **Seamless Concat Demuxer:** FFmpeg reads consecutive files from a text playlist or looped list. Because all files have identical timestamps, codecs, and sample rates, transitions happen in 0 milliseconds without stopping the RTMP connection.

