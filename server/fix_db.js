import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./voting.db', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

db.serialize(() => {
    db.run("ALTER TABLE candidates ADD COLUMN image TEXT", (err) => {
        if (err) {
            console.log("Migration failed (maybe column exists?):", err.message);
        } else {
            console.log("Migration success: 'image' column added.");
        }
    });
});

db.close();
