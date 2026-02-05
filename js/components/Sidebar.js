// Define global namespace if it doesn't exist
window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Sidebar = class Sidebar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    getIcon(name) {
        const icons = {
            insights: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
            contacts: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            companies: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
            deals: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
            hrm: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`,
            marketplace: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
            settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
            logout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
        };
        return icons[name] || '';
    }

    render() {
        this.container.innerHTML = `
            <div class="logo-area">
                <div style="width: 32px; height: 32px; background: var(--primary-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                    <span style="color: white; font-weight: 900; font-size: 1.1rem;">N</span>
                </div>
                <h2 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.02em;">NexoGenix</h2>
            </div>
            
            <nav class="nav-links" style="display: flex; flex-direction: column; gap: 0.25rem;">
                <a href="#insights" class="nav-item">
                    ${this.getIcon('insights')} <span>Insights</span>
                </a>
                <a href="#contacts" class="nav-item">
                    ${this.getIcon('contacts')} <span>Contacts</span>
                </a>
                <a href="#companies" class="nav-item">
                    ${this.getIcon('companies')} <span>Companies</span>
                </a>
                <a href="#deals" class="nav-item">
                    ${this.getIcon('deals')} <span>Deals</span>
                </a>
                <a href="#hrms" class="nav-item">
                    ${this.getIcon('hrm')} <span>NGX HRM</span>
                </a>
            </nav>

            <div style="margin-top: auto; padding: 1.25rem 0; display: flex; flex-direction: column; gap: 0.25rem; border-top: 1px solid rgba(255,255,255,0.05);">
                 <a href="#settings" class="nav-item">
                    ${this.getIcon('settings')} <span>Settings</span>
                </a>
                <a href="#" onclick="window.NexoGenix.auth.logout(); return false;" class="nav-item logout-link" style="color: #f87171 !important;">
                    ${this.getIcon('logout')} <span>Logout</span>
                </a>
            </div>
        `;

        this.updateActiveLink();
        window.addEventListener('hashchange', () => this.updateActiveLink());
    }

    updateActiveLink() {
        const hash = window.location.hash || '#insights';
        const links = this.container.querySelectorAll('.nav-item');
        links.forEach(link => {
            const isActive = link.getAttribute('href') === hash;
            if (isActive) {
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                link.style.color = '#fff';
            } else {
                link.style.backgroundColor = 'transparent';
                link.style.color = 'rgba(255, 255, 255, 0.5)';
            }
        });
    }
}
