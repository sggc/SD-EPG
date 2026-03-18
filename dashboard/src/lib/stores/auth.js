import { writable } from 'svelte/store';
import { browser } from '$app/environment';

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
			if (!browser) return;
			
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
			if (!browser) return;
			
			const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
			if (!clientId) {
				this.loginWithToken();
				return;
			}
			
			const redirectUri = 'https://sggc.github.io/SD-EPG/auth/callback';
			
			const state = Math.random().toString(36).substring(7);
			sessionStorage.setItem('oauth_state', state);
			
			const params = new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				scope: 'repo read:user',
				state: state
			});
			
			window.location.href = `https://github.com/login/oauth/authorize?${params}`;
		},
		
		async loginWithToken() {
			const token = prompt('请输入 GitHub Personal Access Token (用于测试):');
			if (token) {
				try {
					const userResponse = await fetch('https://api.github.com/user', {
						headers: { Authorization: `Bearer ${token}` }
					});
					
					if (!userResponse.ok) throw new Error('Token 无效');
					
					const user = await userResponse.json();
					
					localStorage.setItem('github_token', token);
					localStorage.setItem('github_user', JSON.stringify(user));
					
					set({
						isLoggedIn: true,
						token: token,
						user: user,
						loading: false,
						error: null
					});
				} catch (e) {
					alert('Token 验证失败: ' + e.message);
				}
			}
		},
		
		async handleCallback(code, state) {
			if (!browser) return false;
			
			const storedState = sessionStorage.getItem('oauth_state');
			if (state !== storedState) {
				update(s => ({ ...s, error: '无效的 OAuth 状态' }));
				return false;
			}
			
			update(s => ({ ...s, loading: true }));
			
			try {
				const basePath = import.meta.env.BASE_URL || '/SD-EPG';
				const response = await fetch(`${basePath}/api/auth`, {
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
			if (!browser) return;
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
