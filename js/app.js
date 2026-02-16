// Main App Logic
class App {
    constructor() {
        // Initialize state shell IMMEDIATELY to prevent "Cannot read properties of undefined" in View constructors
        window.NexoGenix.data = {
            contacts: [],
            companies: [],
            deals: [],
            activities: [],
            engagements: [],
            hrmsActivities: []
        };

        // Initialize Core Services
        window.NexoGenix.auth = window.NexoGenix.auth || new window.NexoGenix.Auth();

        // Decide which Store to use
        const remoteUrl = localStorage.getItem('nexogenix_remote_url');

        let localStore;
        if (window.electronAPI && window.electronAPI.isElectron) {
            localStore = new window.NexoGenix.ElectronDataStore();
        } else {
            localStore = new window.NexoGenix.DataStore();
        }

        if (remoteUrl) {
            console.log('App: Initializing Synced (Hybrid) Store with', remoteUrl);
            const remoteStore = new window.NexoGenix.RemoteDataStore(remoteUrl);
            window.NexoGenix.store = new window.NexoGenix.SyncedDataStore(localStore, remoteStore);
        } else {
            window.NexoGenix.store = localStore;
        }

        this.sidebar = new window.NexoGenix.Sidebar('sidebar');
        this.routerView = document.getElementById('router-view');
        this.topNavbar = document.getElementById('top-navbar');

        this.routes = {
            'insights': window.NexoGenix.Insights,
            'dashboard': window.NexoGenix.Dashboard,
            'contacts': window.NexoGenix.Contacts,
            'companies': window.NexoGenix.Companies,
            'deals': window.NexoGenix.Deals,
            'hrms': window.NexoGenix.HRMS,
            'integrations': window.NexoGenix.Integrations,
            'settings': window.NexoGenix.Settings,
            'login': window.NexoGenix.Login
        };

        window.NexoGenix.app = this;
        this.init();
    }

    async init() {
        // 1. Await Data Loading
        if (localStorage.getItem('nexogenix_remote_mode') === 'true') {
            try {
                const results = await window.NexoGenix.store.loadAll();
                window.NexoGenix.data = {
                    ...window.NexoGenix.data,
                    ...results,
                    hrmsActivities: results.activities.filter(a => a.engagementId) // Map if needed
                };
                console.log('App: Remote data loaded successfully');
            } catch (err) {
                console.error('App: Failed to load remote data', err);
                alert('Connection to Central Server failed. Reverting to Local Mode.');
                localStorage.setItem('nexogenix_remote_mode', 'false');
                window.location.reload();
            }
        } else if (window.electronAPI && window.NexoGenix.store.init) {
            await window.NexoGenix.store.init();

            // Sync from Database to State
            window.NexoGenix.data.contacts = window.NexoGenix.store.getContacts() || [];
            window.NexoGenix.data.activities = window.NexoGenix.store.getActivities() || [];
            window.NexoGenix.data.engagements = window.NexoGenix.store.getEngagements() || [];
            window.NexoGenix.data.hrmsActivities = window.NexoGenix.store.getHRMSActivities() || [];

            // Support for newer tables if they exist in schema
            if (window.NexoGenix.store.getCompanies) window.NexoGenix.data.companies = window.NexoGenix.store.getCompanies() || [];
            if (window.NexoGenix.store.getDeals) window.NexoGenix.data.deals = window.NexoGenix.store.getDeals() || [];
        } else {
            // Web mode: DataStore constructor already pointed window.NexoGenix.data to localStorage data
            window.NexoGenix.data = {
                ...window.NexoGenix.data,
                contacts: window.NexoGenix.data.contacts || [],
                companies: window.NexoGenix.data.companies || [],
                deals: window.NexoGenix.data.deals || [],
                activities: window.NexoGenix.data.activities || [],
                engagements: window.NexoGenix.data.engagements || [],
                hrmsActivities: window.NexoGenix.data.hrmsActivities || []
            };
        }

        // 2. Data Health & Migrations
        this.migrateDataOwnership();

        // 3. UI Shell Setup
        if (window.NexoGenix.auth.isAuthenticated()) {
            this.sidebar.render();
            this.renderNavbar();

            // Apply customization
            const customization = localStorage.getItem('nexogenix_customization');
            if (customization) {
                const settings = JSON.parse(customization);
                if (settings.appName) document.title = settings.appName;
            }
        }

        // 4. Routing
        window.addEventListener('hashchange', () => this.handleRoute());

        // Final sanity check before first render: Auth Guard
        if (!window.NexoGenix.auth.isAuthenticated() && !window.location.hash.startsWith('#login')) {
            window.location.hash = '#login';
        } else {
            this.handleRoute();
        }
    }

