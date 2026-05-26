const App = {
    routes: {
        '/': 'home',
        '/channels': 'channels',
        '/config': 'config',
        '/database': 'database',
        '/details': 'details',
        '/logs': 'logs',
        '/epg-config': 'epgConfig',
        '/desc-config': 'descConfig'
    },

    currentRoute: '',

    init() {
        Auth.init();
        Theme.init();
        GitHub.setToken(Auth.token);
        this.updateAuthUI();
        this.bindEvents();
        this.route(window.location.hash.slice(1) || '/');
        window.addEventListener('hashchange', () => {
            this.route(window.location.hash.slice(1) || '/');
        });
    },

    bindEvents() {
        document.getElementById('theme-toggle-btn').addEventListener('click', () => Theme.toggle());
    },

    route(hash) {
        const route = this.routes[hash];
        if (!route) { this.route('/'); return; }
        this.currentRoute = hash;
        this.updateNav();
        const pageFn = pages[route];
        if (typeof pageFn === 'function') pageFn();
    },

    updateNav() {
        document.querySelectorAll('.nav-link[data-route]').forEach(link => {
            link.classList.toggle('active', link.dataset.route === this.currentRoute);
        });
        if (document.querySelector('.nav-link[href="#/"]')) {
            document.querySelector('.nav-link[href="#/"]').classList.toggle('active', this.currentRoute === '/');
        }
    },

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        const input = document.getElementById('token-input');
        const error = document.getElementById('login-error');
        if (modal) modal.style.display = 'flex';
        if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
        if (error) { error.style.display = 'none'; error.textContent = ''; }
    },

    closeLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) modal.style.display = 'none';
    },

    async doLogin() {
        const input = document.getElementById('token-input');
        const error = document.getElementById('login-error');
        const btn = document.querySelector('#login-modal .btn-primary');
        if (!input) return;
        const token = input.value.trim();
        if (!token) { if (error) { error.textContent = '请输入 Token'; error.style.display = 'block'; } return; }
        if (btn) { btn.disabled = true; btn.textContent = '登录中...'; }
        if (error) { error.style.display = 'none'; error.textContent = ''; }
        try {
            const result = await Auth.loginWithToken(token);
            if (result.success) {
                GitHub.setToken(Auth.token);
                this.updateAuthUI();
                this.closeLoginModal();
                this.route(this.currentRoute);
            } else {
                if (error) { error.textContent = result.error; error.style.display = 'block'; }
            }
        } catch (e) {
            if (error) { error.textContent = e.message; error.style.display = 'block'; }
        }
        if (btn) { btn.disabled = false; btn.textContent = '登录'; }
    },

    logout() {
        Auth.logout();
        GitHub.clearToken();
        this.updateAuthUI();
        document.getElementById('user-dropdown').classList.remove('show');
        this.route(this.currentRoute);
    },

    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const avatar = document.getElementById('user-avatar');
        const nameDisplay = document.getElementById('user-name-display');
        const githubLink = document.getElementById('user-github-link');

        if (Auth.isLoggedIn && Auth.user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (avatar) avatar.src = Auth.user.avatar_url || '';
            if (nameDisplay) nameDisplay.textContent = Auth.user.login || '';
            if (githubLink) githubLink.href = Auth.user.html_url || '#';
        } else {
            if (loginBtn) loginBtn.style.display = '';
            if (userMenu) userMenu.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    const userBtn = document.getElementById('user-btn');
    if (dropdown && dropdown.classList.contains('show') && !userBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});