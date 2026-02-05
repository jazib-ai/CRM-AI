window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Settings = class Settings {
    constructor() {
        this.activeTab = 'users';
        window.NexoGenix.activeSettingsView = this;
    }

    async renderToDOM() {
        const html = await this.render();
        const routerView = document.getElementById('router-view');
        if (routerView) {
            routerView.innerHTML = html;
        }
    }

    async switchTab(tabName) {
        this.activeTab = tabName;
        await this.renderToDOM();
    }

    // --- STORAGE ACTIONS ---
    async handleDatabaseLocationChange() {
        if (!window.electronAPI) {
            alert('Desktop Environment Missing: This feature requires the NexoGenix Desktop App.');
            return;
        }
        try {
            const result = await window.electronAPI.db.changePath();
            if (result.success) {
                alert(`Database successfully relocated to: ${result.path}\n\nThe application will refresh to sync with the new location.`);
                window.location.reload();
            } else if (result.error !== 'Cancelled') {
                alert(`Location change failed: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async handleOpenFile() {
        if (!window.electronAPI) {
            alert('Desktop Environment Missing: This feature requires the NexoGenix Desktop App.');
            return;
        }
        try {
            const result = await window.electronAPI.db.openFile();
            if (result.success) {
                if (window.NexoGenix.app.clearState) window.NexoGenix.app.clearState();
                alert('Database Mounted Successfully.');
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
        }
    }

    async handleEject() {
        if (!confirm('Are you sure you want to eject the current database node? This will clear all visible CRM entries.')) return;

        if (window.electronAPI) {
            const result = await window.electronAPI.db.eject();
            if (result.success) {
                if (window.NexoGenix.app.clearState) window.NexoGenix.app.clearState();
                alert('Database Ejected. CRM is now empty.');
                window.location.reload();
            }
        } else {
            localStorage.removeItem('nexogenix_data_v1');
            if (window.NexoGenix.app.clearState) window.NexoGenix.app.clearState();
            alert('Local Storage Resetted. CRM is now empty.');
            window.location.reload();
        }
    }

    async handleSaveRemoteConfig(event) {
        event.preventDefault();
        const url = document.getElementById('remote-server-url').value;
        const enabled = document.getElementById('remote-mode-toggle').checked;

        if (enabled && !url) {
            alert('Please provide a server URL to enable Remote Mode.');
            return;
        }

        localStorage.setItem('nexogenix_remote_url', url);
        localStorage.setItem('nexogenix_remote_mode', enabled ? 'true' : 'false');

        alert(`Infrastructure strategy updated. System will now re-initialize in ${enabled ? 'Remote' : 'Local'} mode.`);
        window.location.reload();
    }

    async handleTestConnection() {
        const url = document.getElementById('remote-server-url').value;
        if (!url) return;
        const btn = document.getElementById('test-conn-btn');
        const originalText = btn.innerHTML;
        btn.textContent = 'Testing...';
        try {
            const response = await fetch(`${url}/api/users`);
            if (response.ok) alert('Connection Successful!');
            else alert('Server reachable, but error returned.');
        } catch (e) {
            alert('Connection Failed: ' + e.message);
        } finally {
            btn.innerHTML = originalText;
        }
    }

    // --- CUSTOMIZATION ---
    async saveCustomization(event) {
        event.preventDefault();
        const appName = event.target.appName.value;
        const logoInput = event.target.logoUpload;
        const customization = JSON.parse(localStorage.getItem('nexogenix_customization') || '{"appName":"NexoGenix","logoUrl":null}');
        customization.appName = appName;

        if (logoInput.files && logoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                customization.logoUrl = e.target.result;
                localStorage.setItem('nexogenix_customization', JSON.stringify(customization));
                this.applyCustomization();
                this.renderToDOM();
            };
            reader.readAsDataURL(logoInput.files[0]);
        } else {
            localStorage.setItem('nexogenix_customization', JSON.stringify(customization));
            this.applyCustomization();
            this.renderToDOM();
        }
    }

    applyCustomization() {
        const customization = JSON.parse(localStorage.getItem('nexogenix_customization') || '{"appName":"NexoGenix","logoUrl":null}');
        document.title = `${customization.appName} - Management`;
        const sidebarBrand = document.querySelector('.sidebar h2');
        if (sidebarBrand) {
            if (customization.logoUrl) {
                sidebarBrand.innerHTML = `<img src="${customization.logoUrl}" style="max-height: 32px; max-width: 150px; object-fit: contain;">`;
            } else {
                sidebarBrand.textContent = customization.appName;
            }
        }
    }

    resetCustomization() {
        if (!confirm('Reset branding?')) return;
        localStorage.removeItem('nexogenix_customization');
        location.reload();
    }

    // --- USER MANAGEMENT ---
    openModal(userId = null) {
        const modal = document.getElementById('addUserModal');
        const form = document.getElementById('addUserForm');
        form.reset();
        if (userId) {
            const user = window.NexoGenix.auth.getAllUsers().find(u => u.id === parseInt(userId));
            if (!user) return;
            form.dataset.mode = 'edit';
            form.dataset.id = userId;
            form.name.value = user.name;
            form.email.value = user.email;
            form.role.value = user.role;
            form.querySelector('.form-group-pass').style.display = 'none';
        } else {
            form.dataset.mode = 'add';
            form.querySelector('.form-group-pass').style.display = 'block';
        }
        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('addUserModal').style.display = 'none';
    }

    async saveUser(event) {
        event.preventDefault();
        const form = event.target;
        const { name, email, role, password } = form;
        const mode = form.dataset.mode;
        const id = form.dataset.id;

        let result;
        if (mode === 'edit') result = window.NexoGenix.auth.updateUser(id, { name: name.value, email: email.value, role: role.value });
        else result = window.NexoGenix.auth.register(name.value, email.value, password.value, role.value);

        if (result.success) {
            this.closeModal();
            this.renderToDOM();
        } else alert(result.message);
    }

    async handleDelete(id, name) {
        if (confirm(`Expunge user ${name}?`)) {
            window.NexoGenix.auth.deleteUser(id);
            this.renderToDOM();
        }
    }

    // --- CONFIG ---
    async addConfigValue(type) {
        const val = document.getElementById(`new-${type}-value`).value.trim();
        if (!val) return;
        if (!window.NexoGenix.data.config) window.NexoGenix.data.config = { timezones: [], services: [], vendors: [] };
        const key = type === 'timezone' ? 'timezones' : type === 'service' ? 'services' : 'vendors';
        if (!window.NexoGenix.data.config[key]) window.NexoGenix.data.config[key] = [];
        if (!window.NexoGenix.data.config[key].includes(val)) {
            window.NexoGenix.data.config[key].push(val);
            window.NexoGenix.store.save();
            this.renderToDOM();
        }
    }

    async removeConfigValue(type, val) {
        const key = type === 'timezone' ? 'timezones' : type === 'service' ? 'services' : 'vendors';
        const list = window.NexoGenix.data.config[key];
        const index = list.indexOf(val);
        if (index > -1) {
            list.splice(index, 1);
            window.NexoGenix.store.save();
            this.renderToDOM();
        }
    }

    async render() {
        const users = window.NexoGenix.auth.getAllUsers();
        const currentUser = window.NexoGenix.auth.getUser();
        let dbPath = 'Unknown';
        if (window.electronAPI) { try { dbPath = await window.electronAPI.db.getPath(); } catch (e) { } }

        // PREMIUM LIGHT THEME DESIGN SYSTEM
        const glassStyle = "backdrop-filter: blur(20px) saturate(180%); background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);";
        const accentColor = "#3b82f6";
        const textColorPrimary = "#0f172a";
        const textColorSecondary = "#64748b";

        let content = '';
        if (this.activeTab === 'users') {
            content = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
                    <div>
                        <h2 style="font-size: 1.75rem; font-weight: 800; color: ${textColorPrimary}; margin: 0; letter-spacing: -0.02em;">Access Management</h2>
                        <p style="color: ${textColorSecondary}; font-size: 0.95rem; margin-top: 0.5rem; font-weight: 500;">Definitive control over system operatives and authorization.</p>
                    </div>
                    <button class="btn-premium" onclick="window.NexoGenix.activeSettingsView.openModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add Personnel
                    </button>
                </div>
                <div style="background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="background: rgba(0,0,0,0.02);">
                            <tr>
                                <th style="padding: 1.25rem 1.5rem; color: #94a3b8; text-transform: uppercase; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em;">Identity</th>
                                <th style="padding: 1.25rem 1.5rem; color: #94a3b8; text-transform: uppercase; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em;">Status</th>
                                <th style="padding: 1.25rem 1.5rem; color: #94a3b8; text-transform: uppercase; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr style="border-bottom: 1px solid rgba(0,0,0,0.03);">
                                    <td style="padding: 1.25rem 1.5rem;">
                                        <div style="display: flex; align-items: center; gap: 1rem;">
                                            <div style="width: 44px; height: 44px; background: ${u.id === currentUser.id ? 'linear-gradient(135deg, #0f172a, #1e293b)' : '#f1f5f9'}; color: ${u.id === currentUser.id ? 'white' : textColorPrimary}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                                                ${u.name[0]}
                                            </div>
                                            <div>
                                                <div style="color: ${textColorPrimary}; font-weight: 700;">${u.name}</div>
                                                <div style="color: ${textColorSecondary}; font-size: 0.85rem; font-weight: 500;">${u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding: 1.25rem 1.5rem;">
                                        <span style="padding: 0.4rem 0.8rem; background: ${u.role === 'admin' ? '#0f172a10' : '#f1f5f9'}; color: ${u.role === 'admin' ? '#0f172a' : textColorSecondary}; border-radius: 99px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em;">${u.role}</span>
                                    </td>
                                    <td style="padding: 1.25rem 1.5rem; text-align: right;">
                                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                            <button onclick="window.NexoGenix.activeSettingsView.openModal('${u.id}')" class="settings-action-btn" title="Edit Properties">✏️</button>
                                            ${u.id !== currentUser.id ? `<button onclick="window.NexoGenix.activeSettingsView.handleDelete('${u.id}', '${u.name}')" class="settings-action-btn delete" title="Revoke Access">🗑️</button>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (this.activeTab === 'customize') {
            const customization = JSON.parse(localStorage.getItem('nexogenix_customization') || '{"appName":"NexoGenix"}');
            content = `
                <div style="max-width: 600px;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: ${textColorPrimary}; margin-bottom: 0.5rem;">Identity Branding</h2>
                    <p style="color: ${textColorSecondary}; margin-bottom: 2.5rem; font-size: 0.95rem; font-weight: 500;">Injecting organizational aesthetics into the system matrix.</p>
                    <form onsubmit="window.NexoGenix.activeSettingsView.saveCustomization(event)">
                        <div style="margin-bottom: 2rem;">
                            <label style="color: ${textColorPrimary}; font-size: 0.85rem; display: block; margin-bottom: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Application Signature</label>
                            <input type="text" name="appName" class="glass-input-light" value="${customization.appName}" required placeholder="e.g., Global Sales CRM">
                        </div>
                        <div style="margin-bottom: 2.5rem;">
                            <label style="color: ${textColorPrimary}; font-size: 0.85rem; display: block; margin-bottom: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Brand Iconography</label>
                            <div style="border: 2px dashed rgba(0,0,0,0.1); border-radius: 20px; padding: 3rem; text-align: center; background: rgba(0,0,0,0.02); cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='white'; this.style.borderColor='${textColorPrimary}'" onmouseout="this.style.background='rgba(0,0,0,0.02)'; this.style.borderColor='rgba(0,0,0,0.1)'" onclick="document.getElementById('logoInput').click()">
                                <input type="file" name="logoUpload" id="logoInput" style="display: none;" onchange="alert('File selected: ' + this.files[0].name)">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem;">🖼️</div>
                                <div style="font-weight: 700; color: ${textColorPrimary};">Deploy Corporate Mark</div>
                                <div style="font-size: 0.8rem; color: ${textColorSecondary};">PNG, SVG or WebP supported</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.05);">
                            <button type="submit" class="btn-premium">Transmit Changes</button>
                            <button type="button" class="btn-secondary-light" onclick="window.NexoGenix.activeSettingsView.resetCustomization()">Factory Reset</button>
                        </div>
                    </form>
                </div>
            `;
        } else if (this.activeTab === 'storage') {
            const isRemote = localStorage.getItem('nexogenix_remote_mode') === 'true';
            const remoteUrl = localStorage.getItem('nexogenix_remote_url') || '';

            content = `
                <div style="max-width: 800px;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: ${textColorPrimary}; margin-bottom: 0.5rem;">Storage Infrastructure</h2>
                    <p style="color: ${textColorSecondary}; margin-bottom: 3rem; font-size: 0.95rem; font-weight: 500;">Configure how and where your relational intelligence is persisted.</p>

                    <div style="display: grid; grid-template-columns: 1fr; gap: 2.5rem;">
                        
                        <!-- SECTION 1: LOCAL INFRASTRUCTURE -->
                        <div style="background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 24px; padding: 2.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
                            <div style="display: flex; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem;">
                                <div style="width: 54px; height: 54px; background: #f1f5f9; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏠</div>
                                <div style="flex: 1;">
                                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: ${textColorPrimary};">Local Data Node</h3>
                                    <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: ${textColorSecondary};">Optimized for solo operatives. Data remains on your local filesystem.</p>
                                </div>
                                <div style="padding: 0.4rem 0.8rem; background: ${!isRemote ? '#10b98115' : '#f1f5f9'}; color: ${!isRemote ? '#10b981' : '#94a3b8'}; border-radius: 99px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">${!isRemote ? 'Active' : 'Standby'}</div>
                            </div>

                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 16px; margin-bottom: 1.5rem;">
                                <div style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Current Mounting Point</div>
                                <code style="display: block; color: ${textColorPrimary}; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; word-break: break-all;">${dbPath}</code>
                            </div>

                            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                                <button onclick="window.NexoGenix.activeSettingsView.handleDatabaseLocationChange()" class="btn-secondary-light" style="flex: 1; justify-content: center; display: flex; align-items: center; gap: 0.5rem;">
                                    <span>📂</span> Choose Local Folder
                                </button>
                                <button onclick="window.NexoGenix.activeSettingsView.handleOpenFile()" class="btn-secondary-light" style="flex: 1; justify-content: center; display: flex; align-items: center; gap: 0.5rem;">
                                    <span>🔗</span> Mount Existing DB
                                </button>
                            </div>

                            <button onclick="window.NexoGenix.activeSettingsView.handleEject()" class="btn-secondary-light" style="width: 100%; justify-content: center; color: #ef4444; border-color: #fecaca;">
                                <span>⚠️</span> Eject / Reset Current Node
                            </button>
                        </div>

                        <!-- SECTION 2: REMOTE ARCHITECTURE -->
                        <div style="background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 24px; padding: 2.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
                            <div style="display: flex; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem;">
                                <div style="width: 54px; height: 54px; background: #eff6ff; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🌐</div>
                                <div style="flex: 1;">
                                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: ${textColorPrimary};">Centralized Cloud Node</h3>
                                    <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: ${textColorSecondary};">Multi-user real-time collaboration via a hosted cluster.</p>
                                </div>
                                <div style="padding: 0.4rem 0.8rem; background: ${isRemote ? '#3b82f615' : '#f1f5f9'}; color: ${isRemote ? '#3b82f6' : '#94a3b8'}; border-radius: 99px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">${isRemote ? 'Active' : 'Standby'}</div>
                            </div>

                            <form onsubmit="window.NexoGenix.activeSettingsView.handleSaveRemoteConfig(event)">
                                <div style="margin-bottom: 1.5rem;">
                                    <label style="color: ${textColorPrimary}; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.5rem;">Cluster Endpoint URL</label>
                                    <div style="display: flex; gap: 0.75rem;">
                                        <input type="text" id="remote-server-url" value="${remoteUrl}" class="glass-input-light" style="flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;" placeholder="https://db-cluster.nexogenix.com">
                                        <button type="button" id="test-conn-btn" onclick="window.NexoGenix.activeSettingsView.handleTestConnection()" class="btn-secondary-light" style="white-space: nowrap;">⚡ Ping Node</button>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 2rem;">
                                    <div>
                                        <div style="font-weight: 800; color: ${textColorPrimary}; font-size: 0.95rem;">Enable Cloud Synchronization</div>
                                        <div style="font-size: 0.85rem; color: ${textColorSecondary};">Switch from local storage to centralized database.</div>
                                    </div>
                                    <label class="switch">
                                        <input type="checkbox" id="remote-mode-toggle" ${isRemote ? 'checked' : ''}>
                                        <span class="slider round"></span>
                                    </label>
                                </div>

                                <button type="submit" class="btn-premium" style="width: 100%; justify-content: center;">
                                    Initialize Infrastructure Strategy
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <style>
                    /* Switch Styling */
                    .switch { position: relative; display: inline-block; width: 60px; height: 34px; }
                    .switch input { opacity: 0; width: 0; height: 0; }
                    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
                    .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                    input:checked + .slider { background-color: ${textColorPrimary}; }
                    input:checked + .slider:before { transform: translateX(26px); }
                </style>
            `;
        } else if (this.activeTab === 'configure') {
            content = `
                <div style="max-width: 800px;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: ${textColorPrimary}; margin-bottom: 0.5rem;">Global Parameters</h2>
                    <p style="color: ${textColorSecondary}; margin-bottom: 3rem; font-size: 0.95rem; font-weight: 500;">Architecting foundational system logic and property categories.</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;">
                        <section>
                            <h3 style="color: ${textColorPrimary}; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span style="width: 32px; height: 32px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem;">🌍</span>
                                Temporal Zones
                            </h3>
                            <div style="background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                                <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
                                    <input type="text" id="new-timezone-value" placeholder="e.g. UTC, PST" class="glass-input-light" style="padding: 0.75rem; font-size: 0.9rem;">
                                    <button onclick="window.NexoGenix.activeSettingsView.addConfigValue('timezone')" style="background: ${textColorPrimary}; border: none; color: white; padding: 0 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer;">Add</button>
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
                                    ${(window.NexoGenix.data.config?.timezones || []).map(tz => `
                                        <div style="background: #f1f5f9; padding: 0.5rem 0.85rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; color: ${textColorPrimary}; display: flex; align-items: center; gap: 0.6rem;">
                                            ${tz} 
                                            <span onclick="window.NexoGenix.activeSettingsView.removeConfigValue('timezone', '${tz}')" style="cursor: pointer; opacity: 0.3; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.3'">✕</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </section>
                        <section>
                            <h3 style="color: ${textColorPrimary}; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span style="width: 32px; height: 32px; background: #ecfdf5; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem;">💎</span>
                                Service Offerings
                            </h3>
                            <div style="background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                                <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
                                    <input type="text" id="new-service-value" placeholder="e.g. Consulting" class="glass-input-light" style="padding: 0.75rem; font-size: 0.9rem;">
                                    <button onclick="window.NexoGenix.activeSettingsView.addConfigValue('service')" style="background: ${textColorPrimary}; border: none; color: white; padding: 0 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer;">Add</button>
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
                                    ${(window.NexoGenix.data.config?.services || []).map(svc => `
                                        <div style="background: #f1f5f9; padding: 0.5rem 0.85rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; color: ${textColorPrimary}; display: flex; align-items: center; gap: 0.6rem;">
                                            ${svc} 
                                            <span onclick="window.NexoGenix.activeSettingsView.removeConfigValue('service', '${svc}')" style="cursor: pointer; opacity: 0.3; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.3'">✕</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            `;
        }

        return `
            <div class="settings-workspace" style="padding: 3rem; background: #f8fafc; min-height: 100vh; color: ${textColorPrimary}; font-family: 'Outfit', sans-serif; position: relative; overflow: hidden;">
                <!-- Atmospheric Background Elements -->
                <div style="position: absolute; top: -100px; right: 10%; width: 600px; height: 600px; background: rgba(59, 130, 246, 0.03); filter: blur(100px); border-radius: 50%; z-index: 0; pointer-events: none;"></div>
                <div style="position: absolute; bottom: -100px; left: 5%; width: 700px; height: 700px; background: rgba(99, 102, 241, 0.03); filter: blur(120px); border-radius: 50%; z-index: 0; pointer-events: none;"></div>
                
                <div style="position: relative; z-index: 1;">
                    <header style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4rem;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                                <div style="width: 10px; height: 10px; background: ${accentColor}; border-radius: 50%; box-shadow: 0 0 10px ${accentColor}50;"></div>
                                <span style="font-size: 0.75rem; font-weight: 800; color: ${textColorSecondary}; text-transform: uppercase; letter-spacing: 0.15em;">Operational Core</span>
                            </div>
                            <h1 style="font-size: 3rem; font-weight: 800; margin: 0; letter-spacing: -0.04em; color: ${textColorPrimary};">System Control</h1>
                        </div>
                        <div style="${glassStyle} padding: 1rem 2rem; border-radius: 20px; display: flex; align-items: center; gap: 1.5rem;">
                            <div style="text-align: right;">
                                <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Node Health</div>
                                <div style="font-size: 1rem; color: #10b981; font-weight: 800;">Optimized & Synced</div>
                            </div>
                            <div style="width: 44px; height: 44px; background: #10b98110; color: #10b981; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">⚡</div>
                        </div>
                    </header>

                    <div style="display: grid; grid-template-columns: 300px 1fr; gap: 3.5rem;">
                        <nav style="${glassStyle} padding: 1.25rem; border-radius: 28px; display: flex; flex-direction: column; gap: 0.5rem; position: sticky; top: 3rem; height: fit-content;">
                            ${[
                { id: 'users', label: 'Access Management', icon: '🔐' },
                { id: 'customize', label: 'Branding Matrix', icon: '🎨' },
                { id: 'storage', label: 'Data Infrastructure', icon: '💾' },
                { id: 'configure', label: 'Global Parameters', icon: '⚙️' }
            ].map(t => `
                                <button onclick="window.NexoGenix.activeSettingsView.switchTab('${t.id}')" style="background: ${this.activeTab === t.id ? textColorPrimary : 'transparent'}; border: none; padding: 1.15rem 1.5rem; border-radius: 18px; color: ${this.activeTab === t.id ? 'white' : textColorSecondary}; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 1rem; font-weight: 700; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);" class="nav-tab-btn">
                                    <span style="font-size: 1.25rem;">${t.icon}</span>
                                    <span style="font-size: 0.95rem;">${t.label}</span>
                                    ${this.activeTab === t.id ? '<div style="margin-left: auto; width: 6px; height: 6px; background: white; border-radius: 50%; opacity: 0.5;"></div>' : ''}
                                </button>
                            `).join('')}
                        </nav>

                        <main style="${glassStyle} padding: 4rem; border-radius: 40px; min-height: 600px;">
                            ${content}
                        </main>
                    </div>
                </div>

                <style>
                    .btn-premium { background: ${textColorPrimary}; color: white; border: none; padding: 0.9rem 1.75rem; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1); }
                    .btn-premium:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(15, 23, 42, 0.15); }
                    
                    .btn-secondary-light { background: white; border: 1px solid #e2e8f0; color: ${textColorSecondary}; padding: 0.9rem 1.75rem; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
                    .btn-secondary-light:hover { background: #f8fafc; color: ${textColorPrimary}; border-color: #cbd5e1; }
                    
                    .btn-action-light { background: white; border: 1px solid rgba(0,0,0,0.05); color: ${textColorPrimary}; padding: 2rem; border-radius: 24px; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                    .btn-action-light:hover { transform: translateY(-5px); border-color: ${textColorPrimary}; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                    
                    .nav-tab-btn:not([style*="background: ${textColorPrimary}"]):hover { background: rgba(0,0,0,0.03); color: ${textColorPrimary}; transform: translateX(8px); }
                    
                    .glass-input-light { width: 100%; border-radius: 14px; border: 1px solid rgba(0,0,0,0.1); padding: 1.15rem 1.5rem; font-size: 1rem; background: white; outline: none; transition: all 0.2s; color: ${textColorPrimary}; font-family: inherit; }
                    .glass-input-light:focus { border-color: ${textColorPrimary}; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); }
                    
                    .settings-action-btn { background: #f8fafc; border: 1px solid #e2e8f0; color: ${textColorSecondary}; padding: 0.6rem; border-radius: 12px; cursor: pointer; transition: all 0.2s; font-size: 1.1rem; }
                    .settings-action-btn:hover { background: ${textColorPrimary}; color: white; border-color: ${textColorPrimary}; transform: translateY(-2px); }
                    .settings-action-btn.delete:hover { background: #ef4444; color: white; border-color: #ef4444; }
                    
                    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.3s ease; }
                    .modal-content { max-width: 500px; width: 100%; animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                    
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideDown { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    
                    main > div { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
                </style>
            </div>

            <div id="addUserModal" class="modal-overlay">
                <div class="modal-content" style="${glassStyle} padding: 3rem; border-radius: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
                        <div>
                            <h3 style="color: ${textColorPrimary}; font-size: 1.75rem; font-weight: 800; margin: 0; letter-spacing: -0.02em;">Personnel Credentials</h3>
                            <p style="color: ${textColorSecondary}; font-size: 0.85rem; margin-top: 0.25rem; font-weight: 500;">Provisioning secure access levels.</p>
                        </div>
                        <button onclick="window.NexoGenix.activeSettingsView.closeModal()" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; color: ${textColorSecondary}; cursor: pointer; font-weight: 800;">✕</button>
                    </div>
                    
                    <form id="addUserForm" onsubmit="window.NexoGenix.activeSettingsView.saveUser(event)">
                        <div style="margin-bottom: 1.5rem;">
                            <label style="color: ${textColorPrimary}; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Operator Full Name</label>
                            <input type="text" name="name" class="glass-input-light" style="margin-top: 0.5rem;" required placeholder="e.g. Sterling Archer">
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <label style="color: ${textColorPrimary}; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Secure End-point Email</label>
                            <input type="email" name="email" class="glass-input-light" style="margin-top: 0.5rem;" required placeholder="archer@isis.com">
                        </div>
                        <div class="form-group-pass" style="margin-bottom: 1.5rem;">
                            <label style="color: ${textColorPrimary}; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Access Credential (Password)</label>
                            <input type="password" name="password" class="glass-input-light" style="margin-top: 0.5rem;" placeholder="••••••••">
                        </div>
                        <div style="margin-bottom: 2.5rem;">
                            <label style="color: ${textColorPrimary}; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Authorization Level</label>
                            <select name="role" class="glass-input-light" style="margin-top: 0.5rem; appearance: none; background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;20&quot; height=&quot;20&quot; fill=&quot;none&quot; stroke=&quot;%2364748b&quot; stroke-width=&quot;2.5&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;m6 9 6 6 6-6&quot;/></svg>'); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1rem;">
                                <option value="standard">Standard Operative</option>
                                <option value="admin">System Architect (Admin)</option>
                            </select>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05);">
                            <button type="button" onclick="window.NexoGenix.activeSettingsView.closeModal()" class="btn-secondary-light" style="padding: 0.8rem 1.5rem;">Cancel</button>
                            <button type="submit" class="btn-premium" style="padding: 0.8rem 2rem;">Confirm Registration</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }
}
