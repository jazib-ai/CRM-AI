window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.DataStore = class DataStore {
    constructor() {
        // Check if running in Electron
        this.isElectron = window.electronAPI && window.electronAPI.isElectron;

        if (this.isElectron) {
            console.log('DataStore: Running in Electron mode');
            // Electron mode will be handled by ElectronDataStore
            return;
        }

        // Web/localStorage mode
        this.STORAGE_KEY = 'nexogenix_data_v1';
        this.BACKUP_KEY = 'nexogenix_backup';
        this.data = this.load();

        // Expose data globally for Views to access
        window.NexoGenix.data = this.data;

        // Auto-backup every 5 minutes
        this.startAutoBackup();
    }

    // ==================== CORE METHODS ====================

    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                console.log('DataStore: Loaded from localStorage');
                return this.validateAndMigrate(parsed);
            } catch (e) {
                console.error('DataStore: Failed to parse data', e);
                return this.getDefaults();
            }
        }
        console.log('DataStore: No existing data, using defaults');
        return this.getDefaults();
    }

    save() {
        try {
            // Update timestamps
            const dataToSave = {
                ...window.NexoGenix.data,
                _lastSaved: new Date().toISOString()
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
            console.log('DataStore: Saved successfully at', dataToSave._lastSaved);
            return true;
        } catch (e) {
            console.error('DataStore: Save failed', e);

            // Check if quota exceeded
            if (e.name === 'QuotaExceededError') {
                alert('Storage quota exceeded! Please export your data and clear old records.');
            }
            return false;
        }
    }

    // ==================== DATABASE-LIKE QUERY METHODS ====================

    // Query contacts with filters
    queryContacts(filters = {}) {
        let results = [...(window.NexoGenix.data.contacts || [])];

        if (filters.ownerId) {
            results = results.filter(c => c.ownerId === filters.ownerId);
        }

        if (filters.status) {
            results = results.filter(c => c.status === filters.status);
        }

        if (filters.company) {
            results = results.filter(c => c.company && c.company.toLowerCase().includes(filters.company.toLowerCase()));
        }

        if (filters.search) {
            const term = filters.search.toLowerCase();
            results = results.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.email && c.email.toLowerCase().includes(term)) ||
                (c.company && c.company.toLowerCase().includes(term))
            );
        }

        // Sort by creation date (newest first)
        results.sort((a, b) => b.id - a.id);

        return results;
    }

    // Query deals with filters
    queryDeals(filters = {}) {
        let results = [...(window.NexoGenix.data.deals || [])];

        if (filters.ownerId) {
            results = results.filter(d => d.ownerId === filters.ownerId);
        }

        if (filters.stage) {
            results = results.filter(d => d.stage === filters.stage);
        }

        results.sort((a, b) => b.id - a.id);
        return results;
    }

    // Query activities for a contact
    queryActivities(contactId) {
        const activities = window.NexoGenix.data.activities || [];
        return activities
            .filter(a => a.contactId === contactId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Get statistics
    getStats(userId = null) {
        const contacts = userId ? this.queryContacts({ ownerId: userId }) : window.NexoGenix.data.contacts;
        const deals = userId ? this.queryDeals({ ownerId: userId }) : window.NexoGenix.data.deals;

        return {
            totalContacts: contacts.length,
            totalDeals: deals.length,
            totalRevenue: deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
            activeDeals: deals.filter(d => d.stage !== 'closed').length,
            contactsByStatus: this.groupBy(contacts, 'status'),
            dealsByStage: this.groupBy(deals, 'stage')
        };
    }

    // ==================== CRUD OPERATIONS ====================

    // Generic insert
    insert(collection, data) {
        if (!window.NexoGenix.data[collection]) {
            window.NexoGenix.data[collection] = [];
        }

        const newItem = {
            ...data,
            id: data.id || Date.now(),
            createdAt: new Date().toISOString()
        };

        window.NexoGenix.data[collection].push(newItem);
        this.save();
        return newItem;
    }

    // Generic update
    update(collection, id, updates) {
        const items = window.NexoGenix.data[collection] || [];
        const index = items.findIndex(item => item.id === id);

        if (index === -1) {
            console.error(`Item with id ${id} not found in ${collection}`);
            return null;
        }

        items[index] = {
            ...items[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.save();
        return items[index];
    }

    // Generic delete
    delete(collection, id) {
        const items = window.NexoGenix.data[collection] || [];
        const initialLength = items.length;

        window.NexoGenix.data[collection] = items.filter(item => item.id !== id);

        const deleted = initialLength !== window.NexoGenix.data[collection].length;
        if (deleted) {
            this.save();
        }

        return deleted;
    }

    // ==================== COMPATIBILITY ALIASES ====================
    // These methods match the ElectronDataStore interface

    async addContact(contact) { return this.insert('contacts', contact); }
    async updateContact(id, contact) {
        const result = this.update('contacts', id, contact);
        // Ensure the global reference is properly synchronized
        const index = window.NexoGenix.data.contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            window.NexoGenix.data.contacts[index] = { ...window.NexoGenix.data.contacts[index], ...contact };
        }
        return result;
    }
    async deleteContact(id) {
        const result = this.delete('contacts', id);
        // Ensure the global reference is updated
        window.NexoGenix.data.contacts = window.NexoGenix.data.contacts.filter(c => c.id !== id);
        return result;
    }

    async addCompany(company) { return this.insert('companies', company); }
    async updateCompany(id, company) { return this.update('companies', id, company); }
    async deleteCompany(id) {
        const result = this.delete('companies', id);
        // Ensure the global reference is updated
        window.NexoGenix.data.companies = window.NexoGenix.data.companies.filter(c => c.id !== id);
        return result;
    }

    async addEngagement(engagement) { return this.insert('engagements', engagement); }
    async updateEngagement(id, engagement) { return this.update('engagements', id, engagement); }
    async deleteEngagement(id) { return this.delete('engagements', id); }

    async addDeal(deal) { return this.insert('deals', deal); }
    async updateDeal(id, deal) { return this.update('deals', id, deal); }
    async deleteDeal(id) { return this.delete('deals', id); }

    async addActivity(activity) {
        if (activity.engagementId) {
            const items = window.NexoGenix.data['hrmsActivities'] || [];
            const newItem = { ...activity, id: Date.now(), createdAt: new Date().toISOString() };
            if (!window.NexoGenix.data['hrmsActivities']) window.NexoGenix.data['hrmsActivities'] = [];
            window.NexoGenix.data['hrmsActivities'].push(newItem);
            this.save();
            return newItem;
        }
        return this.insert('activities', activity);
    }
    async updateActivity(id, activity) { return this.update('activities', id, activity); }
    async deleteActivity(id) { return this.delete('activities', id); }

    // Dashboard Extras
    async addDashboardNote(note) { return this.insert('dashboard_notes', note); }
    async updateDashboardNote(id, note) { return this.update('dashboard_notes', id, note); }
    async deleteDashboardNote(id) { return this.delete('dashboard_notes', id); }

    async addDashboardTask(task) { return this.insert('dashboard_tasks', task); }
    async updateDashboardTask(id, task) { return this.update('dashboard_tasks', id, task); }
    async deleteDashboardTask(id) { return this.delete('dashboard_tasks', id); }

    // Load all data (for compatibility with ElectronDataStore)
    async loadAll() {
        return window.NexoGenix.data;
    }

    // ==================== BACKUP & RESTORE ====================

    createBackup() {
        const backup = {
            data: window.NexoGenix.data,
            timestamp: new Date().toISOString(),
            version: this.STORAGE_KEY
        };

        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
        console.log('DataStore: Backup created at', backup.timestamp);
        return backup;
    }

    restoreBackup() {
        const backup = localStorage.getItem(this.BACKUP_KEY);
        if (!backup) {
            alert('No backup found!');
            return false;
        }

        try {
            const parsed = JSON.parse(backup);
            window.NexoGenix.data = parsed.data;
            this.save();
            console.log('DataStore: Restored from backup', parsed.timestamp);
            alert('Data restored from backup: ' + new Date(parsed.timestamp).toLocaleString());
            return true;
        } catch (e) {
            console.error('DataStore: Restore failed', e);
            alert('Failed to restore backup!');
            return false;
        }
    }

    // Export data as JSON file
    exportData() {
        const dataStr = JSON.stringify(window.NexoGenix.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `nexogenix-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
        console.log('DataStore: Data exported');
    }

    // Import data from JSON file
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);

                    if (confirm('This will replace all current data. Continue?')) {
                        window.NexoGenix.data = this.validateAndMigrate(imported);
                        this.save();
                        alert('Data imported successfully!');
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    console.error('Import failed:', err);
                    alert('Failed to import data. Invalid file format.');
                    reject(err);
                }
            };

            reader.readAsText(file);
        });
    }

    // ==================== UTILITY METHODS ====================

    startAutoBackup() {
        // Create backup every 5 minutes
        setInterval(() => {
            this.createBackup();
        }, 5 * 60 * 1000);
    }

    validateAndMigrate(data) {
        // Ensure all required collections exist
        const validated = {
            contacts: data.contacts || [],
            deals: data.deals || [],
            activities: data.activities || [],
            companies: data.companies || [],
            dashboardNotes: data.dashboardNotes || [],
            dashboardTasks: data.dashboardTasks || [],
            engagements: data.engagements || [],
            hrmsActivities: data.hrmsActivities || [],
            integrations: data.integrations || { gmail: false, outlook: false },
            config: data.config || {
                timezones: ['IST', 'EST', 'CST', 'MST', 'PST', 'GMT', 'BST', 'CET', 'AEST'],
                services: ['Lead Generation', 'Data Enrichment', 'CRM Implementation', 'Sales Outsourcing']
            },
            _lastSaved: data._lastSaved || new Date().toISOString()
        };

        // Data migration: Ensure all contacts have required fields
        validated.contacts = validated.contacts.map(c => ({
            id: c.id,
            ownerId: c.ownerId || 1,
            name: c.name || 'Unknown',
            email: c.email || '',
            phone: c.phone || '',
            company: c.company || '',
            companySize: c.companySize || '',
            jobTitle: c.jobTitle || '',
            status: c.status || 'New',
            lifecycle: c.lifecycle || 'Lead',
            followUp: c.followUp || null,
            meetingDate: c.meetingDate || null,
            website: c.website || '',
            timezone: c.timezone || '',
            linkedin: c.linkedin || '',
            service: c.service || '',
            notes: c.notes || ''
        }));

        return validated;
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'Unknown';
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {});
    }

    // Factory reset
    reset() {
        if (confirm('Are you sure you want to factory reset ALL data? This cannot be undone.')) {
            if (confirm('Last chance! This will delete everything. Continue?')) {
                localStorage.removeItem(this.STORAGE_KEY);
                localStorage.removeItem(this.BACKUP_KEY);
                window.location.reload();
            }
        }
    }

    getDefaults() {
        return {
            contacts: [
                { id: 1, ownerId: 1, name: 'Alice Cooper', email: 'alice@example.com', company: 'TechCorp', status: 'Customer', phone: '', jobTitle: '', lifecycle: 'Customer', followUp: null, meetingDate: null, website: '', timezone: '', linkedin: '', service: '', notes: '' },
                { id: 2, ownerId: 1, name: 'Bob Smith', email: 'bob.smith@acme.inc', company: 'Acme Inc.', status: 'New', phone: '', jobTitle: '', lifecycle: 'Lead', followUp: null, meetingDate: null, website: '', timezone: '', linkedin: '', service: '', notes: '' }
            ],
            deals: [
                { id: 101, ownerId: 1, title: 'TechCorp Renewal', value: 15000, stage: 'negotiation', probability: '75%', company: 'TechCorp', closeDate: null }
            ],
            activities: [],
            engagements: [
                {
                    id: 1,
                    ownerId: 1,
                    clientName: 'TechCorp Solutions',
                    serviceType: 'IT Support',
                    startDate: '2026-01-15',
                    endDate: '2026-12-31',
                    resources: [
                        { id: 1, name: 'John Doe', role: 'Senior Engineer', type: 'resource' },
                        { id: 2, name: 'ABC Vendors Inc.', role: 'Hardware Supplier', type: 'vendor' }
                    ],
                    status: 'Active'
                },
                {
                    id: 2,
                    ownerId: 1,
                    clientName: 'Acme Inc.',
                    serviceType: 'Consulting',
                    startDate: '2025-11-01',
                    endDate: '2026-02-28',
                    resources: [
                        { id: 3, name: 'Jane Smith', role: 'Business Consultant', type: 'resource' }
                    ],
                    status: 'Active'
                }
            ],
            hrmsActivities: [
                { id: 1, engagementId: 1, type: 'Note', content: 'Client onboarded successfully', date: '2026-01-15T10:00:00Z' },
                { id: 2, engagementId: 2, type: 'Milestone', content: 'Initial consultation completed', date: '2025-11-05T14:30:00Z' }
            ],
            companies: [],
            dashboardNotes: [],
            dashboardTasks: [],
            integrations: { gmail: false, outlook: false },
            config: {
                timezones: ['IST', 'EST', 'CST', 'MST', 'PST', 'GMT', 'BST', 'CET', 'AEST'],
                services: ['Lead Generation', 'Data Enrichment', 'CRM Implementation', 'Sales Outsourcing'],
                companySizes: ['1-10', '10-50', '50-200', '200-500', '500+']
            },
            _lastSaved: new Date().toISOString()
        };
    }
}
