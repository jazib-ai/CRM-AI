const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const DatabaseHandler = require('../electron/database');
const PostgresDatabaseHandler = require('./database-postgres');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Database (Async)
let db;
const initDb = async () => {
    if (DATABASE_URL) {
        console.log('Server: Using PostgreSQL database');
        db = new PostgresDatabaseHandler(DATABASE_URL);
    } else {
        console.log('Server: Using SQLite database');
        const dbPath = path.join(__dirname, '../data/nexogenix.db');
        db = new DatabaseHandler(dbPath);
    }
};
initDb();

// Tracking changes for synchronization
let lastChangeTimestamp = Date.now();

const updateSync = () => {
    lastChangeTimestamp = Date.now();
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.authenticateUser(email, password);
        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.run(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id',
            [name, email, passwordHash, role || 'standard']
        );
        updateSync();
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- SYNC ENDPOINT ---
app.get('/api/sync/status', (req, res) => {
    res.json({ lastChange: lastChangeTimestamp });
});

// --- GENERIC CRUD ---
const tables = ['contacts', 'companies', 'engagements', 'deals', 'activities', 'settings', 'dashboard_tasks', 'dashboard_notes', 'users'];

tables.forEach(table => {
    app.get(`/api/${table}`, async (req, res) => {
        try {
            const data = await db.getAll(table);
            // Hide hashes for users
            if (table === 'users') {
                data.forEach(u => delete u.password_hash);
            }
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post(`/api/${table}`, async (req, res) => {
        try {
            const data = req.body;
            // Special handling for users in generic POST
            if (table === 'users' && data.password) {
                data.password_hash = await bcrypt.hash(data.password, 10);
                delete data.password;
            }
            const result = await db.insert(table, data);
            updateSync();
            res.json({ success: true, id: result.lastInsertRowid });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.put(`/api/${table}/:id`, async (req, res) => {
        try {
            const data = req.body;
            if (table === 'users' && data.password) {
                data.password_hash = await bcrypt.hash(data.password, 10);
                delete data.password;
            }
            await db.update(table, req.params.id, data);
            updateSync();
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        try {
            await db.delete(table, req.params.id);
            updateSync();
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexoGenix Central Server running on http://0.0.0.0:${PORT}`);
    console.log(`Synchronization: ACTIVE`);
});
