window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.SyncedDataStore = class SyncedDataStore {
    constructor(localStore, remoteStore) {
        this.localStore = localStore;
        this.remoteStore = remoteStore;
        console.log('SyncedDataStore: Hybrid storage initialized');
    }

    async init() {
        if (this.localStore.init) await this.localStore.init();
        // Remote store initializes itself via Sync Engine
    }

    async loadAll() {
        // Source of truth for UI is local for speed
        return this.localStore.loadAll();
    }

    // --- Core Wrapper Pattern ---
    // We execute local write first for immediate UI feedback, 
    // then background sync to the remote server.

    async addContact(contact) {
        const localResult = await this.localStore.addContact(contact);
        if (this.remoteStore) {
            this.remoteStore.addContact(contact).catch(e => console.warn('Sync: Remote contact add failed', e));
        }
        return localResult;
    }

    async updateContact(id, contact) {
        await this.localStore.updateContact(id, contact);
        if (this.remoteStore) {
            this.remoteStore.updateContact(id, contact).catch(e => console.warn('Sync: Remote contact update failed', e));
        }
    }

    async deleteContact(id) {
        await this.localStore.deleteContact(id);
        if (this.remoteStore) {
            this.remoteStore.deleteContact(id).catch(e => console.warn('Sync: Remote contact delete failed', e));
        }
    }

    async addCompany(company) {
        const localResult = await this.localStore.addCompany(company);
        if (this.remoteStore) {
            this.remoteStore.addCompany(company).catch(e => console.warn('Sync: Remote company add failed', e));
        }
        return localResult;
    }

    async updateCompany(id, company) {
        await this.localStore.updateCompany(id, company);
        if (this.remoteStore) {
            this.remoteStore.updateCompany(id, company).catch(e => console.warn('Sync: Remote company update failed', e));
        }
    }

    async deleteCompany(id) {
        await this.localStore.deleteCompany(id);
        if (this.remoteStore) {
            this.remoteStore.deleteCompany(id).catch(e => console.warn('Sync: Remote company delete failed', e));
        }
    }

    async addDeal(deal) {
        const localResult = await this.localStore.addDeal(deal);
        if (this.remoteStore) {
            this.remoteStore.addDeal(deal).catch(e => console.warn('Sync: Remote deal add failed', e));
        }
        return localResult;
    }

    async updateDeal(id, deal) {
        await this.localStore.updateDeal(id, deal);
        if (this.remoteStore) {
            this.remoteStore.updateDeal(id, deal).catch(e => console.warn('Sync: Remote deal update failed', e));
        }
    }

    async deleteDeal(id) {
        await this.localStore.deleteDeal(id);
        if (this.remoteStore) {
            this.remoteStore.deleteDeal(id).catch(e => console.warn('Sync: Remote deal delete failed', e));
        }
    }

    async addEngagement(engagement) {
        const localResult = await this.localStore.addEngagement(engagement);
        if (this.remoteStore) {
            this.remoteStore.addEngagement(engagement).catch(e => console.warn('Sync: Remote engagement add failed', e));
        }
        return localResult;
    }

    async updateEngagement(id, engagement) {
        await this.localStore.updateEngagement(id, engagement);
        if (this.remoteStore) {
            this.remoteStore.updateEngagement(id, engagement).catch(e => console.warn('Sync: Remote engagement update failed', e));
        }
    }

    async deleteEngagement(id) {
        await this.localStore.deleteEngagement(id);
        if (this.remoteStore) {
            this.remoteStore.deleteEngagement(id).catch(e => console.warn('Sync: Remote engagement delete failed', e));
        }
    }

    async addActivity(activity) {
        const localResult = await this.localStore.addActivity(activity);
        if (this.remoteStore) {
            this.remoteStore.addActivity(activity).catch(e => console.warn('Sync: Remote activity add failed', e));
        }
        return localResult;
    }

    // Dashboard
    async addDashboardNote(note) {
        const localResult = await this.localStore.addDashboardNote(note);
        if (this.remoteStore) {
            this.remoteStore.addDashboardNote(note).catch(e => console.warn('Sync: Remote note add failed', e));
        }
        return localResult;
    }

    async deleteDashboardNote(id) {
        await this.localStore.deleteDashboardNote(id);
        if (this.remoteStore) {
            this.remoteStore.deleteDashboardNote(id).catch(e => console.warn('Sync: Remote note delete failed', e));
        }
    }

    async addDashboardTask(task) {
        const localResult = await this.localStore.addDashboardTask(task);
        if (this.remoteStore) {
            this.remoteStore.addDashboardTask(task).catch(e => console.warn('Sync: Remote task add failed', e));
        }
        return localResult;
    }

    async updateDashboardTask(id, task) {
        await this.localStore.updateDashboardTask(id, task);
        if (this.remoteStore) {
            this.remoteStore.updateDashboardTask(id, task).catch(e => console.warn('Sync: Remote task update failed', e));
        }
    }

    async deleteDashboardTask(id) {
        await this.localStore.deleteDashboardTask(id);
        if (this.remoteStore) {
            this.remoteStore.deleteDashboardTask(id).catch(e => console.warn('Sync: Remote task delete failed', e));
        }
    }

    // Passthrough Getters (read from local for speed)
    getContacts() { return this.localStore.getContacts(); }
    getEngagements() { return this.localStore.getEngagements(); }
    getActivities() { return this.localStore.getActivities(); }
    getHRMSActivities() { return this.localStore.getHRMSActivities(); }
    getCompanies() { return this.localStore.getCompanies ? this.localStore.getCompanies() : []; }
    getDeals() { return this.localStore.getDeals ? this.localStore.getDeals() : []; }
    getDashboardNotes() { return this.localStore.getDashboardNotes ? this.localStore.getDashboardNotes() : []; }
    getDashboardTasks() { return this.localStore.getDashboardTasks ? this.localStore.getDashboardTasks() : []; }

    // Backup/Export always from local
    async exportData() { return this.localStore.exportData(); }
    async importData(file) { return this.localStore.importData(file); }
    async backup() { return this.localStore.backup(); }
};
