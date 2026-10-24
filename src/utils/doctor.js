import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pc from 'picocolors';
import { CONFIG } from '../../config/index.js';

export function runDoctor() {
  console.log(pc.bold(pc.cyan('\n🔍 YouTube 24/7 Engine — System Diagnostics\n')));

  let allGood = true;

  // 1. Check FFmpeg
  let ffmpegVersion = null;
  try {
    const out = execSync('ffmpeg -version', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    ffmpegVersion = out.split('\n')[0];
    console.log(`${pc.green('✔')} FFmpeg is installed: ${pc.gray(ffmpegVersion)}`);
  } catch (err) {
    console.log(`${pc.red('✖')} FFmpeg is NOT found in system PATH.`);
    console.log(pc.yellow('  👉 Ubuntu/Debian fix: sudo apt update && sudo apt install -y ffmpeg'));
    allGood = false;
  }

  // 2. Check FFprobe
  let ffprobeVersion = null;
  try {
    const out = execSync('ffprobe -version', { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    ffprobeVersion = out.split('\n')[0];
    console.log(`${pc.green('✔')} FFprobe is installed: ${pc.gray(ffprobeVersion)}`);
  } catch (err) {
    console.log(`${pc.yellow('ℹ')} FFprobe not in PATH (Converter will automatically fallback to FFmpeg for metadata inspection).`);
  }

  // 3. Check yt-dlp
  try {
    const ytVer = execSync('yt-dlp --version', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    console.log(`${pc.green('✔')} yt-dlp is installed: ${pc.gray(ytVer)}`);
  } catch (err) {
    console.log(`${pc.yellow('⚠')} yt-dlp is not installed. (Install with: pip install -U yt-dlp)`);
  }

  // 3. System RAM Check
  const totalRamGb = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRamMb = (os.freemem() / 1024 / 1024).toFixed(0);
  console.log(`${pc.green('✔')} Total RAM: ${pc.bold(totalRamGb + ' GB')} (Free: ${freeRamMb} MB)`);
  if (parseFloat(totalRamGb) <= 1.2) {
    console.log(pc.cyan('  ℹ 1 GB VPS detected. Stream-copy mode (-c copy) is optimal and will consume <200 MB RAM.'));
  }

  // 4. Media Directory Check
  const rawFiles = fs.existsSync(CONFIG.rawDir)
    ? fs.readdirSync(CONFIG.rawDir).filter(f => !f.startsWith('.'))
    : [];
  const processedFiles = fs.existsSync(CONFIG.processedDir)
    ? fs.readdirSync(CONFIG.processedDir).filter(f => !f.startsWith('.'))
    : [];

  console.log(`${pc.green('✔')} Raw media directory: ${pc.bold(rawFiles.length + ' file(s)')} in ${CONFIG.rawDir}`);
  console.log(`${pc.green('✔')} Processed media directory: ${pc.bold(processedFiles.length + ' file(s)')} in ${CONFIG.processedDir}`);

  if (processedFiles.length === 0) {
    console.log(pc.yellow('  ⚠ No processed videos found in media/processed/!'));
    if (rawFiles.length > 0) {
      console.log(pc.cyan(`  👉 Run '${pc.bold('npm run normalize')}' to convert raw files into stream-ready format.`));
    } else {
      console.log(pc.cyan('  👉 Place your video files into media/raw/ and run normalize.'));
    }
  }

  // 5. YouTube Stream Credentials Check
  const hasStreamKey = Boolean(CONFIG.youtubeStreamKey && CONFIG.youtubeStreamKey.trim());
  const hasTokens = fs.existsSync(CONFIG.tokensPath);

  if (hasStreamKey) {
    const maskedKey = CONFIG.youtubeStreamKey.substring(0, 4) + '...' + CONFIG.youtubeStreamKey.slice(-4);
    console.log(`${pc.green('✔')} YouTube Stream Key configured: ${pc.bold(maskedKey)}`);
  } else if (hasTokens) {
    console.log(`${pc.green('✔')} YouTube OAuth2 tokens found in tokens.json`);
  } else {
    console.log(`${pc.red('✖')} No YouTube Stream Key or OAuth tokens found!`);
    console.log(pc.yellow('  👉 Create a .env file and set YOUTUBE_STREAM_KEY=xxxx-xxxx-xxxx-xxxx'));
    allGood = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allGood && processedFiles.length > 0) {
    console.log(pc.green(pc.bold('🎉 All systems ready! You can launch the stream with: npm start')));
  } else {
    console.log(pc.yellow(pc.bold('⚡ Setup incomplete. Address any ✖ or ⚠ warnings above.')));
  }
  console.log('='.repeat(60) + '\n');

  return allGood;
}

export default runDoctor;
