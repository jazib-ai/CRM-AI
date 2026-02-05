window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.SearchResults = class SearchResults {
    constructor(query) {
        this.query = query.toLowerCase();
        this.contacts = window.NexoGenix.data.contacts || [];
        this.deals = window.NexoGenix.data.deals || [];
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    async render() {
        // Filter Data
        const matchedContacts = this.contacts.filter(c =>
            c.name.toLowerCase().includes(this.query) ||
            c.email.toLowerCase().includes(this.query) ||
            c.company.toLowerCase().includes(this.query)
        );

        const matchedDeals = this.deals.filter(d =>
            d.title.toLowerCase().includes(this.query) ||
            d.company.toLowerCase().includes(this.query)
        );

        const hasResults = matchedContacts.length > 0 || matchedDeals.length > 0;

        return `
            <div class="header-actions" style="margin-bottom: 3rem; background: var(--grad-surface); padding: 2.5rem; border-radius: 1.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 64px; height: 64px; background: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.05); border: 1px solid var(--border-color);">
                        🔍
                    </div>
                    <div>
                        <h1 style="font-size: 2.25rem; font-weight: 800; color: var(--text-main); margin: 0;">Discovery Results</h1>
                        <p style="color: var(--text-muted); font-size: 1.1rem; margin: 0;">Cross-referencing entities for "<span style="color: var(--primary-color); font-weight: 700;">${this.query}</span>"</p>
                    </div>
                </div>
            </div>

            ${!hasResults ? `
                <div style="text-align: center; color: var(--text-muted); padding: 5rem; background: white; border-radius: 1.5rem; border: 1px dashed var(--border-color);">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">🛰️</div>
                    <h3 style="font-size: 1.5rem; color: var(--text-main); font-weight: 700;">Zero Clusters Found</h3>
                    <p style="margin-top: 0.5rem;">Try refining your query parameters or expanding your sector search.</p>
                </div>
            ` : ''}

            <div style="display: flex; flex-direction: column; gap: 3rem;">
                
                ${matchedDeals.length > 0 ? `
                <section>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-left: 0.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.75rem;">
                             <span>💰</span> Commercial Opportunities <span style="font-size: 0.9rem; background: var(--grad-primary); color: white; padding: 0.2rem 0.6rem; border-radius: 6px;">${matchedDeals.length}</span>
                        </h3>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                        ${matchedDeals.map(deal => `
                            <div class="card" onclick="location.hash='#deal/${deal.id}'" style="cursor: pointer; padding: 1.5rem; border-radius: 1.25rem; transition: all 0.2s; border: 1px solid var(--border-color);" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--primary-color)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border-color)';">
                                <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.5rem;">${deal.title}</div>
                                <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.4rem;">
                                    <span>🏢</span> ${deal.company}
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
                                    <span style="font-weight: 800; color: var(--primary-color); font-size: 1.1rem;">${this.formatCurrency(deal.value)}</span>
                                    <span style="background: rgba(37, 99, 235, 0.1); color: var(--primary-color); padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">${deal.stage}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
                ` : ''}

                ${matchedContacts.length > 0 ? `
                <section>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-left: 0.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.75rem;">
                             <span>👤</span> Verified Personnel <span style="font-size: 0.9rem; background: var(--grad-success); color: white; padding: 0.2rem 0.6rem; border-radius: 6px;">${matchedContacts.length}</span>
                        </h3>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                        ${matchedContacts.map(contact => `
                            <div class="card" onclick="location.hash='#contact/${contact.id}'" style="cursor: pointer; padding: 1.5rem; border-radius: 1.25rem; transition: all 0.2s; border: 1px solid var(--border-color);" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--success-color)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border-color)';">
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                    <div style="width: 40px; height: 40px; background: var(--grad-surface); border: 1px solid var(--border-color); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--primary-color);">
                                        ${contact.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">${contact.name}</div>
                                        <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">${contact.jobTitle || 'Lead Executive'}</div>
                                    </div>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 0.75rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                        <span>📧</span> ${contact.email}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span>🏢</span> ${contact.company}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
                ` : ''}

            </div>
        `;
    }
}
