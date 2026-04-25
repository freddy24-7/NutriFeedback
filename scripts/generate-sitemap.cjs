#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Load .env.local or .env for VITE_APP_URL
const envFiles = ['.env.local', '.env'];
let appUrl = 'https://nutriapp.example.com';

for (const file of envFiles) {
  const envPath = path.join(__dirname, '..', file);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^VITE_APP_URL=(.+)$/);
      if (match) {
        appUrl = match[1].trim().replace(/\/$/, '');
        break;
      }
    }
    break;
  }
}

const today = new Date().toISOString().split('T')[0];

// Public pages only — private/auth routes intentionally excluded
const routes = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/pricing', changefreq: 'monthly', priority: '0.8' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.6' },
];

const urls = routes
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${appUrl}${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
fs.writeFileSync(outPath, xml, 'utf-8');
console.log(`Sitemap written to ${outPath} (${routes.length} URLs, base: ${appUrl})`);
