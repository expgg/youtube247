# 🔴 YouTube 24/7 Live Streaming Engine (v1.0)

A production-grade, headless 24/7 YouTube Live streaming engine designed to broadcast pre-recorded video loops continuously from a low-spec VPS (1 vCPU, 1 GB RAM, 7 GB SSD) with near-zero CPU overhead and zero stream cuts.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-5.0%2B-orange.svg)](https://ffmpeg.org/)

---

## ✨ Features

- **Direct Stream Copy (`-c copy`):** No on-the-fly transcoding. Uses less than **5% CPU** and **under 200 MB RAM** on a $4/mo VPS.
- **Auto-Healing Watchdog:** Instantly detects RTMP socket disconnections or network drops and reconnects automatically in 3 seconds without terminating your YouTube stream session.
- **Two-Stage Media Pipeline:**
  1. **Stage 1 (Normalizer):** Converts any raw video to standard 720p/1080p, H.264 High Profile, AAC 48kHz, and a strict 2.0-second GOP (keyframe interval).
  2. **Stage 2 (Broadcaster):** Loops pre-normalized videos seamlessly via the FFmpeg `concat` demuxer with 0ms transition delay.
- **Zero-Maintenance Stream Key Mode:** Broadcast using YouTube's persistent RTMP stream key (no OAuth expiration, no API quota limits).
- **Google OAuth2 & Channel Discovery:** Authenticate via terminal URL flow on a headless VPS to query your owned channels and active ingestion streams.
- **Diagnostic Doctor (`npm run doctor`):** One-command health check inspecting FFmpeg, RAM, disk space, and configurations.
- **Production `systemd` Daemon:** Runs in the background and auto-starts on VPS reboot.

---

## 📁 Repository Structure

```text
youtube247/
├── config/                      # Profiles (720p, 1080p) & central config
├── src/
│   ├── auth/                    # OAuth2 & channel manager
│   ├── converter/               # Media normalizer & ffprobe inspector
│   ├── streamer/                # FFmpeg engine & auto-recovery watchdog
│   ├── utils/                   # Logger & system doctor
│   └── index.js                 # Unified CLI entrypoint
├── media/
│   ├── raw/                     # Drop incoming raw video files here
│   ├── processed/               # Stream-ready standardized MP4s
│   └── playlists/               # Generated FFmpeg concat files
├── system/                      # systemd daemon & swap setup scripts
├── overview.md                  # Hardware & spec evaluation
├── architecture.md              # System architecture & design notes
└── package.json
```

---

## 🚀 Quick Start (Local or VPS)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **FFmpeg & FFprobe**: Installed and available in your system `PATH`

On Ubuntu/Debian:
```bash
sudo apt update && sudo apt install -y nodejs npm ffmpeg
```

### 2. Installation
```bash
git clone https://github.com/expgg/youtube247.git
cd youtube247
npm install
```

### 3. Configure `.env`
Copy the template and fill in your YouTube Stream Key:
```bash
cp .env.example .env
nano .env
```
Set your persistent stream key from **YouTube Studio** (`studio.youtube.com -> Go Live -> Stream`):
```env
YOUTUBE_STREAM_URL=rtmp://a.rtmp.youtube.com/live2
YOUTUBE_STREAM_KEY=xxxx-xxxx-xxxx-xxxx-xxxx
STREAM_PROFILE=720p
```

### 4. Run System Diagnostics
```bash
npm run doctor
```

---

## 🎬 Video Workflow (Adding & Normalizing)

### Step 1: Add Raw Videos
Place any `.mp4`, `.mkv`, `.mov`, or `.webm` files into `media/raw/`:
```bash
cp /path/to/my-video.mp4 media/raw/
```

### Step 2: Normalize Media
Run the batch normalizer to convert raw videos into stream-ready 720p (or 1080p) files with fixed 2-second keyframes:
```bash
npm run normalize
```
*Standardized files will be output to `media/processed/`.*

### Step 3: Start 24/7 Live Stream
```bash
npm start
```
The engine will initialize the playlist, launch FFmpeg, and display real-time live telemetry:
```text
● LIVE [Uptime: 04:12:30] [Stream Time: 00:05:42.10] [Speed: 1.00x] [Bitrate: 2200kbits/s] [Reconnects: 0]
```

---

## 🖥️ Deploying 24/7 on a Linux VPS

### 1. Set Up Swap (Crucial for 1GB RAM VPS)
Run the included swap setup script to add 2GB of virtual memory:
```bash
sudo bash system/install-swap.sh
```

### 2. Configure `systemd` Background Service
Edit `system/youtube-live.service` to match your directory if needed, then install it:
```bash
sudo cp system/youtube-live.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable youtube-live
sudo systemctl start youtube-live
```

### 3. Check Live Status & Logs
```bash
# Check service status
sudo systemctl status youtube-live

# View live broadcast logs
tail -f logs/engine.log
```

---

## ⚙️ CLI Commands Reference

| Command | Description |
| :--- | :--- |
| `npm start` or `node src/index.js stream` | Starts the 24/7 live stream watchdog engine. |
| `npm run normalize` | Batch converts videos in `media/raw/` to standardized stream profiles. |
| `npm run doctor` | Performs a system health check (FFmpeg, RAM, disk, keys). |
| `npm run auth` | Initiates Google OAuth2 login via terminal URL. |
| `npm run channels` | Lists all YouTube channels and live stream ingestion endpoints. |

---

## 📄 License
MIT © [expgg](https://github.com/expgg)
