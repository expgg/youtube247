#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import { CONFIG } from '../config/index.js';
import { getProfile } from '../config/profiles.js';
import { listChannels } from './auth/channel-manager.js';
import { getOAuth2Client } from './auth/oauth.js';
import { normalizeAll, normalizeVideo } from './converter/normalizer.js';
import { downloadVideo } from './downloader/ytdlp.js';
import { Watchdog } from './streamer/watchdog.js';
import { runDoctor } from './utils/doctor.js';
import logger from './utils/logger.js';

const program = new Command();

program
  .name('yt247')
  .description('Production-Grade 24/7 YouTube Live Streaming Engine')
  .version('1.0.0');

// Command: stream (Default)
program
  .command('stream', { isDefault: true })
  .description('Start the 24/7 YouTube Live broadcast engine with auto-recovery')
  .option('-k, --key <streamKey>', 'YouTube stream key (overrides .env)')
  .option('-u, --url <rtmpUrl>', 'YouTube RTMP ingestion URL', CONFIG.youtubeStreamUrl)
  .option('-s, --shuffle', 'Shuffle playlist on loop', CONFIG.shufflePlaylist)
  .action(async options => {
    const watchdog = new Watchdog({
      streamKey: options.key || CONFIG.youtubeStreamKey,
      streamUrl: options.url || CONFIG.youtubeStreamUrl,
      reconnectDelayMs: CONFIG.reconnectDelayMs
    });
    await watchdog.start();
  });

// Command: download
program
  .command('download <url>')
  .description('Download video using yt-dlp into media/raw/ directory')
  .option('-n, --normalize', 'Automatically normalize after download')
  .option('-p, --profile <profileName>', 'Target profile (720p, 1080p, vertical-720p, vertical-1080p)', 'vertical-720p')
  .option('-f, --fit <fitMode>', 'Fit mode: fill (crop to full 9:16), pad (black bars), blur (blurred background)', 'fill')
  .action(async (url, options) => {
    try {
      const rawPath = await downloadVideo(url);
      if (options.normalize) {
        const targetProfile = getProfile(options.profile);
        const targetPath = rawPath.replace('raw', 'processed');
        await normalizeVideo(rawPath, targetPath, { profile: targetProfile, fit: options.fit });
      }
    } catch (err) {
      logger.error('Download operation failed', err);
    }
  });

// Command: normalize
program
  .command('normalize')
  .description('Convert raw video files in media/raw/ to standard 24/7 stream profile')
  .option('-p, --profile <profileName>', 'Target profile (720p, 1080p, vertical-720p, vertical-1080p)', CONFIG.streamProfileName)
  .option('-f, --fit <fitMode>', 'Fit mode: fill (crop to full canvas), pad (black bars), blur (blurred background)', 'fill')
  .action(async options => {
    const targetProfile = getProfile(options.profile);
    logger.info(`Running batch normalizer with profile: ${pc.bold(targetProfile.name)} [Fit: ${options.fit}]`);
    await normalizeAll({ profile: targetProfile, fit: options.fit });
  });

// Command: doctor
program
  .command('doctor')
  .description('Run diagnostics check for FFmpeg, RAM, storage, and configurations')
  .action(() => {
    runDoctor();
  });

// Command: auth
program
  .command('auth')
  .description('Authenticate with Google account via OAuth2 on headless VPS')
  .action(async () => {
    try {
      await getOAuth2Client();
    } catch (err) {
      logger.error('Authentication aborted', err);
    }
  });

// Command: channels
program
  .command('channels')
  .description('List your YouTube channels and live stream ingestion endpoints')
  .action(async () => {
    try {
      await listChannels();
    } catch (err) {
      logger.error('Could not retrieve channels', err);
    }
  });

program.parse(process.argv);
