'use strict';

/**
 * Post-build prerender script.
 * Reads dist/index.html (produced by Vite) and generates route-specific HTML
 * files with correct <head> meta tags for each public page. Vercel serves these
 * static files directly, so social crawlers and search bots get complete OG tags
 * without executing JavaScript.
 *
 * Run automatically via `postbuild` npm script.
 */

const fs = require('fs');
const path = require('path');

// ---------- Config ----------------------------------------------------------

// Load VITE_APP_URL from .env.local or .env
const envFiles = ['.env.local', '.env'];
let appUrl = 'https://nutriapp.example.com';

for (const file of envFiles) {
  const envPath = path.join(__dirname, '..', file);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^VITE_APP_URL=(.+)$/);
      if (m) {
        appUrl = m[1].trim().replace(/\/$/, '');
        break;
      }
    }
    break;
  }
}

// Public routes to prerender (auth + private pages are intentionally excluded)
const routes = [
  {
    path: '/pricing',
    title: 'NutriApp Pro — NutriApp',
    description:
      'Start with 50 free credits — no card required. Upgrade to NutriApp Pro for unlimited food tracking and AI-powered nutrition tips.',
    og: {
      type: 'website',
      title: 'NutriApp Pro — NutriApp',
      description:
        'Start with 50 free credits — no card required. Upgrade to NutriApp Pro for unlimited food tracking and AI-powered nutrition tips.',
    },
    canonical: `${appUrl}/pricing`,
    noindex: false,
  },
  {
    path: '/contact',
    title: 'Contact us — NutriApp',
    description: "Have a question or feedback? We'd love to hear from you.",
    og: null,
    canonical: `${appUrl}/contact`,
    noindex: false,
  },
  {
    path: '/terms',
    title: 'Terms of Service — NutriApp',
    description: 'Terms of Service for NutriApp.',
    og: null,
    canonical: `${appUrl}/terms`,
    noindex: true,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — NutriApp',
    description: 'Privacy Policy for NutriApp.',
    og: null,
    canonical: `${appUrl}/privacy`,
    noindex: true,
  },
];

// ---------- Helpers ---------------------------------------------------------

function buildMetaBlock(route) {
  const lines = [];

  lines.push(`    <title>${route.title}</title>`);
  lines.push(`    <meta name="description" content="${route.description}" />`);
  lines.push(`    <link rel="canonical" href="${route.canonical}" />`);

  if (route.noindex) {
    lines.push('    <meta name="robots" content="noindex,nofollow" />');
  }

  if (route.og) {
    lines.push(`    <meta property="og:type" content="${route.og.type}" />`);
    lines.push(`    <meta property="og:site_name" content="NutriApp" />`);
    lines.push(`    <meta property="og:title" content="${route.og.title}" />`);
    lines.push(`    <meta property="og:description" content="${route.og.description}" />`);
    lines.push(`    <meta property="og:url" content="${route.canonical}" />`);
  }

  return lines.join('\n');
}

// Replace the <title> and key meta tags in the base HTML.
// We inject before </head> to append without disrupting the existing tags.
function injectMeta(baseHtml, route) {
  const metaBlock = buildMetaBlock(route);
  // Strip existing title + description that come from index.html
  let html = baseHtml
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*\/?>/, '')
    .replace(/<link\s+rel="canonical"[^>]*\/?>/, '')
    .replace(/<meta\s+property="og:[^>]*\/?>(\s*\n)?/g, '')
    .replace(/<meta\s+property="twitter:[^>]*\/?>(\s*\n)?/g, '')
    .replace(/<meta\s+name="twitter:[^>]*\/?>(\s*\n)?/g, '');

  return html.replace('</head>', `${metaBlock}\n  </head>`);
}

// ---------- Main ------------------------------------------------------------

const dist = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.warn('inject-meta: dist/index.html not found — skipping (run after `vite build`)');
  process.exit(0);
}

const baseHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');

for (const route of routes) {
  const html = injectMeta(baseHtml, route);
  const dir = path.join(dist, route.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
  console.log(`inject-meta: wrote dist${route.path}/index.html`);
}

console.log(`inject-meta: done — ${routes.length} routes prerendered`);
