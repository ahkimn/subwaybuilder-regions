#!/usr/bin/env node

/**
 * Local server for serving data from a specific directory. Default behavior is to serve ./data/ at http://127.0.0.1:8080
 *
 * Converted from Template: https://github.com/ejfox/subwaybuilder-mod/blob/main/scripts/serve-data.js
 *
 * Usage:
 *   tsx scripts/serve-data.ts
 *   tsx scripts/serve-data.ts --port 8080
 *   tsx scripts/serve-data.ts --dir /path/to/data
 */

import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import http from 'http';
import minimist from 'minimist';
import path from 'path';
import process from 'process';

import { DATA_DIR, DEFAULT_PORT, DEFAULT_URL } from '../shared/constants';
import { requireNumber } from './utils/cli';

const DEFAULT_DATA_DIR = path.join(__dirname, '..', DATA_DIR);

const argv = minimist(process.argv.slice(2), {
  string: ['dir'],
  alias: { p: 'port', d: 'dir' },
  default: { port: DEFAULT_PORT },
});

const port: number = requireNumber(argv.port, 'port');
const dir: string = argv.dir
  ? path.join(__dirname, '..', argv.dir)
  : DEFAULT_DATA_DIR;

// --------------------
// MIME types
// --------------------
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.geojson': 'application/geo+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// --------------------
// Server
// --------------------
const server = http.createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers (required for Subway Builder)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!req.url) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    // Parse URL
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(dir, urlPath);

    // Prevent directory traversal
    if (!filePath.startsWith(dir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Try adding .json extension
        const jsonPath = `${filePath}.json`;
        fs.stat(jsonPath, (err2, stats2) => {
          if (err2 || !stats2.isFile()) {
            res.writeHead(404);
            res.end(`Not found: ${urlPath}`);
            console.log(`404: ${urlPath}`);
            return;
          }
          serveFile(jsonPath, res);
        });
        return;
      }

      serveFile(filePath, res);
    });
  },
);

// --------------------
// Helpers
// --------------------
function serveFile(filePath: string, res: ServerResponse): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
    console.log(`200: ${path.relative(dir, filePath)}`);
  });
}

// --------------------
// Startup
// --------------------
server.listen(port, DEFAULT_URL, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('  Subway Builder Data Server');
  console.log('='.repeat(50));
  console.log('');
  console.log(`  Serving: ${dir}`);
  console.log(`  URL:     http://${DEFAULT_URL}:${port}`);
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});

// --------------------
// Shutdown
// --------------------
process.on('SIGINT', () => {
  console.log('\nServer stopped');
  process.exit(0);
});
