import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const VERSION_FILE = path.join(ROOT_DIR, 'VERSION');

export function getProjectManifest() {
  const manifest = {
    projectName: 'Unknown',
    version: '0.0.0',
    channel: 'development',
    codename: 'Titanium',
    status: 'development',
    build: ''
  };

  if (!fs.existsSync(VERSION_FILE)) {
    return manifest;
  }

  const raw = fs.readFileSync(VERSION_FILE, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [rawKey, rawVal] = trimmed.split('=', 2);
      const key = rawKey.trim().toLowerCase();
      const val = rawVal.trim();

      if (key === 'project_name') manifest.projectName = val;
      else if (key === 'version') manifest.version = val;
      else if (key === 'channel') manifest.channel = val;
      else if (key === 'codename') manifest.codename = val;
      else if (key === 'status') manifest.status = val;
      else if (key === 'build') manifest.build = val;
    }
  });

  return manifest;
}