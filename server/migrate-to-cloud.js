const DatabaseHandler = require('../electron/database');
const PostgresDatabaseHandler = require('./database-postgres');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('Error: Please provide DATABASE_URL environment variable.');
    process.exit(1);
}

const migrate = async () => {
    console.log('--- Starting Migration: SQLite -> PostgreSQL ---');

    const sqlitePath = path.join(__dirname, '../data/nexogenix.db');
    const sqlite = new DatabaseHandler(sqlitePath);
    const pg = new PostgresDatabaseHandler(DATABASE_URL);

    const tables = [
        'users',
        'companies',
        'contacts',
        'engagements',
        'resources',
        'activities',
        'deals',
        'dashboard_tasks',
        'dashboard_notes',
        'settings'
    ];

    try {
        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            const rows = sqlite.getAll(table);

            if (rows.length === 0) {
                console.log(`Table ${table} is empty, skipping.`);
                continue;
            }

            for (const row of rows) {
                // Ensure ID is included for consistency
                await pg.insert(table, row);
            }
            console.log(`Successfully migrated ${rows.length} rows to ${table}`);
        }

        console.log('--- Migration Complete! ---');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        sqlite.close();
        await pg.close();
        process.exit(0);
    }
};

migrate();
