import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './database.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// --- Candidates System ---

// Serve Frontend Files (Monolith Mode)
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
});

app.get('/api/candidates', (req, res) => {
    db.all("SELECT * FROM candidates", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/candidates', upload.single('image'), (req, res) => {
    const { name, email, ideology, symbol, manifesto } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `INSERT INTO candidates (name, email, ideology, symbol, manifesto, image, votes) VALUES (?, ?, ?, ?, ?, ?, 0)`;
    db.run(sql, [name, email, ideology, symbol, manifesto, image], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, email, ideology, symbol, manifesto, image, votes: 0 });
    });
});

app.delete('/api/candidates/:id', (req, res) => {
    db.run("DELETE FROM candidates WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Candidate deleted" });
    });
});

// --- Voting System ---

// --- Voting System ---

app.post('/api/vote', (req, res) => {
    const { candidateId, voterEmail } = req.body;

    // Check global voting status first
    db.get("SELECT value FROM config WHERE key = 'votingEnabled'", (err, row) => {
        if (row && row.value === 'false') {
            return res.status(403).json({ error: "Voting is currently disabled" });
        }

        // ATOMIC UPDATE: preventing race conditions
        const sql = "UPDATE voters SET hasVoted = 1 WHERE email = ? AND hasVoted = 0";

        db.run(sql, [voterEmail], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (this.changes === 0) {
                db.get("SELECT * FROM voters WHERE email = ?", [voterEmail], (err, voter) => {
                    if (!voter) return res.status(404).json({ error: "Voter not found" });
                    return res.status(400).json({ error: "You have already cast your vote." });
                });
            } else {
                // Success! The flag was flipped.
                db.run("UPDATE candidates SET votes = votes + 1 WHERE id = ?", [candidateId]);

                // Audit Trail
                db.get("SELECT name FROM candidates WHERE id = ?", [candidateId], (err, candidate) => {
                    if (candidate) {
                        db.run("INSERT INTO vote_audit (voter_email, candidate_id, candidate_name) VALUES (?, ?, ?)",
                            [voterEmail, candidateId, candidate.name]);
                    }
                });

                res.json({ message: "Vote cast successfully" });
            }
        });
    });
});

// Delete Voter & Revert Vote
app.delete('/api/voters/:email', (req, res) => {
    const email = req.params.email;

    // 1. Find who they voted for to decrement the count
    db.get("SELECT candidate_id FROM vote_audit WHERE voter_email = ?", [email], (err, audit) => {
        if (audit) {
            // They voted, so decrement the count
            db.run("UPDATE candidates SET votes = votes - 1 WHERE id = ?", [audit.candidate_id]);
            // Remove audit record
            db.run("DELETE FROM vote_audit WHERE voter_email = ?", [email]);
        }

        // 2. Delete the voter account
        db.run("DELETE FROM voters WHERE email = ?", [email], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Voter delete and vote reverted (if any)" });
        });
    });
});

app.get('/api/admin/audit', (req, res) => {
    db.all("SELECT * FROM vote_audit ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
    });
});

// --- Auth System ---

app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const verificationCode = Math.random().toString(36).substring(7);

    const sql = `INSERT INTO voters (email, password, hasVoted, verificationCode) VALUES (?, ?, 0, ?)`;
    db.run(sql, [email, password, verificationCode], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                return res.status(409).json({ error: "Email already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ email, hasVoted: false, verificationCode });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT email, hasVoted, verificationCode FROM voters WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: "Invalid credentials" });
        res.json({ email: row.email, hasVoted: !!row.hasVoted, verificationCode: row.verificationCode });
    });
});

// --- Admin System ---

app.get('/api/stats', (req, res) => {
    db.serialize(() => {
        let stats = {};
        db.all("SELECT * FROM voters", (err, voters) => {
            stats.voters = voters.map(v => ({ email: v.email, hasVoted: v.hasVoted }));
            res.json(stats);
        });
    });
});

app.get('/api/admin/audit', (req, res) => {
    db.all("SELECT * FROM vote_audit ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/voters/:email', (req, res) => {
    const email = req.params.email;
    // 1. Revert the vote count
    db.get("SELECT candidate_id FROM vote_audit WHERE voter_email = ?", [email], (err, row) => {
        if (row) {
            db.run("UPDATE candidates SET votes = votes - 1 WHERE id = ?", [row.candidate_id]);
            db.run("DELETE FROM vote_audit WHERE voter_email = ?", [email]);
        }

        // 2. Delete the user
        db.run("DELETE FROM voters WHERE email = ?", [email], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Voter deleted" });
        });
    });
});

app.get('/api/config/voting', (req, res) => {
    db.get("SELECT value FROM config WHERE key = 'votingEnabled'", (err, row) => {
        res.json({ enabled: row ? row.value === 'true' : true });
    });
});

app.post('/api/config/voting', (req, res) => {
    const { enabled } = req.body;
    db.run("REPLACE INTO config (key, value) VALUES ('votingEnabled', ?)", [enabled.toString()], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ enabled });
    });
});

// Catch-all route for React Router (Must be after API routes)
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
