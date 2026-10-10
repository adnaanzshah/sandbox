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

app.use(express.static(WEB_DIR));
app.use('/css', express.static(path.join(WEB_DIR, 'css'), {
  setHeaders: (res, fp) => { if (fp.endsWith('.css')) res.setHeader('Content-Type', 'text/css'); }
}));
app.use('/js', express.static(path.join(WEB_DIR, 'js'), {
  setHeaders: (res, fp) => { if (fp.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript'); }
}));

function parseVersionManifest() {
  const vPath = path.join(ROOT_DIR, 'VERSION');
  const manifest = { version: '2.0.13', channel: 'development', codename: 'Titanium' };
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

// Single Source of Truth Config Endpoint: Dynamically binds VERSION into config payload
app.get('/api/config', (req, res) => {
  const configPath = path.join(SRC_DIR, 'config', 'config.json');
  let configData = {};
  if (fs.existsSync(configPath)) {
    try {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {}
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

app.get('/api/update/status', (req, res) => {
  const statePath = path.join(RUNTIME_DIR, 'update_state.json');
  let state = { update_available: false, remote_version: '' };
  if (fs.existsSync(statePath)) {
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) {}
  }
  const v = parseVersionManifest();
  res.json({
    current_version: v.version,
    update_available: !!state.update_available,
    remote_version: state.remote_version || ''
  });
});

// Apply instant update with pre-pull checkout to avoid collision
app.post('/api/update/apply', (req, res) => {
  const pullCommand = 'git checkout -- src/runtime/ 2>nul || true && git pull --ff-only origin master';
  
  exec(pullCommand, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
    if (err) {
      // Fallback for Unix/Android if Windows syntax fails
      exec('git checkout -- src/runtime/ ; git pull --ff-only origin master', { cwd: ROOT_DIR }, (fallbackErr, fallbackStdout, fallbackStderr) => {
        if (fallbackErr) {
          return res.status(500).json({ success: false, error: fallbackStderr || stderr });
        }
        res.json({ success: true, new_version: parseVersionManifest().version });
      });
      return;
    }
    res.json({ success: true, new_version: parseVersionManifest().version });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`\nPlatform Web Server active at http://localhost:${PORT}\n`);
});