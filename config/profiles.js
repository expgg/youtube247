/**
 * Standard YouTube 24/7 Live Stream Profiles
 * Crucial: GOP must be 2 seconds (framerate * 2) for YouTube ingestion stability.
 */
export const PROFILES = {
  '720p': {
    name: '720p (Optimized for 1GB VPS & Low Bandwidth)',
    width: 1280,
    height: 720,
    fps: 30,
    gop: 60, // Exactly 2 seconds at 30fps
    videoBitrate: '2200k',
    maxRate: '2500k',
    bufSize: '4400k',
    audioBitrate: '128k',
    audioSampleRate: 48000,
    audioChannels: 2,
    preset: 'veryfast',
    crf: 22
  },
  '1080p': {
    name: '1080p (Full HD Quality)',
    width: 1920,
    height: 1080,
    fps: 30,
    gop: 60,
    videoBitrate: '4000k',
    maxRate: '4500k',
    bufSize: '8000k',
    audioBitrate: '160k',
    audioSampleRate: 48000,
    audioChannels: 2,
    preset: 'veryfast',
    crf: 22
  }
};

export function getProfile(profileName = '720p') {
  return PROFILES[profileName] || PROFILES['720p'];
}
