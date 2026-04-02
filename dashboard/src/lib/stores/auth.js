import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createAuthStore() {
	const { subscribe, set, update } = writable({
		isLoggedIn: false,
		token: null,
		user: null,
		loading: false,
		error: null,
		showLoginModal: false
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
			update(s => ({ ...s, showLoginModal: true }));
			return { success: false, error: '请使用登录对话框' };
		},

		openLoginModal() {
			update(s => ({ ...s, showLoginModal: true }));
		},

		closeLoginModal() {
			update(s => ({ ...s, showLoginModal: false, error: null }));
		},
		
		async loginWithToken(token) {
			if (!browser || !token) return { success: false, error: 'Token 不能为空' };
			
			update(s => ({ ...s, loading: true, error: null }));
			
			try {
				const userResponse = await fetch('https://api.github.com/user', {
					headers: { 
						Authorization: `Bearer ${token}`,
						Accept: 'application/vnd.github.v3+json'
					}
				});
				
				if (!userResponse.ok) {
					const errorData = await userResponse.json().catch(() => ({}));
					throw new Error(errorData.message || 'Token 无效或已过期');
				}
				
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
				
				return { success: true };
			} catch (e) {
				update(s => ({ ...s, loading: false, error: e.message }));
				return { success: false, error: e.message };
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
