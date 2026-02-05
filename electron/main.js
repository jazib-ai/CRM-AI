const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./database');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let db;

// Check if this is the first run
function isFirstRun() {
    return !store.get('setupCompleted', false);
}

// Get database path
function getDatabasePath() {
    return store.get('databasePath', path.join(app.getPath('userData'), 'nexogenix.db'));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../build/icon.png'),
        show: false
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Load appropriate page
    if (isFirstRun()) {
        mainWindow.loadFile(path.join(__dirname, 'setup-wizard.html'));
    } else {
        // Initialize database
        const dbPath = getDatabasePath();
        db = new Database(dbPath);
        mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (db) db.close();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Setup wizard handlers
ipcMain.handle('setup:getDefaultPath', () => {
    return path.join(app.getPath('userData'), 'nexogenix.db');
});

ipcMain.handle('setup:choosePath', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Choose Database Location'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return path.join(result.filePaths[0], 'nexogenix.db');
    }
    return null;
});

ipcMain.handle('setup:complete', async (event, setupData) => {
    try {
        const { databasePath, adminUser } = setupData;

        // Ensure directory exists
        const dir = path.dirname(databasePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Initialize database
        db = new Database(databasePath);

        // Create admin user
        await db.createAdminUser(adminUser);

        // Save configuration
        store.set('setupCompleted', true);
        store.set('databasePath', databasePath);

        // Reload main application
        mainWindow.loadFile(path.join(__dirname, '../index.html'));

        return { success: true };
    } catch (error) {
        console.error('Setup error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:getPath', () => {
    return getDatabasePath();
});

ipcMain.handle('db:changePath', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Choose New Database Location'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const newDir = result.filePaths[0];
        const newPath = path.join(newDir, 'nexogenix.db');
        const oldPath = getDatabasePath();

        if (newPath === oldPath) return { success: true, path: oldPath };

        try {
            // Close current DB
            if (db) db.close();

            // Ensure new directory exists
            if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir, { recursive: true });
            }

            // Move existing DB to new location if it exists
            if (fs.existsSync(oldPath)) {
                fs.copyFileSync(oldPath, newPath);
                // Optionally delete old file: fs.unlinkSync(oldPath);
            }

            // Update store
            store.set('databasePath', newPath);

            // Re-initialize DB
            db = new Database(newPath);

            return { success: true, path: newPath };
        } catch (error) {
            console.error('Failed to change database path:', error);
            // Re-open old DB on failure
            db = new Database(oldPath);
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'Cancelled' };
});

ipcMain.handle('db:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: 'Open External Database',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const newPath = result.filePaths[0];

        try {
            if (db) db.close();

            // Update store
            store.set('databasePath', newPath);

            // Re-initialize DB
            db = new Database(newPath);

            return { success: true, path: newPath };
        } catch (error) {
            console.error('Failed to open database file:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'Cancelled' };
});

ipcMain.handle('db:eject', async () => {
    try {
        if (db) db.close();

        // Create a new, empty database in a temp location or reset to default but DELETE content?
        // User wants "CRM should be empty". simplest is to point to a new default file and ensure it is fresh.
        // Let's use a distinct filename for "Ejected/Empty" state or just reset the default one?
        // Let's create a fresh file in userData called 'nexogenix_empty.db'

        const emptyPath = path.join(app.getPath('userData'), `nexogenix_fresh_${Date.now()}.db`);

        store.set('databasePath', emptyPath);
        db = new Database(emptyPath);

        // Ensure it's strictly empty/new
        // Database constructor usually creates tables. So it will be empty but initialized structure.

        return { success: true, path: emptyPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Database query handlers
ipcMain.handle('db:query', async (event, sql, params) => {
    try {
        if (!db) throw new Error('Database not initialized');
        return { success: true, data: db.query(sql, params) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:run', async (event, sql, params) => {
    try {
        if (!db) throw new Error('Database not initialized');
        const result = db.run(sql, params);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:getAll', async (event, table) => {
    try {
        if (!db) throw new Error('Database not initialized');
        return { success: true, data: db.getAll(table) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:insert', async (event, table, data) => {
    try {
        if (!db) throw new Error('Database not initialized');
        const result = db.insert(table, data);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:update', async (event, table, id, data) => {
    try {
        if (!db) throw new Error('Database not initialized');
        const result = db.update(table, id, data);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:delete', async (event, table, id) => {
    try {
        if (!db) throw new Error('Database not initialized');
        const result = db.delete(table, id);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:backup', async () => {
    try {
        if (!db) throw new Error('Database not initialized');
        const backupPath = db.createBackup();
        return { success: true, path: backupPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:export', async () => {
    try {
        if (!db) throw new Error('Database not initialized');
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Database',
            defaultPath: `nexogenix-export-${Date.now()}.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (!result.canceled && result.filePath) {
            const data = db.exportToJSON();
            fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
            return { success: true, path: result.filePath };
        }
        return { success: false, error: 'Export cancelled' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:import', async () => {
    try {
        if (!db) throw new Error('Database not initialized');
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Import Database',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
            db.importFromJSON(data);
            return { success: true };
        }
        return { success: false, error: 'Import cancelled' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Authentication handlers
ipcMain.handle('auth:login', async (event, email, password) => {
    try {
        if (!db) throw new Error('Database not initialized');
        const user = db.authenticateUser(email, password);
        if (user) {
            return { success: true, user };
        }
        return { success: false, error: 'Invalid credentials' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth:getAllUsers', async () => {
    try {
        if (!db) throw new Error('Database not initialized');
        return { success: true, data: db.getAllUsers() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
