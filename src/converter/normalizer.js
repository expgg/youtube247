import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { CONFIG } from '../../config/index.js';
import logger from '../utils/logger.js';
import { probeFile } from './probe.js';

/**
 * Normalizes a single video file to the exact standard profile required for 24/7 streaming
 * @param {string} inputPath Full path to source video
 * @param {string} outputPath Full path to target standardized video
 * @param {object} profile Target profile configuration
 */
export function normalizeVideo(inputPath, outputPath, profile = CONFIG.streamProfile) {
  return new Promise((resolve, reject) => {
    logger.info(`Starting normalization for: ${pc.bold(path.basename(inputPath))}`);
    logger.info(`Target profile: ${profile.name} (${profile.width}x${profile.height} @ ${profile.fps}fps, GOP=${profile.gop})`);

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Video filter: Scale with padding to keep 16:9 ratio without stretching
    const videoFilter = `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;

    const args = [
      '-y', // Overwrite
      '-i', inputPath,
      // Video encoding
      '-vf', videoFilter,
      '-r', String(profile.fps),
      '-c:v', 'libx264',
      '-preset', profile.preset,
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-g', String(profile.gop),
      '-keyint_min', String(profile.gop),
      '-sc_threshold', '0',
      '-b:v', profile.videoBitrate,
      '-maxrate', profile.maxRate,
      '-bufsize', profile.bufSize,
      // Audio encoding
      '-c:a', 'aac',
      '-b:a', profile.audioBitrate,
      '-ar', String(profile.audioSampleRate),
      '-ac', String(profile.audioChannels),
      // Container optimizations
      '-movflags', '+faststart',
      outputPath
    ];

    const proc = spawn('ffmpeg', args);
    let errorLog = '';

    proc.stderr.on('data', data => {
      const line = data.toString();
      errorLog += line;

      // Extract real-time conversion speed/progress if available
      const timeMatch = line.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
      const speedMatch = line.match(/speed=\s*([\d\.]+x)/);
      if (timeMatch && speedMatch) {
        process.stdout.write(`\r  ⚡ Progress: ${timeMatch[1]} (Speed: ${speedMatch[1]})`);
      }
    });

    proc.on('close', code => {
      process.stdout.write('\n');
      if (code === 0) {
        logger.success(`Successfully normalized: ${pc.bold(path.basename(outputPath))}`);
        resolve(outputPath);
      } else {
        logger.error(`Normalization failed for ${path.basename(inputPath)} with code ${code}`);
        reject(new Error(`FFmpeg exited with code ${code}.\n${errorLog.slice(-500)}`));
      }
    });

    proc.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Scans media/raw/ and normalizes any video into media/processed/
 */
export async function normalizeAll() {
  if (!fs.existsSync(CONFIG.rawDir)) {
    fs.mkdirSync(CONFIG.rawDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.processedDir)) {
    fs.mkdirSync(CONFIG.processedDir, { recursive: true });
  }

  const supportedExts = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.flv', '.ts'];
  const files = fs.readdirSync(CONFIG.rawDir)
    .filter(f => supportedExts.includes(path.extname(f).toLowerCase()));

  if (files.length === 0) {
    logger.warn(`No video files found in ${CONFIG.rawDir}.`);
    logger.info(`Supported extensions: ${supportedExts.join(', ')}`);
    return [];
  }

  logger.info(`Found ${files.length} raw video(s) to process.`);
  const results = [];

  for (const file of files) {
    const rawPath = path.join(CONFIG.rawDir, file);
    const targetName = path.parse(file).name + '.mp4';
    const targetPath = path.join(CONFIG.processedDir, targetName);

    try {
      await normalizeVideo(rawPath, targetPath);
      results.push(targetPath);
    } catch (err) {
      logger.error(`Failed to process ${file}`, err);
    }
  }

  logger.success(`Batch normalization finished. ${results.length}/${files.length} videos ready in media/processed/`);
  return results;
}

export default { normalizeVideo, normalizeAll };
