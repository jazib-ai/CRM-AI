window.NexoGenix = window.NexoGenix || {};

window.NexoGenix.Auth = class Auth {
    constructor() {
        this.STORAGE_KEY_USERS = 'nexogenix_users';
        this.STORAGE_KEY_SESSION = 'nexogenix_session';

        this.initUsers();
    }

    initUsers() {
        if (!localStorage.getItem(this.STORAGE_KEY_USERS)) {
            const defaultUsers = [
                {
                    id: 1,
                    name: 'Admin User',
                    email: 'admin@nexcrm.com',
                    password: 'password', // Hash in production
                    role: 'admin',
                    avatar: 'AH' // Admin Hero
                },
                {
                    id: 2,
                    name: 'Standard User',
                    email: 'user@nexcrm.com',
                    password: 'password',
                    role: 'standard',
                    avatar: 'SU' // Standard User
                }
            ];
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(defaultUsers));
        }
    }

    async login(email, password) {
        // --- REMOTE MODE CHECK ---
        if (localStorage.getItem('nexogenix_remote_mode') === 'true') {
            try {
                const response = await window.NexoGenix.store.login(email, password);
                if (response.success) {
                    localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(response.user));
                    return { success: true, user: response.user };
                }
            } catch (err) {
                return { success: false, message: 'Server Authentication Failed: ' + err.message };
            }
        }

        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Create session (exclude password)
            const sessionUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            };
            localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
            return { success: true, user: sessionUser };
        } else {
            return { success: false, message: 'Invalid email or password.' };
        }
    }

    async register(name, email, password, role = 'standard') {
        const users = this.getAllUsers();

        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email already exists.' };
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            role,
            avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        };

        if (localStorage.getItem('nexogenix_remote_mode') === 'true' && window.NexoGenix.store.insert) {
            try {
                const result = await window.NexoGenix.store.insert('users', newUser);
                newUser.id = result.id;
            } catch (e) {
                return { success: false, message: 'Remote Registration Failed: ' + e.message };
            }
        } else {
            users.push(newUser);
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
        }

        return { success: true, user: newUser };
    }

    logout() {
        localStorage.removeItem(this.STORAGE_KEY_SESSION);
        window.location.hash = '#login';
        window.location.reload();
    }

    isAuthenticated() {
        return !!localStorage.getItem(this.STORAGE_KEY_SESSION);
    }

    getUser() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY_SESSION));
    }

    getAllUsers() {
        if (localStorage.getItem('nexogenix_remote_mode') === 'true' && window.NexoGenix.data.users) {
            return window.NexoGenix.data.users;
        }
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS) || '[]');
    }

    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(u => u.id === parseInt(id));
    }

    async updateUser(userId, updates) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === parseInt(userId));
        if (index === -1) return { success: false, message: 'User not found' };

        const updatedUser = { ...users[index], ...updates };
        if (updates.name) {
            updatedUser.avatar = updates.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        }

        if (localStorage.getItem('nexogenix_remote_mode') === 'true') {
            try {
                await window.NexoGenix.store.update('users', userId, updatedUser);
            } catch (e) {
                return { success: false, message: 'Remote Update Failed: ' + e.message };
            }
        } else {
            users[index] = updatedUser;
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
        }

        // Update session if editing current user
        const currentUser = this.getUser();
        if (currentUser && currentUser.id === parseInt(userId)) {
            const sessionUser = { ...updatedUser };
            delete sessionUser.password;
            localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
        }

        return { success: true, user: updatedUser };
    }

    async deleteUser(userId) {
        if (localStorage.getItem('nexogenix_remote_mode') === 'true') {
            await window.NexoGenix.store.delete('users', userId);
        } else {
            let users = this.getAllUsers();
            users = users.filter(u => u.id !== parseInt(userId));
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
        }
    }
};

// Instantiate singleton
window.NexoGenix.auth = new window.NexoGenix.Auth();
