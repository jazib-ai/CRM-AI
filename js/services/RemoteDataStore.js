window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.RemoteDataStore = class RemoteDataStore {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || 'http://localhost:3000';
        this.lastSync = 0;
        this.isSyncing = false;
        this.startSyncEngine();
    }

    async request(path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'API request failed');
        }
        return response.json();
    }

    // --- SYNC ENGINE ---
    startSyncEngine() {
        // Poll for changes every 5 seconds
        setInterval(async () => {
            if (this.isSyncing || !localStorage.getItem('nexogenix_session')) return;

            try {
                const status = await fetch(`${this.baseUrl}/api/sync/status`).then(r => r.json());
                if (status.lastChange > this.lastSync) {
                    console.log('RemoteDataStore: Remote changes detected, re-syncing...');
                    await this.refreshState();
                }
            } catch (e) {
                console.warn('Sync Engine: Connection lost', e);
            }
        }, 5000);
    }

    async refreshState() {
        this.isSyncing = true;
        try {
            const results = await this.loadAll();
            window.NexoGenix.data = {
                ...window.NexoGenix.data,
                ...results,
                hrmsActivities: results.activities.filter(a => a.engagementId)
            };
            this.lastSync = Date.now();

            // Trigger UI update if possible
            if (window.NexoGenix.app && window.NexoGenix.app.handleRoute) {
                window.NexoGenix.app.handleRoute();
            }
        } finally {
            this.isSyncing = false;
        }
    }

    // Auth
    async login(email, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Generic Methods
    async getAll(table) { return this.request(`/api/${table}`); }
    async insert(table, data) {
        const result = await this.request(`/api/${table}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        this.lastSync = Date.now();
        return result;
    }

    async update(table, id, data) {
        const result = await this.request(`/api/${table}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        this.lastSync = Date.now();
        return result;
    }

    async delete(table, id) {
        const result = await this.request(`/api/${table}/${id}`, {
            method: 'DELETE'
        });
        this.lastSync = Date.now();
        return result;
    }

    // Specific CRUD
    async addContact(contact) { return this.insert('contacts', contact); }
    async updateContact(id, contact) { return this.update('contacts', id, contact); }
    async deleteContact(id) { return this.delete('contacts', id); }

    async addCompany(company) { return this.insert('companies', company); }
    async updateCompany(id, company) { return this.update('companies', id, company); }
    async deleteCompany(id) { return this.delete('companies', id); }

    async addEngagement(engagement) { return this.insert('engagements', engagement); }
    async updateEngagement(id, engagement) { return this.update('engagements', id, engagement); }
    async deleteEngagement(id) { return this.delete('engagements', id); }

    async addDeal(deal) { return this.insert('deals', deal); }
    async updateDeal(id, deal) { return this.update('deals', id, deal); }
    async deleteDeal(id) { return this.delete('deals', id); }

    async addActivity(activity) { return this.insert('activities', activity); }
    async updateActivity(id, activity) { return this.update('activities', id, activity); }
    async deleteActivity(id) { return this.delete('activities', id); }

    // Dashboard Extras
    async getDashboardNotes() { return this.getAll('dashboard_notes'); }
    async addDashboardNote(note) { return this.insert('dashboard_notes', note); }
    async updateDashboardNote(id, note) { return this.update('dashboard_notes', id, note); }
    async deleteDashboardNote(id) { return this.delete('dashboard_notes', id); }

    async getDashboardTasks() { return this.getAll('dashboard_tasks'); }
    async addDashboardTask(task) { return this.insert('dashboard_tasks', task); }
    async updateDashboardTask(id, task) { return this.update('dashboard_tasks', id, task); }
    async deleteDashboardTask(id) { return this.delete('dashboard_tasks', id); }

    async loadAll() {
        const results = await Promise.all([
            this.getAll('contacts'),
            this.getAll('companies'),
            this.getAll('deals'),
            this.getAll('engagements'),
            this.getAll('activities'),
            this.getAll('users'),
            this.getAll('dashboard_notes'),
            this.getAll('dashboard_tasks')
        ]);

        this.lastSync = Date.now();

        return {
            contacts: results[0],
            companies: results[1],
            deals: results[2],
            engagements: results[3],
            activities: results[4],
            users: results[5],
            dashboardNotes: results[6],
            dashboardTasks: results[7]
        };
    }

    // Save method (dummy for remote)
    save() {
        console.log('RemoteDataStore: Changes are persistent on server.');
    }
}
