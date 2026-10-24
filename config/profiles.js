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
    name: '1080p Horizontal (Full HD Quality)',
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
  },
  'vertical-720p': {
    name: 'Vertical 720p (720x1280 - 9:16 YouTube Shorts Live / VPS-Friendly)',
    width: 720,
    height: 1280,
    fps: 30,
    gop: 60,
    videoBitrate: '2200k',
    maxRate: '2500k',
    bufSize: '4400k',
    audioBitrate: '128k',
    audioSampleRate: 48000,
    audioChannels: 2,
    preset: 'veryfast',
    crf: 22
  },
  'vertical-1080p': {
    name: 'Vertical 1080p (1080x1920 - 9:16 Full HD YouTube Shorts Live)',
    width: 1080,
    height: 1920,
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
  if (profileName === 'vertical' || profileName === 'shorts') {
    return PROFILES['vertical-720p'];
  }
  return PROFILES[profileName] || PROFILES['720p'];
}
