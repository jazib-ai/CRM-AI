window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Companies = class Companies {
    constructor() {
        this.contacts = window.NexoGenix.data.contacts || [];
        this.companies = window.NexoGenix.data.companies || [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.filters = {
            search: '',
            ownerId: '',
            size: '',
            service: '',
            callingTaskDateStart: '',
            callingTaskDateEnd: '',
            followUpDateStart: '',
            followUpDateEnd: ''
        };

        this.availableColumns = [
            { id: 'identity', label: 'Company Name', always: true },
            { id: 'size', label: 'Size' },
            { id: 'website', label: 'Website' },
            { id: 'contacts', label: 'Contacts' },
            { id: 'owner', label: 'Owner' },
            { id: 'tasks', label: 'Key Dates' }
        ];

        this.visibleColumns = ['identity', 'size', 'website', 'contacts', 'owner'];
        this.showAdvancedFilters = false;

        window.NexoGenix.activeCompaniesView = this;
    }

    _generateVirtualId(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) * -1;
    }

    // ==================== ACTIONS ====================

    toggleAdvancedFilters() {
        this.showAdvancedFilters = !this.showAdvancedFilters;
        this.renderToDOM();
    }

    toggleColumn(colId) {
        if (this.visibleColumns.includes(colId)) {
            if (this.visibleColumns.length > 1) {
                this.visibleColumns = this.visibleColumns.filter(c => c !== colId);
            }
        } else {
            this.visibleColumns.push(colId);
        }
        this.renderToDOM();
    }

    setPage(page) {
        this.currentPage = page;
        this.renderToDOM();
    }

    setItemsPerPage(count) {
        this.itemsPerPage = parseInt(count);
        this.currentPage = 1;
        this.renderToDOM();
    }

    updateFilter(key, value) {
        this.filters[key] = value;
        this.currentPage = 1;
        this.renderToDOM();
    }

    clearFilters() {
        this.filters = {
            search: '', ownerId: '', size: '', service: '',
            callingTaskDateStart: '', callingTaskDateEnd: '',
            followUpDateStart: '', followUpDateEnd: ''
        };
        this.currentPage = 1;
        this.renderToDOM();
    }

    // ==================== DATA PROCESSING ====================

    getCompanies() {
        const companyMap = new Map();
        const user = window.NexoGenix.auth.getUser();

        (window.NexoGenix.data.companies || []).forEach(comp => {
            companyMap.set(comp.name, {
                id: comp.id,
                name: comp.name,
                size: comp.size || comp.companySize || '--',
                website: comp.website || '--',
                ownerId: comp.ownerId || null,
                service: comp.service || '--',
                callingTaskDate: comp.callingTaskDate || '',
                followUp: comp.followUp || '',
                contacts: []
            });
        });

        (window.NexoGenix.data.contacts || []).forEach(c => {
            if (user.role !== 'admin' && c.ownerId !== user.id) return;
            if (!c.company) return;

            if (!companyMap.has(c.company)) {
                companyMap.set(c.company, {
                    id: this._generateVirtualId(c.company),
                    name: c.company,
                    size: c.companySize || '--',
                    website: c.website || '--',
                    ownerId: c.ownerId || null,
                    service: c.service || '--',
                    callingTaskDate: '',
                    followUp: '',
                    isVirtual: true,
                    contacts: []
                });
            }

            const comp = companyMap.get(c.company);
            comp.contacts.push(c);

            if (c.companySize && (comp.size === '--' || !comp.size)) comp.size = c.companySize;
            if (c.website && (comp.website === '--' || !comp.website)) comp.website = c.website;
        });

        let result = Array.from(companyMap.values());

        // Range filters
        const checkRange = (date, start, end) => {
            if (!date) return false;
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        };

        if (this.filters.search) {
            const s = this.filters.search.toLowerCase();
            result = result.filter(c => (c.name || '').toLowerCase().includes(s) || (c.website || '').toLowerCase().includes(s));
        }
        if (this.filters.ownerId) result = result.filter(c => c.ownerId?.toString() === this.filters.ownerId);
        if (this.filters.size) result = result.filter(c => c.size === this.filters.size);
        if (this.filters.service) result = result.filter(c => c.service === this.filters.service);

        if (this.filters.callingTaskDateStart || this.filters.callingTaskDateEnd) {
            result = result.filter(c => checkRange(c.callingTaskDate, this.filters.callingTaskDateStart, this.filters.callingTaskDateEnd));
        }
        if (this.filters.followUpDateStart || this.filters.followUpDateEnd) {
            result = result.filter(c => checkRange(c.followUp, this.filters.followUpDateStart, this.filters.followUpDateEnd));
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }

    // ==================== BULK ACTIONS ====================

    toggleSelectAll(checkbox) {
        document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = checkbox.checked);
        this.updateBulkActions();
    }

    updateBulkActions() {
        const selectedCount = document.querySelectorAll('.company-checkbox:checked').length;
        const bulkActions = document.getElementById('bulk-actions-overlay');
        if (bulkActions) {
            bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
            document.getElementById('selected-count-label').textContent = selectedCount;
        }
    }

    async bulkDelete() {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.company-checkbox:checked'));
        const selectedIds = selectedCheckboxes.map(cb => parseInt(cb.dataset.companyId));
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} companies?`)) return;

        for (const cb of selectedCheckboxes) {
            const id = parseInt(cb.dataset.companyId);
            const row = cb.closest('tr');
            const companyName = row.dataset.name;
            if (id > 0) {
                await window.NexoGenix.store.deleteCompany(id);
            } else {
                const contactsToUpdate = window.NexoGenix.data.contacts.filter(c => c.company === companyName);
                for (const contact of contactsToUpdate) {
                    contact.company = '';
                    await window.NexoGenix.store.updateContact(contact.id, contact);
                }
            }
        }
        this.renderToDOM();
    }

    bulkReassign() {
        const modal = document.getElementById('bulkReassignModal');
        const container = document.getElementById('bulk-reassign-owner-group');
        const allUsers = window.NexoGenix.auth.getAllUsers();

        container.innerHTML = `
            <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem;">New Owner</label>
            <select id="bulkNewOwnerId" style="width: 100%; padding: 0.85rem; border: 1px solid rgba(226, 232, 240, 0.4); border-radius: 12px; outline: none; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px);">
                ${allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
        `;
        modal.style.display = 'flex';
    }

    closeBulkReassignModal() {
        document.getElementById('bulkReassignModal').style.display = 'none';
    }

    async saveBulkReassign() {
        const newOwnerId = parseInt(document.getElementById('bulkNewOwnerId').value);
        const selectedCheckboxes = Array.from(document.querySelectorAll('.company-checkbox:checked'));
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const newOwner = allUsers.find(u => u.id === newOwnerId);
        const currentUser = window.NexoGenix.auth.getUser();

        for (const cb of selectedCheckboxes) {
            const id = parseInt(cb.dataset.companyId);
            const row = cb.closest('tr');
            const companyName = row.dataset.name;

            if (id > 0) {
                const comp = window.NexoGenix.data.companies.find(c => c.id === id);
                if (comp) {
                    const oldOwnerId = comp.ownerId;
                    const updatedComp = { ...comp, ownerId: newOwnerId };
                    await window.NexoGenix.store.updateCompany(id, updatedComp);

                    const oldOwner = allUsers.find(u => u.id === oldOwnerId);
                    await window.NexoGenix.store.addActivity({
                        companyId: id,
                        type: 'Update',
                        content: `<strong>Owner Reassigned</strong><br>By: ${currentUser.name}<br>From: ${oldOwner ? oldOwner.name : 'Unassigned'} → To: ${newOwner ? newOwner.name : 'Unknown'}`,
                        date: new Date().toISOString(),
                        ownerId: currentUser.id
                    });
                }
            } else {
                const contactsToUpdate = window.NexoGenix.data.contacts.filter(c => c.company === companyName);
                for (const contact of contactsToUpdate) {
                    const oldOwnerId = contact.ownerId;
                    const updatedContact = { ...contact, ownerId: newOwnerId };
                    await window.NexoGenix.store.updateContact(contact.id, updatedContact);

                    const oldOwner = allUsers.find(u => u.id === oldOwnerId);
                    await window.NexoGenix.store.addActivity({
                        contactId: contact.id,
                        type: 'Update',
                        content: `<strong>Owner Reassigned (via Company)</strong><br>By: ${currentUser.name}<br>From: ${oldOwner ? oldOwner.name : 'Unassigned'} → To: ${newOwner ? newOwner.name : 'Unknown'}`,
                        date: new Date().toISOString(),
                        ownerId: currentUser.id
                    });
                }
            }
        }
        this.closeBulkReassignModal();
        this.renderToDOM();
    }

    exportToCSV() {
        if (window.NexoGenix.auth.getUser().role !== 'admin') {
            alert('Access Denied: Only administrators can export data.');
            return;
        }
        const companies = this.getCompanies();
        const headers = ['Company Name', 'Size', 'Website', 'Contacts Count'];
        const rows = [headers.join(','), ...companies.map(c => [
            `"${c.name}"`,
            `"${c.size}"`,
            `"${c.website}"`,
            c.contacts.length
        ].join(','))];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'companies.csv';
        a.click();
    }

    // ==================== UI RENDERING ====================

    async renderToDOM() {
        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
        this.updateBulkActions();
    }

    renderTableHeaders() {
        return this.availableColumns
            .filter(col => this.visibleColumns.includes(col.id))
            .map(col => `<th class="th-label">${col.label}</th>`)
            .join('');
    }

    renderTableRow(comp, allUsers) {
        const owner = allUsers.find(u => u.id === comp.ownerId);
        return `
            <tr class="row-body" data-name="${comp.name}">
                <td style="padding: 1rem 1.5rem; width: 40px; text-align: center;">
                    <input type="checkbox" class="company-checkbox" data-company-id="${comp.id}" onchange="window.NexoGenix.activeCompaniesView.updateBulkActions()">
                </td>
                ${this.visibleColumns.map(colId => {
            if (colId === 'identity') {
                return `
                            <td onclick="window.location.hash='#company/${comp.id}'" style="cursor: pointer;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(45, 212, 191, 0.1)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid rgba(59, 130, 246, 0.2);">🏢</div>
                                    <div>
                                        <div style="font-weight: 500; color: #1e293b; font-size: 0.95rem;">${comp.name}</div>
                                        ${comp.isVirtual ? '<span style="font-size: 0.65rem; font-weight: 500; color: #0ea5e9; text-transform: uppercase; background: rgba(14, 165, 233, 0.08); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px; border: 1px solid rgba(14, 165, 233, 0.15);">Auto Created</span>' : ''}
                                    </div>
                                </div>
                            </td>
                        `;
            }
            if (colId === 'size') return `<td><span class="badge badge-size" style="background: rgba(241, 245, 249, 0.5); color: #64748b; padding: 0.35rem 0.65rem; border-radius: 8px; font-weight: 500; font-size: 0.75rem; border: 1px solid rgba(203, 213, 225, 0.3);">${comp.size}</span></td>`;
            if (colId === 'website') return `
                        <td>
                            <a href="${comp.website.startsWith('http') ? comp.website : 'https://' + comp.website}" target="_blank" style="color: #64748b; text-decoration: none; font-size: 0.85rem; font-weight: 400; display: flex; align-items: center; gap: 0.4rem; transition: color 0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#64748b'" onclick="event.stopPropagation()">
                                ${comp.website}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </td>
                    `;
            if (colId === 'contacts') return `
                        <td>
                            <button onclick="window.NexoGenix.activeCompaniesView.showCompanyContacts('${comp.name.replace(/'/g, "\\'")}')" class="stakeholders-btn" onclick="event.stopPropagation()">
                                ${comp.contacts.length} Contacts
                            </button>
                        </td>
                    `;
            if (colId === 'owner') return `
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 500; color: white;">${owner ? owner.name.charAt(0) : '?'}</div>
                                <span style="font-size: 0.85rem; color: #475569; font-weight: 400;">${owner ? owner.name : 'Unassigned'}</span>
                            </div>
                        </td>
                    `;
            if (colId === 'tasks') return `
                        <td>
                            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">
                                ${comp.callingTaskDate ? `<div style="color: #0ea5e9; margin-bottom: 2px;">📞 ${comp.callingTaskDate}</div>` : ''}
                                ${comp.followUp ? `<div style="color: #14b8a6;">🗓️ ${comp.followUp}</div>` : ''}
                                ${!comp.callingTaskDate && !comp.followUp ? '<span style="opacity: 0.3;">--</span>' : ''}
                            </div>
                        </td>
                    `;
            return `<td>-</td>`;
        }).join('')}
                <td style="text-align: right; padding: 1rem 1.5rem;">
                    <button onclick="window.location.hash='#company/${comp.id}'" style="background: transparent; border: none; color: rgba(148, 163, 184, 0.5); cursor: pointer; transition: all 0.2s; vertical-align: middle;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='rgba(148, 163, 184, 0.5)'" title="View Details">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                    ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                        <button onclick="window.NexoGenix.activeCompaniesView.deleteCompany(${comp.id})" style="background: transparent; border: none; cursor: pointer; color: #fca5a5; padding: 0.5rem; vertical-align: middle;" title="Delete"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    renderPageNumbers(totalPages) {
        let pages = [];
        let start = Math.max(1, this.currentPage - 2);
        let end = Math.min(totalPages, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);

        for (let i = start; i <= end; i++) {
            pages.push(`<button class="page-num-btn ${this.currentPage === i ? 'active' : ''}" onclick="window.NexoGenix.activeCompaniesView.setPage(${i})">${i}</button>`);
        }
        return pages.join('');
    }

    async render() {
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const config = window.NexoGenix.data.config || {};
        const companies = this.getCompanies();

        const totalItems = companies.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pagedCompanies = companies.slice(startIndex, startIndex + this.itemsPerPage);

        return `
            <div class="company-workspace" style="padding: 2rem; background: radial-gradient(circle at top left, #f8fafc, #f1f5f9); min-height: 100vh; font-family: 'Outfit', sans-serif;">
                
                <!-- Page Header -->
                <header style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem;">
                    <div>
                        <h1 style="font-size: 1.75rem; font-weight: 500; color: #0f172a; margin: 0; letter-spacing: -0.01em;">Companies</h1>
                        <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.35rem;">
                            <span style="font-size: 0.85rem; color: #64748b; font-weight: 400;">Total: <span style="color: #0f172a;">${window.NexoGenix.data.companies.length}</span></span>
                            <span style="color: #cbd5e1;">&bull;</span>
                            <span style="font-size: 0.85rem; color: #64748b; font-weight: 400;">Matched: <span style="color: #3b82f6;">${totalItems}</span></span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                            <button class="action-btn-secondary" onclick="window.NexoGenix.activeCompaniesView.exportToCSV()">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export
                            </button>
                        ` : ''}
                        <button class="action-btn-primary" onclick="window.NexoGenix.activeCompaniesView.openModal()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add Company
                        </button>
                    </div>
                </header>

                <!-- Glass Filter Toolbar -->
                <div class="glass-card" style="margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem; position: relative; z-index: 50;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <div style="position: relative; flex: 1;">
                            <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search companies..." value="${this.filters.search}" class="glass-input" oninput="window.NexoGenix.activeCompaniesView.updateFilter('search', this.value)">
                        </div>
                        
                        <div style="display: flex; gap: 0.6rem;">
                            <button class="filter-toggle-btn ${this.showAdvancedFilters ? 'active' : ''}" onclick="window.NexoGenix.activeCompaniesView.toggleAdvancedFilters()">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Filters
                            </button>
                            <div class="dropdown" style="position: relative;">
                                <button class="filter-toggle-btn">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                                    View
                                </button>
                                <div class="dropdown-content glass-dropdown">
                                    <h4 class="dropdown-title">Columns</h4>
                                    ${this.availableColumns.map(col => `
                                        <label class="dropdown-item">
                                            <input type="checkbox" style="width: 14px; height: 14px;" ${this.visibleColumns.includes(col.id) ? 'checked' : ''} ${col.always ? 'disabled' : ''} onclick="window.NexoGenix.activeCompaniesView.toggleColumn('${col.id}')">
                                            ${col.label}
                                        </label>
                                    `).join('')}
                                    <h4 class="dropdown-title" style="margin-top: 1rem;">Entries per page</h4>
                                    <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem;">
                                        ${[50, 100, 200].map(n => `
                                            <button onclick="window.NexoGenix.activeCompaniesView.setItemsPerPage(${n})" style="flex: 1; padding: 0.35rem; border: 1px solid ${this.itemsPerPage === n ? '#3b82f6' : 'rgba(226, 232, 240, 0.5)'}; border-radius: 6px; background: ${this.itemsPerPage === n ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}; font-size: 0.7rem; font-weight: 500; color: ${this.itemsPerPage === n ? '#3b82f6' : '#64748b'}; cursor: pointer;">${n}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.showAdvancedFilters ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem; padding-top: 1.25rem; border-top: 1px solid rgba(226, 232, 240, 0.5); animation: fadeIn 0.3s ease-out;">
                            <div class="filter-group">
                                <label>Owner</label>
                                <select onchange="window.NexoGenix.activeCompaniesView.updateFilter('ownerId', this.value)">
                                    <option value="">All</option>
                                    ${allUsers.map(u => `<option value="${u.id}" ${this.filters.ownerId == u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Size</label>
                                <select onchange="window.NexoGenix.activeCompaniesView.updateFilter('size', this.value)">
                                    <option value="">All Sizes</option>
                                    ${['1-10', '10-50', '50-100', '100-200', '200-500', '500+'].map(s => `<option value="${s}" ${this.filters.size === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Service</label>
                                <select onchange="window.NexoGenix.activeCompaniesView.updateFilter('service', this.value)">
                                    <option value="">All Services</option>
                                    ${(config.services || []).map(s => `<option value="${s}" ${this.filters.service === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group" style="grid-column: span 2;">
                                <label>Calling Task Range</label>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="date" value="${this.filters.callingTaskDateStart}" onchange="window.NexoGenix.activeCompaniesView.updateFilter('callingTaskDateStart', this.value)" class="glass-input-sm">
                                    <span style="color: #cbd5e1;">-</span>
                                    <input type="date" value="${this.filters.callingTaskDateEnd}" onchange="window.NexoGenix.activeCompaniesView.updateFilter('callingTaskDateEnd', this.value)" class="glass-input-sm">
                                </div>
                            </div>
                            <div class="filter-group" style="grid-column: span 2;">
                                <label>Follow-up Range</label>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="date" value="${this.filters.followUpDateStart}" onchange="window.NexoGenix.activeCompaniesView.updateFilter('followUpDateStart', this.value)" class="glass-input-sm">
                                    <span style="color: #cbd5e1;">-</span>
                                    <input type="date" value="${this.filters.followUpDateEnd}" onchange="window.NexoGenix.activeCompaniesView.updateFilter('followUpDateEnd', this.value)" class="glass-input-sm">
                                </div>
                            </div>
                            <div style="display: flex; align-items: flex-end; justify-content: flex-end;">
                                <button onclick="window.NexoGenix.activeCompaniesView.clearFilters()" style="background: transparent; border: none; font-size: 0.8rem; font-weight: 500; color: #ef4444; cursor: pointer; padding: 0.4rem;">Reset All</button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Main Glass Table Content -->
                <div class="glass-card" style="padding: 0; box-shadow: 0 12px 40px -10px rgba(0,0,0,0.03); border: 1px solid rgba(255, 255, 255, 0.7);">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                            <thead>
                                <tr style="background: rgba(248, 250, 252, 0.5);">
                                    <th style="padding: 1.25rem 1.5rem; width: 40px; border-bottom: 1px solid rgba(226, 232, 240, 0.5); text-align: center;">
                                        <input type="checkbox" style="width: 16px; height: 16px;" onchange="window.NexoGenix.activeCompaniesView.toggleSelectAll(this)">
                                    </th>
                                    ${this.availableColumns.filter(col => this.visibleColumns.includes(col.id)).map(col => `<th class="th-label" style="border-bottom: 1px solid rgba(226, 232, 240, 0.5);">${col.label}</th>`).join('')}
                                    <th style="padding: 1.25rem 1.5rem; text-align: right; border-bottom: 1px solid rgba(226, 232, 240, 0.5);"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pagedCompanies.map(c => this.renderTableRow(c, allUsers)).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${pagedCompanies.length === 0 ? `
                        <div style="padding: 6rem 2rem; text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.2;">🏢</div>
                            <p style="color: #64748b; font-size: 1rem; font-weight: 400;">No companies match your filters.</p>
                        </div>
                    ` : ''}

                    <footer style="padding: 1.25rem 1.5rem; background: rgba(248, 250, 252, 0.3); border-top: 1px solid rgba(226, 232, 240, 0.5); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.85rem; color: #64748b; font-weight: 400;">
                            Showing <span style="color: #334155; font-weight: 500;">${Math.min(startIndex + 1, totalItems)} - ${Math.min(startIndex + this.itemsPerPage, totalItems)}</span> of <span style="color: #334155; font-weight: 500;">${totalItems}</span>
                        </span>
                        <div style="display: flex; gap: 0.4rem;">
                            <button class="page-nav-btn" onclick="window.NexoGenix.activeCompaniesView.setPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Prev</button>
                            ${this.renderPageNumbers(totalPages)}
                            <button class="page-nav-btn" onclick="window.NexoGenix.activeCompaniesView.setPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    </footer>
                </div>

                <!-- Floating Actions Glass -->
                <div id="bulk-actions-overlay" style="display: none; position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px) saturate(180%); padding: 0.65rem 1.5rem; border-radius: 99px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4); align-items: center; gap: 1.5rem; z-index: 1000; border: 1px solid rgba(255,255,255,0.1); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                    <span style="color: white; font-size: 0.85rem; font-weight: 400;"><span id="selected-count-label" style="font-weight: 600; color: #3b82f6;">0</span> Selected</span>
                    <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.15);"></div>
                    <div style="display: flex; gap: 0.6rem;">
                        <button onclick="window.NexoGenix.activeCompaniesView.bulkReassign()" style="background: transparent; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Reassign</button>
                        ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                            <button onclick="window.NexoGenix.activeCompaniesView.bulkDelete()" style="background: transparent; color: #fca5a5; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Delete</button>
                        ` : ''}
                    </div>
                </div>

            </div>

            <!-- Modals (SaaS Glass Style) -->
            <div id="addCompanyModal" class="modal-overlay">
                <div class="glass-modal" style="width: 720px;">
                    <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.5rem; font-weight: 500; color: #0f172a;">New Company</h3>
                            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem;">Setup a new institutional profile.</p>
                        </div>
                        <button onclick="window.NexoGenix.activeCompaniesView.closeModal()" class="close-modal-btn">&times;</button>
                    </header>
                    <form id="addCompanyForm" onsubmit="window.NexoGenix.activeCompaniesView.saveCompany(event)">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2.5rem;">
                            <div class="modal-field"><label>Company Name</label><input type="text" name="companyName" required placeholder="e.g. Acme Corp" class="glass-input-modal"></div>
                            <div class="modal-field"><label>Website</label><input type="text" name="website" placeholder="e.g. acme.com" class="glass-input-modal"></div>
                            <div class="modal-field">
                                <label>Company Size</label>
                                <select name="companySize" class="glass-input-modal">
                                    <option value="">Select Size...</option>
                                    ${['1-10', '10-50', '50-100', '100-200', '200-500', '500+'].map(s => `<option value="${s}">${s} employees</option>`).join('')}
                                </select>
                            </div>
                            <div class="modal-field">
                                <label>Service Interested</label>
                                <select name="service" class="glass-input-modal">
                                    <option value="">Select Service...</option>
                                    ${(config.services || []).map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div style="background: rgba(248, 250, 252, 0.4); padding: 2rem; border-radius: 20px; border: 1px dashed rgba(203, 213, 225, 0.6);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                                <h4 style="margin: 0; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Initial Contacts</h4>
                                <button type="button" onclick="window.NexoGenix.activeCompaniesView.addEmployeeRow()" class="add-row-btn">+ Add Row</button>
                            </div>
                            <div id="employees-container" style="display: flex; flex-direction: column; gap: 0.85rem;"></div>
                        </div>

                        <footer style="margin-top: 3rem; display: flex; justify-content: flex-end; gap: 1rem;">
                            <button type="button" onclick="window.NexoGenix.activeCompaniesView.closeModal()" class="modal-btn-secondary">Cancel</button>
                            <button type="submit" class="modal-btn-primary">Index Company</button>
                        </footer>
                    </form>
                </div>
            </div>

            <!-- Contacts Modal (SaaS Glass Style) -->
            <div id="companyContactsModal" class="modal-overlay">
                <div class="glass-modal" style="width: 500px;">
                    <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div>
                            <h3 id="companyContactsTitle" style="margin: 0; font-size: 1.5rem; font-weight: 500; color: #0f172a;">Contacts</h3>
                            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem;">Team members at this company.</p>
                        </div>
                        <button onclick="window.NexoGenix.activeCompaniesView.closeContactsModal()" class="close-modal-btn">&times;</button>
                    </header>
                    <div id="companyContactsList" style="display: flex; flex-direction: column; gap: 1rem;"></div>
                </div>
            </div>

            <!-- Reassign Modal (SaaS Glass Style) -->
            <div id="bulkReassignModal" class="modal-overlay">
                <div class="glass-modal" style="width: 400px;">
                    <header style="margin-bottom: 1.5rem;">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 500; color: #0f172a;">Reassign Owner</h3>
                        <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem;">Choose a new internal manager.</p>
                    </header>
                    <div id="bulk-reassign-owner-group" style="margin-bottom: 2rem;"></div>
                    <footer style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button type="button" onclick="window.NexoGenix.activeCompaniesView.closeBulkReassignModal()" class="modal-btn-secondary" style="padding: 0.7rem 1.5rem;">Cancel</button>
                        <button type="button" onclick="window.NexoGenix.activeCompaniesView.saveBulkReassign()" class="modal-btn-primary" style="padding: 0.7rem 1.5rem;">Confirm</button>
                    </footer>
                </div>
            </div>

            <style>
                .glass-card { background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(12px) saturate(160%); -webkit-backdrop-filter: blur(12px) saturate(160%); border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 20px; padding: 1.25rem; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.04); }
                .action-btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 500; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid rgba(255,255,255,0.1); }
                .action-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.2); }
                .action-btn-secondary { background: rgba(255, 255, 255, 0.6); color: #475569; border: 1px solid rgba(226, 232, 240, 0.8); padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 500; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
                .action-btn-secondary:hover { background: white; border-color: #3b82f6; color: #3b82f6; }

                .glass-input { width: 100%; padding: 0.8rem 1rem 0.8rem 2.75rem; border: 1px solid rgba(226, 232, 240, 0.6); border-radius: 12px; font-size: 0.9rem; outline: none; transition: all 0.2s; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(4px); font-weight: 400; color: #1e293b; }
                .glass-input:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05); }
                .glass-input-sm { padding: 0.5rem 0.75rem; border: 1px solid rgba(226, 232, 240, 0.6); border-radius: 8px; font-size: 0.8rem; outline: none; background: rgba(255, 255, 255, 0.6); font-weight: 400; color: #475569; width: 100%; }

                .filter-toggle-btn { background: rgba(255, 255, 255, 0.6); color: #64748b; border: 1px solid rgba(226, 232, 240, 0.8); padding: 0.65rem 1.25rem; border-radius: 12px; font-weight: 500; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
                .filter-toggle-btn:hover { background: white; color: #3b82f6; border-color: #3b82f6; }
                .filter-toggle-btn.active { background: #0f172a; color: white; border-color: #0f172a; }

                .filter-group { display: flex; flex-direction: column; gap: 0.4rem; }
                .filter-group label { font-size: 0.7rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.02em; }
                .filter-group select { padding: 0.55rem 0.75rem; border: 1px solid rgba(226, 232, 240, 0.6); border-radius: 10px; font-size: 0.85rem; outline: none; background: rgba(255, 255, 255, 0.7); font-weight: 400; }

                .th-label { font-size: 0.7rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding: 1.25rem 1.5rem; text-align: left; }
                .row-body:hover { background: rgba(248, 250, 252, 0.6); }
                .row-body td { border-bottom: 1px solid rgba(226, 232, 240, 0.3); padding: 1.15rem 1.5rem; vertical-align: middle; }

                .stakeholders-btn { background: rgba(59, 130, 246, 0.06); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.1); padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .stakeholders-btn:hover { background: #3b82f6; color: white; border-color: #3b82f6; }

                .page-nav-btn { background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(226, 232, 240, 0.6); padding: 0.45rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s; }
                .page-nav-btn:hover:not(:disabled) { background: white; border-color: #3b82f6; color: #3b82f6; }
                .page-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .page-num-btn { width: 34px; height: 34px; border: 1px solid rgba(226, 232, 240, 0.6); border-radius: 10px; font-size: 0.8rem; font-weight: 500; color: #64748b; cursor: pointer; background: rgba(255, 255, 255, 0.8); transition: all 0.2s; }
                .page-num-btn:hover { border-color: #3b82f6; color: #3b82f6; }
                .page-num-btn.active { background: #0f172a; color: white; border-color: #0f172a; }

                .dropdown-content { display: none; position: absolute; right: 0; top: 100%; margin-top: 0.5rem; min-width: 200px; padding: 1rem; z-index: 1000; animation: bounceIn 0.3s cubic-bezier(0.17, 0.89, 0.32, 1.49); }
                .glass-dropdown { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 16px; box-shadow: 0 15px 30px -5px rgba(0,0,0,0.1); }
                .dropdown:hover .dropdown-content { display: block; }

                .dropdown-title { margin: 0 0 0.6rem 0; font-size: 0.65rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
                .dropdown-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0; font-size: 0.85rem; font-weight: 400; cursor: pointer; color: #475569; transition: color 0.2s; }
                .dropdown-item:hover { color: #0f172a; }

                .bulk-action-btn { background: transparent; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 4100; cursor: pointer; transition: background 0.2s; }
                /* No bold fonts fix - weight 400 */
                .bulk-action-btn:hover { background: rgba(255,255,255,0.1); }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                @keyframes bounceIn { from { transform: scale(0.95) translateY(-5px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

                .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.3); z-index: 4000; align-items: center; justify-content: center; }
                .glass-modal { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; padding: 2.5rem; box-shadow: 0 32px 64px -12px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.7); animation: bounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .close-modal-btn { background: rgba(241, 245, 249, 0.8); border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; color: #64748b; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .close-modal-btn:hover { background: #f1f5f9; color: #0f172a; transform: rotate(90deg); }

                .modal-field label { font-size: 0.75rem; font-weight: 500; color: #64748b; text-transform: uppercase; margin-bottom: 0.4rem; display: block; }
                .glass-input-modal { width: 100%; padding: 0.85rem 1rem; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 12px; font-size: 0.95rem; outline: none; background: rgba(255, 255, 255, 0.8); transition: all 0.2s; font-weight: 400; }
                .glass-input-modal:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05); }

                .modal-btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border: none; padding: 0.85rem 2.25rem; border-radius: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
                .modal-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }
                .modal-btn-secondary { background: rgba(241, 245, 249, 0.8); color: #475569; border: none; padding: 0.85rem 2.25rem; border-radius: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                
                .add-row-btn { background: #0f172a; color: white; border: none; padding: 0.45rem 1rem; border-radius: 10px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .add-row-btn:hover { transform: translateY(-1px); opacity: 0.9; }
            </style>
        `;
    }

    openModal() {
        const modal = document.getElementById('addCompanyModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('employees-container').innerHTML = '';
            this.addEmployeeRow();
        }
    }

    closeModal() {
        document.getElementById('addCompanyModal').style.display = 'none';
        document.getElementById('addCompanyForm').reset();
    }

    addEmployeeRow() {
        const container = document.getElementById('employees-container');
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr 1fr 1fr 36px';
        row.style.gap = '0.75rem';
        row.innerHTML = `
            <input type="text" name="empName[]" placeholder="Name" required class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="email" name="empEmail[]" placeholder="Email" required class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="text" name="empPhone[]" placeholder="Phone" class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="text" name="empJob[]" placeholder="Title" class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="text" name="employeeName" placeholder="Name" required class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="email" name="employeeEmail" placeholder="Email" required class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="text" name="employeePhone" placeholder="Phone" class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <input type="text" name="employeeJob" placeholder="Title" class="glass-input-modal" style="padding: 0.65rem 0.85rem; font-size: 0.85rem;">
            <button type="button" onclick="this.parentElement.remove()" style="background: rgba(239, 68, 68, 0.08); color: #ef4444; border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: all 0.2s;">&times;</button>
        `;
        container.appendChild(row);
    }

    async deleteCompany(id) {
        if (id < 0) {
            alert('Cannot delete unindexed (virtual) company. Please convert it to a master record by editing its profile first.');
            return;
        }

        if (confirm('Permanently delete this company? Contacts associated with it will have their company field cleared.')) {
            if (!confirm('Are you sure you want to delete this company profile?')) return;
            await window.NexoGenix.store.deleteCompany(id);
            this.renderToDOM();
        }
    }

    async saveCompany(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const currentUser = window.NexoGenix.auth.getUser();

        const companyData = {
            name: formData.get('companyName'),
            website: formData.get('website'),
            size: formData.get('companySize'),
            service: formData.get('service'),
            ownerId: currentUser.id,
            createdAt: new Date().toISOString()
        };

        try {
            const companyId = await window.NexoGenix.store.addCompany(companyData);

            // Add initial contacts
            const rows = document.querySelectorAll('.employee-row');
            for (const row of rows) {
                const nameInput = row.querySelector('[name="empName[]"]') || row.querySelector('[name="employeeName"]');
                const emailInput = row.querySelector('[name="empEmail[]"]') || row.querySelector('[name="employeeEmail"]');
                const phoneInput = row.querySelector('[name="empPhone[]"]') || row.querySelector('[name="employeePhone"]');
                const jobInput = row.querySelector('[name="empJob[]"]') || row.querySelector('[name="employeeJob"]');

                const name = nameInput ? nameInput.value : '';
                const email = emailInput ? emailInput.value : '';
                const phone = phoneInput ? phoneInput.value : '';
                const jobTitle = jobInput ? jobInput.value : '';

                if (name) {
                    const newContact = {
                        ownerId: currentUser.id,
                        name: name,
                        email: email,
                        phone: phone,
                        jobTitle: jobTitle,
                        company: companyData.name,
                        status: 'New',
                        lifecycle: 'Lead',
                        createdAt: new Date().toISOString()
                    };
                    await window.NexoGenix.store.addContact(newContact);
                }
            }
        } catch (err) {
            console.error('Failed to save company:', err);
            alert('Error saving company profile.');
        }

        this.closeModal();
        this.renderToDOM();
    }

    showCompanyContacts(companyName) {
        const company = this.getCompanies().find(c => c.name === companyName);
        if (!company) return;

        const modal = document.getElementById('companyContactsModal');
        const list = document.getElementById('companyContactsList');
        document.getElementById('companyContactsTitle').textContent = companyName;

        list.innerHTML = company.contacts.length > 0 ? company.contacts.map(c => `
            <div onclick="window.location.hash='#contact/${c.id}'" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background: rgba(248, 250, 252, 0.5); border: 1px solid rgba(226, 232, 240, 0.5); border-radius: 16px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor='#3b82f6'; this.style.background='white'; this.style.transform='translateX(8px)'" onmouseout="this.style.borderColor='rgba(226, 232, 240, 0.5)'; this.style.background='rgba(248, 250, 252, 0.5)'; this.style.transform='none'">
                <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 1.2rem;">${c.name.charAt(0)}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #0f172a; font-size: 1.05rem;">${c.name}</div>
                    <div style="font-size: 0.85rem; color: #64748b; font-weight: 400;">${c.jobTitle || 'Contact'}</div>
                </div>
                <div style="width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(226, 232, 240, 0.6);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
        `).join('') : `
            <div style="text-align: center; padding: 4rem 2rem; color: #94a3b8; font-weight: 400;">No contacts found.</div>
        `;

        modal.style.display = 'flex';
    }

    closeContactsModal() {
        document.getElementById('companyContactsModal').style.display = 'none';
    }
}
