const CONFIG = {
    GITHUB_USER: 'sggc',
    PUBLIC_REPO: 'SD-EPG',
    PRIVATE_REPO: 'SDU-IPTV-NEW',
    API_BASE: 'https://api.github.com',
    RAW_BASE: 'https://raw.githubusercontent.com'
};

const GitHub = {
    _token: null,

    setToken(token) { this._token = token; },
    clearToken() { this._token = null; },

    async fetchWithAuth(url, options = {}) {
        const headers = { 'Accept': 'application/vnd.github.v3+json', ...options.headers };
        if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        return res;
    },

    async getPublicFile(path) {
        const url = `${CONFIG.RAW_BASE}/${CONFIG.GITHUB_USER}/${CONFIG.PUBLIC_REPO}/main/${path}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`获取文件失败: ${path}`);
        return res.json();
    },

    async getPublicFileRaw(path) {
        const url = `${CONFIG.RAW_BASE}/${CONFIG.GITHUB_USER}/${CONFIG.PUBLIC_REPO}/main/${path}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`获取文件失败: ${path}`);
        return res.text();
    },

    async getPrivateFile(path) {
        const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${CONFIG.PRIVATE_REPO}/contents/${path}`;
        const res = await this.fetchWithAuth(url);
        const data = await res.json();
        return JSON.parse(atob(data.content));
    },

    async getFileContent(repo, path) {
        const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}/contents/${path}`;
        const res = await this.fetchWithAuth(url);
        const data = await res.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        return { content, sha: data.sha, path: data.path };
    },

    async updateFile(repo, path, content, message, sha) {
        const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}/contents/${path}`;
        const res = await this.fetchWithAuth(url, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha
            })
        });
        return res.json();
    },

    async getRepoInfo(repo) {
        const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}`;
        const res = await this.fetchWithAuth(url);
        return res.json();
    },

    async checkRepoAccess(repo) {
        try { await this.getRepoInfo(repo); return true; }
        catch { return false; }
    },

    async getUser() {
        if (!this._token) return null;
        const res = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${this._token}` }
        });
        return res.json();
    }
};