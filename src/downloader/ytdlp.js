import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { CONFIG } from '../../config/index.js';
import logger from '../utils/logger.js';

/**
 * Downloads a video from YouTube or any supported site via yt-dlp into media/raw/
 * @param {string} url Target video URL
 * @param {object} options Optional settings (e.g. filename)
 * @returns {Promise<string>} Path to downloaded raw video file
 */
export function downloadVideo(url, options = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CONFIG.rawDir)) {
      fs.mkdirSync(CONFIG.rawDir, { recursive: true });
    }

    logger.info(`Initiating yt-dlp download for: ${pc.bold(url)}`);

    // Output template: media/raw/%(title)s.%(ext)s (sanitized)
    const outputTemplate = path.join(CONFIG.rawDir, '%(title)s.%(ext)s');

    const args = [
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android,web',
      '-f', 'bv*+ba/b',
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--no-mtime',
      '--no-part',
      url
    ];

    const proc = spawn('yt-dlp', args);
    let downloadedFilePath = null;
    let fullOutput = '';

    proc.stdout.on('data', data => {
      const text = data.toString();
      fullOutput += text;

      // Extract filename when yt-dlp announces destination or merging
      const destMatch = text.match(/\[(?:download|Merger)\] Destination:\s*(.+)/);
      if (destMatch) {
        downloadedFilePath = destMatch[1].trim();
      }

      // Already downloaded message
      const alreadyMatch = text.match(/\[download\]\s*(.+?)\s*has already been downloaded/);
      if (alreadyMatch) {
        downloadedFilePath = alreadyMatch[1].trim();
      }

      // Real-time download progress
      const progressMatch = text.match(/\[download\]\s*([\d\.]+)%\s*of\s*~?([\d\.]+\w+)\s*at\s*([\d\.]+\w+\/s)\s*ETA\s*([\d:]+)/);
      if (progressMatch) {
        process.stdout.write(
          `\r  📥 Downloading: ${pc.cyan(progressMatch[1] + '%')} of ${progressMatch[2]} at ${progressMatch[3]} (ETA: ${progressMatch[4]})`
        );
      }
    });

    proc.stderr.on('data', data => {
      const text = data.toString();
      if (!text.includes('WARNING:')) {
        fullOutput += text;
      }
    });

    proc.on('close', code => {
      process.stdout.write('\n');
      if (code === 0) {
        // If downloadedFilePath wasn't caught directly from regex, find the newest file in rawDir
        if (!downloadedFilePath || !fs.existsSync(downloadedFilePath)) {
          const files = fs.readdirSync(CONFIG.rawDir)
            .map(f => ({ name: f, time: fs.statSync(path.join(CONFIG.rawDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);
          if (files.length > 0) {
            downloadedFilePath = path.join(CONFIG.rawDir, files[0].name);
          }
        }

        logger.success(`Download complete: ${pc.bold(path.basename(downloadedFilePath))}`);
        resolve(downloadedFilePath);
      } else {
        logger.error(`yt-dlp exited with error code ${code}`);
        reject(new Error(`yt-dlp download failed:\n${fullOutput.slice(-500)}`));
      }
    });

    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        logger.error('yt-dlp executable was not found on your system PATH!');
      }
      reject(err);
    });
  });
}

export default { downloadVideo };
