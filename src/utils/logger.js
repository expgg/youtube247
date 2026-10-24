import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { CONFIG } from '../../config/index.js';

const LOG_FILE = path.join(CONFIG.logsDir, 'engine.log');

// Ensure logs directory exists
if (!fs.existsSync(CONFIG.logsDir)) {
  fs.mkdirSync(CONFIG.logsDir, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function appendToFile(level, message) {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}\n`;
  fs.appendFile(LOG_FILE, line, () => {});
}

export const logger = {
  info(message) {
    console.log(`${pc.gray(timestamp())} ${pc.cyan('[INFO]')} ${message}`);
    appendToFile('info', message);
  },

  success(message) {
    console.log(`${pc.gray(timestamp())} ${pc.green('[SUCCESS]')} ${pc.bold(message)}`);
    appendToFile('success', message);
  },

  warn(message) {
    console.log(`${pc.gray(timestamp())} ${pc.yellow('[WARN]')} ${message}`);
    appendToFile('warn', message);
  },

  error(message, error = null) {
    const errorDetails = error ? (error.stack || error.message || error) : '';
    console.error(`${pc.gray(timestamp())} ${pc.red('[ERROR]')} ${pc.bold(message)} ${errorDetails ? pc.red(errorDetails) : ''}`);
    appendToFile('error', `${message} ${errorDetails}`);
  },

  stream(message) {
    console.log(`${pc.gray(timestamp())} ${pc.magenta('[LIVE 24/7]')} ${message}`);
  }
};

export default logger;
