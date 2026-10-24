import { spawn } from 'child_process';
import logger from '../utils/logger.js';

/**
 * Probes a video file using ffprobe and returns parsed stream metadata
 * @param {string} filePath Absolute or relative path to media file
 * @returns {Promise<object>} Parsed metadata object
 */
export function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];

    const proc = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      stdout += data.toString();
    });

    proc.stderr.on('data', data => {
      stderr += data.toString();
    });

    proc.on('close', code => {
      if (code !== 0) {
        return probeWithFfmpeg(filePath).then(resolve).catch(reject);
      }

      try {
        const parsed = JSON.parse(stdout);
        const videoStream = parsed.streams?.find(s => s.codec_type === 'video');
        const audioStream = parsed.streams?.find(s => s.codec_type === 'audio');

        let fps = 30;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && den > 0) {
            fps = Math.round(num / den);
          }
        }

        resolve({
          format: parsed.format?.format_name,
          duration: parseFloat(parsed.format?.duration || '0'),
          sizeBytes: parseInt(parsed.format?.size || '0', 10),
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps,
            pixFmt: videoStream.pix_fmt
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            sampleRate: parseInt(audioStream.sample_rate || '48000', 10),
            channels: audioStream.channels
          } : null
        });
      } catch (err) {
        probeWithFfmpeg(filePath).then(resolve).catch(reject);
      }
    });

    proc.on('error', () => {
      // Fallback if ffprobe executable is not found
      probeWithFfmpeg(filePath).then(resolve).catch(reject);
    });
  });
}

/**
 * Fallback metadata probe using ffmpeg -i stderr output
 */
function probeWithFfmpeg(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-i', filePath]);
    let stderr = '';

    proc.stderr.on('data', data => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      // Parse resolution (e.g., 288x640 or 1920x1080)
      const resMatch = stderr.match(/Video:.*?,\s*(\d{2,5})x(\d{2,5})/);
      // Parse FPS (e.g. 30 fps)
      const fpsMatch = stderr.match(/([\d\.]+)\s*fps/);
      // Parse Duration (e.g. Duration: 00:59:39.12)
      const durMatch = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);

      let duration = 0;
      if (durMatch) {
        duration = parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3]);
      }

      resolve({
        format: 'mp4',
        duration,
        video: resMatch ? {
          width: parseInt(resMatch[1], 10),
          height: parseInt(resMatch[2], 10),
          fps: fpsMatch ? Math.round(parseFloat(fpsMatch[1])) : 30
        } : null,
        audio: {
          sampleRate: 48000,
          channels: 2
        }
      });
    });

    proc.on('error', err => reject(err));
  });
}

export default probeFile;
