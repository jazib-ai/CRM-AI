window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Deals = class Deals {
    constructor() {
        this.deals = window.NexoGenix.data.deals || [];
        this.selectedStage = 'All';
        this.serviceFilter = 'All';
        this.ownerFilter = 'All';
        this.entityType = 'Contact'; // 'Contact' or 'Company'
        this.closeDateFilter = 'All'; // Presets: Today, This Week, This Month, Last 90 Days, Custom
        this.customDateRange = { start: '', end: '' };

        window.NexoGenix.activeDealsView = this;
    }

    // ==================== DATA PROCESSING ====================

    getFilteredDeals() {
        let filtered = [...this.deals];

        // 1. Service Filter
        if (this.serviceFilter !== 'All') {
            filtered = filtered.filter(d => (d.service || '').toLowerCase() === this.serviceFilter.toLowerCase());
        }

        // 2. Owner Filter
        if (this.ownerFilter !== 'All') {
            filtered = filtered.filter(d => d.ownerId === parseInt(this.ownerFilter));
        }

        // 3. Close Date Filter
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (this.closeDateFilter !== 'All') {
            filtered = filtered.filter(d => {
                if (!d.closeDate) return false;
                const cDate = new Date(d.closeDate);
                cDate.setHours(0, 0, 0, 0);

                if (this.closeDateFilter === 'Today') {
                    return cDate.getTime() === now.getTime();
                }
                else if (this.closeDateFilter === 'This Week') {
                    const first = now.getDate() - now.getDay();
                    const last = first + 6;
                    const firstDay = new Date(now.setDate(first));
                    const lastDay = new Date(now.setDate(last));
                    return cDate >= firstDay && cDate <= lastDay;
                }
                else if (this.closeDateFilter === 'This Month') {
                    return cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
                }
                else if (this.closeDateFilter === 'Last 90 Days') {
                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(now.getDate() - 90);
                    return cDate >= ninetyDaysAgo && cDate <= now;
                }
                else if (this.closeDateFilter === 'Custom' && this.customDateRange.start && this.customDateRange.end) {
                    const start = new Date(this.customDateRange.start);
                    const end = new Date(this.customDateRange.end);
                    return cDate >= start && cDate <= end;
                }
                return true;
            });
        }

        return filtered;
    }

    getStats() {
        // Stats represent the aggregate of all deals that match current filters (Owner, Service, Close Date)
        let baseFiltered = this.getFilteredDeals();

        const stats = {
            'Discover': 0,
            'Negotiation': 0,
            'Proposal': 0,
            'Closed Won': 0,
            'Closed Lost': 0,
            'Total Value': 0
        };

        baseFiltered.forEach(d => {
            const val = parseFloat(d.value) || 0;
            const stage = (d.stage || '').toLowerCase();

            if (stage === 'discover' || stage === 'discovery' || stage === 'new' || stage === 'lead') stats['Discover'] += val;
            else if (stage === 'negotiation') stats['Negotiation'] += val;
            else if (stage === 'proposal' || stage === 'proposal sent' || stage === 'qualified') stats['Proposal'] += val;
            else if (stage === 'closed won' || stage === 'closed' || stage === 'won') stats['Closed Won'] += val;
            else if (stage === 'closed lost' || stage === 'lost') stats['Closed Lost'] += val;

            stats['Total Value'] += val;
        });

        return stats;
    }

    getEntityList() {
        const filteredDeals = this.getFilteredDeals();
        const entities = [];

        if (this.entityType === 'Contact') {
            const contactGroups = {};
            filteredDeals.forEach(d => {
                if (!d.contactId) return;
                if (!contactGroups[d.contactId]) contactGroups[d.contactId] = [];
                contactGroups[d.contactId].push(d);
            });

            Object.entries(contactGroups).forEach(([cid, deals]) => {
                const contact = window.NexoGenix.data.contacts.find(c => c.id === parseInt(cid));
                if (!contact) return;

                // If stage filter is active, only show entities with matching deals
                const matchingDeals = this.selectedStage === 'All' ? deals : deals.filter(d => this.isStageMatch(d.stage, this.selectedStage));
                if (matchingDeals.length === 0) return;

                entities.push({
                    id: contact.id,
                    name: contact.name,
                    subTitle: contact.company || 'Private',
                    dealCount: matchingDeals.length,
                    totalValue: matchingDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
                    ownerId: contact.ownerId,
                    type: 'contact',
                    deals: matchingDeals
                });
            });
        } else {
            const companyGroups = {};
            filteredDeals.forEach(d => {
                const companyKey = d.company || 'Unknown';
                if (!companyGroups[companyKey]) companyGroups[companyKey] = [];
                companyGroups[companyKey].push(d);
            });

            Object.entries(companyGroups).forEach(([cname, deals]) => {
                const company = window.NexoGenix.data.companies.find(c => (c.name || '').toLowerCase() === (cname || '').toLowerCase());

                // Only show entities that are officially present in the companies database
                if (!company) return;

                const matchingDeals = this.selectedStage === 'All' ? deals : deals.filter(d => this.isStageMatch(d.stage, this.selectedStage));
                if (matchingDeals.length === 0) return;

                entities.push({
                    id: company.id,
                    name: company.name,
                    subTitle: company.industry || 'Lead Sector',
                    dealCount: matchingDeals.length,
                    totalValue: matchingDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
                    ownerId: company.ownerId || (deals[0] ? deals[0].ownerId : 1),
                    type: 'company',
                    deals: matchingDeals
                });
            });
        }

        return entities.sort((a, b) => b.totalValue - a.totalValue);
    }

    isStageMatch(dealStage, filterStage) {
        if (filterStage === 'All' || filterStage === 'Total Value') return true;
        const s = (dealStage || '').toLowerCase();
        const f = filterStage.toLowerCase();
        if (f === 'discover') return s === 'discover' || s === 'discovery' || s === 'new' || s === 'lead';
        if (f === 'proposal') return s === 'proposal' || s === 'proposal sent' || s === 'qualified';
        if (f === 'closed won') return s === 'closed won' || s === 'closed' || s === 'won';
        if (f === 'closed lost') return s === 'closed lost' || s === 'lost';
        return s === f;
    }

    // ==================== INTERACTION HANDLERS ====================

    setEntityType(type) {
        this.entityType = type;
        this.renderToDOM();
    }

    setStageFilter(stage) {
        this.selectedStage = (this.selectedStage === stage) ? 'All' : stage;
        this.renderToDOM();
    }

    setServiceFilter(val) {
        this.serviceFilter = val;
        this.renderToDOM();
    }

    setOwnerFilter(val) {
        this.ownerFilter = val;
        this.renderToDOM();
    }

    setCloseDateFilter(val) {
        this.closeDateFilter = val;
        if (val !== 'Custom') this.renderToDOM();
        else this.renderToDOM();
    }

    handleCustomDateChange() {
        const start = document.getElementById('close-start-date').value;
        const end = document.getElementById('close-end-date').value;
        this.customDateRange = { start, end };
        if (start && end) this.renderToDOM();
    }

    async renderToDOM() {
        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
    }

    // ==================== UI RENDERING ====================

    async render() {
        const stats = this.getStats();
        const entities = this.getEntityList();
        const allServices = window.NexoGenix.data.config?.services || [];
        const allUsers = window.NexoGenix.auth.getAllUsers();

        const glassBg = "rgba(255, 255, 255, 0.4)";
        const glassBorder = "1px solid rgba(255, 255, 255, 0.3)";
        const glassShadow = "0 8px 32px 0 rgba(31, 38, 135, 0.07)";

        return `
            <div style="padding: 2.5rem; background: #f1f5f9; min-height: 100vh; font-family: 'Outfit', 'Inter', sans-serif;">
                
                <!-- Page Title -->
                <div style="margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.03em;">Deals Overview</h1>
                        <p style="color: #64748b; font-weight: 500; margin-top: 0.5rem;">Managing pipeline health through entity-centric intelligence.</p>
                    </div>
                    
                    <!-- View Toggle -->
                    <div style="display: flex; background: #e2e8f0; padding: 0.35rem; border-radius: 14px; gap: 0.25rem;">
                        <button onclick="window.NexoGenix.activeDealsView.setEntityType('Contact')" style="padding: 0.6rem 1.25rem; border-radius: 10px; border: none; background: ${this.entityType === 'Contact' ? '#0f172a' : 'transparent'}; color: ${this.entityType === 'Contact' ? 'white' : '#64748b'}; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem;">Contacts</button>
                        <button onclick="window.NexoGenix.activeDealsView.setEntityType('Company')" style="padding: 0.6rem 1.25rem; border-radius: 10px; border: none; background: ${this.entityType === 'Company' ? '#0f172a' : 'transparent'}; color: ${this.entityType === 'Company' ? 'white' : '#64748b'}; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem;">Companies</button>
                    </div>
                </div>

                <!-- Summary Tiles Grid -->
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.25rem; margin-bottom: 2.5rem;">
                    ${this.renderTile('Discover', stats['Discover'], '#3b82f6', `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    `)}
                    ${this.renderTile('Proposal', stats['Proposal'], '#8b5cf6', `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    `)}
                    ${this.renderTile('Negotiation', stats['Negotiation'], '#f59e0b', `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 6.1H3"></path><path d="M21 12.1H3"></path><path d="M15.1 18.1H3"></path></svg>
                    `)}
                    ${this.renderTile('Closed Won', stats['Closed Won'], '#10b981', `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    `)}
                    ${this.renderTile('Closed Lost', stats['Closed Lost'], '#ef4444', `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    `)}
                    ${this.renderTile('Total Value', stats['Total Value'], '#0f172a', `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    `, true)}
                </div>

                <!-- Comprehensive Filter Section -->
                <div style="background: ${glassBg}; backdrop-filter: blur(12px); border: ${glassBorder}; padding: 1.5rem; border-radius: 20px; box-shadow: ${glassShadow}; margin-bottom: 2.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 1.5rem;">
                        <!-- Owner Filter -->
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Assigned Owner</label>
                            <select onchange="window.NexoGenix.activeDealsView.setOwnerFilter(this.value)" style="width: 100%; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 600; color: #1e293b; outline: none; cursor: pointer;">
                                <option value="All">All Owners</option>
                                ${allUsers.map(u => `<option value="${u.id}" ${this.ownerFilter == u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Service Filter -->
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Service Vertical</label>
                            <select onchange="window.NexoGenix.activeDealsView.setServiceFilter(this.value)" style="width: 100%; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 600; color: #1e293b; outline: none; cursor: pointer;">
                                <option value="All">All Services</option>
                                ${allServices.map(s => `<option value="${s}" ${this.serviceFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Close Date Filter -->
                        <div style="flex: 1.5;">
                            <label style="display: block; font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Scheduled Close Date</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <select onchange="window.NexoGenix.activeDealsView.setCloseDateFilter(this.value)" style="flex: 1; padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 600; color: #1e293b; outline: none; cursor: pointer;">
                                    <option value="All" ${this.closeDateFilter === 'All' ? 'selected' : ''}>All Time</option>
                                    <option value="Today" ${this.closeDateFilter === 'Today' ? 'selected' : ''}>Today</option>
                                    <option value="This Week" ${this.closeDateFilter === 'This Week' ? 'selected' : ''}>This Week</option>
                                    <option value="This Month" ${this.closeDateFilter === 'This Month' ? 'selected' : ''}>This Month</option>
                                    <option value="Last 90 Days" ${this.closeDateFilter === 'Last 90 Days' ? 'selected' : ''}>Last 90 Days</option>
                                    <option value="Custom" ${this.closeDateFilter === 'Custom' ? 'selected' : ''}>Custom Range</option>
                                </select>
                                ${this.closeDateFilter === 'Custom' ? `
                                    <input type="date" id="close-start-date" value="${this.customDateRange.start}" onchange="window.NexoGenix.activeDealsView.handleCustomDateChange()" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.85rem;">
                                    <input type="date" id="close-end-date" value="${this.customDateRange.end}" onchange="window.NexoGenix.activeDealsView.handleCustomDateChange()" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.85rem;">
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Entity-Centric Deals List -->
                <div style="background: white; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.03); overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 1.25rem 1.5rem; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">${this.entityType} Information</th>
                                <th style="padding: 1.25rem 1.5rem; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">Active Deals</th>
                                <th style="padding: 1.25rem 1.5rem; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Total Pipeline</th>
                                <th style="padding: 1.25rem 1.5rem; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Primary Owner</th>
                                <th style="padding: 1.25rem 1.5rem; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; text-align: right;">View Profile</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entities.length > 0 ? entities.map(entity => {
            const owner = allUsers.find(u => u.id === entity.ownerId);
            const initials = (entity.name || 'E')[0];

            return `
                                    <tr onclick="window.location.hash='#${entity.type === 'contact' ? 'contact/' + entity.id : 'company/' + entity.id}'" style="border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                                        <td style="padding: 1.25rem 1.5rem;">
                                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                                <div style="width: 44px; height: 44px; border-radius: 12px; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; border: 1px solid #e2e8f0;">
                                                    ${initials}
                                                </div>
                                                <div>
                                                    <div style="font-weight: 800; color: #0f172a; font-size: 1rem;">${entity.name}</div>
                                                    <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">${entity.subTitle}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="padding: 1.25rem 1.5rem; text-align: center;">
                                            <span style="display: inline-block; padding: 0.35rem 0.75rem; border-radius: 8px; background: #f1f5f9; color: #0f172a; font-size: 0.85rem; font-weight: 700; border: 1px solid #e2e8f0;">
                                                ${entity.dealCount} Opps
                                            </span>
                                        </td>
                                        <td style="padding: 1.25rem 1.5rem;">
                                            <div style="font-weight: 900; color: #10b981; font-size: 1.1rem;">$${Number(entity.totalValue).toLocaleString()}</div>
                                            <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">AGGREGATE VALUE</div>
                                        </td>
                                        <td style="padding: 1.25rem 1.5rem;">
                                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                                <div style="width: 28px; height: 28px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800;">
                                                    ${(owner && owner.name ? owner.name[0] : 'U')}
                                                </div>
                                                <span style="font-size: 0.85rem; font-weight: 700; color: #475569;">${owner && owner.name ? owner.name : 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td style="padding: 1.25rem 1.5rem; text-align: right;">
                                            <div style="color: #cbd5e1;">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </div>
                                        </td>
                                    </tr>
                                `;
        }).join('') : `
                                <tr>
                                    <td colspan="5" style="padding: 6rem; text-align: center; color: #94a3b8;">
                                        <div style="font-size: 3.5rem; margin-bottom: 1.5rem; opacity: 0.5;">📉</div>
                                        <div style="font-weight: 800; font-size: 1.25rem; color: #64748b;">No ${this.entityType}s found with active deals</div>
                                        <p style="font-size: 0.95rem; margin-top: 0.5rem; color: #94a3b8;">Adjust your filters or owner assignments to expand the view.</p>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderTile(label, value, color, icon, isTotal = false) {
        const isActive = this.selectedStage === label;
        const glassStyle = `
            background: ${isActive ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.45)'};
            backdrop-filter: blur(14px);
            border: 1px solid ${isActive ? color : 'rgba(255, 255, 255, 0.3)'};
            box-shadow: ${isActive ? `0 18px 40px -10px ${color}35` : '0 12px 36px 0 rgba(31, 38, 135, 0.05)'};
            transform: ${isActive ? 'translateY(-8px)' : 'translateY(0)'};
        `;

        return `
            <div onclick="window.NexoGenix.activeDealsView.setStageFilter('${label}')" style="${glassStyle} padding: 1.75rem; border-radius: 24px; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
                    <div style="color: ${color}; background: ${color}12; padding: 0.75rem; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                        ${icon}
                    </div>
                </div>
                <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">${label}</div>
                <div style="font-size: 1.75rem; font-weight: 900; color: #0f172a; letter-spacing: -0.03em;">$${Number(value).toLocaleString()}</div>
            </div>
        `;
    }

    afterRender() { }
}
