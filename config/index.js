import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProfile } from './profiles.js';

// Resolve project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

export const CONFIG = {
  // Paths
  rootDir: ROOT_DIR,
  mediaDir: path.resolve(ROOT_DIR, process.env.MEDIA_DIR || './media'),
  rawDir: path.resolve(ROOT_DIR, process.env.MEDIA_DIR || './media', 'raw'),
  processedDir: path.resolve(ROOT_DIR, process.env.MEDIA_DIR || './media', 'processed'),
  playlistsDir: path.resolve(ROOT_DIR, process.env.MEDIA_DIR || './media', 'playlists'),
  logsDir: path.resolve(ROOT_DIR, 'logs'),
  tokensPath: path.resolve(ROOT_DIR, 'src', 'auth', 'tokens.json'),

  // YouTube RTMP Stream Config
  youtubeStreamUrl: process.env.YOUTUBE_STREAM_URL || 'rtmp://a.rtmp.youtube.com/live2',
  youtubeStreamKey: process.env.YOUTUBE_STREAM_KEY || '',

  // Google OAuth2 Config (optional)
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',

  // Stream Profile
  streamProfileName: process.env.STREAM_PROFILE || '720p',
  get streamProfile() {
    return getProfile(this.streamProfileName);
  },

  // Engine Behaviors
  shufflePlaylist: process.env.SHUFFLE_PLAYLIST === 'true',
  reconnectDelayMs: parseInt(process.env.RECONNECT_DELAY_MS || '3000', 10)
};

export default CONFIG;
