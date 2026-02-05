window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.HRMS = class HRMS {
    constructor() {
        this.engagements = window.NexoGenix.data.engagements || [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.filters = {
            search: '',
            status: ''
        };

        this.availableColumns = [
            { id: 'client', label: 'Client / Engagement', always: true },
            { id: 'service', label: 'Service Category' },
            { id: 'timeline', label: 'Start Date' },
            { id: 'status', label: 'Progress Status' },
            { id: 'units', label: 'Resource Units' },
            { id: 'owner', label: 'Project Lead' }
        ];
        this.visibleColumns = ['client', 'service', 'timeline', 'status', 'units', 'owner'];
        this.showAdvancedFilters = false;

        window.NexoGenix.activeHRMSView = this;
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
            status: ''
        };
        this.currentPage = 1;
        this.renderToDOM();
    }

    // ==================== DATA PROCESSING ====================

    getFilteredEngagements() {
        const user = window.NexoGenix.auth.getUser();
        let filtered = [...this.engagements];

        // Role-based filtering
        if (user.role !== 'admin') {
            filtered = filtered.filter(e => e.ownerId === user.id);
        }

        // Search filter
        if (this.filters.search) {
            const s = this.filters.search.toLowerCase();
            filtered = filtered.filter(e =>
                (e.clientName || '').toLowerCase().includes(s) ||
                (e.serviceType || '').toLowerCase().includes(s)
            );
        }

        // Select filters
        if (this.filters.status) filtered = filtered.filter(e => e.status === this.filters.status);

        return filtered;
    }

    // ==================== UI RENDERING ====================

    async renderToDOM() {
        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
        this.updateBulkActions();
        this.setupCompanyAutocomplete();
    }

    updateBulkActions() {
        const selectedCount = document.querySelectorAll('.engagement-checkbox:checked').length;
        const bulkActions = document.getElementById('bulk-actions-overlay');
        if (bulkActions) {
            bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
            const countLabel = document.getElementById('selected-count-label');
            if (countLabel) countLabel.textContent = selectedCount;
        }
    }

    toggleSelectAll(checkbox) {
        document.querySelectorAll('.engagement-checkbox').forEach(cb => cb.checked = checkbox.checked);
        this.updateBulkActions();
    }

    async render() {
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const filtered = this.getFilteredEngagements();
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pagedEngagements = filtered.slice(startIndex, startIndex + this.itemsPerPage);

        return `
            <div class="hrms-workspace" style="padding: 2.5rem; background: #f8fafc; min-height: 100vh; font-family: 'Outfit', sans-serif;">
                
                <!-- Page Header (Contact Page Style) -->
                <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
                    <div>
                        <h1 style="font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.03em;">Workforce Management</h1>
                        <div style="display: flex; align-items: center; gap: 0.6rem; margin-top: 0.4rem;">
                            <span style="font-size: 0.9rem; color: #64748b; font-weight: 500;">Active Projects: <strong>${this.engagements.length}</strong></span>
                            <span style="color: #cbd5e1;">&bull;</span>
                            <span style="font-size: 0.9rem; color: #64748b; font-weight: 500;">Filtered Result: <strong>${totalItems}</strong></span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.85rem;">
                        <button class="action-btn-primary" onclick="window.NexoGenix.activeHRMSView.openModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Plan Engagement
                        </button>
                    </div>
                </header>

                <!-- Search & Filter Bar (Contact Page Style) -->
                <div style="background: white; border-radius: 24px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1.5rem; border: 1px solid #f1f5f9;">
                    <div style="display: flex; gap: 1.25rem; align-items: center;">
                        <div style="position: relative; flex: 1;">
                            <svg style="position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); color: #94a3b8;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search by client or service interest..." value="${this.filters.search}" style="width: 100%; padding: 1rem 1.25rem 1rem 3.5rem; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 1rem; outline: none; transition: all 0.2s; background: #fff;" oninput="window.NexoGenix.activeHRMSView.updateFilter('search', this.value)">
                        </div>
                        
                        <div style="display: flex; gap: 0.75rem;">
                            <button class="filter-toggle-btn ${this.showAdvancedFilters ? 'active' : ''}" onclick="window.NexoGenix.activeHRMSView.toggleAdvancedFilters()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Filters
                            </button>
                            <div class="dropdown-wrap" style="position: relative;">
                                <button class="filter-toggle-btn dropdown-trigger">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                                    Columns
                                </button>
                                <div class="dropdown-panel">
                                    <h4 style="margin: 0 0 1rem 0; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Visible Fields</h4>
                                    ${this.availableColumns.map(col => `
                                        <label style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; font-size: 0.9rem; font-weight: 600; cursor: pointer; color: #334155;">
                                            <input type="checkbox" ${this.visibleColumns.includes(col.id) ? 'checked' : ''} ${col.always ? 'disabled' : ''} onclick="window.NexoGenix.activeHRMSView.toggleColumn('${col.id}')">
                                            ${col.label}
                                        </label>
                                    `).join('')}
                                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 1.5rem 0;">
                                    <h4 style="margin: 0 0 1rem 0; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Display Limit</h4>
                                    <div style="display: flex; gap: 0.5rem;">
                                        ${[50, 100, 200].map(n => `
                                            <button onclick="window.NexoGenix.activeHRMSView.setItemsPerPage(${n})" style="flex: 1; padding: 0.5rem; border: 1px solid ${this.itemsPerPage === n ? '#3b82f6' : '#e2e8f0'}; border-radius: 8px; background: ${this.itemsPerPage === n ? '#eff6ff' : 'white'}; font-size: 0.8rem; font-weight: 800; color: ${this.itemsPerPage === n ? '#3b82f6' : '#64748b'}; cursor: pointer;">${n}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.showAdvancedFilters ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9;">
                            <div class="filter-item">
                                <label>Operational Status</label>
                                <select onchange="window.NexoGenix.activeHRMSView.updateFilter('status', this.value)">
                                    <option value="">All Statuses</option>
                                    <option value="Active" ${this.filters.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="Completed" ${this.filters.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="On Hold" ${this.filters.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                                </select>
                            </div>
                            <div style="display: flex; align-items: flex-end; justify-content: flex-end;">
                                <button onclick="window.NexoGenix.activeHRMSView.clearFilters()" style="background: transparent; border: none; font-size: 0.9rem; font-weight: 800; color: #ef4444; cursor: pointer; padding: 0.75rem;">Reset All Parameters</button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Workforce Table Container -->
                <div style="background: white; border-radius: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.02); overflow: hidden; border: 1px solid #f1f5f9;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="padding: 1.25rem 1.75rem; width: 40px;">
                                        <input type="checkbox" onchange="window.NexoGenix.activeHRMSView.toggleSelectAll(this)">
                                    </th>
                                    ${this.renderTableHeaders()}
                                    <th style="padding: 1.25rem 1.75rem; text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pagedEngagements.map(e => this.renderTableRow(e, allUsers)).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${pagedEngagements.length === 0 ? `
                        <div style="padding: 6rem 2rem; text-align: center;">
                            <div style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.3;">📂</div>
                            <h3 style="margin: 0; color: #0f172a; font-size: 1.5rem; font-weight: 800;">Deployment data unavailable</h3>
                            <p style="color: #64748b; margin-top: 0.75rem; font-size: 1rem;">No engagements match your current organizational filters.</p>
                        </div>
                    ` : ''}

                    <footer style="padding: 1.5rem 2rem; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.9rem; color: #64748b; font-weight: 600;">
                            Viewing <span style="color: #0f172a; font-weight: 800;">${Math.min(startIndex + 1, totalItems)} - ${Math.min(startIndex + this.itemsPerPage, totalItems)}</span> of <span style="color: #0f172a; font-weight: 800;">${totalItems}</span> Deployments
                        </span>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="nav-page-btn" onclick="window.NexoGenix.activeHRMSView.setPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                            ${this.renderPageNumbers(totalPages)}
                            <button class="nav-page-btn" onclick="window.NexoGenix.activeHRMSView.setPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    </footer>
                </div>

                <!-- Bulk Actions Overlay -->
                <div id="bulk-actions-overlay" style="display: none; position: fixed; bottom: 3rem; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px); padding: 0.8rem 2rem; border-radius: 99px; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5); align-items: center; gap: 2rem; z-index: 2000; border: 1px solid rgba(255,255,255,0.15);">
                    <span style="color: white; font-size: 0.95rem; font-weight: 500;"><span id="selected-count-label" style="font-weight: 800; color: #3b82f6;">0</span> Engagements Selected</span>
                    <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.2);"></div>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="window.NexoGenix.activeHRMSView.bulkArchive()" style="background: transparent; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 10px; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Archive</button>
                        ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                            <button onclick="window.NexoGenix.activeHRMSView.bulkDelete()" style="background: transparent; color: #f87171; border: none; padding: 0.6rem 1.25rem; border-radius: 10px; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">Delete Forever</button>
                        ` : ''}
                    </div>
                </div>

                <!-- Engagement Modal (Contact Modal Style) -->
                <div id="engagementModal" class="hrms-modal-overlay" style="display: none;">
                    <div class="hrms-modal-card" style="width: 720px;">
                        <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem;">
                            <div>
                                <h3 id="modal-title" style="margin: 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Deployment Blueprint</h3>
                                <p style="margin: 0.4rem 0 0 0; color: #64748b; font-size: 1rem; font-weight: 500;">Configure your organizational resource engagement.</p>
                            </div>
                            <button onclick="window.NexoGenix.activeHRMSView.closeModal()" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 12px; cursor: pointer; color: #64748b; font-size: 1.25rem; display: flex; align-items: center; justify-content: center;">&times;</button>
                        </header>
                        <form id="engagementForm" onsubmit="window.NexoGenix.activeHRMSView.saveEngagement(event)">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                                <div class="field-box" style="grid-column: span 2; position: relative;">
                                    <label>Client Organization Name *</label>
                                    <input type="text" id="clientNameInput" name="clientName" required placeholder="Type to search companies or enter manually..." autocomplete="off">
                                    <div id="companyAutocomplete" class="autocomplete-panel"></div>
                                </div>
                                <div class="field-box">
                                    <label>Service Interest *</label>
                                    <select name="serviceType" required>
                                        <option value="">Select Domain</option>
                                        ${(window.NexoGenix.data.config?.services || ['IT Support', 'Strategic Consulting', 'Software Development', 'Managed Infrastructure', 'Talent Acquisition', 'BPO Operations']).map(s => `<option value="${s}">${s}</option>`).join('')}
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div class="field-box">
                                    <label>Lifecycle Status *</label>
                                    <select name="status" required>
                                        <option value="Active">Active Operations</option>
                                        <option value="Completed">Project Completed</option>
                                        <option value="On Hold">Strategically Paused</option>
                                    </select>
                                </div>
                                <div class="field-box">
                                    <label>Kickoff Date *</label>
                                    <input type="date" name="startDate" required>
                                </div>
                                <div class="field-box">
                                    <label>Anticipated Closure</label>
                                    <input type="date" name="endDate">
                                </div>
                            </div>

                            <!-- Resource Mapping Section -->
                            <div style="margin-top: 2.5rem; padding-top: 2rem; border-top: 2px dashed #f1f5f9;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                                    <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Resource Mapping</h4>
                                    <button type="button" class="action-btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="window.NexoGenix.activeHRMSView.addResourceRow()">+ Add resources</button>
                                </div>
                                <div id="resources-grid-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
                                    <!-- Dynamic Rows -->
                                </div>
                            </div>

                            <footer style="margin-top: 3rem; display: flex; justify-content: flex-end; gap: 1.25rem;">
                                <button type="button" onclick="window.NexoGenix.activeHRMSView.closeModal()" class="hrms-modal-btn-off">Cancel</button>
                                <button type="submit" id="submit-btn" class="hrms-modal-btn-on">Deploy Engagement</button>
                            </footer>
                        </form>
                    </div>
                </div>

                <style>
                    .action-btn-primary { background: #0f172a; color: white; border: none; padding: 0.85rem 1.75rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: all 0.3s; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2); }
                    .action-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.2); }
                    .action-btn-secondary { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 0.85rem 1.75rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s; }
                    .action-btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }

                    .filter-toggle-btn { background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 0.8rem 1.4rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; transition: all 0.2s; }
                    .filter-toggle-btn.active { background: #0f172a; color: white; border-color: #0f172a; }

                    .filter-item { display: flex; flex-direction: column; gap: 0.6rem; }
                    .filter-item label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
                    .filter-item select { padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; font-weight: 600; outline: none; background: #fff; cursor: pointer; }

                    .hrms-th-cell { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding: 1.25rem 1.75rem; text-align: left; }
                    .hrms-table-row:hover { background: #f8fafc; }
                    .hrms-table-row td { border-bottom: 1px solid #f1f5f9; padding: 1.25rem 1.75rem; }

                    .hrms-status-pill { padding: 0.45rem 1rem; border-radius: 12px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
                    
                    .nav-page-btn { background: white; border: 1px solid #e2e8f0; padding: 0.6rem 1.25rem; border-radius: 12px; font-size: 0.9rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; }
                    .nav-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                    .page-bullet { width: 38px; height: 38px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.2s; }
                    .page-bullet.active { background: #0f172a; color: white; border-color: #0f172a; scale: 1.05; }

                    .dropdown-panel { display: none; position: absolute; right: 0; top: 100%; margin-top: 0.75rem; background: white; border-radius: 20px; padding: 1.5rem; box-shadow: 0 20px 50px -12px rgba(0,0,0,0.15); border: 1px solid #f1f5f9; min-width: 240px; z-index: 100; }
                    .dropdown-wrap:hover .dropdown-panel { display: block; animation: panelFade 0.2s ease-out; }

                    .hrms-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(12px); background: rgba(15, 23, 42, 0.4); z-index: 4000; align-items: center; justify-content: center; display: flex; }
                    .hrms-modal-card { background: white; border-radius: 32px; padding: 3rem; max-height: 90vh; overflow-y: auto; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.4); animation: cardSnap 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                    .field-box { display: flex; flex-direction: column; gap: 0.6rem; }
                    .field-box label { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                    .field-box input, .field-box select { padding: 1rem 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 1rem; font-weight: 600; outline: none; transition: all 0.2s; }
                    .field-box input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
                    .hrms-modal-btn-on { background: #0f172a; color: white; border: none; padding: 1rem 2.5rem; border-radius: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; font-size: 1rem; }
                    .hrms-modal-btn-on:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2); }
                    .hrms-modal-btn-off { background: #f1f5f9; color: #475569; border: none; padding: 1rem 2.5rem; border-radius: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 1rem; }

                    .autocomplete-panel { position: absolute; top: 100%; left: 0; width: 100%; max-height: 200px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 50; overflow-y: auto; display: none; }
                    .autocomplete-item { padding: 0.75rem 1.25rem; cursor: pointer; font-weight: 600; transition: background 0.2s; color: #0f172a; }
                    .autocomplete-item:hover { background: #f8fafc; }

                    @keyframes panelFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes cardSnap { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                </style>
            </div>
        `;
    }

    renderTableHeaders() {
        return this.visibleColumns.map(colId => {
            const col = this.availableColumns.find(c => c.id === colId);
            return `<th class="hrms-th-cell">${col.label}</th>`;
        }).join('');
    }

    renderTableRow(e, allUsers) {
        const owner = allUsers.find(u => u.id === e.ownerId);
        const statusColors = {
            'Active': { bg: '#eff6ff', text: '#3b82f6' },
            'Completed': { bg: '#f0fdf4', text: '#16a34a' },
            'On Hold': { bg: '#fff7ed', text: '#ea580c' }
        };
        const st = statusColors[e.status] || { bg: '#f1f5f9', text: '#475569' };

        return `
            <tr class="hrms-table-row">
                <td style="text-align: center;">
                    <input type="checkbox" class="engagement-checkbox" data-id="${e.id}" onchange="window.NexoGenix.activeHRMSView.updateBulkActions()">
                </td>
                ${this.visibleColumns.map(colId => {
            switch (colId) {
                case 'client':
                    const company = (window.NexoGenix.data.companies || []).find(c => (c.name || '').toLowerCase() === (e.clientName || '').toLowerCase());
                    const link = company ? `#company/${company.id}` : `#engagement/${e.id}`;
                    return `
                                <td>
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div style="width: 44px; height: 44px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0f172a; font-size: 1.1rem;">${(e.clientName || 'C').charAt(0)}</div>
                                        <div>
                                            <a href="${link}" style="color: #0f172a; font-weight: 800; text-decoration: none; font-size: 1.05rem; display: block;">${e.clientName}</a>
                                            <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; margin-top: 0.1rem;">DEPLOYMENT ID: ${e.id}</div>
                                        </div>
                                    </div>
                                </td>
                            `;
                case 'service':
                    return `<td><span style="font-size: 0.95rem; font-weight: 700; color: #475569;">${e.serviceType}</span></td>`;
                case 'timeline':
                    return `<td><div style="font-size: 0.95rem; font-weight: 700; color: #64748b;">${new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>`;
                case 'status':
                    return `<td><span class="hrms-status-pill" style="background: ${st.bg}; color: ${st.text};">${e.status}</span></td>`;
                case 'units':
                    return `<td><div style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${(e.resources || []).length} Intelligence Units</div></td>`;
                case 'owner':
                    return `
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.95rem; font-weight: 700; color: #475569;">
                                        <div style="width: 24px; height: 24px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; color: #3b82f6;">${owner ? owner.name.charAt(0) : '?'}</div>
                                        ${owner ? owner.name : 'Unassigned'}
                                    </div>
                                </td>
                            `;
            }
        }).join('')}
                <td style="text-align: right; padding: 1.25rem 1.75rem;">
                    <button onclick="window.NexoGenix.activeHRMSView.openModal(${e.id})" style="background: transparent; border: 1px solid #e2e8f0; cursor: pointer; color: #94a3b8; padding: 0.5rem; border-radius: 10px; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'; this.style.color='#0f172a'" onmouseout="this.style.background='transparent'; this.style.color='#94a3b8'" title="Edit"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg></button>
                    ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                        <button onclick="window.NexoGenix.activeHRMSView.deleteEngagement(${e.id})" style="background: transparent; border: 1px solid #fecdd3; cursor: pointer; color: #fca5a5; padding: 0.5rem; border-radius: 10px; transition: all 0.2s; margin-left: 0.5rem;" onmouseover="this.style.background='#fff1f2'; this.style.color='#ef4444'" onmouseout="this.style.background='transparent'; this.style.color='#fca5a5'" title="Decommission"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    renderPageNumbers(totalPages) {
        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(`<button class="page-bullet ${this.currentPage === i ? 'active' : ''}" onclick="window.NexoGenix.activeHRMSView.setPage(${i})">${i}</button>`);
        }
        return pages.join('');
    }

    // ==================== AUTOCOMPLETE ====================

    setupCompanyAutocomplete() {
        const input = document.getElementById('clientNameInput');
        const panel = document.getElementById('companyAutocomplete');
        if (!input || !panel) return;

        input.addEventListener('input', () => {
            const val = input.value.toLowerCase();
            if (!val) {
                panel.style.display = 'none';
                return;
            }

            const companies = window.NexoGenix.data.companies || [];
            const matches = companies.filter(c => (c.name || '').toLowerCase().includes(val)).slice(0, 5);

            if (matches.length > 0) {
                panel.innerHTML = matches.map(c => `<div class="autocomplete-item" onclick="window.NexoGenix.activeHRMSView.selectCompany('${c.name.replace(/'/g, "\\'")}')">${c.name}</div>`).join('');
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target !== input) panel.style.display = 'none';
        });
    }

    selectCompany(name) {
        const input = document.getElementById('clientNameInput');
        const panel = document.getElementById('companyAutocomplete');
        if (input) input.value = name;
        if (panel) panel.style.display = 'none';
    }

    // ==================== MODALS & CRUD ====================

    openModal(id = null) {
        const modal = document.getElementById('engagementModal');
        const form = document.getElementById('engagementForm');
        const title = document.getElementById('modal-title');
        const submitBtn = document.getElementById('submit-btn');

        form.reset();
        document.getElementById('resources-grid-container').innerHTML = '';

        if (id) {
            const e = this.engagements.find(e => e.id === id);
            form.dataset.editId = id;
            title.textContent = "Modify Engagement";
            submitBtn.textContent = "Save Changes";

            form.elements.clientName.value = e.clientName;
            form.elements.serviceType.value = e.serviceType;
            form.elements.status.value = e.status;
            form.elements.startDate.value = e.startDate;
            form.elements.endDate.value = e.endDate || '';

            (e.resources || []).forEach(r => this.addResourceRow(r));
        } else {
            delete form.dataset.editId;
            title.textContent = "Deployment Blueprint";
            submitBtn.textContent = "Deploy Engagement";
            this.addResourceRow();
        }

        modal.style.display = 'flex';
        this.setupCompanyAutocomplete();
    }

    closeModal() {
        document.getElementById('engagementModal').style.display = 'none';
    }

    addResourceRow(r = null) {
        const container = document.getElementById('resources-grid-container');
        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '1fr 1fr 140px 40px';
        div.style.gap = '0.75rem';
        div.style.alignItems = 'center';

        const vendorOptions = (window.NexoGenix.data.config?.vendors || ['AWS', 'Freelance Dev', 'External Agency']).map(v =>
            `<option value="${v}" ${r && r.name === v ? 'selected' : ''}>${v}</option>`
        ).join('');

        div.innerHTML = `
            <select name="rName" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; font-size: 0.9rem; background: #fff;">
                <option value="">Select Resource/Vendor</option>
                ${vendorOptions}
                <option value="custom" ${r && !window.NexoGenix.data.config?.vendors?.includes(r.name) ? 'selected' : ''}>+ Custom Unit</option>
            </select>
            <input type="text" name="rRole" value="${r ? r.role : ''}" placeholder="Mission Role" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; font-size: 0.9rem;">
            <select name="rType" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 600; font-size: 0.9rem; background: #fff;">
                <option value="resource" ${r && r.type === 'resource' ? 'selected' : ''}>Internal Resource</option>
                <option value="vendor" ${r && r.type === 'vendor' ? 'selected' : ''}>External Vendor</option>
            </select>
            <button type="button" onclick="this.parentElement.remove()" style="background: #fee2e2; border: none; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; color: #ef4444; font-weight: 900; font-size: 1.25rem; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;
        container.appendChild(div);

        // Handle custom unit entry (simplified for now: if they select custom, they can use the role field or we could add a swap logic)
        // For a more robust UI, we'd swap select for input if 'custom' is picked.
    }

    async saveEngagement(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const rNames = Array.from(form.querySelectorAll('select[name="rName"]')).map(i => i.value);
        const rRoles = Array.from(form.querySelectorAll('input[name="rRole"]')).map(i => i.value);
        const rTypes = Array.from(form.querySelectorAll('select[name="rType"]')).map(i => i.value);

        const resources = rNames.map((n, i) => ({
            id: Date.now() + i,
            name: n,
            role: rRoles[i],
            type: rTypes[i]
        })).filter(r => r.name && r.name !== 'custom');

        const data = {
            clientName: formData.get('clientName'),
            serviceType: formData.get('serviceType'),
            status: formData.get('status'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate') || null,
            resources: resources,
            ownerId: window.NexoGenix.auth.getUser().id
        };

        if (form.dataset.editId) {
            const id = parseInt(form.dataset.editId);
            const idx = this.engagements.findIndex(e => e.id === id);
            const updated = { ...this.engagements[idx], ...data };
            this.engagements[idx] = updated;
            await window.NexoGenix.store.updateEngagement(id, updated);

            // Log Activity
            const activity = {
                id: Date.now(),
                engagementId: id,
                type: 'Note',
                content: 'Deployment parameters updated by management.',
                date: new Date().toISOString()
            };
            window.NexoGenix.data.hrmsActivities.push(activity);
            await window.NexoGenix.store.addActivity(activity);
        } else {
            const newId = Date.now();
            const newEngagement = { id: newId, ...data };
            this.engagements.unshift(newEngagement);
            await window.NexoGenix.store.addEngagement(newEngagement);

            // Log Activity
            const activity = {
                id: Date.now(),
                engagementId: newId,
                type: 'Milestone',
                content: `Account "${data.clientName}" officially deployed.`,
                date: new Date().toISOString()
            };
            window.NexoGenix.data.hrmsActivities.push(activity);
            await window.NexoGenix.store.addActivity(activity);
        }

        // --- SYNCHRONIZATION WITH COMPANY & CONTACTS ---
        const company = (window.NexoGenix.data.companies || []).find(c => (c.name || '').toLowerCase() === (data.clientName || '').toLowerCase());
        if (company) {
            const resourceSummary = resources.map(r => r.name).join(', ');
            company.assignedResource = resourceSummary;

            // Sync with associated contacts
            (window.NexoGenix.data.contacts || []).forEach(contact => {
                if (contact.company === company.name) {
                    contact.assignedResource = resourceSummary;
                }
            });

            // Log activity in Company Feed
            window.NexoGenix.data.activities.push({
                id: Date.now() + 999,
                companyId: company.id,
                type: 'Update',
                content: `<strong>Resources Deployed via HRM</strong><br>The following units have been assigned to this account:<br>${resources.map(r => `• ${r.name} (${r.role})`).join('<br>')}`,
                date: new Date().toISOString(),
                ownerId: window.NexoGenix.auth.getUser().id,
                completed: false,
                isTask: false
            });

            window.NexoGenix.store.save();
        }

        this.closeModal();
        this.renderToDOM();
    }

    async deleteEngagement(id) {
        if (!confirm('Permanently decommission this engagement and all associated intel?')) return;
        this.engagements = this.engagements.filter(e => e.id !== id);
        window.NexoGenix.data.engagements = this.engagements;
        window.NexoGenix.data.hrmsActivities = (window.NexoGenix.data.hrmsActivities || []).filter(a => a.engagementId !== id);
        await window.NexoGenix.store.deleteEngagement(id);
        this.renderToDOM();
    }

    async bulkDelete() {
        const selectedIds = Array.from(document.querySelectorAll('.engagement-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
        if (confirm(`Decommission ${selectedIds.length} deployments? This action is IRREVERSIBLE.`)) {
            for (const id of selectedIds) {
                await window.NexoGenix.store.deleteEngagement(id);
            }
            this.engagements = this.engagements.filter(e => !selectedIds.includes(e.id));
            window.NexoGenix.data.engagements = this.engagements;
            this.renderToDOM();
        }
    }

    bulkArchive() {
        const selectedIds = Array.from(document.querySelectorAll('.engagement-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
        this.engagements.forEach(e => {
            if (selectedIds.includes(e.id)) e.status = 'Completed';
        });
        window.NexoGenix.store.save();
        this.renderToDOM();
    }
}
