window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.DealDetails = class DealDetails {
    constructor(id) {
        this.dealId = parseInt(id);
        this.deal = window.NexoGenix.data.deals.find(d => d.id === this.dealId);
        window.NexoGenix.activeDealDetails = this;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    async saveChanges(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        // Update object
        this.deal.title = formData.get('title');
        this.deal.value = parseFloat(formData.get('value'));
        this.deal.stage = formData.get('stage');
        this.deal.probability = formData.get('probability');
        this.deal.closeDate = formData.get('closeDate');
        this.deal.description = formData.get('description');

        // Update persistence
        window.NexoGenix.data.deals = window.NexoGenix.data.deals.map(d => d.id === this.deal.id ? this.deal : d);

        alert('Deal updated successfully!');
    }

    async render() {
        if (!this.deal) {
            return `<div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Deal intelligence missing. <a href="#deals" style="color: var(--primary-color);">Return to Sector</a></div>`;
        }

        return `
            <div class="record-container">
                <!-- Left Pane: About this Deal -->
                <aside class="record-left-pane">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="width: 64px; height: 64px; background: #eaf0f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem; color: var(--text-muted); border: 1px solid var(--border-color);">
                            💰
                        </div>
                        <h2 style="font-size: 1.25rem; margin: 0; color: var(--text-main);">${this.deal.title}</h2>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-color); margin-top: 0.5rem;">${this.formatCurrency(this.deal.value)}</div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
                        <button class="btn btn-primary" style="flex: 1; padding: 0.5rem;" onclick="alert('Action Commited')">Actions</button>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                        <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 1.25rem; letter-spacing: 0.05em;">About this deal</h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div class="prop-group">
                                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.25rem;">Deal Name</label>
                                <div style="font-size: 0.875rem;">${this.deal.title}</div>
                            </div>
                             <div class="prop-group">
                                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.25rem;">Amount</label>
                                <div style="font-size: 0.875rem;">${this.formatCurrency(this.deal.value)}</div>
                            </div>
                            <div class="prop-group">
                                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.25rem;">Deal Stage</label>
                                <div style="font-size: 0.875rem; text-transform: capitalize;">${this.deal.stage}</div>
                            </div>
                            <div class="prop-group">
                                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.25rem;">Close Date</label>
                                <div style="font-size: 0.875rem;">${this.deal.closeDate || '—'}</div>
                            </div>
                            <div class="prop-group">
                                <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.25rem;">Deal Probability</label>
                                <div style="font-size: 0.875rem;">${this.deal.probability || '0'}%</div>
                            </div>
                        </div>
                    </div>
                </aside>

                <!-- Center Pane: Timeline & Details -->
                <section class="record-center-pane">
                    <div class="card" style="padding: 2.5rem; border-radius: 3px; background: white; border: 1px solid var(--border-color);">
                        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 1.5rem;">Commercial Parameters</h3>
                        <form onsubmit="window.NexoGenix.activeDealDetails.saveChanges(event)">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label">Deal Title</label>
                                    <input type="text" name="title" class="form-input" value="${this.deal.title}" required style="border-radius: 3px;">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Amount ($)</label>
                                    <input type="number" name="value" class="form-input" value="${this.deal.value}" required style="border-radius: 3px;">
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label">Pipeline Stage</label>
                                    <select name="stage" class="form-select" style="border-radius: 3px;">
                                        <option value="lead" ${this.deal.stage === 'lead' ? 'selected' : ''}>New Leads</option>
                                        <option value="contacted" ${this.deal.stage === 'contacted' ? 'selected' : ''}>Contacted</option>
                                        <option value="qualified" ${this.deal.stage === 'qualified' ? 'selected' : ''}>Qualified</option>
                                        <option value="closed" ${this.deal.stage === 'closed' ? 'selected' : ''}>Closed Won</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Close Date</label>
                                    <input type="date" name="closeDate" class="form-input" value="${this.deal.closeDate || ''}" style="border-radius: 3px;">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Engagement Directives</label>
                                <textarea name="description" class="form-input" rows="4" style="border-radius: 3px; resize: none;">${this.deal.description || ''}</textarea>
                            </div>
                            <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                                <button type="submit" class="btn btn-primary">Update deal</button>
                            </div>
                        </form>
                    </div>

                    <div style="margin-top: 2rem;">
                         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="font-size: 0.875rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Engagement History</h3>
                         </div>
                         <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: white; border: 1px solid var(--border-color); border-radius: 3px;">
                            No historical activity for this opportunity.
                         </div>
                    </div>
                </section>

                <!-- Right Pane: Associations -->
                <aside class="record-right-pane">
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div class="association-card" style="border: 1px solid var(--border-color); border-radius: 3px; background: white;">
                             <div style="padding: 0.75rem 1rem; background: #f8fafc; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; font-size: 0.8rem; color: var(--text-main);">Company</span>
                            </div>
                            <div style="padding: 1rem;">
                                <a href="#company/${encodeURIComponent(this.deal.company)}" style="text-decoration: none; display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="width: 32px; height: 32px; background: #f1f5f9; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">🏢</div>
                                    <div style="font-size: 0.875rem; font-weight: 600; color: var(--link-color);">${this.deal.company}</div>
                                </a>
                            </div>
                        </div>

                         <div class="association-card" style="border: 1px solid var(--border-color); border-radius: 3px; background: white;">
                             <div style="padding: 0.75rem 1rem; background: #f8fafc; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; font-size: 0.8rem; color: var(--text-main);">Contacts</span>
                            </div>
                            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
                                No direct personnel contacts associated.
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        `;
    }
}
}
