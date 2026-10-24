import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import pc from 'picocolors';
import readline from 'readline';
import { CONFIG } from '../../config/index.js';
import logger from '../utils/logger.js';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

/**
 * Returns an authenticated OAuth2 client, or guides the user through terminal authorization
 */
export async function getOAuth2Client() {
  if (!CONFIG.googleClientId || !CONFIG.googleClientSecret) {
    throw new Error(
      'Google OAuth credentials not found in .env!\n' +
      'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console,\n' +
      'or use Method A (Direct YOUTUBE_STREAM_KEY in .env) instead.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    CONFIG.googleClientId,
    CONFIG.googleClientSecret,
    CONFIG.googleRedirectUri || 'urn:ietf:wg:oauth:2.0:oob'
  );

  // Auto-persist refreshed tokens
  oauth2Client.on('tokens', tokens => {
    saveTokens(tokens);
  });

  // Check if we already have saved tokens
  if (fs.existsSync(CONFIG.tokensPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG.tokensPath, 'utf8'));
      oauth2Client.setCredentials(saved);
      return oauth2Client;
    } catch (err) {
      logger.warn('Failed to parse existing tokens.json, prompting re-authorization...');
    }
  }

  // Interactive Authorization via Terminal
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });

  console.log(pc.bold(pc.cyan('\n🔗 YouTube Google Account Authorization\n')));
  console.log('1. Open this link in your web browser:');
  console.log(pc.underline(pc.yellow(authUrl)));
  console.log('\n2. Sign in with the Google account that manages your YouTube channel.');
  console.log('3. Copy the authorization code provided by Google.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise(resolve => {
    rl.question(pc.bold('👉 Paste the authorization code here: '), answer => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  saveTokens(tokens);

  logger.success('Google OAuth2 authentication successful! Tokens saved.');
  return oauth2Client;
}

function saveTokens(tokens) {
  const dir = path.dirname(CONFIG.tokensPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existing = {};
  if (fs.existsSync(CONFIG.tokensPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(CONFIG.tokensPath, 'utf8'));
    } catch (e) {}
  }

  const merged = { ...existing, ...tokens };
  fs.writeFileSync(CONFIG.tokensPath, JSON.stringify(merged, null, 2), 'utf8');
}

export default { getOAuth2Client };
