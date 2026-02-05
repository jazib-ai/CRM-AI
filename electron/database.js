const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class DatabaseHandler {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeSchema();
    }

    initializeSchema() {
        // Users table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Contacts table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                company TEXT,
                job_title TEXT,
                status TEXT DEFAULT 'Lead',
                lifecycle TEXT DEFAULT 'Lead',
                follow_up DATE,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            );
        `);

        // Companies table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                size TEXT,
                website TEXT,
                industry TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration for existing tables
        try { this.db.exec("ALTER TABLE companies ADD COLUMN size TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE companies ADD COLUMN website TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE companies ADD COLUMN industry TEXT"); } catch (e) { }

        // Engagements table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS engagements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL,
                client_name TEXT NOT NULL,
                service_type TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                status TEXT NOT NULL DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            );
        `);

        // Resources table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                engagement_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                type TEXT NOT NULL,
                FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
            );
        `);

        // Activities table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                engagement_id INTEGER,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
                FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE
            );
        `);

        // Settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // Deals table (New)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS deals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                value REAL DEFAULT 0,
                stage TEXT DEFAULT 'lead',
                probability TEXT,
                description TEXT,
                close_date DATE,
                service_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            );
        `);

        // Migrations
        try { this.db.exec("ALTER TABLE companies ADD COLUMN size TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE companies ADD COLUMN website TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE companies ADD COLUMN industry TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE companies ADD COLUMN service_fit TEXT"); } catch (e) { } // New

        try { this.db.exec("ALTER TABLE contacts ADD COLUMN service_fit TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE contacts ADD COLUMN service TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE contacts ADD COLUMN linkedin TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE contacts ADD COLUMN company_size TEXT"); } catch (e) { }
        try { this.db.exec("ALTER TABLE deals ADD COLUMN service_type TEXT"); } catch (e) { }

        // Dashboard specific tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS dashboard_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                color TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS dashboard_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                due_date DATE,
                completed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    // User management
    async createAdminUser(userData) {
        const { name, email, password } = userData;
        const passwordHash = await bcrypt.hash(password, 10);

        const stmt = this.db.prepare(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, 'admin')
        `);

        return stmt.run(name, email, passwordHash);
    }

    authenticateUser(email, password) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email);

        if (user && bcrypt.compareSync(password, user.password_hash)) {
            // Don't return password hash
            delete user.password_hash;
            return user;
        }
        return null;
    }

    getAllUsers() {
        const stmt = this.db.prepare('SELECT id, name, email, role, created_at FROM users');
        return stmt.all();
    }

    // Generic CRUD operations
    query(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    run(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.run(...params);
    }

    getAll(table) {
        const stmt = this.db.prepare(`SELECT * FROM ${table}`);
        return stmt.all();
    }

    insert(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...values);
    }

    update(table, id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');

        const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...values, id);
    }

    delete(table, id) {
        const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        return stmt.run(id);
    }

    // Backup
    createBackup() {
        const backupDir = path.join(path.dirname(this.dbPath), '.backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

        this.db.backup(backupPath);
        return backupPath;
    }

    // Export/Import
    exportToJSON() {
        const data = {
            users: this.getAll('users'),
            contacts: this.getAll('contacts'),
            companies: this.getAll('companies'),
            engagements: this.getAll('engagements'),
            resources: this.getAll('resources'),
            activities: this.getAll('activities'),
            settings: this.getAll('settings')
        };

        // Remove password hashes from export
        data.users = data.users.map(u => {
            const { password_hash, ...user } = u;
            return user;
        });

        return data;
    }

    importFromJSON(data) {
        // Note: This is a simple import. In production, you'd want more validation
        const tables = ['contacts', 'companies', 'engagements', 'resources', 'activities', 'settings'];

        this.db.exec('BEGIN TRANSACTION');
        try {
            for (const table of tables) {
                if (data[table]) {
                    for (const row of data[table]) {
                        this.insert(table, row);
                    }
                }
            }
            this.db.exec('COMMIT');
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    close() {
        this.db.close();
    }
}

module.exports = DatabaseHandler;
