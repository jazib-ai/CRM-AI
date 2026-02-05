window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Login = class Login {
    constructor() {
        this.isSignup = false;
        window.NexoGenix.activeLoginView = this;
    }

    toggleMode() {
        this.isSignup = !this.isSignup;
        this.render().then(html => {
            document.getElementById('router-view').innerHTML = html;
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.email.value;
        const password = form.password.value;
        const messageEl = document.getElementById('auth-message');

        if (this.isSignup) {
            const name = form.name.value;
            // Default to standard role for self-registration
            const res = window.NexoGenix.auth.register(name, email, password, 'standard');
            if (res.success) {
                // Determine if we should auto-login or ask them to login
                const loginRes = await window.NexoGenix.auth.login(email, password);
                if (loginRes.success) {
                    window.location.hash = '#dashboard';
                }
            } else {
                messageEl.textContent = res.message;
                messageEl.style.color = '#ef4444';
            }
        } else {
            const res = await window.NexoGenix.auth.login(email, password);
            if (res.success) {
                window.location.hash = '#dashboard';
            } else {
                messageEl.textContent = res.message;
                messageEl.style.color = '#ef4444';
            }
        }
    }

    async render() {
        return `
            <div style="
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #1e1e24 0%, #2a2a35 100%);
                color: white;
                font-family: 'Inter', sans-serif;
            ">
                <div class="card" style="
                    width: 100%;
                    max-width: 400px;
                    padding: 2.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                ">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h1 style="font-size: 2rem; margin-bottom: 0.5rem; color: white;">NexoGenix</h1>
                        <p style="color: rgba(255, 255, 255, 0.6);">${this.isSignup ? 'Create your account' : 'Welcome back'}</p>
                    </div>

                    <form onsubmit="window.NexoGenix.activeLoginView.handleSubmit(event)">
                        ${this.isSignup ? `
                        <div class="form-group">
                            <label class="form-label" style="color: rgba(255, 255, 255, 0.8);">Full Name</label>
                            <input type="text" name="name" class="form-input" required style="background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: white;">
                        </div>
                        ` : ''}

                        <div class="form-group">
                            <label class="form-label" style="color: rgba(255, 255, 255, 0.8);">Email Address</label>
                            <input type="email" name="email" class="form-input" required style="background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: white;">
                        </div>

                        <div class="form-group">
                            <label class="form-label" style="color: rgba(255, 255, 255, 0.8);">Password</label>
                            <input type="password" name="password" class="form-input" required style="background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: white;">
                        </div>

                        <div id="auth-message" style="margin-bottom: 1rem; font-size: 0.875rem; min-height: 1.25rem;"></div>

                        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 0.75rem;">
                            ${this.isSignup ? 'Sign Up' : 'Log In'}
                        </button>
                    </form>

                    <div style="margin-top: 1.5rem; text-align: center; font-size: 0.875rem; color: rgba(255, 255, 255, 0.6);">
                        ${this.isSignup ? 'Already have an account?' : "Don't have an account?"}
                        <button onclick="window.NexoGenix.activeLoginView.toggleMode()" style="background: none; border: none; color: var(--primary-color); cursor: pointer; text-decoration: underline; margin-left: 0.25rem;">
                            ${this.isSignup ? 'Log In' : 'Sign Up'}
                        </button>
                    </div>
                     <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.8rem; color: rgba(255,255,255,0.4);">
                        <p><strong>Demo Admin:</strong> admin@nexcrm.com / password</p>
                        <p><strong>Demo User:</strong> user@nexcrm.com / password</p>
                    </div>
                </div>
            </div>
        `;
    }
}