    migrateDataOwnership() {
        const adminId = 1;
        ['contacts', 'companies', 'deals'].forEach(collection => {
            if (window.NexoGenix.data[collection]) {
                window.NexoGenix.data[collection].forEach(item => {
                    if (!item.ownerId) item.ownerId = adminId;
                    // Ensure numeric ID comparison consistency
                    if (item.id) item.id = Number(item.id);
                });
            }
        });
    }

    renderNavbar() {
        if (!window.NexoGenix.auth.isAuthenticated()) return;

        const isRemote = localStorage.getItem('nexogenix_remote_mode') === 'true';
        const syncStatus = isRemote ? `
            <div id="sync-indicator" style="display: flex; align-items: center; gap: 0.5rem; background: #f1f5f9; padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid #e2e8f0;">
                <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: block; box-shadow: 0 0 8px #10b981;"></span>
                <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Cluster Synced</span>
            </div>
        ` : '';

        this.topNavbar.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <button onclick="window.NexoGenix.app.toggleSidebar()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; display: flex; align-items: center;">☰</button>
                    <div class="search-bar" style="position: relative; width: 400px;">
                        <input type="text" id="global-search" placeholder="Search accounts, leads, intelligence..." onkeypress="if(event.key === 'Enter') location.hash='#search/' + this.value" style="width: 100%; padding: 0.625rem 1rem 0.625rem 2.5rem; border-radius: 2rem; border: 1px solid #e2e8f0; background-color: #f8fafc; font-family: inherit; font-size: 0.9rem; transition: all 0.2s;">
                        <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8;">🔍</span>
                    </div>
                </div>
                ${syncStatus}
            </div>
        `;
    }

    clearState() {
        window.NexoGenix.data = {
            contacts: [],
            companies: [],
            deals: [],
            activities: [],
            engagements: [],
            hrmsActivities: [],
            users: []
        };
        console.log('App: State cleared for unmount/eject.');
    }

    toggleSidebar() {
        const app = document.getElementById('app');
        app.classList.toggle('sidebar-hidden');
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || 'insights';

        if (hash !== 'login' && !window.NexoGenix.auth.isAuthenticated()) {
            window.location.hash = '#login';
            return;
        }

        const sidebar = document.getElementById('sidebar');
        const navbar = document.getElementById('top-navbar');

        if (hash === 'login') {
            if (sidebar) sidebar.style.display = 'none';
            if (navbar) navbar.style.display = 'none';
            const view = new this.routes['login']();
            this.routerView.innerHTML = await view.render();
            return;
        } else {
            if (sidebar) sidebar.style.display = 'flex';
            if (navbar) navbar.style.display = 'flex';
            this.sidebar.render();
            this.renderNavbar();
        }

        // Handle Dynamic Routes
        if (hash.startsWith('contact/')) {
            const view = new window.NexoGenix.ContactDetails(hash.split('/')[1]);
            this.routerView.innerHTML = await view.render();
            if (view.afterRender) view.afterRender();
            return;
        }
        if (hash.startsWith('company/')) {
            const view = new window.NexoGenix.CompanyDetails(decodeURIComponent(hash.split('/')[1]));
            this.routerView.innerHTML = await view.render();
            if (view.afterRender) view.afterRender();
            return;
        }
        if (hash.startsWith('deal/')) {
            const view = new window.NexoGenix.DealDetails(hash.split('/')[1]);
            this.routerView.innerHTML = await view.render();
            return;
        }
        if (hash.startsWith('search/')) {
            const view = new window.NexoGenix.SearchResults(decodeURIComponent(hash.split('/')[1]));
            this.routerView.innerHTML = await view.render();
            return;
        }

        let ViewClass = this.routes[hash] || this.routes['dashboard'];
        try {
            const view = new ViewClass();
            this.routerView.innerHTML = await view.render();
            if (view.afterRender) view.afterRender();
        } catch (error) {
            console.error('Routing Error:', error);
            this.routerView.innerHTML = `<div style="padding: 2rem; color: #f43f5e; background: #fff1f2; border: 1px solid #fecaca; border-radius: 12px;">
                <h3 style="margin-top:0">View Load Failure</h3>
                <p>${error.message}</p>
            </div>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
