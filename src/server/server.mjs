import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { db } from '../db/DatabaseManager.mjs';

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
  const manifest = { version: '2.2.0', channel: 'development', codename: 'Titanium' };
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

// Single Source of Truth Config Route
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

// Update Status Route
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

// Resilient Git Pull with 8-second Timeout
app.post('/api/update/apply', (req, res) => {
  const command = process.platform === 'win32'
    ? 'git checkout -- src/runtime/ 2>nul || (exit 0) & git pull --ff-only origin master'
    : 'git checkout -- src/runtime/ 2>/dev/null || true; git pull --ff-only origin master';

  exec(command, { cwd: ROOT_DIR, timeout: 8000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr || err.message });
    }
    // Clear update state flag
    const statePath = path.join(RUNTIME_DIR, 'update_state.json');
    if (fs.existsSync(statePath)) {
      try { fs.writeFileSync(statePath, JSON.stringify({ update_available: false }), 'utf8'); } catch (e) {}
    }
    res.json({ success: true, new_version: parseVersionManifest().version });
  });
});

// Process Management APIs (For Settings GUI)
app.get('/api/services/status', (req, res) => {
  const readPid = (fname) => {
    const p = path.join(RUNTIME_DIR, fname);
    if (fs.existsSync(p)) {
      try { return parseInt(fs.readFileSync(p, 'utf8').trim(), 10); } catch (e) { return null; }
    }
    return null;
  };

  res.json({
    webServer: { running: true, pid: process.pid, port: PORT },
    updater: { pid: readPid('updater.pid') },
    doctor: { pid: readPid('doctor.pid') }
  });
});

app.post('/api/services/restart', (req, res) => {
  const pyCmd = process.platform === 'win32' ? 'py' : 'python';
  res.json({ success: true, message: 'Restart dispatched' });
  setTimeout(() => {
    exec(`${pyCmd} server.py restart`, { cwd: ROOT_DIR });
  }, 300);
});

// Doctor Diagnostics API
app.get('/api/doctor/diagnose', (req, res) => {
  const logPath = path.join(RUNTIME_DIR, 'doctor.log');
  let logs = 'No logs available.';
  if (fs.existsSync(logPath)) {
    try {
      const data = fs.readFileSync(logPath, 'utf8');
      logs = data.split(/\r?\n/).slice(-15).join('\n');
    } catch (e) {}
  }
  res.json({ success: true, recentLogs: logs });
});

// Database Health Route
app.get('/api/db/health', async (req, res) => {
  const health = await db.getHealth();
  res.json(health);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(WEB_DIR, 'index.html'));
});

// Initialize DB on boot
db.init();

app.listen(PORT, HOST, () => {
  console.log(`\nPlatform Web Server active at http://localhost:${PORT}\n`);
});