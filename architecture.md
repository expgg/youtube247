# 24/7 YouTube Live Engine — Architecture & Modular Design

## 1. Best Language Selection: Node.js vs. Python

Both **Node.js (TypeScript / JavaScript ES Modules)** and **Python 3** are top-tier choices for this project on a 1 GB RAM VPS.

| Feature | Node.js (Recommended for Web/API) | Python (Recommended for Media/CLI) |
| :--- | :--- | :--- |
| **RAM Footprint** | ~35 MB – 50 MB | ~30 MB – 45 MB |
| **FFmpeg Process Control** | Excellent (`child_process.spawn` with stream events) | Excellent (`asyncio.subprocess` / `subprocess`) |
| **YouTube API Support** | Official `googleapis` client | Official `google-api-python-client` |
| **Web Dashboard / Control** | Ultra-lightweight (Fastify or Express) | Lightweight (FastAPI or Flask) |
| **Best For** | Clean async event loops, web control panel, live status websockets. | Data manipulation, quick scripting, CLI-first workflows. |

**Final Recommendation:** **Node.js (ES Modules)** or **Python (FastAPI + asyncio)**.  
Below, we present the clean modular folder structure designed to work seamlessly in either language (structure is language-agnostic).

---

## 2. Clean Modular Folder Structure

```
youtube-247-live/
├── .env.example                 # Environment config template (Stream key, API keys, ports)
├── .gitignore                   # Ignore node_modules, .env, media/raw, logs
├── package.json (or pyproject)  # Dependencies & scripts
├── overview.md                  # Project evaluation & specs
├── architecture.md              # System design & folder breakdown
│
├── config/                      # Application Configuration
│   ├── index.js                 # Centralized config loader & env validator
│   └── profiles.js              # Standard video profiles (720p 30fps GOP=60, 1080p, etc.)
│
├── src/
│   ├── auth/                    # YouTube Authentication & Channel Selection
│   │   ├── oauth.js             # OAuth2 token generator & automatic token refresher
│   │   ├── channel-manager.js   # Lists owned channels, gets active stream key
│   │   └── tokens.json          # Persisted refresh tokens (ignored by git)
│   │
│   ├── converter/               # Video Normalizer & Validator
│   │   ├── probe.js             # Uses ffprobe to inspect input files (res, fps, codecs)
│   │   ├── normalizer.js        # FFmpeg converter enforcing 30fps, AAC 48k, GOP=60
│   │   └── queue.js             # Batch processor for newly uploaded raw videos
│   │
│   ├── streamer/                # Core Broadcast Engine
│   │   ├── playlist.js          # Generates seamless concat playlist text files
│   │   ├── engine.js            # Launches & monitors FFmpeg (`-re -c copy`)
│   │   └── watchdog.js          # Auto-healer: detects network drops & reconnects in 3s
│   │
│   ├── api/                     # Optional Lightweight Dashboard / Webhooks
│   │   ├── server.js            # Fastify/Express server for status & control
│   │   └── routes.js            # Start/stop, list library, switch channels
│   │
│   └── index.js                 # Main Application Entry Point
│
├── media/                       # Video Storage
│   ├── raw/                     # Incoming raw videos uploaded by user (to be converted)
│   ├── processed/               # Stream-ready standardized MP4s (ready for 24/7 loop)
│   └── playlists/               # Dynamic FFmpeg concat files (`playlist.txt`)
│
├── system/                      # Deployment & Production Daemons
│   ├── install-swap.sh          # Auto-configures 1GB/2GB swap file on 1GB VPS
│   └── youtube-live.service     # Linux systemd service for 100% 24/7 background uptime
│
└── logs/                        # Rotation logs (FFmpeg output, watchdog restarts)
```

---

## 3. How Logins & Channel Selection Will Work

There are two primary ways to connect to YouTube Live. We support **both**, with Method A as the primary bulletproof baseline:

### Method A: Persistent Stream Key (Zero Token Overhead — Recommended)
- In **YouTube Studio** (`studio.youtube.com`), navigate to **Go Live** -> **Stream**.
- Create a stream named "24/7 Live" and select:
  - **Enable Auto-start**: ON
  - **Enable Auto-stop**: OFF
  - **Stream Latency**: Normal Latency (Best for 24/7 stability)
  - **Persistent Stream Key**: Copy the secret key (`xxxx-xxxx-xxxx-xxxx-xxxx`).
- Paste into `.env`:
  ```env
  YOUTUBE_STREAM_URL=rtmp://a.rtmp.youtube.com/live2
  YOUTUBE_STREAM_KEY=xxxx-xxxx-xxxx-xxxx-xxxx
  ```
- **Channel Selection:** If you have multiple channels, you just create a stream key in each channel's YouTube Studio and save them in `.env` (e.g. `CHANNEL_A_KEY`, `CHANNEL_B_KEY`).
- **Why this is best:** Zero OAuth tokens to expire, zero Google Cloud API quota limits, and 100% stable 365 days a year.

---

### Method B: Google OAuth2 & YouTube Data API v3 (Programmatic Channel Switching)
If you want to authenticate with your Google account directly and pick channels from a menu or web dashboard:

1. **Google Cloud Console Setup:**
   - Create a free Google Cloud project.
   - Enable **YouTube Data API v3**.
   - Create OAuth 2.0 Client Credentials (`client_id`, `client_secret`).
2. **Headless VPS Login Flow (Device Code Flow or Auth URL):**
   - The CLI/Server outputs an authorization URL:
     ```
     👉 Please visit: https://accounts.google.com/o/oauth2/auth?...
     👉 Enter authorization code: [ ____________ ]
     ```
   - You click the link in your desktop browser, authorize your Google account, and paste the code into the terminal (or complete it via the local web dashboard).
   - The engine securely stores the `refresh_token` in `src/auth/tokens.json`.
3. **Channel Discovery & Selection:**
   - The engine calls `youtube.channels.list({ part: 'snippet,contentDetails', mine: true })`.
   - YouTube returns all channels associated with your Google account:
     ```
     [1] Lofi Beats 24/7 (ID: UC_xxxx1)
     [2] Gaming Highlights (ID: UC_xxxx2)
     Select channel to stream to: 1
     ```
   - The engine calls `youtube.liveStreams.list()` to fetch the RTMP ingestion URL and stream key for the chosen channel automatically.
   - When you want to switch channels, you pick another channel from the CLI or dashboard, and the streamer smoothly switches keys!
