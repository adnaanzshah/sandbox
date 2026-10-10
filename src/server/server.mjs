import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getProjectManifest } from './versionReader.mjs';
import { getRules, generateCssTokens } from './rulesEngine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const WEB_DIR = path.resolve(SRC_DIR, 'web');
const RUNTIME_DIR = path.resolve(SRC_DIR, 'runtime');

if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
if (!fs.existsSync(WEB_DIR)) fs.mkdirSync(WEB_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic rules tokens
app.get('/css/rules-theme.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(generateCssTokens());
});

app.get('/api/rules', (req, res) => {
  res.json(getRules());
});

app.get('/api/manifest', (req, res) => {
  res.json(getProjectManifest());
});

app.get('/api/health', (req, res) => {
  const manifest = getProjectManifest();
  res.json({
    status: 'healthy',
    system: manifest.projectName,
    version: manifest.version,
    rulesEnforced: true,
    palette: 'Pure Binary Black & White',
    timestamp: new Date().toISOString()
  });
});

app.use(express.static(WEB_DIR));

// Plain Pitch-Black Page with Solid White Typography
app.use((req, res) => {
  const manifest = getProjectManifest();
  res.send(`<!DOCTYPE html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${manifest.projectName}</title>
    <link rel="stylesheet" href="/css/rules-theme.css" />
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        background: #000000 !important;
        color: #ffffff !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
        min-height: 100vh;
        min-height: 100dvh;
        width: 100vw;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
      }
      h1 {
        font-size: 2.2rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #ffffff;
        margin-bottom: 12px;
      }
      p {
        font-size: 1rem;
        font-weight: 400;
        color: #ffffff;
        line-height: 1.5;
        max-width: 480px;
        margin-bottom: 24px;
      }
      .version-tag {
        font-size: 0.85rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #ffffff;
      }
    </style>
  </head>
  <body>
    <h1>${manifest.projectName}</h1>
    <p>Binary Monochrome System online. Pitch black background with solid white typography.</p>
    <div class="version-tag">v${manifest.version} [${manifest.status}]</div>
  </body>
</html>`);
});

app.listen(PORT, HOST, () => {
  const manifest = getProjectManifest();
  console.log(`[${manifest.projectName}] Server live at http://localhost:${PORT}`);
});