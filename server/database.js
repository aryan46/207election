import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'voting.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Candidates Table
        db.run(`CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      ideology TEXT,
      symbol TEXT,
      manifesto TEXT,
      image TEXT,
      votes INTEGER DEFAULT 0
    )`);

        // Voters Table
        db.run(`CREATE TABLE IF NOT EXISTS voters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT, 
      hasVoted INTEGER DEFAULT 0,
      verificationCode TEXT
    )`);

        // System Config Table (for voting enabled status)
        db.run(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

        // Initialize voting status if not exists
        db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('votingEnabled', 'true')`);

        // Vote Audit Table (Secure Log)
        db.run(`CREATE TABLE IF NOT EXISTS vote_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_email TEXT,
            candidate_id INTEGER,
            candidate_name TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

export default db;
