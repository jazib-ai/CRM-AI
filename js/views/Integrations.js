window.NexoGenix = window.NexoGenix || {};

// Initialize state
if (!window.NexoGenix.data.integrations) {
    window.NexoGenix.data.integrations = {
        gmail: false,
        outlook: false
    };
}

window.NexoGenix.Integrations = class Integrations {
    constructor() {
        this.status = window.NexoGenix.data.integrations;
    }

    async toggleIntegration(type) {
        const isConnected = this.status[type];

        if (isConnected) {
            if (confirm(`Disconnect ${type}? This will stop syncing new emails.`)) {
                this.status[type] = false;
                alert(`${type} disconnected.`);
            }
        } else {
            // Simulate OAuth/Sync delay
            const button = document.getElementById(`btn-${type}`);
            const originalText = button.innerHTML;
            button.innerHTML = 'Connecting...';
            button.disabled = true;

            await new Promise(resolve => setTimeout(resolve, 1500));

            this.status[type] = true;
            this.generateMockEmails(type);
            alert(`${type} connected successfully! Emulated 5 new emails being synced.`);
        }

        // Save state (persisting object reference)
        window.NexoGenix.data.integrations = this.status;
        window.NexoGenix.store.save(); // Backend Save

        // Re-render
        document.getElementById('router-view').innerHTML = await this.render();
    }

    generateMockEmails(source) {
        const contacts = window.NexoGenix.data.contacts;
        if (contacts.length === 0) return;

        // Add 5 mock emails to random contacts
        for (let i = 0; i < 5; i++) {
            const contact = contacts[Math.floor(Math.random() * contacts.length)];
            const templates = [
                "Re: Proposal follow-up",
                "Meeting confirmed for Tuesday",
                "New file shared with you",
                "Question about pricing tier",
                "Introduction to team"
            ];

            const activity = {
                id: Date.now() + i,
                contactId: contact.id,
                type: 'Email',
                content: `[Synced from ${source}] ${templates[Math.floor(Math.random() * templates.length)]}`,
                date: new Date().toISOString()
            };

            if (!window.NexoGenix.data.activities) window.NexoGenix.data.activities = [];
            window.NexoGenix.data.activities.push(activity);
        }
        window.NexoGenix.store.save(); // Backend Save
    }

    async render() {
        return `
            <div class="header-actions" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; background: var(--grad-surface); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <span style="padding: 0.375rem 0.75rem; background: #6366f1; color: white; border-radius: 8px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Connectivity</span>
                        <h1 style="font-size: 2.25rem; font-weight: 800; color: var(--text-main); line-height: 1.1;">Central Sync</h1>
                    </div>
                    <p style="color: var(--text-muted); font-size: 1.1rem;">Bridge your communication stacks to the CRM core for automated intelligence.</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <!-- Gmail Card -->
                <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem; padding: 2.5rem; border: 1px solid var(--border-color); border-radius: 1.5rem; background: white; box-shadow: var(--shadow-sm); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)';">
                    <div style="width: 64px; height: 64px; background: #ea4335; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 16px rgba(234, 67, 53, 0.25);">
                        <span style="font-size: 2rem; font-weight: 800;">G</span>
                    </div>
                    <div>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Google Cloud Sync</h3>
                        <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5;">Index Gmail threads, calendar events, and drive attachments automatically into contact timelines.</p>
                    </div>
                    <div style="margin-top: auto;">
                        <button id="btn-gmail" onclick="new window.NexoGenix.Integrations().toggleIntegration('gmail')" 
                            class="btn" style="width: 100%; border-radius: 1rem; padding: 0.875rem; font-weight: 700; border: 1px solid var(--border-color); ${this.status.gmail ? 'background: rgba(16, 185, 129, 0.1); color: #065f46; border-color: rgba(16, 185, 129, 0.2);' : 'background: white;'}">
                            ${this.status.gmail ? '✓ Engine Active' : 'Authorize Sync'}
                        </button>
                    </div>
                </div>

                <!-- Outlook Card -->
                <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem; padding: 2.5rem; border: 1px solid var(--border-color); border-radius: 1.5rem; background: white; box-shadow: var(--shadow-sm); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)';">
                    <div style="width: 64px; height: 64px; background: #0078d4; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 16px rgba(0, 120, 212, 0.25);">
                        <span style="font-size: 2rem; font-weight: 800;">O</span>
                    </div>
                    <div>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Microsoft 365</h3>
                        <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5;">Seamlessly integrate Outlook 365 and Exchange mailboxes with enterprise-grade security protocols.</p>
                    </div>
                    <div style="margin-top: auto;">
                        <button id="btn-outlook" onclick="new window.NexoGenix.Integrations().toggleIntegration('outlook')" 
                            class="btn" style="width: 100%; border-radius: 1rem; padding: 0.875rem; font-weight: 700; border: 1px solid var(--border-color); ${this.status.outlook ? 'background: rgba(16, 185, 129, 0.1); color: #065f46; border-color: rgba(16, 185, 129, 0.2);' : 'background: white;'}">
                            ${this.status.outlook ? '✓ Engine Active' : 'Authorize Sync'}
                        </button>
                    </div>
                </div>
                
                <!-- Slack Card -->
                <div class="card" style="display: flex; flex-direction: column; gap: 1.5rem; padding: 2.5rem; border: 1px solid var(--border-color); border-radius: 1.5rem; background: #f8fafc; opacity: 0.7;">
                    <div style="width: 64px; height: 64px; background: #4A154B; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white;">
                        <span style="font-size: 2rem; font-weight: 800;">S</span>
                    </div>
                    <div>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Slack Node</h3>
                        <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5;">Relay deal velocity and high-urgency alerts directly to your team's Slack channels.</p>
                    </div>
                    <div style="margin-top: auto;">
                        <button class="btn" disabled style="width: 100%; border-radius: 1rem; padding: 0.875rem; font-weight: 700; border: 1px solid var(--border-color); background: white; cursor: not-allowed; color: var(--text-muted);">
                            Under Development
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}
