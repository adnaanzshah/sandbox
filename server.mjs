import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use('/css', express.static(path.join(__dirname, 'css'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

app.use('/js', express.static(path.join(__dirname, 'js'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
  }
}));

app.use(express.static(__dirname));

function getVersionData() {
  const vPath = path.join(__dirname, 'VERSION');
  let version = '2.0.8';
  if (fs.existsSync(vPath)) {
    const raw = fs.readFileSync(vPath, 'utf8');
    const match = raw.match(/VERSION=([^\r\n]+)/);
    if (match) version = match[1].trim();
  }
  return version;
}

app.get('/api/config', (req, res) => {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    return res.sendFile(configPath);
  }
  res.status(404).json({ error: 'config.json not found' });
});

app.get('/api/update/status', (req, res) => {
  const statePath = path.join(__dirname, 'updater', '.update_state.json');
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

app.post('/api/update/apply', (req, res) => {
  exec('git pull --ff-only origin master', { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: stderr });
    }
    const statePath = path.join(__dirname, 'updater', '.update_state.json');
    if (fs.existsSync(statePath)) {
      try {
        fs.writeFileSync(statePath, JSON.stringify({ update_available: false }), 'utf8');
      } catch (e) {}
    }
    res.json({ success: true, new_version: getVersionData() });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`\nPlatform Web Server running on http://localhost:${PORT}\n`);
});