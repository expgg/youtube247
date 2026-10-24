import { spawn } from 'child_process';
import EventEmitter from 'events';
import pc from 'picocolors';
import logger from '../utils/logger.js';

export class StreamEngine extends EventEmitter {
  constructor(playlistPath, rtmpTargetUrl) {
    super();
    this.playlistPath = playlistPath;
    this.rtmpTargetUrl = rtmpTargetUrl;
    this.ffmpegProcess = null;
    this.isStopping = false;
    this.startTime = null;
  }

  start() {
    this.isStopping = false;
    this.startTime = Date.now();

    // Mask stream key in logs for security
    const maskedUrl = this.rtmpTargetUrl.replace(/(live2\/)([a-zA-Z0-9\-_]+)/, '$1****');
    logger.stream(`Initializing FFmpeg RTMP pipeline to: ${pc.bold(maskedUrl)}`);

    const args = [
      '-re',                             // Read input in native real-time frame rate
      '-f', 'concat',                    // Use concat demuxer
      '-safe', '0',                      // Allow absolute paths
      '-stream_loop', '-1',              // Infinite loop across the playlist
      '-i', this.playlistPath,           // Input playlist file
      '-c', 'copy',                      // DIRECT STREAM COPY: ZERO CPU TRANSCODING
      '-flvflags', 'no_duration_filesize', // Optimize FLV container for 24/7 continuous stream
      '-f', 'flv',                       // Target container format
      this.rtmpTargetUrl                 // Target RTMP ingestion endpoint
    ];

    this.ffmpegProcess = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    this.ffmpegProcess.stdout.on('data', () => {});

    this.ffmpegProcess.stderr.on('data', data => {
      const line = data.toString();

      // Parse FFmpeg telemetry stats: frame= 120 fps= 30 q=-1.0 size= 2400kB time=00:00:04.00 bitrate=4915.2kbits/s speed=1.0x
      const timeMatch = line.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
      const fpsMatch = line.match(/fps=\s*([\d\.]+)/);
      const bitrateMatch = line.match(/bitrate=\s*([\d\.]+\s*kbits\/s)/);
      const speedMatch = line.match(/speed=\s*([\d\.]+x)/);

      if (timeMatch && bitrateMatch) {
        const stats = {
          time: timeMatch[1],
          fps: fpsMatch ? fpsMatch[1] : '30',
          bitrate: bitrateMatch[1],
          speed: speedMatch ? speedMatch[1] : '1.0x',
          uptimeSec: Math.floor((Date.now() - this.startTime) / 1000)
        };
        this.emit('stats', stats);
      }
    });

    this.ffmpegProcess.on('close', (code, signal) => {
      if (this.isStopping) {
        logger.info('Stream engine stopped gracefully.');
        this.emit('stopped');
      } else {
        logger.warn(`FFmpeg process exited unexpectedly with code ${code} (Signal: ${signal})`);
        this.emit('crashed', { code, signal });
      }
    });

    this.ffmpegProcess.on('error', err => {
      logger.error('Failed to launch FFmpeg process', err);
      this.emit('error', err);
    });

    return this;
  }

  stop() {
    this.isStopping = true;
    if (this.ffmpegProcess) {
      logger.info('Stopping FFmpeg stream engine...');
      try {
        this.ffmpegProcess.kill('SIGINT');
      } catch (e) {
        this.ffmpegProcess.kill();
      }
    }
  }
}

export default StreamEngine;
