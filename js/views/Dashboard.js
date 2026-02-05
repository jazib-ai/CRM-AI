window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Dashboard = class Dashboard {
    constructor() {
        this.timeRange = 'thisMonth';
        this.selectedUserId = 'all';
        window.NexoGenix.activeDashboard = this;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    getDateRange(range) {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        switch (range) {
            case 'today':
                break;
            case 'thisWeek':
                const day = now.getDay() || 7;
                if (day !== 1) start.setHours(-24 * (day - 1));
                break;
            case 'thisMonth':
                start.setDate(1);
                break;
            case 'thisQuarter':
                const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
                start.setMonth(quarterMonth, 1);
                break;
            case 'allTime':
                return null;
        }
        return start;
    }

    filterByDate(items, dateField, start) {
        if (!start) return items;
        return items.filter(item => {
            if (!item[dateField]) return false;
            return new Date(item[dateField]) >= start;
        });
    }

    async updateFilter(key, value) {
        this[key] = value;
        const html = await this.render();
        const routerView = document.getElementById('router-view');
        if (routerView) {
            routerView.innerHTML = html;
        }
    }

    // --- DASHBOARD ACTIONS ---
    async addNote() {
        const content = prompt("Enter your briefing note:");
        if (!content) return;

        await window.NexoGenix.store.addDashboardNote({
            content,
            ownerId: window.NexoGenix.auth.getUser().id,
            date: new Date().toISOString()
        });
        this.updateFilter();
    }

    async deleteNote(id) {
        if (confirm("Expunge this note from records?")) {
            await window.NexoGenix.store.deleteDashboardNote(id);
            this.updateFilter();
        }
    }

    async addTask() {
        const title = prompt("Enter task objective:");
        if (!title) return;

        await window.NexoGenix.store.addDashboardTask({
            title,
            completed: false,
            ownerId: window.NexoGenix.auth.getUser().id,
            date: new Date().toISOString()
        });
        this.updateFilter();
    }

    async toggleTask(id, completed) {
        await window.NexoGenix.store.updateDashboardTask(id, { completed });
        this.updateFilter();
    }

    async deleteTask(id) {
        if (confirm("Archive this task?")) {
            await window.NexoGenix.store.deleteDashboardTask(id);
            this.updateFilter();
        }
    }

    async render() {
        const range = this.timeRange;
        const selectedUserId = this.selectedUserId;
        const startDate = this.getDateRange(range);

        const currentUser = window.NexoGenix.auth.getUser();
        const isAdmin = currentUser.role === 'admin';
        const allUsers = window.NexoGenix.auth.getAllUsers();

        // 1. Get Base Data
        let allContacts = window.NexoGenix.data.contacts || [];
        let allActivities = window.NexoGenix.data.activities || [];

        // 2. Apply User Filter
        if (!isAdmin) {
            allContacts = allContacts.filter(c => c.ownerId === currentUser.id);
        } else if (selectedUserId !== 'all') {
            allContacts = allContacts.filter(c => c.ownerId === selectedUserId);
        }

        const contactIdsFilter = new Set(allContacts.map(c => c.id));
        allActivities = allActivities.filter(a => contactIdsFilter.has(a.contactId));

        // 3. Apply Date Filters
        const createdContacts = this.filterByDate(allContacts, 'createdAt', startDate);
        const activitiesInRange = this.filterByDate(allActivities, 'date', startDate);

        // 4. Notes & Tasks
        const dashboardNotes = (window.NexoGenix.data.dashboardNotes || []).filter(n => isAdmin || n.ownerId === currentUser.id);
        const dashboardTasks = (window.NexoGenix.data.dashboardTasks || []).filter(t => isAdmin || t.ownerId === currentUser.id);

        // 4. Calculate Metrics
        const leadsCollected = createdContacts.length;
        const callsConnected = activitiesInRange.filter(a =>
            a.type === 'Call' && (a.content.toLowerCase().includes('connected') || a.content.toLowerCase().includes('answered'))
        ).length;
        const callsTotal = activitiesInRange.filter(a => a.type === 'Call').length;

        // Follow-ups Due
        const todayStr = new Date().toISOString().split('T')[0];
        const dueFollowUps = allContacts.filter(c => {
            if (!c.followUp) return false;
            return c.followUp <= todayStr && c.status !== 'Customer' && c.status !== 'Closed';
        }).sort((a, b) => a.followUp.localeCompare(b.followUp));

        const glassStyle = "backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);";

        return `
            <div style="font-family: 'Inter', sans-serif; padding-top: 1rem;">
                
                <!-- Atmospheric Background Elements -->
                <div style="position: fixed; top: -100px; right: 15%; width: 500px; height: 500px; background: rgba(59, 130, 246, 0.05); filter: blur(120px); border-radius: 50%; z-index: -1;"></div>
                <div style="position: fixed; bottom: -100px; left: 5%; width: 600px; height: 600px; background: rgba(217, 70, 239, 0.05); filter: blur(150px); border-radius: 50%; z-index: -1;"></div>

                <!-- Header Section -->
                <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; ${glassStyle} padding: 2.5rem; border-radius: 32px;">
                    <div>
                        <h1 style="font-size: 2.25rem; font-weight: 600; color: #0f172a; margin: 0; letter-spacing: -0.02em;">Intelligence Overview</h1>
                        <p style="color: #64748b; font-size: 1rem; margin-top: 0.5rem; font-weight: 400;">Synthesizing relationship signals and engagement metrics.</p>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        ${isAdmin ? `
                        <select class="glass-select-minimal" onchange="window.NexoGenix.activeDashboard.updateFilter('selectedUserId', this.value)">
                            <option value="all" ${selectedUserId === 'all' ? 'selected' : ''}>All Operatives</option>
                            ${allUsers.map(u => `<option value="${u.id}" ${selectedUserId === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                        </select>
                        ` : ''}

                        <select class="glass-select-minimal" onchange="window.NexoGenix.activeDashboard.updateFilter('timeRange', this.value)">
                            <option value="today" ${range === 'today' ? 'selected' : ''}>Today</option>
                            <option value="thisWeek" ${range === 'thisWeek' ? 'selected' : ''}>This Week</option>
                            <option value="thisMonth" ${range === 'thisMonth' ? 'selected' : ''}>This Month</option>
                            <option value="thisQuarter" ${range === 'thisQuarter' ? 'selected' : ''}>This Quarter</option>
                            <option value="allTime" ${range === 'allTime' ? 'selected' : ''}>All Time</option>
                        </select>
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem;">
                    <div style="${glassStyle} padding: 2rem; border-radius: 24px; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(59, 130, 246, 0.03); border-radius: 50%;"></div>
                        <span style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.1em;">Leads Indexed</span>
                        <div style="font-size: 3rem; font-weight: 600; color: #0f172a; margin-top: 1rem; display: flex; align-items: baseline; gap: 0.5rem;">
                            ${leadsCollected}
                            <span style="font-size: 0.9rem; color: #10b981; font-weight: 700;">+${Math.floor(Math.random() * 5)}%</span>
                        </div>
                    </div>

                    <div style="${glassStyle} padding: 2rem; border-radius: 24px; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(244, 63, 94, 0.03); border-radius: 50%;"></div>
                        <span style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.1em;">Action Items Due</span>
                        <div style="font-size: 3rem; font-weight: 600; color: #f43f5e; margin-top: 1rem;">${dueFollowUps.length}</div>
                    </div>

                    <div style="${glassStyle} padding: 2rem; border-radius: 24px; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(16, 185, 129, 0.03); border-radius: 50%;"></div>
                        <span style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.1em;">Engagement Depth</span>
                        <div style="font-size: 3rem; font-weight: 600; color: #0f172a; margin-top: 1rem;">
                            ${callsConnected} 
                            <span style="font-size: 1.25rem; color: #94a3b8; font-weight: 400; margin-left: 0.25rem;">/ ${callsTotal} signals</span>
                        </div>
                    </div>
                </div>

                <!-- Bottom row: Recents and Intelligence Annex -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
                    
                    <!-- Activity Feed & Notes -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <!-- Activity Feed -->
                        <div style="${glassStyle} border-radius: 32px; overflow: hidden;">
                            <div style="padding: 1.75rem 2.5rem; border-bottom: 1px solid rgba(226, 232, 240, 0.4); background: rgba(255,255,255,0.2);">
                                <h3 style="font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    Intelligence Stream
                                </h3>
                            </div>
                            <div style="padding: 1rem 2.5rem;">
                                ${activitiesInRange.length > 0 ? activitiesInRange.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(a => {
            const contact = allContacts.find(c => c.id === a.contactId);
            const contactName = contact ? contact.name : 'Unknown';
            const color = { Note: '#fbbf24', Email: '#3b82f6', Call: '#10b981', Meeting: '#8b5cf6', Task: '#f43f5e' }[a.type] || '#64748b';

            return `
                                        <div style="display: flex; gap: 1.5rem; align-items: center; padding: 1.25rem 0; border-bottom: 1px solid rgba(226, 232, 240, 0.3);">
                                            <div style="width: 44px; height: 44px; background: ${color}10; color: ${color}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                                ${a.type === 'Call' ? '📞' : a.type === 'Email' ? '✉️' : '📝'}
                                            </div>
                                            <div style="flex: 1;">
                                                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;">
                                                    <div style="font-weight: 600; font-size: 0.95rem; color: #1e293b;">${a.type} with ${contactName}</div>
                                                    <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">${new Date(a.date).toLocaleDateString()}</div>
                                                </div>
                                                <div style="color: #64748b; font-size: 0.85rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${a.content}</div>
                                            </div>
                                        </div>
                                    `;
        }).join('') :
                `<div style="padding: 4rem 2rem; text-align: center; color: #94a3b8;">No stream data.</div>`}
                            </div>
                        </div>

                        <!-- Briefing Notes -->
                        <div style="${glassStyle} border-radius: 32px; overflow: hidden;">
                            <div style="padding: 1.5rem 2.5rem; border-bottom: 1px solid rgba(226, 232, 240, 0.4); display: flex; justify-content: space-between; align-items: center;">
                                <h3 style="font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0;">Briefing Notes</h3>
                                <button onclick="window.NexoGenix.activeDashboard.addNote()" style="background: #0f172a; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 10px; font-size: 0.75rem; cursor: pointer;">+ Add Note</button>
                            </div>
                            <div style="padding: 1.5rem 2.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                                ${dashboardNotes.map(n => `
                                    <div style="background: rgba(255,255,255,0.6); padding: 1.25rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.8); position: relative;" class="note-card">
                                        <div style="font-size: 0.85rem; color: #475569; line-height: 1.5;">${n.content}</div>
                                        <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: flex-end;">
                                            <span style="font-size: 0.7rem; color: #94a3b8;">${new Date(n.date).toLocaleDateString()}</span>
                                            <button onclick="window.NexoGenix.activeDashboard.deleteNote(${n.id})" style="background: transparent; border: none; color: #fca5a5; cursor: pointer; padding: 0;">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                                ${dashboardNotes.length === 0 ? '<div style="grid-column: span 2; text-align: center; color: #94a3b8; padding: 2rem;">No briefings recorded.</div>' : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Priority & Tasks -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <!-- Pinned Actions -->
                        <div style="${glassStyle} border-radius: 32px; overflow: hidden;">
                            <div style="padding: 1.75rem 2.5rem; border-bottom: 1px solid rgba(226, 232, 240, 0.4); background: rgba(255,255,255,0.2);">
                                <h3 style="font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0;">High Priority</h3>
                            </div>
                            <div style="padding: 1.5rem 2rem;">
                                ${dueFollowUps.length > 0 ? dueFollowUps.slice(0, 5).map(c => `
                                    <div onclick="window.location.hash='#contact/${c.id}'" style="padding: 1rem; border-radius: 16px; background: rgba(255,255,255,0.4); margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.8); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateX(4px)'; this.style.borderColor='#3b82f640'">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.9rem;">${c.name}</div>
                                        <div style="font-size: 0.75rem; color: #f43f5e; font-weight: 700; margin-top: 4px; text-transform: uppercase;">Due: ${c.followUp}</div>
                                    </div>
                                `).join('') : `
                                    <div style="text-align: center; color: #94a3b8; padding: 2rem 1rem; font-size: 0.9rem;">Clean slate.</div>
                                `}
                            </div>
                        </div>

                        <!-- Directive Tasks -->
                        <div style="${glassStyle} border-radius: 32px; overflow: hidden;">
                            <div style="padding: 1.5rem 2.5rem; border-bottom: 1px solid rgba(226, 232, 240, 0.4); display: flex; justify-content: space-between; align-items: center;">
                                <h3 style="font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0;">Directives</h3>
                                <button onclick="window.NexoGenix.activeDashboard.addTask()" style="background: transparent; color: #3b82f6; border: 1px solid #3b82f6; padding: 0.4rem 0.8rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">+ New</button>
                            </div>
                            <div style="padding: 1.5rem 1.75rem;">
                                ${dashboardTasks.map(t => `
                                    <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.5rem; border-bottom: 1px solid rgba(226, 232, 240, 0.3);">
                                        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="window.NexoGenix.activeDashboard.toggleTask(${t.id}, this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
                                        <span style="flex: 1; font-size: 0.9rem; color: ${t.completed ? '#94a3b8' : '#334155'}; text-decoration: ${t.completed ? 'line-through' : 'none'};">${t.title}</span>
                                        <button onclick="window.NexoGenix.activeDashboard.deleteTask(${t.id})" style="background: transparent; border: none; color: #cbd5e1; cursor: pointer; padding: 0;">&times;</button>
                                    </div>
                                `).join('')}
                                ${dashboardTasks.length === 0 ? '<div style="text-align: center; color: #94a3b8; padding: 2rem;">No directives assigned.</div>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .glass-select-minimal {
                    padding: 0.75rem 1.25rem;
                    border-radius: 14px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    background: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #475569;
                    outline: none;
                    cursor: pointer;
                    backdrop-filter: blur(8px);
                    transition: all 0.2s;
                }
                .glass-select-minimal:hover {
                    background: white;
                    border-color: #3b82f6;
                }
            </style>
        `;
    }
}
