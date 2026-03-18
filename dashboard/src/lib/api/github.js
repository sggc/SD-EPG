import { CONFIG } from '$lib/config.js';
import { authStore } from '$lib/stores/auth.js';
import { get } from 'svelte/store';

async function fetchWithAuth(url, options = {}) {
	const { token } = get(authStore);
	
	const headers = {
		'Accept': 'application/vnd.github.v3+json',
		...options.headers
	};
	
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	
	const response = await fetch(url, { ...options, headers });
	
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || `HTTP ${response.status}`);
	}
	
	return response;
}

export const github = {
	async getPublicFile(path) {
		const url = `${CONFIG.RAW_BASE}/${CONFIG.GITHUB_USER}/${CONFIG.PUBLIC_REPO}/main/${path}`;
		const response = await fetch(url);
		if (!response.ok) throw new Error(`获取文件失败: ${path}`);
		return response.json();
	},
	
	async getPrivateFile(path) {
		const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${CONFIG.PRIVATE_REPO}/contents/${path}`;
		const response = await fetchWithAuth(url);
		const data = await response.json();
		const content = atob(data.content);
		return JSON.parse(content);
	},
	
	async getFileContent(repo, path) {
		const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}/contents/${path}`;
		const response = await fetchWithAuth(url);
		const data = await response.json();
		return {
			content: atob(data.content),
			sha: data.sha,
			path: data.path
		};
	},
	
	async updateFile(repo, path, content, message, sha) {
		const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}/contents/${path}`;
		const response = await fetchWithAuth(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				message,
				content: btoa(unescape(encodeURIComponent(content))),
				sha
			})
		});
		return response.json();
	},
	
	async getRepoInfo(repo) {
		const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}`;
		const response = await fetchWithAuth(url);
		return response.json();
	},
	
	async getWorkflowRuns(repo, limit = 10) {
		const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}/actions/runs?per_page=${limit}`;
		const response = await fetchWithAuth(url);
		return response.json();
	},
	
	async triggerWorkflow(repo, workflowId, inputs = {}) {
		const url = `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_USER}/${repo}/actions/workflows/${workflowId}/dispatches`;
		await fetchWithAuth(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ref: 'main', inputs })
		});
		return true;
	},
	
	async getUser() {
		const { token } = get(authStore);
		if (!token) return null;
		
		const response = await fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${token}` }
		});
		return response.json();
	},
	
	async checkRepoAccess(repo) {
		try {
			await this.getRepoInfo(repo);
			return true;
		} catch {
			return false;
		}
	}
};
