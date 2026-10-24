import pc from 'picocolors';
import { CONFIG } from '../../config/index.js';
import logger from '../utils/logger.js';
import { StreamEngine } from './engine.js';
import { generatePlaylist } from './playlist.js';

export class Watchdog {
  constructor(options = {}) {
    this.streamKey = options.streamKey || CONFIG.youtubeStreamKey;
    this.streamUrl = options.streamUrl || CONFIG.youtubeStreamUrl;
    this.reconnectDelayMs = options.reconnectDelayMs || CONFIG.reconnectDelayMs;
    this.reconnectCount = 0;
    this.activeEngine = null;
    this.isRunning = false;
    this.totalUptimeStart = null;
  }

  async start() {
    if (!this.streamKey || !this.streamKey.trim()) {
      logger.error('Cannot start 24/7 stream: No YouTube Stream Key provided!');
      logger.info('Please set YOUTUBE_STREAM_KEY in your .env file.');
      process.exit(1);
    }

    this.isRunning = true;
    this.totalUptimeStart = Date.now();
    logger.stream(pc.bold(pc.green('🚀 Launching YouTube 24/7 Live Broadcast Engine...')));

    // Clean exit handlers
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    this.runLoop();
  }

  async runLoop() {
    while (this.isRunning) {
      try {
        // 1. Generate / refresh playlist
        const { playlistPath, videoCount } = generatePlaylist();
        logger.info(`Loaded ${videoCount} video(s) for broadcast loop.`);

        // 2. Build full RTMP URL
        const fullRtmpUrl = `${this.streamUrl.replace(/\/$/, '')}/${this.streamKey.trim()}`;

        // 3. Launch stream engine
        this.activeEngine = new StreamEngine(playlistPath, fullRtmpUrl);

        // Track stats output
        this.activeEngine.on('stats', stats => {
          const totalSec = Math.floor((Date.now() - this.totalUptimeStart) / 1000);
          const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
          const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
          const secs = String(totalSec % 60).padStart(2, '0');

          process.stdout.write(
            `\r${pc.red('● LIVE')} [Uptime: ${pc.bold(`${hrs}:${mins}:${secs}`)}] ` +
            `[Stream Time: ${stats.time}] [Speed: ${pc.cyan(stats.speed)}] ` +
            `[Bitrate: ${pc.green(stats.bitrate)}] [Reconnects: ${this.reconnectCount}]`
          );
        });

        // Wait for engine to exit/crash
        await new Promise(resolve => {
          this.activeEngine.on('stopped', () => resolve());
          this.activeEngine.on('crashed', err => resolve(err));
          this.activeEngine.on('error', err => resolve(err));
          this.activeEngine.start();
        });

      } catch (err) {
        logger.error('Watchdog encountered an error during loop setup', err);
      }

      if (!this.isRunning) break;

      this.reconnectCount++;
      process.stdout.write('\n');
      logger.warn(`Network/RTMP stream disconnected. Auto-reconnecting in ${this.reconnectDelayMs / 1000}s (Attempt #${this.reconnectCount})...`);
      await new Promise(r => setTimeout(r, this.reconnectDelayMs));
    }
  }

  shutdown() {
    if (!this.isRunning) return;
    this.isRunning = false;
    process.stdout.write('\n');
    logger.info('Shutting down 24/7 Watchdog and terminating stream engine...');
    if (this.activeEngine) {
      this.activeEngine.stop();
    }
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

export default Watchdog;
