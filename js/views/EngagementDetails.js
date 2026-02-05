window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.EngagementDetails = class EngagementDetails {
    constructor(id) {
        this.engagementId = parseInt(id);
        this.engagement = (window.NexoGenix.data.engagements || []).find(e => e.id === this.engagementId);
        window.NexoGenix.activeEngagementDetailsView = this;
    }

    async addActivity(event) {
        event.preventDefault();
        const form = event.target;

        const activity = {
            id: Date.now(),
            engagementId: this.engagementId,
            type: form.elements.type.value,
            content: form.elements.content.value,
            date: new Date().toISOString()
        };

        if (!window.NexoGenix.data.hrmsActivities) window.NexoGenix.data.hrmsActivities = [];
        window.NexoGenix.data.hrmsActivities.push(activity);
        window.NexoGenix.store.save();

        form.reset();

        // Re-render
        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    async render() {
        if (!this.engagement) {
            return `
                <div class="card" style="padding: 3rem; text-align: center; border-radius: 1.5rem; border: 1px solid var(--border-color); background: white;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🛰️</div>
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">Engagement Absent</h2>
                    <p style="color: var(--text-muted); margin-top: 1rem;">The requested project node does not exist in the HRMS cluster.</p>
                    <a href="#hrms" class="btn btn-primary" style="margin-top: 1.5rem; border-radius: 1rem; padding: 0.75rem 1.75rem;">Return to Command Center</a>
                </div>
            `;
        }

        const activities = (window.NexoGenix.data.hrmsActivities || [])
            .filter(a => a.engagementId === this.engagementId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const allUsers = window.NexoGenix.auth.getAllUsers();
        const owner = allUsers.find(u => u.id === this.engagement.ownerId);

        return `
            <div class="header-actions" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; background: var(--grad-surface); padding: 2.5rem; border-radius: 1.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 80px; height: 80px; background: white; border-radius: 20px; border: 2px solid var(--success-color); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.1);">
                        🚀
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                             <span style="padding: 0.25rem 0.6rem; background: rgba(16, 185, 129, 0.1); color: var(--success-color); border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">Mission Parameters</span>
                             <h1 style="font-size: 2.5rem; font-weight: 800; color: var(--text-main); margin: 0;">${this.engagement.clientName}</h1>
                        </div>
                        <p style="color: var(--text-muted); font-size: 1.1rem; margin: 0;">Primary Service: <span style="font-weight: 700; color: var(--text-main);">${this.engagement.serviceType}</span></p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="
                        display: inline-block;
                        padding: 0.6rem 1.25rem;
                        border-radius: 1rem;
                        font-size: 0.85rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                        background: ${this.engagement.status === 'Active' ? 'var(--grad-success)' :
                this.engagement.status === 'Completed' ? 'var(--grad-primary)' : 'var(--grad-warning)'};
                        color: white;
                    ">
                        ${this.engagement.status}
                    </span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
                <div class="card" style="padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-color); background: white;">
                    <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem;">Operational Window</div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">
                        ${new Date(this.engagement.startDate).toLocaleDateString()} — ${this.engagement.endDate ? new Date(this.engagement.endDate).toLocaleDateString() : 'Active Indefinite'}
                    </div>
                </div>
                <div class="card" style="padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-color); background: white;">
                    <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem;">Resource Controller</div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 24px; height: 24px; background: var(--grad-surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">👤</div>
                        ${owner ? owner.name : 'Unassigned'}
                    </div>
                </div>
                <div class="card" style="padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-color); background: white;">
                    <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem;">Asset Allocation</div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">${this.engagement.resources.length} Units Active</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2.5rem; align-items: start;">
                <!-- Main: Deployment Roster -->
                <div class="card" style="padding: 0; overflow: hidden; border-radius: 1.5rem; border: 1px solid var(--border-color); background: white; box-shadow: var(--shadow-md);">
                    <div style="padding: 2rem; border-bottom: 1px solid var(--border-color); background: #f8fafc;">
                        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0;">Personnel & Vendor Ledger</h2>
                    </div>
                    
                    ${this.engagement.resources.length === 0 ? `
                        <p style="color: var(--text-muted); text-align: center; padding: 4rem; font-weight: 500;">Zero asset allocation detected.</p>
                    ` : `
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: white; border-bottom: 1px solid var(--border-color);">
                                    <th style="padding: 1.25rem 2rem; text-align: left; font-weight: 800; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Resource Name</th>
                                    <th style="padding: 1.25rem 2rem; text-align: left; font-weight: 800; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Duty Core</th>
                                    <th style="padding: 1.25rem 2rem; text-align: left; font-weight: 800; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Node Classification</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.engagement.resources.map(resource => `
                                    <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                        <td style="padding: 1.5rem 2rem; font-weight: 700; color: var(--text-main);">${resource.name}</td>
                                        <td style="padding: 1.5rem 2rem; color: var(--text-muted); font-weight: 600;">${resource.role}</td>
                                        <td style="padding: 1.5rem 2rem;">
                                            <span style="
                                                display: inline-block;
                                                padding: 0.4rem 0.8rem;
                                                border-radius: 0.75rem;
                                                font-size: 0.7rem;
                                                font-weight: 800;
                                                text-transform: uppercase;
                                                background: ${resource.type === 'resource' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
                                                color: ${resource.type === 'resource' ? '#2563eb' : '#d97706'};
                                            ">
                                                ${resource.type === 'resource' ? 'INTERNAL' : 'VENDOR'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>

                <!-- Sidebar: Activity Feed -->
                <div>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📡</span> Engagement Stream
                    </h3>

                    <form onsubmit="window.NexoGenix.activeEngagementDetailsView.addActivity(event)" style="background: white; padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-weight: 700; font-size: 0.8rem; margin-bottom: 0.5rem; display: block;">Event Type</label>
                                <select name="type" class="form-input" required style="padding: 0.75rem; border-radius: 0.75rem; font-weight: 600;">
                                    <option value="Note">Note</option>
                                    <option value="Milestone">Milestone</option>
                                    <option value="Resource Change">Resource Change</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-weight: 700; font-size: 0.8rem; margin-bottom: 0.5rem; display: block;">Operational Note</label>
                                <input type="text" name="content" class="form-input" placeholder="Enter activity log..." required style="padding: 0.75rem; border-radius: 0.75rem;">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.875rem; border-radius: 0.75rem; font-weight: 800;">Commit Log</button>
                        </div>
                    </form>

                    ${activities.length === 0 ? `
                        <div style="text-align: center; color: var(--text-muted); padding: 2rem;">Timeline initialized. Waiting for data...</div>
                    ` : `
                        <div class="timeline" style="display: flex; flex-direction: column; gap: 1rem;">
                            ${activities.map(activity => `
                                <div style="display: flex; gap: 1rem; padding: 1.25rem; background: white; border-radius: 1rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                                    <div style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px; background: #f8fafc; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1rem;">
                                        ${activity.type === 'Milestone' ? '🎯' : activity.type === 'Resource Change' ? '👥' : '📝'}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                            <span style="font-weight: 800; font-size: 0.7rem; color: var(--primary-color); text-transform: uppercase;">${activity.type}</span>
                                            <span style="color: var(--text-muted); font-size: 0.7rem;">${new Date(activity.date).toLocaleDateString()}</span>
                                        </div>
                                        <p style="margin: 0; color: var(--text-main); font-size: 0.95rem; font-weight: 500; line-height: 1.4;">${activity.content}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}
