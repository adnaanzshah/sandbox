import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root is two directories up: src/server -> src -> root
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

// Serve frontend assets strictly from src/web/
app.use(express.static(WEB_DIR));

app.use('/css', express.static(path.join(WEB_DIR, 'css'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

app.use('/js', express.static(path.join(WEB_DIR, 'js'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
  }
}));

function getVersionData() {
  const vPath = path.join(ROOT_DIR, 'VERSION');
  let version = '2.0.9';
  if (fs.existsSync(vPath)) {
    const raw = fs.readFileSync(vPath, 'utf8');
    const match = raw.match(/VERSION=([^\r\n]+)/);
    if (match) version = match[1].trim();
  }
  return version;
}

// Config route
app.get('/api/config', (req, res) => {
  const configPath = path.join(SRC_DIR, 'config', 'config.json');
  if (fs.existsSync(configPath)) {
    return res.sendFile(configPath);
  }
  res.status(404).json({ error: 'config.json missing' });
});

// Update state route
app.get('/api/update/status', (req, res) => {
  const statePath = path.join(RUNTIME_DIR, 'update_state.json');
  let state = { update_available: false, remote_version: '' };

  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (e) {}
  }

  res.json({
    current_version: getVersionData(),
    update_available: !!state.update_available,
    remote_version: state.remote_version || ''
  });
});

// Trigger instant git pull
app.post('/api/update/apply', (req, res) => {
  exec('git pull --ff-only origin master', { cwd: ROOT_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr });
    }
    const statePath = path.join(RUNTIME_DIR, 'update_state.json');
    if (fs.existsSync(statePath)) {
      try {
        fs.writeFileSync(statePath, JSON.stringify({ update_available: false }), 'utf8');
      } catch (e) {}
    }
    res.json({ success: true, new_version: getVersionData() });
  });
});

// Serve index.html from src/web/
app.get('/', (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`\nPlatform Web Server active at http://localhost:${PORT}\n`);
});