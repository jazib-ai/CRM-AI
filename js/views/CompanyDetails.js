window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.CompanyDetails = class CompanyDetails {
    constructor(id) {
        this.companyId = Number(id);

        if (!window.NexoGenix.data.companies) window.NexoGenix.data.companies = [];
        this.company = window.NexoGenix.data.companies.find(c => Number(c.id) === this.companyId);

        // If not found in master records, check virtual sources (Contacts)
        if (!this.company && this.companyId < 0) {
            const allContacts = window.NexoGenix.data.contacts || [];
            const contactSource = allContacts.find(c => {
                let str = c.company;
                if (!str) return false;
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return (Math.abs(hash) * -1) === this.companyId;
            });

            if (contactSource) {
                this.company = {
                    id: this.companyId,
                    name: contactSource.company,
                    website: contactSource.website || '--',
                    size: contactSource.companySize || '--',
                    isVirtual: true,
                    ownerId: contactSource.ownerId || null
                };
            }
        }

        if (!this.company) {
            this.company = {
                id: this.companyId,
                name: 'Unknown Institution',
                website: '--',
                isVirtual: true
            };
        }

        this.currentFilter = 'All';
        this.activeCreatorTab = 'Notes';
        window.NexoGenix.activeCompanyDetails = this;

        if (!window.NexoGenix.data.activities) window.NexoGenix.data.activities = [];
        if (!window.NexoGenix.data.deals) window.NexoGenix.data.deals = [];

        this.allFields = [
            { id: 'name', label: 'Company Name', type: 'text' },
            { id: 'website', label: 'Website', type: 'text' },
            { id: 'email', label: 'Email Address', type: 'email' },
            { id: 'phone', label: 'Phone Number', type: 'text' },
            { id: 'callingTaskDate', label: 'Calling Task Date', type: 'date' },
            { id: 'followUp', label: 'Follow-up Date', type: 'date' },
            { id: 'companySize', label: 'Company Size', type: 'select', options: ['', '1-10', '10-50', '50-100', '100-200', '200-500', '500+'] },
            { id: 'service', label: 'Service Interest', type: 'select', options: ['', ...(window.NexoGenix.data.config?.services || [])] },
            { id: 'lifecycle', label: 'Life Cycle Stage', type: 'select', options: ['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist', 'Other'] },
            { id: 'status', label: 'Lead Status', type: 'select', options: ['New', 'Attempted to Contact', 'Connected', 'Meeting Scheduled', 'Qualified', 'Open Deal', 'Unqualified', 'Closed Lost'] },
            { id: 'assignedResource', label: 'Assigned Resource', type: 'select', options: ['', ...(window.NexoGenix.data.config?.vendors || [])] },
            { id: 'ownerId', label: 'Company Owner', type: 'owner_select' }
        ];

        if (!this.company.propertyOrder) {
            this.company.propertyOrder = this.allFields.map(f => f.id);
        }
    }

    async renderToDOM() {
        const html = await this.render();
        document.getElementById('router-view').innerHTML = html;
        this.afterRender();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.renderActivities();
    }

    setCreatorTab(tabName) {
        this.activeCreatorTab = tabName;
        const container = document.getElementById('creator-form-container');
        if (!container) return;

        document.querySelectorAll('.tab').forEach(tab => {
            if (tab.textContent === (tabName === 'Notes' ? 'Note' : tabName)) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        const inputStyle = `width: 100%; border: 1px solid rgba(226, 232, 240, 0.4); border-radius: 12px; padding: 0.85rem; font-family: inherit; font-size: 0.9rem; outline: none; background: rgba(255,255,255,0.8);`;

        if (tabName === 'Notes') {
            container.innerHTML = `
                <form onsubmit="window.NexoGenix.activeCompanyDetails.handleNoteSubmit(event)">
                    <textarea name="note" style="${inputStyle} min-height: 120px;" placeholder="Capture institutional intelligence..."></textarea>
                    <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                        <button type="submit" class="modal-btn-primary" style="padding: 0.6rem 1.5rem; font-size: 0.85rem;">Save Note</button>
                    </div>
                </form>
            `;
        } else if (tabName === 'Tasks') {
            container.innerHTML = `
                <form onsubmit="window.NexoGenix.activeCompanyDetails.handleTaskSubmit(event)">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <input type="text" name="taskName" placeholder="Task objective..." style="${inputStyle}" required>
                        <input type="date" name="dueDate" style="${inputStyle}" required>
                    </div>
                    <textarea name="desc" style="${inputStyle} min-height: 80px;" placeholder="Additional context..."></textarea>
                    <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                        <button type="submit" class="modal-btn-primary" style="padding: 0.6rem 1.5rem; font-size: 0.85rem;">Create Task</button>
                    </div>
                </form>
            `;
        }
    }

    getActivities() {
        const companyName = this.company.name;
        const companyContacts = (window.NexoGenix.data.contacts || []).filter(c => c.company === companyName);
        const contactIds = companyContacts.map(c => c.id);

        let activities = (window.NexoGenix.data.activities || []).map(a => {
            if (a.contactId && contactIds.includes(a.contactId)) {
                const contact = companyContacts.find(c => c.id === a.contactId);
                return { ...a, contactName: contact ? contact.name : null };
            }
            return a;
        }).filter(a =>
            a.companyId === this.companyId || (a.contactId && contactIds.includes(a.contactId))
        );

        if (this.currentFilter !== 'All') {
            activities = activities.filter(a => a.type === this.currentFilter);
        }
        return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async addActivity(type, content, isTask = false) {
        const newActivity = {
            id: Date.now(),
            companyId: this.companyId,
            type: type,
            content: content,
            date: new Date().toISOString(),
            ownerId: window.NexoGenix.auth.getUser().id,
            completed: false,
            isTask: isTask,
            comments: []
        };

        window.NexoGenix.data.activities.push(newActivity);
        await window.NexoGenix.store.addActivity(newActivity);
        this.renderActivities();
    }

    async handleNoteSubmit(event) {
        event.preventDefault();
        const content = event.target.note.value;
        if (!content) return;
        await this.addActivity('Note', content);
        event.target.reset();
    }

    async handleTaskSubmit(event) {
        event.preventDefault();
        const name = event.target.taskName.value;
        const date = event.target.dueDate.value;
        const desc = event.target.desc.value;
        if (!name) return;
        await this.addActivity('Task', `<strong>Task: ${name}</strong><br>Due: ${date}<br>${desc}`, true);
        event.target.reset();
    }

    async saveCompanyProperties() {
        const form = document.getElementById('company-properties-form');
        if (!form) return;

        const formData = new FormData(form);
        const updates = {};
        const changes = [];
        const dateFields = ['callingTaskDate', 'followUp'];
        const dateChanges = [];
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const currentUser = window.NexoGenix.auth.getUser();

        this.allFields.forEach(field => {
            let newVal = formData.get(field.id);
            let oldVal = this.company[field.id];

            // Normalize for comparison
            let compareOld = (oldVal === undefined || oldVal === null) ? '' : oldVal.toString();
            let compareNew = (newVal === undefined || newVal === null) ? '' : newVal.toString();

            if (field.type === 'owner_select') {
                newVal = parseInt(newVal);
                compareNew = newVal.toString();
            }

            if (compareNew !== compareOld) {
                updates[field.id] = (field.id === 'ownerId') ? newVal : newVal;

                let logMsg = '';
                if (field.id === 'ownerId') {
                    const oldOwner = allUsers.find(u => u.id === parseInt(compareOld));
                    const newOwner = allUsers.find(u => u.id === parseInt(compareNew));
                    logMsg = `<strong>Owner Reassigned</strong><br>From: ${oldOwner ? oldOwner.name : 'Unassigned'} → To: ${newOwner ? newOwner.name : 'Unknown'}`;
                } else {
                    logMsg = `${field.label}: ${compareOld || 'None'} → ${compareNew || 'None'}`;
                }
                changes.push(logMsg);

                if (dateFields.includes(field.id) && compareNew) {
                    dateChanges.push({ label: field.label, val: compareNew });
                }
            }
        });

        if (changes.length > 0) {
            const oldName = this.company.name;
            const newName = updates.name || oldName;

            if (this.company.isVirtual) {
                // Promote virtual company to master record
                const newId = Date.now();
                const newCompany = {
                    ...this.company,
                    ...updates,
                    id: newId,
                    name: newName
                };
                delete newCompany.isVirtual;
                window.NexoGenix.data.companies.push(newCompany);

                this.company = newCompany;
                this.companyId = newId;

                // Propagate name change to associated contacts
                if (newName !== oldName) {
                    window.NexoGenix.data.contacts.forEach(c => {
                        if (c.company === oldName) c.company = newName;
                    });
                }

                // Update URL to match new master ID
                window.location.hash = `#company/${newId}`;
                await window.NexoGenix.store.addCompany(newCompany);
            } else {
                Object.assign(this.company, updates);

                // Propagate name change to contacts for master record too
                if (newName !== oldName) {
                    window.NexoGenix.data.contacts.forEach(c => {
                        if (c.company === oldName) c.company = newName;
                    });
                }
                await window.NexoGenix.store.updateCompany(this.companyId, this.company);
            }

            // Log general updates
            const nonDateNonOwnerChanges = changes.filter(c => !c.includes('Owner Reassigned') && !dateChanges.some(dc => c.startsWith(dc.label)));
            if (nonDateNonOwnerChanges.length > 0) {
                await this.addActivity('Update', `<strong>Profile Modified by ${currentUser.name}</strong><br>${nonDateNonOwnerChanges.join('<br>')}`);
            }

            // Log specific reassignments
            const ownerChanges = changes.filter(c => c.includes('Owner Reassigned'));
            for (const oc of ownerChanges) {
                await this.addActivity('Update', oc);
            }

            // Log date tasks
            for (const dc of dateChanges) {
                await this.addActivity('Task', `<strong>${dc.label} Scheduled</strong><br>Execution Date: ${dc.val}`, true);
            }

            // --- SYNC ASSIGNED RESOURCE TO CONTACTS ---
            if (updates.assignedResource !== undefined) {
                const resVal = updates.assignedResource;
                (window.NexoGenix.data.contacts || []).forEach(c => {
                    if (c.company === this.company.name) c.assignedResource = resVal;
                });
            }

            alert('Enterprise profile updated and persistent.');
            this.renderToDOM();
        } else {
            alert('No adjustments detected.');
        }
    }

    async updateTaskStatus(id, completed) {
        const activity = window.NexoGenix.data.activities.find(a => a.id === id);
        if (activity) {
            activity.completed = completed;
            await window.NexoGenix.store.updateActivity(id, activity);
            this.renderActivities();
        }
    }

    async addCommentToTask(id) {
        const comment = prompt("Enter your comment:");
        if (!comment) return;

        const activity = window.NexoGenix.data.activities.find(a => a.id === id);
        if (activity) {
            if (!activity.comments) activity.comments = [];
            activity.comments.push({
                text: comment,
                user: window.NexoGenix.auth.getUser().name,
                date: new Date().toISOString()
            });
            await window.NexoGenix.store.updateActivity(id, activity);
            this.renderActivities();
        }
    }

    handleDragStart(e) {
        const draggingElement = e.target.closest('.draggable-field');
        if (draggingElement) {
            draggingElement.classList.add('dragging');
            e.dataTransfer.setData('fieldId', draggingElement.dataset.id);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        const target = e.target.closest('.draggable-field');
        if (target && target !== draggingElement) {
            const bounding = target.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) target.after(draggingElement);
            else target.before(draggingElement);
        }
    }

    handleDragEnd(e) {
        const draggingElement = document.querySelector('.dragging');
        if (draggingElement) draggingElement.classList.remove('dragging');
        const fields = Array.from(document.querySelectorAll('.draggable-field'));
        this.company.propertyOrder = fields.map(f => f.dataset.id);
        window.NexoGenix.store.save();
    }

    // ==================== RESOURCE MANAGEMENT ====================

    toggleResourceSearch() {
        const dropdown = document.getElementById('resource-dropdown-list');
        if (dropdown) {
            const isOpening = dropdown.style.display === 'none';
            dropdown.style.display = isOpening ? 'block' : 'none';
            if (isOpening) {
                this.tempResource = this.company.assignedResource || '';
                this.updateResourceUI();
            }
        }
    }

    updateResourceUI() {
        const div = document.getElementById('resource-dropdown-list');
        if (!div) return;
        const options = div.querySelectorAll('.resource-opt');
        options.forEach(opt => {
            const val = opt.dataset.value;
            if (val === this.tempResource) {
                opt.style.background = '#eff6ff';
                opt.style.color = '#3b82f6';
                opt.style.fontWeight = '700';
            } else {
                opt.style.background = 'white';
                opt.style.color = '#1e293b';
                opt.style.fontWeight = '500';
            }
        });
    }

    filterResources() {
        const input = document.getElementById('resource-search-input');
        const filter = input.value.toUpperCase();
        const div = document.getElementById('resource-dropdown-list');
        const optionsContainer = div.querySelector('div[style*="overflow-y: auto"]');
        const options = optionsContainer.getElementsByTagName('div');
        for (let i = 0; i < options.length; i++) {
            const txtValue = options[i].textContent || options[i].innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                options[i].style.display = "";
            } else {
                options[i].style.display = "none";
            }
        }
    }

    selectResource(val) {
        this.tempResource = val;
        this.updateResourceUI();
    }

    async confirmResourceAssignment() {
        const oldVal = this.company.assignedResource || 'Unassigned';
        const newVal = this.tempResource;

        if (oldVal === (newVal || 'Unassigned')) {
            this.toggleResourceSearch();
            return;
        }

        this.company.assignedResource = newVal;

        // --- SYNC TO CONTACTS ---
        (window.NexoGenix.data.contacts || []).forEach(c => {
            if (c.company === this.company.name) c.assignedResource = newVal;
        });

        const user = window.NexoGenix.auth.getUser();
        await this.addActivity('Update', `<strong>Resource Assigned</strong><br>By: ${user.name}<br>From: ${oldVal} → To: ${newVal || 'Unassigned'}`);

        await window.NexoGenix.store.updateCompany(this.companyId, this.company);
        this.renderToDOM();
    }

    // ==================== DEALS MANAGEMENT ====================

    openAddDealModal(dealId = null) {
        const modal = document.getElementById('addDealModal');
        const form = modal.querySelector('form');
        const titleEl = modal.querySelector('h3');
        const submitBtn = modal.querySelector('button[type="submit"]');

        if (dealId) {
            const deal = window.NexoGenix.data.deals.find(d => d.id === dealId);
            if (!deal) return;
            form.dataset.editId = dealId;
            titleEl.textContent = 'Edit Deal';
            submitBtn.textContent = 'Update Deal';
            form.title.value = deal.title;
            form.value.value = deal.value;
            form.probability.value = parseInt(deal.probability);
            form.stage.value = deal.stage;
            form.closeDate.value = deal.closeDate || '';
        } else {
            form.reset();
            delete form.dataset.editId;
            titleEl.textContent = 'Create New Deal';
            submitBtn.textContent = 'Create Deal';
        }

        if (modal) modal.style.display = 'flex';
    }

    closeAddDealModal() {
        const modal = document.getElementById('addDealModal');
        if (modal) modal.style.display = 'none';
    }

    async saveDeal(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const dealData = Object.fromEntries(formData.entries());
        const currentUser = window.NexoGenix.auth.getUser();
        const editId = form.dataset.editId ? parseInt(form.dataset.editId) : null;

        if (editId) {
            const index = window.NexoGenix.data.deals.findIndex(d => d.id === editId);
            if (index !== -1) {
                const oldDeal = { ...window.NexoGenix.data.deals[index] };
                const updatedDeal = {
                    ...oldDeal,
                    title: dealData.title,
                    value: Number(dealData.value),
                    stage: dealData.stage,
                    probability: dealData.probability + '%',
                    closeDate: dealData.closeDate
                };
                window.NexoGenix.data.deals[index] = updatedDeal;
                const changes = [];
                if (oldDeal.title !== updatedDeal.title) changes.push(`Title: ${oldDeal.title} → ${updatedDeal.title}`);
                if (oldDeal.value !== updatedDeal.value) changes.push(`Value: $${oldDeal.value} → $${updatedDeal.value}`);
                if (oldDeal.stage !== updatedDeal.stage) changes.push(`Stage: ${oldDeal.stage} → ${updatedDeal.stage}`);
                if (changes.length > 0) {
                    await this.addActivity('Update', `<strong>Deal Modified: ${updatedDeal.title}</strong><br>${changes.join('<br>')}`);
                }
                await window.NexoGenix.store.updateDeal(editId, updatedDeal);
            }
        } else {
            const newDeal = {
                id: Date.now(),
                ownerId: currentUser.id,
                title: dealData.title,
                value: Number(dealData.value),
                stage: dealData.stage,
                probability: dealData.probability + '%',
                company: this.company.name,
                closeDate: dealData.closeDate
            };
            window.NexoGenix.data.deals.push(newDeal);
            await this.addActivity('Update', `<strong>New Deal Indexing</strong><br>Title: ${newDeal.title}<br>Value: $${newDeal.value.toLocaleString()}<br>Stage: ${newDeal.stage}`);
            await window.NexoGenix.store.addDeal(newDeal);
        }

        this.closeAddDealModal();
        this.renderToDOM();
    }

    async deleteDeal(dealId) {
        if (confirm('Permanently delete this deal?')) {
            const deal = window.NexoGenix.data.deals.find(d => d.id === dealId);
            window.NexoGenix.data.deals = window.NexoGenix.data.deals.filter(d => d.id !== dealId);
            await this.addActivity('Update', `<strong>Deal Expunged</strong><br>Title: ${deal ? deal.title : 'N/A'}`);
            await window.NexoGenix.store.deleteDeal(dealId);
            this.renderToDOM();
        }
    }

    renderActivities() {
        const list = document.getElementById('activity-timeline');
        if (!list) return;
        const activities = this.getActivities();
        const allUsers = window.NexoGenix.auth.getAllUsers();

        if (activities.length === 0) {
            list.innerHTML = `<div style="text-align: center; padding: 4rem 2rem; color: #94a3b8; font-weight: 400;">No engagement history recorded.</div>`;
            return;
        }

        list.innerHTML = activities.map(a => {
            const author = allUsers.find(u => u.id === a.ownerId);
            return `
                <div style="padding: 1.25rem; border: 1px solid rgba(226, 232, 240, 0.4); border-radius: 16px; margin-bottom: 1.25rem; background: rgba(255,255,255,0.4); position: relative; backdrop-filter: blur(4px);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; align-items: center;">
                        <span style="font-size: 0.7rem; font-weight: 700; color: ${a.isTask ? '#ef4444' : '#3b82f6'}; text-transform: uppercase; letter-spacing: 0.05em;">${a.type}</span>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            ${a.contactName ? `<span style="font-size: 0.65rem; font-weight: 500; background: rgba(59, 130, 246, 0.08); color: #3b82f6; padding: 2px 8px; border-radius: 100px; border: 1px solid rgba(59, 130, 246, 0.15);">👤 ${a.contactName}</span>` : ''}
                            <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">${new Date(a.date).toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="font-size: 0.95rem; color: #1e293b; font-weight: 400; line-height: 1.5; ${a.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${a.content}</div>
                    
                    ${a.comments && a.comments.length > 0 ? `
                        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed rgba(226, 232, 240, 0.6);">
                            ${a.comments.map(c => `
                                <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem; font-weight: 400;">
                                    <strong>${c.user}:</strong> ${c.text} <span style="font-size: 0.7rem; color: #cbd5e1; font-weight: 400;">(${new Date(c.date).toLocaleTimeString()})</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
 
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center;">
                        <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 400;">Logged by ${author ? author.name : 'System'}</span>
                        <div style="flex: 1;"></div>
                        ${a.isTask && !a.completed ? `
                            <button onclick="window.NexoGenix.activeCompanyDetails.addCommentToTask(${a.id})" style="font-size: 0.7rem; padding: 0.35rem 0.85rem; border: 1px solid rgba(226, 232, 240, 0.4); border-radius: 8px; background: white; cursor: pointer; font-weight: 500;">Comment</button>
                            <button onclick="window.NexoGenix.activeCompanyDetails.updateTaskStatus(${a.id}, true)" style="font-size: 0.7rem; padding: 0.35rem 0.85rem; border: none; border-radius: 8px; background: #0f172a; color: white; cursor: pointer; font-weight: 500;">Resolve</button>
                        ` : ''}
                        ${a.isTask && a.completed ? `
                             <button onclick="window.NexoGenix.activeCompanyDetails.updateTaskStatus(${a.id}, false)" style="font-size: 0.7rem; padding: 0.35rem 0.85rem; border: 1px solid rgba(226, 232, 240, 0.4); border-radius: 8px; background: white; cursor: pointer; font-weight: 500;">Reopen</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async render() {
        if (!this.company) return `<div>Institution Not Found</div>`;
        const allUsers = window.NexoGenix.auth.getAllUsers();
        const glassStyle = "backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);";

        const orderedFieldIds = this.company.propertyOrder || this.allFields.map(f => f.id);
        const sortedFields = orderedFieldIds.map(id => this.allFields.find(f => f.id === id)).filter(Boolean);
        const associatedContacts = window.NexoGenix.data.contacts.filter(c => c.company === this.company.name);
        const associatedDeals = (window.NexoGenix.data.deals || []).filter(d => d.company === this.company.name);

        return `
            <div class="company-details-view" style="display: grid; grid-template-columns: 350px 1fr 300px; gap: 2rem; padding: 2rem; min-height: 100vh; font-family: 'Inter', sans-serif;">
                
                <!-- Left side: Company Properties -->
                <aside style="display: flex; flex-direction: column; gap: 2rem;">
                    <div style="${glassStyle} padding: 0; overflow: hidden; margin-bottom: 1.5rem;">
                        <div style="height: 100px; background: linear-gradient(135deg, #0f172a, #1e293b); display: flex; align-items: center; justify-content: center; position: relative;">
                            <div style="width: 60px; height: 60px; background: white; color: #0f172a; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; box-shadow: 0 10px 20px rgba(0,0,0,0.2); z-index: 1;">
                                ${this.company.name.charAt(0)}
                            </div>
                            <div style="position: absolute; bottom: -10px; right: 20px; width: 30px; height: 30px; background: #3b82f6; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7M4 21V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v17"></path></svg>
                            </div>
                        </div>
                        <div style="padding: 1.5rem; text-align: center;">
                            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a;">${this.company.name}</h3>
                            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">Enterprise Account</p>
                        </div>
                    </div>

                    <div style="${glassStyle}">
                        <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Enterprise Profile</h3>
                        <p style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 1.5rem;">(Drag handles to reorder properties)</p>
                        <form id="company-properties-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <div id="draggable-props-container" style="display: flex; flex-direction: column; gap: 1rem;">
                                ${sortedFields.map(field => `
                                    <div class="draggable-field" draggable="true" data-id="${field.id}" style="padding: 0.5rem; border-radius: 8px; background: rgba(255,255,255,0.3); border: 1px dashed transparent; cursor: grab; transition: all 0.2s;">
                                        <div class="field">
                                            <label class="label" style="display: flex; align-items: center; gap: 0.5rem;">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: #cbd5e1;"><circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle></svg>
                                                ${field.label}
                                            </label>
                                            ${(() => {
                if (field.type === 'select') {
                    return `
                                                                <select name="${field.id}" class="input">
                                                                    ${field.options.map(opt => `<option value="${opt}" ${this.company[field.id] === opt ? 'selected' : ''}>${opt || 'Select...'}</option>`).join('')}
                                                                </select>
                                                            `;
                } else if (field.type === 'owner_select') {
                    return `
                                                                <select name="${field.id}" class="input">
                                                                    ${allUsers.map(u => `<option value="${u.id}" ${this.company.ownerId === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                                                                </select>
                                                            `;
                } else {
                    return `<input type="${field.type}" name="${field.id}" value="${this.company[field.id] || ''}" class="input">`;
                }
            })()}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <div style="margin-top: 1.5rem;">
                                <button type="button" onclick="window.NexoGenix.activeCompanyDetails.saveCompanyProperties()" class="save-btn">Update Profile</button>
                            </div>
                        </form>
                    </div>
                </aside>

                <!-- Middle side: Activity -->
                <main style="display: flex; flex-direction: column; gap: 2rem;">
                    <div style="${glassStyle} padding: 0; overflow: hidden;">
                        <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: rgba(0,0,0,0.02);">
                            <button class="tab active" onclick="window.NexoGenix.activeCompanyDetails.setCreatorTab('Notes')">Note</button>
                            <button class="tab" onclick="window.NexoGenix.activeCompanyDetails.setCreatorTab('Tasks')">Task</button>
                        </div>
                        <div id="creator-form-container" style="padding: 2rem;">
                            <!-- Activity creator injected here -->
                        </div>
                    </div>

                    <div style="${glassStyle}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                            <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">Engagement Timeline</h3>
                            <div style="display: flex; gap: 0.5rem;">
                                ${['All', 'Note', 'Task', 'Update'].map(f => `
                                    <button onclick="window.NexoGenix.activeCompanyDetails.setFilter('${f}')" style="border: none; background: ${f === this.currentFilter ? '#3b82f6' : 'transparent'}; color: ${f === this.currentFilter ? 'white' : '#64748b'}; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">${f}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div id="activity-timeline"></div>
                    </div>
                </main>

                <!-- Right side: Actions, Contacts & Deals -->
                <aside style="display: flex; flex-direction: column; gap: 2rem;">
                    <!-- Quick Actions -->
                    <div style="${glassStyle}">
                        <h3 style="margin-top: 0; margin-bottom: 1.25rem; font-size: 0.95rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Quick Actions</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <a href="tel:${this.company.phone || ''}" class="action-btn call" style="background: #10b981; color: white;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                Call Headquarters
                            </a>
                            <a href="mailto:${this.company.email || ''}" class="action-btn email" style="background: #3b82f6; color: white;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                Primary Outreach
                            </a>
                            <a href="${this.company.website ? (this.company.website.startsWith('http') ? this.company.website : 'https://' + this.company.website) : '#'}" target="_blank" class="action-btn linkedin" style="background: #0f172a; color: white;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                Visit Domain
                            </a>
                        </div>
                    </div>

                    <!-- Team Context -->
                    <div style="${glassStyle}">
                        <h3 style="margin-top: 0; margin-bottom: 1.25rem; font-size: 0.95rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Institutional Team</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${associatedContacts.length > 0 ? associatedContacts.map(c => `
                                <a href="#contact/${c.id}" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none; padding: 0.5rem; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.03)'" onmouseout="this.style.background='transparent'">
                                    <div style="width: 28px; height: 28px; background: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: white;">${c.name.charAt(0)}</div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.85rem; font-weight: 600; color: #1e293b;">${c.name}</div>
                                        <div style="font-size: 0.7rem; color: #94a3b8;">${c.jobTitle || 'Stakeholder'}</div>
                                    </div>
                                </a>
                            `).join('') : '<div style="font-size: 0.8rem; color: #cbd5e1; font-style: italic;">No team members found.</div>'}
                        </div>
                    </div>

                    <!-- Deals Section -->
                    <div style="${glassStyle}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; text-transform: uppercase;">Linked Deals</h3>
                            <button onclick="window.NexoGenix.activeCompanyDetails.openAddDealModal()" style="background: #0f172a; color: white; border: none; width: 24px; height: 24px; border-radius: 6px; cursor: pointer; font-weight: 800; display: flex; align-items: center; justify-content: center;">+</button>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${associatedDeals.length > 0 ? associatedDeals.map(d => `
                                <div style="padding: 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 12px; position: relative;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                        <div style="font-size: 0.9rem; font-weight: 700; color: #0f172a; flex: 1; padding-right: 2rem;">${d.title}</div>
                                        <div style="display: flex; gap: 0.25rem; position: absolute; top: 0.75rem; right: 0.75rem;">
                                            <button onclick="window.NexoGenix.activeCompanyDetails.openAddDealModal(${d.id})" style="background: transparent; border: none; cursor: pointer; color: #94a3b8; padding: 2px;">
                                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                                             </button>
                                             ${window.NexoGenix.auth.getUser().role === 'admin' ? `
                                                 <button onclick="window.NexoGenix.activeCompanyDetails.deleteDeal(${d.id})" style="background: transparent; border: none; cursor: pointer; color: #ef4444; padding: 2px;">
                                                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                 </button>
                                             ` : ''}
                                         </div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="font-size: 0.85rem; font-weight: 800; color: #10b981;">$${Number(d.value).toLocaleString()}</div>
                                        <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; background: #f8fafc; padding: 2px 6px; border-radius: 4px;">${d.stage}</div>
                                    </div>
                                </div>
                            `).join('') : '<div style="text-align: center; padding: 1.5rem; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; font-size: 0.8rem;">No active deals found.</div>'}
                        </div>
                    </div>

                    <!-- Resources Assigned Section -->
                    <div style="${glassStyle}">
                        <h3 style="margin-top: 0; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Resources</h3>
                        <div style="position: relative;">
                            <div onclick="window.NexoGenix.activeCompanyDetails.toggleResourceSearch()" style="padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 10px; background: white; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; font-weight: 500; color: #1e293b;">
                                <span>${this.company.assignedResource || 'Select Resource...'}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                            
                            <div id="resource-dropdown-list" style="display: none; position: absolute; top: 110%; left: 0; width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 5000; overflow: hidden;">
                                <div style="padding: 0.5rem; border-bottom: 1px solid #f1f5f9;">
                                    <input type="text" id="resource-search-input" onkeyup="window.NexoGenix.activeCompanyDetails.filterResources()" placeholder="Search vendors..." style="width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; outline: none;">
                                </div>
                                <div style="max-height: 180px; overflow-y: auto;">
                                    <div class="resource-opt" data-value="" onclick="window.NexoGenix.activeCompanyDetails.selectResource('')" style="padding: 0.75rem 1rem; cursor: pointer; font-size: 0.85rem; color: #64748b; transition: background 0.2s;" onmouseover="if(this.style.background!=='rgb(239, 246, 255)')this.style.background='#f8fafc'" onmouseout="if(this.style.background!=='rgb(239, 246, 255)')this.style.background='white'">-- Unassigned --</div>
                                    ${(window.NexoGenix.data.config?.vendors || []).map(vnd => `
                                        <div class="resource-opt" data-value="${vnd}" onclick="window.NexoGenix.activeCompanyDetails.selectResource('${vnd}')" style="padding: 0.75rem 1rem; cursor: pointer; font-size: 0.85rem; color: #1e293b; font-weight: 500; transition: background 0.2s;" onmouseover="if(this.style.background!=='rgb(239, 246, 255)')this.style.background='#f8fafc'" onmouseout="if(this.style.background!=='rgb(239, 246, 255)')this.style.background='white'">
                                            ${vnd}
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="padding: 0.75rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 0.5rem;">
                                    <button onclick="window.NexoGenix.activeCompanyDetails.toggleResourceSearch()" style="flex: 1; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; color: #64748b; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Cancel</button>
                                    <button onclick="window.NexoGenix.activeCompanyDetails.confirmResourceAssignment()" style="flex: 2; padding: 0.5rem; border: none; border-radius: 6px; background: #3b82f6; color: white; font-size: 0.75rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">Confirm Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <style>
                .label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .input { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; outline: none; transition: all 0.2s; background: white; }
                .input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .save-btn { width: 100%; padding: 0.75rem; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .save-btn:hover { background: #1e293b; }
                
                .tab { padding: 1rem 1.75rem; border: none; background: transparent; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
                .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: white; }

                .action-btn { display: flex; align-items: center; justify-content: center; gap: 0.8rem; padding: 0.75rem; border-radius: 12px; font-weight: 700; text-decoration: none; transition: all 0.2s; font-size: 0.85rem; }
                .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

                .draggable-field:hover { border-color: #3b82f6; background: rgba(255,255,255,0.7); }
                .draggable-field.dragging { opacity: 0.4; }
                
                .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.3); z-index: 4000; align-items: center; justify-content: center; }
                .glass-modal { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; padding: 2.5rem; box-shadow: 0 32px 64px -12px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.7); }
                .modal-field label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.4rem; display: block; }
                .modal-btn-primary { background: #0f172a; color: white; border: none; padding: 0.85rem 2.25rem; border-radius: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
                .modal-btn-secondary { background: rgba(241, 245, 249, 0.8); color: #475569; border: none; padding: 0.85rem 2.25rem; border-radius: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            </style>

            <!-- Deal Modal -->
            <div id="addDealModal" class="modal-overlay">
                <div class="glass-modal" style="width: 400px;">
                    <h3 style="margin: 0 0 1.5rem 0; font-size: 1.25rem; font-weight: 800; color: #0f172a;">Sales Opportunity</h3>
                    <form onsubmit="window.NexoGenix.activeCompanyDetails.saveDeal(event)">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div class="modal-field"><label>Deal Title</label><input type="text" name="title" class="input" required placeholder="e.g. Enterprise Expansion"></div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="modal-field"><label>Value ($)</label><input type="number" name="value" class="input" required></div>
                                <div class="modal-field"><label>Prob %</label><input type="number" name="probability" class="input" required value="40"></div>
                            </div>
                            <div class="modal-field">
                                <label>Sales Stage</label>
                                <select name="stage" class="input">
                                    <option value="discovery">Discovery</option>
                                    <option value="proposal">Proposal</option>
                                    <option value="negotiation">Negotiation</option>
                                    <option value="closed-won">Closed Won</option>
                                    <option value="closed-lost">Closed Lost</option>
                                </select>
                            </div>
                            <div class="modal-field">
                                <label>Close Date</label>
                                <input type="date" name="closeDate" class="input">
                            </div>
                        </div>
                        <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" onclick="window.NexoGenix.activeCompanyDetails.closeAddDealModal()" class="modal-btn-secondary">Cancel</button>
                            <button type="submit" class="modal-btn-primary" style="width: auto;">Index Deal</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    afterRender() {
        this.renderActivities();
        this.setCreatorTab('Notes');
        this.initDragAndDrop();
    }

    initDragAndDrop() {
        const container = document.getElementById('draggable-props-container');
        if (!container) return;
        container.addEventListener('dragstart', (e) => this.handleDragStart(e));
        container.addEventListener('dragend', (e) => this.handleDragEnd(e));
        container.addEventListener('dragover', (e) => this.handleDragOver(e));
    }
}
