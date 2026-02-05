window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Contacts = class Contacts {
    constructor() {
        this.contacts = window.NexoGenix.data.contacts;
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.filters = {
            search: '',
            ownerId: '',
            service: '',
            lifecycle: '',
            status: '',
            callingTaskDateStart: '',
            callingTaskDateEnd: '',
            followUpDateStart: '',
            followUpDateEnd: ''
        };

        this.availableColumns = [
            { id: 'identity', label: 'Identity', always: true },
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone' },
            { id: 'company', label: 'Company' },
            { id: 'status', label: 'Status' },
            { id: 'owner', label: 'Owner' },
            { id: 'tasks', label: 'Task Dates' },
            { id: 'lifecycle', label: 'Lifecycle' },
            { id: 'service', label: 'Service' },
            { id: 'timezone', label: 'Timezone' }
        ];

        this.visibleColumns = ['identity', 'email', 'phone', 'company', 'status', 'owner', 'tasks'];
        this.showAdvancedFilters = false;

        window.NexoGenix.activeContactsView = this;
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
            search: '',
            ownerId: '',
            service: '',
            lifecycle: '',
            status: '',
            callingTaskDateStart: '',
            callingTaskDateEnd: '',
            followUpDateStart: '',
            followUpDateEnd: ''
        };
        this.currentPage = 1;
        this.renderToDOM();
    }

    // ==================== UI HELPERS ====================

    getFilteredContacts() {
        const user = window.NexoGenix.auth.getUser();
        let filtered = window.NexoGenix.data.contacts || [];

        if (user.role !== 'admin') {
            filtered = filtered.filter(c => c.ownerId === user.id);
        }

        if (this.filters.search) {
            const s = this.filters.search.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name || '').toLowerCase().includes(s) ||
                (c.email || '').toLowerCase().includes(s) ||
                (c.company || '').toLowerCase().includes(s)
            );
        }
        if (this.filters.ownerId) filtered = filtered.filter(c => c.ownerId.toString() === this.filters.ownerId);
        if (this.filters.service) filtered = filtered.filter(c => c.service === this.filters.service);
        if (this.filters.lifecycle) filtered = filtered.filter(c => c.lifecycle === this.filters.lifecycle);
        if (this.filters.status) filtered = filtered.filter(c => c.status === this.filters.status);

        if (this.filters.callingTaskDateStart) filtered = filtered.filter(c => c.callingTaskDate && c.callingTaskDate >= this.filters.callingTaskDateStart);
        if (this.filters.callingTaskDateEnd) filtered = filtered.filter(c => c.callingTaskDate && c.callingTaskDate <= this.filters.callingTaskDateEnd);
        if (this.filters.followUpDateStart) filtered = filtered.filter(c => c.followUp && c.followUp >= this.filters.followUpDateStart);
        if (this.filters.followUpDateEnd) filtered = filtered.filter(c => c.followUp && c.followUp <= this.filters.followUpDateEnd);

        return filtered;
    }

    updateBulkActions() {
        const selectedCount = document.querySelectorAll('.contact-checkbox:checked').length;
        const bulkActions = document.getElementById('bulk-actions-overlay');
        if (bulkActions) {
            bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
            const countLabel = document.getElementById('selected-count-label');
            if (countLabel) countLabel.textContent = selectedCount;
        }
    }

    toggleSelectAll(checkbox) {
        document.querySelectorAll('.contact-checkbox').forEach(cb => cb.checked = checkbox.checked);
        this.updateBulkActions();
    }

    // ==================== RENDERING ====================

    async renderToDOM() {
        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
        this.updateBulkActions();
    }

    async render() {
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const config = window.NexoGenix.data.config || {};
        const filtered = this.getFilteredContacts();

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pagedContacts = filtered.slice(startIndex, startIndex + this.itemsPerPage);

        return `
            <div class="contacts-workspace" style="padding: 2rem; background: #f8fafc; min-height: 100vh; font-family: 'Outfit', sans-serif;">
                
                <!-- Page Header -->
                <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <h1 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em;">Relationship Hub</h1>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                            <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Total Records: <strong>${window.NexoGenix.data.contacts.length}</strong></span>
                            <span style="color: #cbd5e1;">&bull;</span>
                            <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Filtered: <strong>${totalItems}</strong></span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <input type="file" id="contact-import-input" style="display: none;" accept=".csv,.json" onchange="window.NexoGenix.activeContactsView.handleImport(event)">
                        <button class="action-btn-secondary" onclick="window.NexoGenix.activeContactsView.triggerImport()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 17 9 12 4 7"></polyline><line x1="9" y1="12" x2="20" y2="12"></line><line x1="20" y1="12" x2="16" y2="16"></line><line x1="20" y1="12" x2="16" y2="8"></line></svg>
                            Import
                        </button>
                        ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                            <button class="action-btn-secondary" onclick="window.NexoGenix.activeContactsView.exportToCSV()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export
                            </button>
                        ` : ''}
                        <button class="action-btn-primary" onclick="window.NexoGenix.activeContactsView.openModal()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add Contact
                        </button>
                    </div>
                </header>

                <!-- Search & Filter Bar -->
                <div style="background: white; border-radius: 20px; padding: 1.25rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; border: 1px solid #f1f5f9;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <div style="position: relative; flex: 1;">
                            <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search by name, email or company..." value="${this.filters.search}" style="width: 100%; padding: 0.85rem 1rem 0.85rem 3rem; border: 1px solid #e2e8f0; border-radius: 14px; font-size: 0.95rem; outline: none; transition: all 0.2s;" oninput="window.NexoGenix.activeContactsView.updateFilter('search', this.value)">
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-toggle-btn ${this.showAdvancedFilters ? 'active' : ''}" onclick="window.NexoGenix.activeContactsView.toggleAdvancedFilters()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Advanced
                            </button>
                            <div class="dropdown" style="position: relative;">
                                <button class="filter-toggle-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                                    View
                                </button>
                                <div class="dropdown-content">
                                    <h4 style="margin: 0 0 0.75rem 0; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Columns</h4>
                                    ${this.availableColumns.map(col => `
                                        <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: #334155;">
                                            <input type="checkbox" ${this.visibleColumns.includes(col.id) ? 'checked' : ''} ${col.always ? 'disabled' : ''} onclick="window.NexoGenix.activeContactsView.toggleColumn('${col.id}')">
                                            ${col.label}
                                        </label>
                                    `).join('')}
                                    <h4 style="margin: 1.5rem 0 0.75rem 0; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Page Size</h4>
                                    <div style="display: flex; gap: 0.5rem;">
                                        ${[50, 100, 200].map(n => `
                                            <button onclick="window.NexoGenix.activeContactsView.setItemsPerPage(${n})" style="flex: 1; padding: 0.4rem; border: 1px solid ${this.itemsPerPage === n ? '#3b82f6' : '#e2e8f0'}; border-radius: 6px; background: ${this.itemsPerPage === n ? '#eff6ff' : 'white'}; font-size: 0.75rem; font-weight: 700; color: ${this.itemsPerPage === n ? '#3b82f6' : '#64748b'}; cursor: pointer;">${n}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.showAdvancedFilters ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
                            <div class="filter-group">
                                <label>Owner</label>
                                <select onchange="window.NexoGenix.activeContactsView.updateFilter('ownerId', this.value)">
                                    <option value="">All Owners</option>
                                    ${allUsers.map(u => `<option value="${u.id}" ${this.filters.ownerId == u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Status</label>
                                <select onchange="window.NexoGenix.activeContactsView.updateFilter('status', this.value)">
                                    <option value="">All Statuses</option>
                                    ${['New', 'Attempted to Contact', 'Connected', 'Meeting Scheduled', 'Qualified', 'Open Deal', 'Unqualified', 'Closed Lost'].map(s => `<option value="${s}" ${this.filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Service</label>
                                <select onchange="window.NexoGenix.activeContactsView.updateFilter('service', this.value)">
                                    <option value="">All Services</option>
                                    ${(config.services || []).map(s => `<option value="${s}" ${this.filters.service === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Stage</label>
                                <select onchange="window.NexoGenix.activeContactsView.updateFilter('lifecycle', this.value)">
                                    <option value="">All Stages</option>
                                    ${['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist', 'Other'].map(l => `<option value="${l}" ${this.filters.lifecycle === l ? 'selected' : ''}>${l}</option>`).join('')}
                                </select>
                            </div>
                            <div class="filter-group" style="grid-column: span 2;">
                                <label>Call Date Range</label>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="date" value="${this.filters.callingTaskDateStart}" onchange="window.NexoGenix.activeContactsView.updateFilter('callingTaskDateStart', this.value)">
                                    <span style="color: #cbd5e1;">&rarr;</span>
                                    <input type="date" value="${this.filters.callingTaskDateEnd}" onchange="window.NexoGenix.activeContactsView.updateFilter('callingTaskDateEnd', this.value)">
                                </div>
                            </div>
                            <div class="filter-group" style="grid-column: span 2;">
                                <label>Follow-up Range</label>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="date" value="${this.filters.followUpDateStart}" onchange="window.NexoGenix.activeContactsView.updateFilter('followUpDateStart', this.value)">
                                    <span style="color: #cbd5e1;">&rarr;</span>
                                    <input type="date" value="${this.filters.followUpDateEnd}" onchange="window.NexoGenix.activeContactsView.updateFilter('followUpDateEnd', this.value)">
                                </div>
                            </div>
                            <div style="display: flex; align-items: flex-end; justify-content: flex-end;">
                                <button onclick="window.NexoGenix.activeContactsView.clearFilters()" style="background: transparent; border: none; font-size: 0.85rem; font-weight: 700; color: #ef4444; cursor: pointer; padding: 0.5rem;">Reset All Filters</button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Table Container -->
                <div style="background: white; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #f1f5f9;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="padding: 1rem 1.5rem; width: 40px;">
                                        <input type="checkbox" onchange="window.NexoGenix.activeContactsView.toggleSelectAll(this)">
                                    </th>
                                    ${this.renderTableHeaders()}
                                    <th style="padding: 1rem 1.5rem; text-align: right;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pagedContacts.map(c => this.renderTableRow(c, allUsers)).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Empty State -->
                    ${pagedContacts.length === 0 ? `
                        <div style="padding: 5rem 2rem; text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🔎</div>
                            <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem;">No contacts found</h3>
                            <p style="color: #64748b; margin-top: 0.5rem;">Try adjusting your search or filters to find what you're looking for.</p>
                        </div>
                    ` : ''}

                    <!-- Pagination Footer -->
                    <footer style="padding: 1.25rem 1.5rem; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">
                            Showing <span style="color: #0f172a; font-weight: 700;">${Math.min(startIndex + 1, totalItems)} - ${Math.min(startIndex + this.itemsPerPage, totalItems)}</span> of <span style="color: #0f172a; font-weight: 700;">${totalItems}</span>
                        </span>
                        <div style="display: flex; gap: 0.4rem;">
                            <button class="page-nav-btn" onclick="window.NexoGenix.activeContactsView.setPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                            ${this.renderPageNumbers(totalPages)}
                            <button class="page-nav-btn" onclick="window.NexoGenix.activeContactsView.setPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    </footer>
                </div>

                <!-- Floating Bulk Actions -->
                <div id="bulk-actions-overlay" style="display: none; position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); padding: 0.65rem 1.5rem; border-radius: 99px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3); align-items: center; gap: 1.5rem; z-index: 1000; border: 1px solid rgba(255,255,255,0.1); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                    <span style="color: white; font-size: 0.85rem; font-weight: 400;"><span id="selected-count-label" style="font-weight: 600; color: #3b82f6;">0</span> Selected</span>
                    <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.15);"></div>
                    <div style="display: flex; gap: 0.6rem;">
                        <button onclick="window.NexoGenix.activeContactsView.bulkReassign()" style="background: transparent; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Reassign</button>
                        ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                            <button onclick="window.NexoGenix.activeContactsView.bulkDelete()" style="background: transparent; color: #fca5a5; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Delete</button>
                        ` : ''}
                    </div>
                </div>

            </div>

            <!-- Modal logic preserved but updated UI -->
            <div id="addContactModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.4); z-index: 4000; align-items: center; justify-content: center;">
                <div style="background: white; width: 680px; border-radius: 28px; padding: 2.5rem; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a;">Contact Record</h3>
                            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem;">Fill in the details to create or update a contact.</p>
                        </div>
                        <button onclick="window.NexoGenix.activeContactsView.closeModal()" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; color: #64748b;">&times;</button>
                    </header>
                    <form id="addContactForm" onsubmit="window.NexoGenix.activeContactsView.saveContact(event)">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                            <div class="modal-field"><label>Full Name</label><input type="text" name="name" required></div>
                            <div class="modal-field"><label>Email Address</label><input type="email" name="email" required></div>
                            <div class="modal-field"><label>Phone Number</label><input type="text" name="phone"></div>
                            <div class="modal-field"><label>Company</label><input type="text" name="company"></div>
                            <div class="modal-field"><label>Job Title</label><input type="text" name="jobTitle"></div>
                            <div class="modal-field">
                                <label>Service Interest</label>
                                <select name="service">
                                    <option value="">Select Service</option>
                                    ${(config.services || []).map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="modal-field"><label>Lifecycle Stage</label><select name="lifecycle">${['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist', 'Other'].map(l => `<option value="${l}">${l}</option>`).join('')}</select></div>
                            <div class="modal-field"><label>Lead Status</label><select name="status">${['New', 'Attempted to Contact', 'Connected', 'Meeting Scheduled', 'Qualified', 'Open Deal', 'Unqualified', 'Closed Lost'].map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
                             <div class="modal-field"><label>Follow-up Date</label><input type="date" name="followUp"></div>
                             <div class="modal-field"><label>Calling Task Date</label><input type="date" name="callingTaskDate"></div>
                             <div class="modal-field" id="contact-owner-group-modal"></div>
                             <div class="modal-field">
                                 <label>Profile Theme</label>
                                 <div id="contact-theme-picker" style="display: flex; gap: 0.5rem; padding-top: 0.25rem;">
                                     ${['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#64748b'].map((hex, i) => `
                                         <label style="cursor: pointer; position: relative; width: 28px; height: 28px;">
                                             <input type="radio" name="themeColor" value="${hex}" style="display: none;" ${i === 0 ? 'checked' : ''}>
                                             <div class="color-swatch" style="width: 100%; height: 100%; border-radius: 50%; background: ${hex}; border: 2px solid white; box-shadow: 0 0 0 1px #e2e8f0;"></div>
                                         </label>
                                     `).join('')}
                                 </div>
                                 <style>
                                     input[name="themeColor"]:checked + .color-swatch { transform: scale(1.2); box-shadow: 0 0 0 2px #3b82f6 !important; z-index: 10; }
                                     .color-swatch { transition: all 0.2s; }
                                 </style>
                             </div>
                        </div>
                        <footer style="margin-top: 2.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
                            <button type="button" onclick="window.NexoGenix.activeContactsView.closeModal()" class="modal-btn-secondary">Cancel</button>
                            <button id="contactSubmitBtn" type="submit" class="modal-btn-primary">Save Relationship</button>
                        </footer>
                    </form>
                </div>
            </div>

            <!-- Bulk Reassign Modal -->
            <div id="bulkReassignModal" class="modal-overlay">
                <div class="glass-modal" style="width: 400px;">
                    <header style="margin-bottom: 1.5rem;">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 500; color: #0f172a;">Reassign Owner</h3>
                        <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem;">Choose a new internal manager.</p>
                    </header>
                    <div id="bulk-reassign-owner-group" style="margin-bottom: 2rem;"></div>
                    <footer style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button type="button" onclick="window.NexoGenix.activeContactsView.closeBulkReassignModal()" class="modal-btn-secondary" style="padding: 0.7rem 1.5rem;">Cancel</button>
                        <button type="button" onclick="window.NexoGenix.activeContactsView.saveBulkReassign()" class="modal-btn-primary" style="padding: 0.7rem 1.5rem;">Confirm</button>
                    </footer>
                </div>
            </div>

            <style>
                .action-btn-primary { background: #0f172a; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s; }
                .action-btn-primary:hover { background: #1e293b; transform: translateY(-1px); }
                .action-btn-secondary { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s; }
                .action-btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }

                .filter-toggle-btn { background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 0.7rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s; }
                .filter-toggle-btn:hover { background: #f8fafc; color: #0f172a; }
                .filter-toggle-btn.active { background: #0f172a; color: white; border-color: #0f172a; }

                .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .filter-group label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
                .filter-group select, .filter-group input { padding: 0.6rem 0.85rem; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; outline: none; background: white; }

                .th-label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding: 1.25rem 1.5rem; text-align: left; }
                .row-body:hover { background: #f8fafc; }
                .row-body td { border-bottom: 1px solid #f1f5f9; padding: 1rem 1.5rem; }

                .badge { padding: 0.45rem 0.85rem; border-radius: 99px; font-size: 0.725rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
                .badge-new { background: #f1f5f9; color: #475569; }
                .badge-customer { background: #dcfce7; color: #15803d; }
                .badge-connected { background: #dbeafe; color: #1e40af; }
                .badge-attempted { background: #fef9c3; color: #a16207; }
                .badge-meeting { background: #ede9fe; color: #6d28d9; }
                .badge-qualified { background: #ecfdf5; color: #047857; }
                .badge-open { background: #eff6ff; color: #1d4ed8; }
                .badge-unqualified { background: #fff1f2; color: #be123c; }
                .badge-closed { background: #1e293b; color: white; }

                /* Lifecycle Colors */
                .badge-lead { background: #fdf4ff; color: #a21caf; }
                .badge-mql { background: #fff7ed; color: #c2410c; }
                .badge-sql { background: #fffbeb; color: #b45309; }
                .badge-opportunity { background: #f0fdf4; color: #15803d; }
                .badge-subscriber { background: #f8fafc; color: #64748b; }
                .badge-evangelist { background: #fff1f2; color: #be123c; }

                .page-nav-btn { background: white; border: 1px solid #e2e8f0; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; }
                .page-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .page-num { width: 34px; height: 34px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #64748b; cursor: pointer; }
                .page-num.active { background: #0f172a; color: white; border-color: #0f172a; }

                .dropdown-content { display: none; position: absolute; right: 0; top: 100%; margin-top: 0.5rem; background: white; border-radius: 16px; padding: 1.25rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #f1f5f9; min-width: 220px; z-index: 50; }
                .dropdown:hover .dropdown-content { display: block; }

                .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.3); z-index: 4000; align-items: center; justify-content: center; }
                .glass-modal { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; padding: 2.5rem; box-shadow: 0 32px 64px -12px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.7); animation: bounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .modal-field { display: flex; flex-direction: column; gap: 0.5rem; }
                .modal-field label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
                .modal-field input, .modal-field select { padding: 0.85rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; }
                .modal-field input:focus { border-color: #3b82f6; }
                .modal-btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border: none; padding: 0.85rem 2.25rem; border-radius: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
                .modal-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }
                .modal-btn-secondary { background: rgba(241, 245, 249, 0.8); color: #475569; border: none; padding: 0.85rem 2.25rem; border-radius: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }

                .bulk-action-btn { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1.25rem; border-radius: 99px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .bulk-action-btn:hover { background: rgba(255,255,255,0.2); }

                @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                @keyframes bounceIn { from { transform: scale(0.95) translateY(-5px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
            </style>
        `;
    }

    renderTableHeaders() {
        return this.visibleColumns.map(colId => {
            const col = this.availableColumns.find(c => c.id === colId);
            return `<th class="th-label" ${colId === 'tasks' ? 'style="text-align: center;"' : ''}>${col.label}</th>`;
        }).join('');
    }

    renderTableRow(c, allUsers) {
        const owner = allUsers.find(u => u.id === c.ownerId);
        return `
            <tr class="row-body">
                <td style="text-align: center;">
                    <input type="checkbox" class="contact-checkbox" data-contact-id="${c.id}" onchange="window.NexoGenix.activeContactsView.updateBulkActions()">
                </td>
                ${this.visibleColumns.map(colId => {
            switch (colId) {
                case 'identity': {
                    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];
                    const colorIndex = (Math.abs(c.id || 0) % colors.length);
                    const themeColor = c.themeColor || colors[colorIndex];
                    return `
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 36px; height: 36px; background: ${themeColor}15; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${themeColor}; font-size: 0.9rem;">${c.name.charAt(0)}</div>
                                        <div>
                                            <a href="#contact/${c.id}" style="color: #0f172a; font-weight: 700; text-decoration: none; font-size: 0.95rem;">${c.name}</a>
                                            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">${c.jobTitle || 'No Title'}</div>
                                        </div>
                                    </div>
                                </td>
                            `;
                }
                case 'email':
                    return `<td><a href="mailto:${c.email}" style="color: #64748b; font-size: 0.85rem; text-decoration: none; font-weight: 600;">${c.email || '--'}</a></td>`;
                case 'phone':
                    return `<td><a href="tel:${c.phone}" style="color: #64748b; font-size: 0.85rem; text-decoration: none; font-weight: 600;">${c.phone || '--'}</a></td>`;
                case 'company':
                    return `
                                <td>
                                    ${c.company ? `
                                        <a href="#company/${(() => {
                                const company = (window.NexoGenix.data.companies || []).find(com => com.name === c.company);
                                if (company) return company.id;
                                let str = c.company;
                                let hash = 0;
                                for (let i = 0; i < str.length; i++) {
                                    const char = str.charCodeAt(i);
                                    hash = ((hash << 5) - hash) + char;
                                    hash = hash & hash;
                                }
                                return Math.abs(hash) * -1;
                            })()}" style="color: #3b82f6; font-weight: 700; text-decoration: none; font-size: 0.9rem;">${c.company}</a>
                                    ` : '<span style="color: #cbd5e1;">--</span>'}
                                </td>
                            `;
                case 'status':
                    return `<td><span class="badge badge-${(c.status || 'New').toLowerCase().split(' ')[0]}">${c.status || 'New'}</span></td>`;
                case 'owner':
                    return `
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #64748b;">
                                        <div style="width: 20px; height: 20px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800;">${owner ? owner.name.charAt(0) : '?'}</div>
                                        ${owner ? owner.name : 'Unknown'}
                                    </div>
                                </td>
                            `;
                case 'tasks':
                    return `
                                <td style="text-align: center;">
                                    <div style="font-size: 0.8rem; font-weight: 700; color: #94a3b8;">
                                        ${c.callingTaskDate ? `<div style="color: #ef4444;">📞 ${c.callingTaskDate}</div>` : ''}
                                        ${c.followUp ? `<div style="color: #3b82f6;">🗓️ ${c.followUp}</div>` : ''}
                                        ${!c.callingTaskDate && !c.followUp ? '<span style="opacity: 0.3;">--</span>' : ''}
                                    </div>
                                </td>
                            `;
                case 'lifecycle': return `<td><span class="badge badge-${(c.lifecycle || 'Lead').toLowerCase()}">${c.lifecycle || 'Lead'}</span></td>`;
                case 'service': return `<td style="font-size: 0.85rem; color: #64748b;">${c.service || '--'}</td>`;
                case 'timezone': return `<td style="font-size: 0.85rem; color: #64748b;">${c.timezone || '--'}</td>`;
            }
        }).join('')}
                <td style="text-align: right; padding: 1rem 1.5rem;">
                    <button onclick="window.NexoGenix.activeContactsView.openModal(${c.id})" style="background: transparent; border: none; cursor: pointer; color: #94a3b8; padding: 0.5rem;" title="Edit"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg></button>
                    ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                        <button onclick="window.NexoGenix.activeContactsView.deleteContact(${c.id})" style="background: transparent; border: none; cursor: pointer; color: #fca5a5; padding: 0.5rem;" title="Delete"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    renderPageNumbers(totalPages) {
        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(`<button class="page-num ${this.currentPage === i ? 'active' : ''}" onclick="window.NexoGenix.activeContactsView.setPage(${i})">${i}</button>`);
        }
        return pages.join('');
    }

    // ==================== CRUD & MODALS ====================

    openModal(id = null) {
        const modal = document.getElementById('addContactModal');
        const form = document.getElementById('addContactForm');
        if (id) {
            const contact = window.NexoGenix.data.contacts.find(c => c.id === id);
            form.dataset.editId = id;
            Object.keys(contact).forEach(key => {
                if (form[key]) {
                    if (form[key] instanceof NodeList || form[key].type === 'radio') {
                        const radio = Array.from(form[key]).find(r => r.value === contact[key]);
                        if (radio) radio.checked = true;
                    } else {
                        form[key].value = contact[key] || '';
                    }
                }
            });
        } else {
            form.reset();
            delete form.dataset.editId;
        }

        const ownerGroup = document.getElementById('contact-owner-group-modal');
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const currentUser = window.NexoGenix.auth.getUser();
        const selectedOwnerId = id ? window.NexoGenix.data.contacts.find(c => c.id === id).ownerId : currentUser.id;

        ownerGroup.innerHTML = `
            <label>Contact Owner</label>
            <select name="ownerId">
                ${allUsers.map(u => `<option value="${u.id}" ${u.id === selectedOwnerId ? 'selected' : ''}>${u.name}</option>`).join('')}
            </select>
        `;
        modal.style.display = 'flex';
    }

    closeModal() { document.getElementById('addContactModal').style.display = 'none'; }

    async saveContact(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const contactData = Object.fromEntries(formData.entries());
        contactData.ownerId = parseInt(contactData.ownerId);

        if (event.target.dataset.editId) {
            const id = parseInt(event.target.dataset.editId);
            const index = window.NexoGenix.data.contacts.findIndex(c => c.id === id);
            const updated = { ...window.NexoGenix.data.contacts[index], ...contactData };
            // Note: Store will update window.NexoGenix.data.contacts
            await window.NexoGenix.store.updateContact(id, updated);
        } else {
            const newContact = { ...contactData, createdAt: new Date().toISOString() };
            // Note: Store will update window.NexoGenix.data.contacts and assign ID
            await window.NexoGenix.store.addContact(newContact);
        }

        this.closeModal();
        this.renderToDOM();
    }

    async deleteContact(id) {
        if (confirm('Are you sure you want to delete this contact?')) {
            await window.NexoGenix.store.deleteContact(id);
            this.renderToDOM();
        }
    }

    // ==================== BULK ====================

    async bulkDelete() {
        const selectedIds = Array.from(document.querySelectorAll('.contact-checkbox:checked')).map(cb => parseInt(cb.dataset.contactId));
        if (confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) {
            for (const id of selectedIds) {
                await window.NexoGenix.store.deleteContact(id);
            }
            this.renderToDOM();
        }
    }

    bulkReassign() {
        const modal = document.getElementById('bulkReassignModal');
        const ownerGroup = document.getElementById('bulk-reassign-owner-group');
        const allUsers = window.NexoGenix.auth.getAllUsers();

        ownerGroup.innerHTML = `
            <label style="display: block; font-size: 0.75rem; font-weight: 500; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem;">New Owner</label>
            <select id="bulkNewOwnerId" style="width: 100%; padding: 0.85rem; border: 1px solid rgba(226, 232, 240, 0.4); border-radius: 12px; outline: none; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); font-family: inherit;">
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
        const selectedIds = Array.from(document.querySelectorAll('.contact-checkbox:checked')).map(cb => parseInt(cb.dataset.contactId));

        if (selectedIds.length === 0) return;

        const allUsers = window.NexoGenix.auth.getAllUsers();
        const newOwner = allUsers.find(u => u.id === newOwnerId);
        const currentUser = window.NexoGenix.auth.getUser();

        for (const id of selectedIds) {
            const contact = window.NexoGenix.data.contacts.find(c => c.id === id);
            if (contact) {
                const oldOwnerId = contact.ownerId;
                const updatedContact = { ...contact, ownerId: newOwnerId };
                await window.NexoGenix.store.updateContact(id, updatedContact);

                const oldOwner = allUsers.find(u => u.id === oldOwnerId);
                await window.NexoGenix.store.addActivity({
                    contactId: id,
                    type: 'Update',
                    content: `<strong>Owner Reassigned by ${currentUser.name}</strong><br>From: ${oldOwner ? oldOwner.name : 'Unknown'} → To: ${newOwner.name}`,
                    date: new Date().toISOString(),
                    ownerId: currentUser.id
                });
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
        const contacts = this.getFilteredContacts();
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Status'];
        const rows = [headers.join(','), ...contacts.map(c => [c.name, c.email, c.phone, c.company, c.status].join(','))];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contacts.csv';
        a.click();
    }

    triggerImport() {
        document.getElementById('contact-import-input').click();
    }

    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.name.endsWith('.json')) {
            await window.NexoGenix.store.importData(file);
        } else {
            // Simple CSV Import
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target.result;
                const rows = text.split('\n').slice(1); // Skip header
                const currentUser = window.NexoGenix.auth.getUser();

                for (const row of rows) {
                    if (!row.trim()) continue;
                    const [name, email, phone, company, status] = row.split(',').map(s => s.trim());
                    if (name && email) {
                        await window.NexoGenix.store.addContact({
                            name, email, phone, company,
                            status: status || 'New',
                            ownerId: currentUser.id,
                            lifecycle: 'Lead'
                        });
                    }
                }
                alert(`Successfully processed ${rows.length} records.`);
                this.renderToDOM();
            };
            reader.readAsText(file);
        }
    }
}
