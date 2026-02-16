const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class PostgresDatabaseHandler {
    constructor(connectionString) {
        this.pool = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });
        this.initializeSchema();
    }

    async initializeSchema() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Users table
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Companies table
            await client.query(`
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    size TEXT,
                    website TEXT,
                    industry TEXT,
                    service_fit TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Contacts table
            await client.query(`
                CREATE TABLE IF NOT EXISTS contacts (
                    id SERIAL PRIMARY KEY,
                    owner_id INTEGER NOT NULL REFERENCES users(id),
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    company TEXT,
                    job_title TEXT,
                    status TEXT DEFAULT 'Lead',
                    lifecycle TEXT DEFAULT 'Lead',
                    follow_up DATE,
                    notes TEXT,
                    service_fit TEXT,
                    service TEXT,
                    linkedin TEXT,
                    company_size TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Engagements table
            await client.query(`
                CREATE TABLE IF NOT EXISTS engagements (
                    id SERIAL PRIMARY KEY,
                    owner_id INTEGER NOT NULL REFERENCES users(id),
                    client_name TEXT NOT NULL,
                    service_type TEXT NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    status TEXT NOT NULL DEFAULT 'Active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Resources table
            await client.query(`
                CREATE TABLE IF NOT EXISTS resources (
                    id SERIAL PRIMARY KEY,
                    engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    type TEXT NOT NULL
                );
            `);

            // Activities table
            await client.query(`
                CREATE TABLE IF NOT EXISTS activities (
                    id SERIAL PRIMARY KEY,
                    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
                    engagement_id INTEGER REFERENCES engagements(id) ON DELETE CASCADE,
                    type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Settings table
            await client.query(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            `);

            // Deals table
            await client.query(`
                CREATE TABLE IF NOT EXISTS deals (
                    id SERIAL PRIMARY KEY,
                    owner_id INTEGER NOT NULL REFERENCES users(id),
                    title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    value REAL DEFAULT 0,
                    stage TEXT DEFAULT 'lead',
                    probability TEXT,
                    description TEXT,
                    close_date DATE,
                    service_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Dashboard tables
            await client.query(`
                CREATE TABLE IF NOT EXISTS dashboard_notes (
                    id SERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    color TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS dashboard_tasks (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    due_date DATE,
                    completed INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await client.query('COMMIT');
            console.log('PostgresDatabaseHandler: Schema initialized');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('PostgresDatabaseHandler: Schema initialization failed', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // User management
    async createAdminUser(userData) {
        const { name, email, password } = userData;
        const passwordHash = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, \'admin\') RETURNING id';
        const res = await this.pool.query(query, [name, email, passwordHash]);
        return res.rows[0];
    }

    async authenticateUser(email, password) {
        const res = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = res.rows[0];
        if (user && bcrypt.compareSync(password, user.password_hash)) {
            delete user.password_hash;
            return user;
        }
        return null;
    }

    async getAllUsers() {
        const res = await this.pool.query('SELECT id, name, email, role, created_at FROM users');
        return res.rows;
    }

    // Generic CRUD operations
    async query(sql, params = []) {
        // Convert ? placeholders to $1, $2... for pg
        let index = 1;
        const pgSql = sql.replace(/\?/g, () => `$${index++}`);
        const res = await this.pool.query(pgSql, params);
        return res.rows;
    }

    async run(sql, params = []) {
        let index = 1;
        const pgSql = sql.replace(/\?/g, () => `$${index++}`);
        const res = await this.pool.query(pgSql, params);
        return { lastInsertRowid: res.rows[0]?.id, changes: res.rowCount };
    }

    async getAll(table) {
        const res = await this.pool.query(`SELECT * FROM ${table}`);
        return res.rows;
    }

    async insert(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`;
        const res = await this.pool.query(sql, values);
        return { lastInsertRowid: res.rows[0]?.id };
    }

    async update(table, id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1}`;
        const res = await this.pool.query(sql, [...values, id]);
        return { changes: res.rowCount };
    }

    async delete(table, id) {
        const res = await this.pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return { changes: res.rowCount };
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = PostgresDatabaseHandler;
