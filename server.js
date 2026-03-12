/**
 * Production static file server for Expo web export.
 *
 * Serves the dist/ directory with SPA fallback — any request that doesn't
 * match a static file gets index.html so client-side routing works.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Cache static assets aggressively (hashed filenames)
app.use(
  '/_expo',
  express.static(path.join(DIST, '_expo'), {
    maxAge: '1y',
    immutable: true,
  }),
);

// Serve other static files with short cache
app.use(
  express.static(DIST, {
    maxAge: '1h',
    index: false, // Don't auto-serve index.html — we handle it below
  }),
);

// SPA fallback: serve index.html for all non-file routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
