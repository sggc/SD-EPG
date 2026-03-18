import { writable } from 'svelte/store';
import { CONFIG } from '$lib/config.js';

function createAuthStore() {
	const { subscribe, set, update } = writable({
		isLoggedIn: false,
		token: null,
		user: null,
		loading: false,
		error: null
	});

	return {
		subscribe,
		
		init() {
			const stored = localStorage.getItem('github_token');
			const userStored = localStorage.getItem('github_user');
			
			if (stored && userStored) {
				update(s => ({
					...s,
					isLoggedIn: true,
					token: stored,
					user: JSON.parse(userStored)
				}));
			}
		},
		
		async login() {
			if (!CONFIG.OAUTH_CLIENT_ID) {
				update(s => ({ ...s, error: '未配置 OAuth Client ID' }));
				return;
			}
			
			const state = Math.random().toString(36).substring(7);
			sessionStorage.setItem('oauth_state', state);
			
			const params = new URLSearchParams({
				client_id: CONFIG.OAUTH_CLIENT_ID,
				redirect_uri: CONFIG.OAUTH_REDIRECT_URI,
				scope: 'repo read:user',
				state: state
			});
			
			window.location.href = `https://github.com/login/oauth/authorize?${params}`;
		},
		
		async handleCallback(code, state) {
			const storedState = sessionStorage.getItem('oauth_state');
			if (state !== storedState) {
				update(s => ({ ...s, error: '无效的 OAuth 状态' }));
				return false;
			}
			
			update(s => ({ ...s, loading: true }));
			
			try {
				const response = await fetch('/api/auth', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code })
				});
				
				if (!response.ok) {
					throw new Error('获取 token 失败');
				}
				
				const { access_token } = await response.json();
				
				const userResponse = await fetch('https://api.github.com/user', {
					headers: { Authorization: `Bearer ${access_token}` }
				});
				
				const user = await userResponse.json();
				
				localStorage.setItem('github_token', access_token);
				localStorage.setItem('github_user', JSON.stringify(user));
				
				set({
					isLoggedIn: true,
					token: access_token,
					user: user,
					loading: false,
					error: null
				});
				
				return true;
			} catch (error) {
				update(s => ({ ...s, loading: false, error: error.message }));
				return false;
			}
		},
		
		logout() {
			localStorage.removeItem('github_token');
			localStorage.removeItem('github_user');
			set({
				isLoggedIn: false,
				token: null,
				user: null,
				loading: false,
				error: null
			});
		}
	};
}

export const authStore = createAuthStore();
