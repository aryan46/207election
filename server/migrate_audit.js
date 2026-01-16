import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./voting.db', (err) => {
    if (err) console.error(err);
    else console.log("Connected to DB");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS vote_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_email TEXT,
        candidate_id INTEGER,
        candidate_name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("Created vote_audit table");
});

db.close();
