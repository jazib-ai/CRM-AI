const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Setup wizard
    setup: {
        getDefaultPath: () => ipcRenderer.invoke('setup:getDefaultPath'),
        choosePath: () => ipcRenderer.invoke('setup:choosePath'),
        complete: (setupData) => ipcRenderer.invoke('setup:complete', setupData)
    },

    // Database operations
    db: {
        query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
        run: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
        getAll: (table) => ipcRenderer.invoke('db:getAll', table),
        insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
        update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
        delete: (table, id) => ipcRenderer.invoke('db:delete', table, id),
        backup: () => ipcRenderer.invoke('db:backup'),
        export: () => ipcRenderer.invoke('db:export'),
        import: () => ipcRenderer.invoke('db:import'),
        getPath: () => ipcRenderer.invoke('db:getPath'),
        changePath: () => ipcRenderer.invoke('db:changePath'),
        openFile: () => ipcRenderer.invoke('db:openFile'),
        eject: () => ipcRenderer.invoke('db:eject')
    },

    // Authentication
    auth: {
        login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
        getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers')
    },

    // Environment check
    isElectron: true
});
