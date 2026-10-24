import { readFileSync } from 'node:fs';
/** Share the built patient portal while keeping local development and staff controls private. */
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use('/api/staff', (_req, res) =>
  res.status(403).json({
    error:
      'Practice administration is available only on the local demo. Please return to the patient portal.',
  }),
);
// Only patient endpoints are forwarded. This never exposes Vite source files or local secrets.
const patientPaths = [
  /^\/api\/urgent-care\/(estimate|status)$/,
  /^\/api\/auth\/(me|login|signup|logout)$/,
  /^\/api\/(state|profile|requests|slots|bookings)$/,
  /^\/api\/bookings\/[^/]+\/(cancel|calendar)$/,
  /^\/api\/support-chat(?:\/(message|route|book))?$/,
];
app.use('/api', (req, res) => {
  if (!patientPaths.some((pattern) => pattern.test(req.originalUrl.split('?')[0])))
    return res.status(404).json({ error: 'Page not found.' });
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: 4174,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:4174' },
    },
    (response) => {
      const headers = { ...response.headers };
      if (headers['set-cookie'])
        headers['set-cookie'] = headers['set-cookie'].map((cookie) => cookie + '; Secure');
      res.writeHead(response.statusCode || 502, headers);
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent)
      res.status(502).json({ error: 'The local demo is offline. Please try again shortly.' });
    else res.end();
  });
  req.pipe(upstream);
});
app.use(express.static(path.join(root, 'dist'), { dotfiles: 'deny', index: false }));
app.get('/{*path}', (_req, res) =>
  res
    .type('html')
    .send(
      readFileSync(path.join(root, 'dist/index.html'), 'utf8').replace(
        '</head>',
        '<meta name="wellby-guest-preview" content="true"></head>',
      ),
    ),
);
app.listen(4175, '127.0.0.1', () =>
  console.log('Wellby patient preview listening on 127.0.0.1:4175'),
);
