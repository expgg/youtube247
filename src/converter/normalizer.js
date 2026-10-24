import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { CONFIG } from '../../config/index.js';
import logger from '../utils/logger.js';
import { probeFile } from './probe.js';

let nvencSupported = null;
function hasNvenc() {
  if (nvencSupported !== null) return nvencSupported;
  try {
    const out = execSync('ffmpeg -encoders', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    nvencSupported = out.includes('h264_nvenc');
  } catch (e) {
    nvencSupported = false;
  }
  return nvencSupported;
}

/**
 * Normalizes a single video file to the exact standard profile required for 24/7 streaming
 * @param {string} inputPath Full path to source video
 * @param {string} outputPath Full path to target standardized video
 * @param {object} options Target profile & fit options
 */
export function normalizeVideo(inputPath, outputPath, options = {}) {
  const profile = options.profile || CONFIG.streamProfile;
  const fitMode = options.fit || 'blur'; // 'blur' (blurred background), 'pad' (black bars), or 'fill' (crop to 9:16)
  const useGpu = hasNvenc();

  return new Promise((resolve, reject) => {
    logger.info(`Starting normalization for: ${pc.bold(path.basename(inputPath))}`);
    logger.info(`Target profile: ${profile.name} (${profile.width}x${profile.height} @ ${profile.fps}fps, GOP=${profile.gop})`);
    logger.info(`Fit mode: ${pc.cyan(fitMode)} | Hardware Acceleration: ${useGpu ? pc.green('NVIDIA NVENC (GPU)') : pc.yellow('libx264 (CPU)')}`);

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Build filter based on fitMode
    let filterArgs = [];

    if (fitMode === 'fill' || fitMode === 'crop') {
      // Zoom and crop to completely fill the target aspect ratio
      const videoFilter = `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=increase,crop=${profile.width}:${profile.height},setsar=1`;
      filterArgs = ['-vf', videoFilter];
    } else if (fitMode === 'blur') {
      // Blurred background + centered sharp foreground
      const complexFilter = `[0:v]scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=increase,crop=${profile.width}:${profile.height},boxblur=20:5[bg];[0:v]scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`;
      filterArgs = ['-filter_complex', complexFilter];
    } else {
      // 'pad' mode: scale to fit and pad with black borders
      const videoFilter = `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
      filterArgs = ['-vf', videoFilter];
    }

    const videoEncoderArgs = useGpu
      ? ['-c:v', 'h264_nvenc', '-preset', 'p4', '-profile:v', 'high', '-pix_fmt', 'yuv420p']
      : ['-c:v', 'libx264', '-preset', profile.preset, '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p'];

    const args = [
      '-y', // Overwrite
      '-i', inputPath,
      ...filterArgs,
      '-r', String(profile.fps),
      ...videoEncoderArgs,
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
export async function normalizeAll(options = {}) {
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
      await normalizeVideo(rawPath, targetPath, options);
      results.push(targetPath);
    } catch (err) {
      logger.error(`Failed to process ${file}`, err);
    }
  }

  logger.success(`Batch normalization finished. ${results.length}/${files.length} videos ready in media/processed/`);
  return results;
}

export default { normalizeVideo, normalizeAll };
