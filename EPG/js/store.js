const Auth = {
    isLoggedIn: false,
    token: null,
    user: null,

    init() {
        const token = localStorage.getItem('github_token');
        const user = localStorage.getItem('github_user');
        if (token && user) {
            this.isLoggedIn = true;
            this.token = token;
            this.user = JSON.parse(user);
            GitHub.setToken(token);
        }
    },

    async loginWithToken(token) {
        if (!token) return { success: false, error: 'Token 不能为空' };
        try {
            const res = await fetch('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Token 无效或已过期');
            }
            const user = await res.json();
            localStorage.setItem('github_token', token);
            localStorage.setItem('github_user', JSON.stringify(user));
            this.isLoggedIn = true;
            this.token = token;
            this.user = user;
            GitHub.setToken(token);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    logout() {
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
        this.isLoggedIn = false;
        this.token = null;
        this.user = null;
        GitHub.clearToken();
    }
};

const Theme = {
    _current: 'dark',

    init() {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') {
            this._current = stored;
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            this._current = 'light';
        }
        this.apply();
        this.updateIcon();
    },

    get current() { return this._current; },

    apply() {
        document.documentElement.setAttribute('data-theme', this._current);
        localStorage.setItem('theme', this._current);
    },

    toggle() {
        this._current = this._current === 'dark' ? 'light' : 'dark';
        this.apply();
        this.updateIcon();
    },

    updateIcon() {
        const sun = document.getElementById('theme-icon-sun');
        const moon = document.getElementById('theme-icon-moon');
        if (!sun || !moon) return;
        sun.style.display = this._current === 'dark' ? 'block' : 'none';
        moon.style.display = this._current === 'dark' ? 'none' : 'block';
    }
};

