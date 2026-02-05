window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Insights = class Insights {
    constructor() {
        this.filters = {
            range: 'today',
            customStart: '',
            customEnd: ''
        };

        const savedOrder = localStorage.getItem('nexogenix_insights_order_v3');
        this.cardOrder = savedOrder ? JSON.parse(savedOrder) : ['kpi_tiles', 'sticky_notes', 'todos', 'activity_feed'];

        window.NexoGenix.activeInsights = this;
        this.drillDownData = null;
    }

    async updateFilter(key, value) {
        this.filters[key] = value;
        const html = await this.render();
        const routerView = document.getElementById('router-view');
        if (routerView) routerView.innerHTML = html;
    }

    // ==================== DASHBOARD ACTIONS ====================

    async addStickyNote() {
        const content = prompt("Enter note content:");
        if (!content) return;

        const colors = ['#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#f3e8ff'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const note = {
            id: Date.now(),
            content,
            color: randomColor,
            createdAt: new Date().toISOString()
        };

        if (window.electronAPI) {
            await window.NexoGenix.store.addDashboardNote(note);
        } else {
            window.NexoGenix.data.dashboardNotes.push(note);
            window.NexoGenix.store.save();
        }

        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    async deleteStickyNote(id) {
        if (!confirm('Delete this note?')) return;

        if (window.electronAPI) {
            await window.NexoGenix.store.deleteDashboardNote(id);
        } else {
            window.NexoGenix.data.dashboardNotes = window.NexoGenix.data.dashboardNotes.filter(n => n.id !== id);
            window.NexoGenix.store.save();
        }

        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    async addDashboardTask() {
        const title = prompt("Task title:");
        if (!title) return;

        const dueDate = prompt("Due date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);

        const task = {
            id: Date.now(),
            title,
            dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (window.electronAPI) {
            await window.NexoGenix.store.addDashboardTask(task);
        } else {
            window.NexoGenix.data.dashboardTasks.push(task);
            window.NexoGenix.store.save();
        }

        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    async toggleTask(id) {
        const tasks = window.NexoGenix.data.dashboardTasks || [];
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        task.completed = !task.completed;

        if (window.electronAPI) {
            await window.NexoGenix.store.updateDashboardTask(id, task);
        } else {
            window.NexoGenix.store.save();
        }

        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    async deleteTask(id) {
        if (!confirm('Delete this task?')) return;

        if (window.electronAPI) {
            await window.NexoGenix.store.deleteDashboardTask(id);
        } else {
            window.NexoGenix.data.dashboardTasks = window.NexoGenix.data.dashboardTasks.filter(t => t.id !== id);
            window.NexoGenix.store.save();
        }

        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    // ==================== DRILL DOWN MODAL ====================

    showDrillDown(type, data, title) {
        this.drillDownData = { type, data, title };
        const modal = document.getElementById('drillDownModal');
        const content = document.getElementById('drillDownContent');
        const titleEl = document.getElementById('drillDownTitle');

        titleEl.textContent = title;

        let html = '';
        if (data.length === 0) {
            html = '<div style="text-align: center; padding: 3rem; color: #64748b;">No records found for this period.</div>';
        } else {
            html = `
                <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #f1f5f9; text-align: left;">
                            <th style="padding: 1rem; color: #64748b; font-size: 0.85rem; font-weight: 600;">NAME / TITLE</th>
                            <th style="padding: 1rem; color: #64748b; font-size: 0.85rem; font-weight: 600;">DETAIL</th>
                            <th style="padding: 1rem; color: #64748b; font-size: 0.85rem; font-weight: 600;">DATE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                <td style="padding: 1rem; font-weight: 600; color: #0f172a;">${item.name || item.title || item.content || 'Untitled'}</td>
                                <td style="padding: 1rem; color: #64748b; font-size: 0.9rem;">${item.email || item.company || item.type || ''}</td>
                                <td style="padding: 1rem; color: #94a3b8; font-size: 0.85rem;">${new Date(item.createdAt || item.date || item.id).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        content.innerHTML = html;
        modal.style.display = 'flex';
    }

    closeDrillDown() {
        const modal = document.getElementById('drillDownModal');
        if (modal) modal.style.display = 'none';
        this.drillDownData = null;
    }

    // ==================== DRAG & DROP ====================

    handleDragStart(e, cardId) {
        e.dataTransfer.setData('text/plain', cardId);
        e.currentTarget.style.opacity = '0.4';
    }

    handleDragEnd(e) {
        e.currentTarget.style.opacity = '1';
    }

    handleDragOver(e) { e.preventDefault(); return false; }

    async handleDrop(e, targetId) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId !== targetId) {
            const oldOrder = [...this.cardOrder];
            const draggedIdx = oldOrder.indexOf(draggedId);
            const targetIdx = oldOrder.indexOf(targetId);
            oldOrder.splice(draggedIdx, 1);
            oldOrder.splice(targetIdx, 0, draggedId);
            this.cardOrder = oldOrder;
            localStorage.setItem('nexogenix_insights_order_v3', JSON.stringify(this.cardOrder));
            const html = await this.render();
            document.getElementById('router-view').innerHTML = html;
        }
    }

    // ==================== DATA PROCESSING ====================

    getDateLimit(range) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (range) {
            case 'today':
                return { start, end };
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            case 'last7':
                start.setDate(now.getDate() - 7);
                return { start, end };
            case 'last30':
                start.setDate(now.getDate() - 30);
                return { start, end };
            case 'custom':
                if (this.filters.customStart && this.filters.customEnd) {
                    return {
                        start: new Date(this.filters.customStart),
                        end: new Date(this.filters.customEnd)
                    };
                }
                return null;
            default:
                return { start, end };
        }
    }

    async render() {
        const currentUser = window.NexoGenix.auth.getUser();
        if (!currentUser) return '<div style="padding: 2rem;">Loading auth...</div>';

        const data = window.NexoGenix.data || {};
        const contacts = data.contacts || [];
        const activities = data.activities || [];
        const deals = data.deals || [];
        const notes = data.dashboardNotes || [];
        const tasks = data.dashboardTasks || [];

        const dateLimits = this.getDateLimit(this.filters.range);

        // Filter functions
        const inRange = (itemDate) => {
            if (!dateLimits) return true;
            const d = new Date(itemDate);
            return d >= dateLimits.start && d <= dateLimits.end;
        };

        const myContacts = contacts.filter(c => c.ownerId === currentUser.id);
        const myDeals = deals.filter(d => d.ownerId === currentUser.id);

        const leadsCreated = myContacts.filter(c => inRange(c.createdAt || c.id));
        const contactsUpdated = activities.filter(a => inRange(a.date) && a.type === 'Update'); // Simplified
        const followupsToday = myContacts.filter(c => c.followUp === new Date().toISOString().split('T')[0]);
        const meetingsToday = activities.filter(a => inRange(a.date) && a.type === 'Meeting');

        const metrics = {
            leads: { count: leadsCreated.length, data: leadsCreated, label: 'Leads Generated', icon: '🎯', color: '#3b82f6' },
            updates: { count: contactsUpdated.length, data: contactsUpdated, label: 'Contacts Updated', icon: '🔄', color: '#10b981' },
            followups: { count: followupsToday.length, data: followupsToday, label: 'Follow-ups Today', icon: '⏰', color: '#f43f5e' },
            meetings: { count: meetingsToday.length, data: meetingsToday, label: 'Meetings Today', icon: '🤝', color: '#8b5cf6' }
        };

        const glassStyle = "backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);";

        const cardTemplates = {
            kpi_tiles: `
                <div style="grid-column: span 12; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem;"
                     class="draggable-section" draggable="true" ondragstart="window.NexoGenix.activeInsights.handleDragStart(event, 'kpi_tiles')"
                     ondragend="window.NexoGenix.activeInsights.handleDragEnd(event)"
                     ondragover="window.NexoGenix.activeInsights.handleDragOver(event)"
                     ondrop="window.NexoGenix.activeInsights.handleDrop(event, 'kpi_tiles')">
                    ${Object.entries(metrics).map(([key, m]) => `
                        <div onclick="window.NexoGenix.activeInsights.showDrillDown('${key}', metrics['${key}'].data, '${m.label}')" 
                             class="kpi-card" 
                             style="${glassStyle} padding: 1.75rem; border-radius: 24px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div style="width: 44px; height: 44px; background: ${m.color}20; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">${m.icon}</div>
                                <div style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">${m.label}</div>
                            </div>
                            <div style="font-size: 2.25rem; font-weight: 800; color: #0f172a; line-height: 1;">${m.count}</div>
                        </div>
                    `).join('')}
                </div>
            `,
            sticky_notes: `
                <div style="grid-column: span 3; ${glassStyle} border-radius: 32px; padding: 2rem; height: 450px; display: flex; flex-direction: column;"
                     class="draggable-section" draggable="true" ondragstart="window.NexoGenix.activeInsights.handleDragStart(event, 'sticky_notes')"
                     ondragend="window.NexoGenix.activeInsights.handleDragEnd(event)"
                     ondragover="window.NexoGenix.activeInsights.handleDragOver(event)"
                     ondrop="window.NexoGenix.activeInsights.handleDrop(event, 'sticky_notes')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Personal Notes</h3>
                        <button onclick="window.NexoGenix.activeInsights.addStickyNote()" class="add-note-btn">+</button>
                    </div>
                    <div style="flex: 1; display: grid; grid-template-columns: 1fr; gap: 1rem; overflow-y: auto;" class="custom-scroll">
                        ${notes.map(n => `
                            <div class="sticky-note" style="background: ${n.color || '#fef3c7'}; padding: 1.25rem; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative; transition: transform 0.2s;">
                                <button onclick="window.NexoGenix.activeInsights.deleteStickyNote(${n.id})" style="position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: rgba(0,0,0,0.2)">&times;</button>
                                <div style="font-weight: 500; color: #4b5563; font-size: 0.95rem; line-height: 1.5;">${n.content}</div>
                                <div style="font-size: 0.7rem; color: rgba(0,0,0,0.25); margin-top: 0.75rem; font-weight: 600;">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
            todos: `
                <div style="grid-column: span 4; ${glassStyle} border-radius: 32px; padding: 2rem; height: 450px; display: flex; flex-direction: column;"
                     class="draggable-section" draggable="true" ondragstart="window.NexoGenix.activeInsights.handleDragStart(event, 'todos')"
                     ondragend="window.NexoGenix.activeInsights.handleDragEnd(event)"
                     ondragover="window.NexoGenix.activeInsights.handleDragOver(event)"
                     ondrop="window.NexoGenix.activeInsights.handleDrop(event, 'todos')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">To-Do Checklist</h3>
                        <button onclick="window.NexoGenix.activeInsights.addDashboardTask()" class="add-task-btn">Add Task</button>
                    </div>
                    <div style="flex: 1; overflow-y: auto;" class="custom-scroll">
                        ${tasks.map(t => `
                            <div class="todo-item ${t.completed ? 'completed' : ''}" style="margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background: white; border-radius: 16px; border: 1px solid #f1f5f9; transition: all 0.2s;">
                                <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="window.NexoGenix.activeInsights.toggleTask(${t.id})" class="task-checkbox">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: ${t.completed ? '#94a3b8' : '#334155'}; font-size: 1rem; text-decoration: ${t.completed ? 'line-through' : 'none'};">${t.title}</div>
                                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem;">Due: ${t.dueDate || 'No date'}</div>
                                </div>
                                <button onclick="window.NexoGenix.activeInsights.deleteTask(${t.id})" style="color: #fca5a5; background: none; border: none; cursor: pointer;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
            activity_feed: `
                <div style="grid-column: span 5; ${glassStyle} border-radius: 32px; padding: 2rem; height: 450px; display: flex; flex-direction: column;"
                     class="draggable-section" draggable="true" ondragstart="window.NexoGenix.activeInsights.handleDragStart(event, 'activity_feed')"
                     ondragend="window.NexoGenix.activeInsights.handleDragEnd(event)"
                     ondragover="window.NexoGenix.activeInsights.handleDragOver(event)"
                     ondrop="window.NexoGenix.activeInsights.handleDrop(event, 'activity_feed')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Live Operations Feed</h3>
                        <div style="background: #10b981; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></div>
                    </div>
                    <div style="flex: 1; overflow-y: auto;" class="custom-scroll">
                        ${activities.slice().reverse().slice(0, 15).map(a => {
                const user = window.NexoGenix.auth.getUserById(a.ownerId) || { name: 'System' };
                return `
                                <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; position: relative; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(241, 149, 241, 0.05);">
                                    <div style="min-width: 40px; height: 40px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #64748b; font-size: 0.8rem;">
                                        ${user.name.charAt(0)}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.9rem; font-weight: 600; color: #334155;">${user.name} <span style="font-weight: 400; color: #94a3b8;">${a.type}</span></div>
                                        <div style="font-size: 0.85rem; color: #64748b; margin-top: 0.25rem;">${a.content}</div>
                                        <div style="font-size: 0.7rem; color: #cbd5e1; margin-top: 0.5rem; font-weight: 600;">${new Date(a.date).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `
        };

        // We need to pass metrics and keys to the window so global calls work
        window.metrics = metrics;

        return `
            <div class="insights-view" style="min-height: 100vh; padding: 2.5rem; font-family: 'Inter', sans-serif; position: relative; background: #f8fafc;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem;">
                    <div>
                        <h1 style="font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.04em;">Operations Cockpit</h1>
                        <p style="color: #64748b; margin-top: 0.5rem; font-weight: 500;">Real-time command center for team productivity.</p>
                    </div>
                    
                    <div style="display: flex; gap: 0.75rem; align-items: center; padding: 0.6rem; border-radius: 16px; ${glassStyle}">
                        <select class="cockpit-select" onchange="window.NexoGenix.activeInsights.updateFilter('range', this.value)">
                            <option value="today" ${this.filters.range === 'today' ? 'selected' : ''}>Today</option>
                            <option value="yesterday" ${this.filters.range === 'yesterday' ? 'selected' : ''}>Yesterday</option>
                            <option value="last7" ${this.filters.range === 'last7' ? 'selected' : ''}>Last 7 Days</option>
                            <option value="last30" ${this.filters.range === 'last30' ? 'selected' : ''}>Last 30 Days</option>
                            <option value="custom" ${this.filters.range === 'custom' ? 'selected' : ''}>Custom Range</option>
                        </select>
                        ${this.filters.range === 'custom' ? `
                            <input type="date" class="cockpit-input" value="${this.filters.customStart}" onchange="window.NexoGenix.activeInsights.updateFilter('customStart', this.value)">
                            <span style="color: #94a3b8;">&rarr;</span>
                            <input type="date" class="cockpit-input" value="${this.filters.customEnd}" onchange="window.NexoGenix.activeInsights.updateFilter('customEnd', this.value)">
                        ` : ''}
                    </div>
                </div>

                <div id="cockpit-grid" style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 2rem;">
                    ${this.cardOrder.map(key => cardTemplates[key]).join('')}
                </div>

                <!-- Drill Down Modal -->
                <div id="drillDownModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(12px); background: rgba(0,0,0,0.2); z-index: 3000; align-items: center; justify-content: center;">
                    <div style="background: white; width: 90%; max-width: 800px; max-height: 80vh; border-radius: 32px; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column;">
                        <div style="padding: 2rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                            <h2 id="drillDownTitle" style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a;">Records</h2>
                            <button onclick="window.NexoGenix.activeInsights.closeDrillDown()" style="background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
                        </div>
                        <div id="drillDownContent" style="padding: 2rem; overflow-y: auto; flex: 1;" class="custom-scroll"></div>
                    </div>
                </div>

            </div>

            <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                .insights-view { font-family: 'Plus Jakarta Sans', sans-serif !important; }
                
                .cockpit-select, .cockpit-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 0.9rem;
                    padding: 0.4rem 0.8rem;
                    cursor: pointer;
                }
                
                .kpi-card:hover {
                    transform: translateY(-8px);
                    background: rgba(255, 255, 255, 0.8) !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
                }
                
                .add-note-btn, .add-task-btn {
                    background: #0f172a;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 0.5rem 1rem;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .add-note-btn { width: 32px; height: 32px; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
                
                .sticky-note:hover { transform: rotate(-1deg) scale(1.02); z-index: 10; cursor: move; }
                
                .task-checkbox {
                    width: 20px;
                    height: 20px;
                    appearance: none;
                    border: 2px solid #e2e8f0;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .task-checkbox:checked { background: #3b82f6; border-color: #3b82f6; }
                .task-checkbox:checked::after {
                    content: '✓';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-size: 11px;
                    font-weight: 900;
                }
                
                .todo-item:hover { transform: translateX(5px); border-color: #3b82f6 !important; }
                
                .custom-scroll::-webkit-scrollbar { width: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                
                @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
            </style>
        `;
    }
}
