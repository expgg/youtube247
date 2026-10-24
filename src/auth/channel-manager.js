import { google } from 'googleapis';
import pc from 'picocolors';
import logger from '../utils/logger.js';
import { getOAuth2Client } from './oauth.js';

export async function listChannels() {
  try {
    const auth = await getOAuth2Client();
    const youtube = google.youtube({ version: 'v3', auth });

    logger.info('Fetching your owned YouTube channels...');
    const res = await youtube.channels.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      mine: true
    });

    const channels = res.data.items || [];
    if (channels.length === 0) {
      logger.warn('No YouTube channels found for this authenticated Google account.');
      return [];
    }

    console.log(pc.bold(pc.green(`\n📺 Found ${channels.length} YouTube Channel(s):\n`)));
    channels.forEach((ch, idx) => {
      console.log(`${pc.bold(`[${idx + 1}]`)} ${pc.cyan(ch.snippet.title)}`);
      console.log(`    Channel ID: ${pc.gray(ch.id)}`);
      if (ch.snippet.customUrl) {
        console.log(`    Handle: ${pc.gray(ch.snippet.customUrl)}`);
      }
      console.log(`    Subscribers: ${ch.statistics?.subscriberCount || 'Hidden'}\n`);
    });

    // Check for live streams
    try {
      const streamRes = await youtube.liveStreams.list({
        part: ['snippet', 'cdn', 'status'],
        mine: true
      });

      const streams = streamRes.data.items || [];
      if (streams.length > 0) {
        console.log(pc.bold(pc.magenta('🔴 Configured Live Stream Ingestion Endpoints:')));
        streams.forEach(s => {
          const streamName = s.cdn?.ingestionInfo?.streamName;
          const maskedName = streamName ? streamName.substring(0, 4) + '...' + streamName.slice(-4) : 'N/A';
          console.log(`  - Stream Title: ${pc.bold(s.snippet.title)}`);
          console.log(`    Ingestion URL: ${s.cdn?.ingestionInfo?.ingestionAddress}`);
          console.log(`    Stream Key: ${pc.yellow(maskedName)}`);
          console.log(`    Resolution: ${s.cdn?.resolution || 'variable'}`);
          console.log(`    Status: ${s.status?.streamStatus || 'ready'}\n`);
        });
      } else {
        console.log(pc.yellow('ℹ No active Live Stream instances found in YouTube Studio.'));
        console.log(pc.gray('  Create one in studio.youtube.com -> Go Live -> Stream to generate an ingest key.\n'));
      }
    } catch (streamErr) {
      logger.warn(`Could not query liveStreams API: ${streamErr.message}`);
    }

    return channels;
  } catch (err) {
    logger.error('Failed to list channels', err);
    throw err;
  }
}

export default { listChannels };
