import fs from 'fs';
import path from 'path';
import { CONFIG } from '../../config/index.js';
import logger from '../utils/logger.js';

/**
 * Discovers processed MP4s and generates an FFmpeg concat demuxer playlist file
 * @param {boolean} shuffle Whether to randomize video sequence
 * @returns {object} { playlistPath, videoCount, files }
 */
export function generatePlaylist(shuffle = CONFIG.shufflePlaylist) {
  if (!fs.existsSync(CONFIG.processedDir)) {
    fs.mkdirSync(CONFIG.processedDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.playlistsDir)) {
    fs.mkdirSync(CONFIG.playlistsDir, { recursive: true });
  }

  // Find all .mp4 files in media/processed/
  const files = fs.readdirSync(CONFIG.processedDir)
    .filter(file => path.extname(file).toLowerCase() === '.mp4')
    .map(file => path.join(CONFIG.processedDir, file));

  if (files.length === 0) {
    throw new Error(`No normalized MP4 videos found in ${CONFIG.processedDir}. Run 'npm run normalize' first.`);
  }

  // Optional shuffle
  let orderedFiles = [...files];
  if (shuffle) {
    for (let i = orderedFiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [orderedFiles[i], orderedFiles[j]] = [orderedFiles[j], orderedFiles[i]];
    }
  }

  // Build FFmpeg concat file content
  // Note: FFmpeg concat demuxer on both Linux and Windows expects forward slashes
  const lines = orderedFiles.map(filePath => {
    const normalizedPath = filePath.replace(/\\/g, '/').replace(/'/g, "'\\''");
    return `file '${normalizedPath}'`;
  });

  const playlistPath = path.join(CONFIG.playlistsDir, 'active_playlist.txt');
  fs.writeFileSync(playlistPath, lines.join('\n') + '\n', 'utf8');

  logger.info(`Playlist generated with ${orderedFiles.length} video(s): ${playlistPath}`);
  return {
    playlistPath,
    videoCount: orderedFiles.length,
    files: orderedFiles
  };
}

export default { generatePlaylist };
