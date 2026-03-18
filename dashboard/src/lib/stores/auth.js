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
			
			const token = prompt('请输入 GitHub Personal Access Token:\n\n需要在 GitHub Settings > Developer settings > Personal access tokens 创建，权限选择 repo 和 read:user');
			
			if (!token) return;
			
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
			} catch (e) {
				update(s => ({ ...s, loading: false, error: e.message }));
				alert('登录失败: ' + e.message);
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
