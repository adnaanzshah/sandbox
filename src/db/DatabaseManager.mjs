import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, '../config/config.json');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isReady = false;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const dbConfig = cfg.database || {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: '',
        database: 'sandbox_db'
      };

      this.pool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000
      });
    } catch (err) {
      console.warn('[DB WARNING] Config unreadable, using default Postgres socket:', err.message);
      this.pool = new Pool({ database: 'sandbox_db' });
    }
  }

  async init() {
    try {
      const client = await this.pool.connect();
      console.log('[DB ENGINE] Connected successfully to PostgreSQL.');
      
      // Auto-migrate standard schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_telemetry (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id VARCHAR(50) PRIMARY KEY,
          payload JSONB,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      client.release();
      this.isReady = true;
      return { status: 'connected', engine: 'PostgreSQL' };
    } catch (err) {
      console.warn(`[DB NOTICE] PostgreSQL not reachable (${err.message}). Database services standby.`);
      this.isReady = false;
      return { status: 'standby', error: err.message };
    }
  }

  async query(text, params) {
    if (!this.isReady) {
      throw new Error('Database is in standby mode. Start PostgreSQL service to run queries.');
    }
    return this.pool.query(text, params);
  }

  async getHealth() {
    if (!this.isReady) {
      const retest = await this.init();
      return { status: retest.status, details: retest.error || 'Standby' };
    }
    try {
      await this.pool.query('SELECT 1');
      return { status: 'healthy', engine: 'PostgreSQL 5432' };
    } catch (e) {
      this.isReady = false;
      return { status: 'error', error: e.message };
    }
  }
}

export const db = new DatabaseManager();