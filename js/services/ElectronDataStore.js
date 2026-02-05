// Electron Database Adapter
// This replaces localStorage with Electron IPC calls to SQLite

window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.ElectronDataStore = class ElectronDataStore {
    constructor() {
        this.isElectron = window.electronAPI && window.electronAPI.isElectron;
        this.cache = {
            contacts: [],
            engagements: [],
            activities: [],
            hrmsActivities: [],
            companies: [],
            deals: [],
            dashboardNotes: [],
            dashboardTasks: []
        };
    }

    async init() {
        if (!this.isElectron) {
            console.warn('Not running in Electron, falling back to localStorage');
            return;
        }

        // Load all data into cache
        await this.loadAll();
    }

    async loadAll() {
        try {
            const contacts = await window.electronAPI.db.getAll('contacts');
            const engagements = await window.electronAPI.db.getAll('engagements');
            const activities = await window.electronAPI.db.getAll('activities');
            const companies = await window.electronAPI.db.getAll('companies');
            const deals = await window.electronAPI.db.getAll('deals');
            const dashboardNotes = await window.electronAPI.db.getAll('dashboard_notes');
            const dashboardTasks = await window.electronAPI.db.getAll('dashboard_tasks');

            if (contacts.success) this.cache.contacts = contacts.data;
            if (engagements.success) {
                // Load resources for each engagement
                for (const engagement of engagements.data) {
                    const resources = await window.electronAPI.db.query(
                        'SELECT * FROM resources WHERE engagement_id = ?',
                        [engagement.id]
                    );
                    engagement.resources = resources.success ? resources.data : [];
                }
                this.cache.engagements = engagements.data;
            }

            if (activities.success) {
                this.cache.activities = activities.data.filter(a => a.contact_id);
                this.cache.hrmsActivities = activities.data.filter(a => a.engagement_id);
            }

            if (companies.success) this.cache.companies = companies.data;
            if (deals.success) this.cache.deals = deals.data;
            if (dashboardNotes.success) this.cache.dashboardNotes = dashboardNotes.data;
            if (dashboardTasks.success) this.cache.dashboardTasks = dashboardTasks.data;

        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async save() {
        // Data is saved immediately on each operation, so this is a no-op
        // But we keep it for compatibility with existing code
        return true;
    }

    async backup() {
        if (!this.isElectron) return;
        const result = await window.electronAPI.db.backup();
        if (result.success) {
            alert(`Backup created at: ${result.path}`);
        } else {
            alert(`Backup failed: ${result.error}`);
        }
    }

    async exportData() {
        if (!this.isElectron) return;
        const result = await window.electronAPI.db.export();
        if (result.success) {
            alert(`Data exported to: ${result.path}`);
        } else if (!result.error.includes('cancelled')) {
            alert(`Export failed: ${result.error}`);
        }
    }

    async importData() {
        if (!this.isElectron) return;
        const result = await window.electronAPI.db.import();
        if (result.success) {
            await this.loadAll();
            alert('Data imported successfully!');
            window.location.reload();
        } else if (!result.error.includes('cancelled')) {
            alert(`Import failed: ${result.error}`);
        }
    }

    // Contact operations
    async addContact(contact) {
        if (!this.isElectron) return contact;

        const result = await window.electronAPI.db.insert('contacts', {
            owner_id: contact.ownerId,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            job_title: contact.jobTitle,
            status: contact.status,
            lifecycle: contact.lifecycle,
            follow_up: contact.followUp,
            notes: contact.notes,
            service: contact.service,
            linkedin: contact.linkedin,
            company_size: contact.companySize
        });

        if (result.success) {
            contact.id = result.data.lastInsertRowid;
            this.cache.contacts.push(contact);
        }
        return contact;
    }

    async updateContact(id, contact) {
        if (!this.isElectron) return;

        await window.electronAPI.db.update('contacts', id, {
            owner_id: contact.ownerId,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            job_title: contact.jobTitle,
            status: contact.status,
            lifecycle: contact.lifecycle,
            follow_up: contact.followUp,
            notes: contact.notes,
            service: contact.service,
            linkedin: contact.linkedin,
            company_size: contact.companySize
        });

        const index = this.cache.contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            this.cache.contacts[index] = contact;
        }
    }

    async deleteContact(id) {
        if (!this.isElectron) return;

        await window.electronAPI.db.delete('contacts', id);
        this.cache.contacts = this.cache.contacts.filter(c => c.id !== id);
    }

    // Engagement operations
    async addEngagement(engagement) {
        if (!this.isElectron) return engagement;

        const result = await window.electronAPI.db.insert('engagements', {
            owner_id: engagement.ownerId,
            client_name: engagement.clientName,
            service_type: engagement.serviceType,
            start_date: engagement.startDate,
            end_date: engagement.endDate,
            status: engagement.status
        });

        if (result.success) {
            engagement.id = result.data.lastInsertRowid;

            // Add resources
            if (engagement.resources && engagement.resources.length > 0) {
                for (const resource of engagement.resources) {
                    await window.electronAPI.db.insert('resources', {
                        engagement_id: engagement.id,
                        name: resource.name,
                        role: resource.role,
                        type: resource.type
                    });
                }
            }

            this.cache.engagements.push(engagement);
        }
        return engagement;
    }

    async updateEngagement(id, engagement) {
        if (!this.isElectron) return;

        await window.electronAPI.db.update('engagements', id, {
            owner_id: engagement.ownerId,
            client_name: engagement.clientName,
            service_type: engagement.serviceType,
            start_date: engagement.startDate,
            end_date: engagement.endDate,
            status: engagement.status
        });

        // Delete old resources and add new ones
        await window.electronAPI.db.run('DELETE FROM resources WHERE engagement_id = ?', [id]);

        if (engagement.resources && engagement.resources.length > 0) {
            for (const resource of engagement.resources) {
                await window.electronAPI.db.insert('resources', {
                    engagement_id: id,
                    name: resource.name,
                    role: resource.role,
                    type: resource.type
                });
            }
        }

        const index = this.cache.engagements.findIndex(e => e.id === id);
        if (index !== -1) {
            this.cache.engagements[index] = engagement;
        }
    }

    async deleteEngagement(id) {
        if (!this.isElectron) return;

        await window.electronAPI.db.delete('engagements', id);
        this.cache.engagements = this.cache.engagements.filter(e => e.id !== id);
    }

    // Activity operations
    async addActivity(activity) {
        if (!this.isElectron) return activity;

        const result = await window.electronAPI.db.insert('activities', {
            contact_id: activity.contactId || null,
            engagement_id: activity.engagementId || null,
            type: activity.type,
            content: activity.content,
            date: activity.date
        });

        if (result.success) {
            activity.id = result.data.lastInsertRowid;

            if (activity.contactId) {
                this.cache.activities.push(activity);
            } else if (activity.engagementId) {
                this.cache.hrmsActivities.push(activity);
            }
        }
        return activity;
    }

    // Getters (return cached data)
    getContacts() {
        return this.cache.contacts;
    }

    getEngagements() {
        return this.cache.engagements;
    }

    getActivities() {
        return this.cache.activities;
    }

    getHRMSActivities() {
        return this.cache.hrmsActivities;
    }

    // Company operations
    async addCompany(company) {
        if (!this.isElectron) return company;

        const result = await window.electronAPI.db.insert('companies', {
            name: company.name,
            size: company.size,
            website: company.website,
            industry: company.industry
        });

        if (result.success) {
            company.id = result.data.lastInsertRowid;
            this.cache.companies.push(company);
        }
        return company;
    }

    async updateCompany(id, company) {
        if (!this.isElectron) return;

        await window.electronAPI.db.update('companies', id, {
            name: company.name,
            size: company.size,
            website: company.website,
            industry: company.industry
        });

        const index = this.cache.companies.findIndex(c => c.id === id);
        if (index !== -1) {
            this.cache.companies[index] = { ...this.cache.companies[index], ...company };
        }
    }

    async deleteCompany(id) {
        if (!this.isElectron) return;
        await window.electronAPI.db.delete('companies', id);
        this.cache.companies = this.cache.companies.filter(c => c.id !== id);
    }

    getCompanies() {
        return this.cache.companies;
    }

    // Deal operations
    async addDeal(deal) {
        if (!this.isElectron) return deal;

        const result = await window.electronAPI.db.insert('deals', {
            owner_id: deal.ownerId,
            title: deal.title,
            company: deal.company,
            value: deal.value,
            stage: deal.stage,
            probability: deal.probability,
            description: deal.description,
            close_date: deal.closeDate,
            service_type: deal.serviceType
        });

        if (result.success) {
            deal.id = result.data.lastInsertRowid;
            this.cache.deals.push(deal);
        }
        return deal;
    }

    async updateDeal(id, deal) {
        if (!this.isElectron) return;

        await window.electronAPI.db.update('deals', id, {
            owner_id: deal.ownerId,
            title: deal.title,
            company: deal.company,
            value: deal.value,
            stage: deal.stage,
            probability: deal.probability,
            description: deal.description,
            close_date: deal.closeDate,
            service_type: deal.serviceType
        });

        const index = this.cache.deals.findIndex(d => d.id === parseInt(id));
        if (index !== -1) {
            this.cache.deals[index] = { ...this.cache.deals[index], ...deal };
        }
    }

    async deleteDeal(id) {
        if (!this.isElectron) return;
        await window.electronAPI.db.delete('deals', id);
        this.cache.deals = this.cache.deals.filter(d => d.id !== parseInt(id));
    }

    getDeals() {
        return this.cache.deals;
    }

    // Dashboard Note operations
    async addDashboardNote(note) {
        if (!this.isElectron) return note;
        const result = await window.electronAPI.db.insert('dashboard_notes', {
            content: note.content,
            color: note.color
        });
        if (result.success) {
            note.id = result.data.lastInsertRowid;
            this.cache.dashboardNotes.push(note);
        }
        return note;
    }

    async deleteDashboardNote(id) {
        if (!this.isElectron) return;
        await window.electronAPI.db.delete('dashboard_notes', id);
        this.cache.dashboardNotes = this.cache.dashboardNotes.filter(n => n.id !== id);
    }

    getDashboardNotes() {
        return this.cache.dashboardNotes;
    }

    // Dashboard Task operations
    async addDashboardTask(task) {
        if (!this.isElectron) return task;
        const result = await window.electronAPI.db.insert('dashboard_tasks', {
            title: task.title,
            due_date: task.dueDate,
            completed: task.completed ? 1 : 0
        });
        if (result.success) {
            task.id = result.data.lastInsertRowid;
            this.cache.dashboardTasks.push(task);
        }
        return task;
    }

    async updateDashboardTask(id, task) {
        if (!this.isElectron) return;
        await window.electronAPI.db.update('dashboard_tasks', id, {
            title: task.title,
            due_date: task.dueDate,
            completed: task.completed ? 1 : 0
        });
        const index = this.cache.dashboardTasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.cache.dashboardTasks[index] = { ...this.cache.dashboardTasks[index], ...task };
        }
    }

    async deleteDashboardTask(id) {
        if (!this.isElectron) return;
        await window.electronAPI.db.delete('dashboard_tasks', id);
        this.cache.dashboardTasks = this.cache.dashboardTasks.filter(t => t.id !== id);
    }

    getDashboardTasks() {
        return this.cache.dashboardTasks;
    }
};
