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
        return reject(new Error(`ffprobe failed with exit code ${code}: ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        const videoStream = parsed.streams?.find(s => s.codec_type === 'video');
        const audioStream = parsed.streams?.find(s => s.codec_type === 'audio');

        // Calculate FPS
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
        reject(new Error(`Failed to parse ffprobe JSON output: ${err.message}`));
      }
    });

    proc.on('error', err => {
      reject(err);
    });
  });
}

export default probeFile;
