import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const WEB_DIR = path.resolve(SRC_DIR, 'web');
const RUNTIME_DIR = path.resolve(SRC_DIR, 'runtime');

if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

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

app.use(express.static(WEB_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
  }
}));

function parseVersionManifest() {
  const vPath = path.join(ROOT_DIR, 'VERSION');
  const manifest = { version: '2.4.0', channel: 'development', codename: 'Titanium' };
  if (fs.existsSync(vPath)) {
    const raw = fs.readFileSync(vPath, 'utf8');
    raw.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, v] = trimmed.split('=');
        manifest[k.trim().toLowerCase()] = v.trim();
      }
    });
  }
  return manifest;
}

// 1. Health & Config Verification Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: parseVersionManifest().version,
    pid: process.pid
  });
});

app.get('/api/config', (req, res) => {
  const configPath = path.join(SRC_DIR, 'config', 'config.json');
  let configData = {};
  if (fs.existsSync(configPath)) {
    try {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {}
  }
  const versionData = parseVersionManifest();
  configData.system = {
    ...configData.system,
    version: versionData.version,
    channel: versionData.channel,
    codename: versionData.codename
  };
  res.json(configData);
});

// 2. Safe Self-Healing Git Update API
app.post('/api/update/apply', (req, res) => {
  const lockPath = path.join(ROOT_DIR, '.git', 'index.lock');
  if (fs.existsSync(lockPath)) {
    try { fs.unlinkSync(lockPath); } catch {}
  }

  const updateScript = 'git fetch origin master && git reset --hard origin/master';
  exec(updateScript, { cwd: ROOT_DIR, timeout: 15000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    const newVersion = parseVersionManifest().version;
    res.json({ success: true, new_version: newVersion });
  });
});

// Fallback Root Route
app.get('*', (req, res) => {
  const indexPath = path.join(WEB_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Sandbox v2.4.0</title></head>
        <body style="background:#0a0a0c; color:#fff; font-family:system-ui; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="text-align:center;">
            <h1 style="font-size:2rem; margin-bottom:8px;">Sandbox Server Online</h1>
            <p style="color:#888;">Backend engine active on port ${PORT}. Ready for new UI build.</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, HOST, () => {
  console.log(`\nPlatform Web Server active at http://localhost:${PORT}\n`);
});