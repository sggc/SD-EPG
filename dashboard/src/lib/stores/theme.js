import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	const getInitialTheme = (): Theme => {
		if (browser) {
			const stored = localStorage.getItem('theme');
			if (stored === 'light' || stored === 'dark') {
				return stored;
			}
			if (window.matchMedia('(prefers-color-scheme: light)').matches) {
				return 'light';
			}
		}
		return 'dark';
	};

	const theme = writable<Theme>(getInitialTheme());

	function setTheme(newTheme: Theme) {
		theme.set(newTheme);
		if (browser) {
			localStorage.setItem('theme', newTheme);
			document.documentElement.setAttribute('data-theme', newTheme);
		}
	}

	function toggle() {
		theme.update(current => {
			const newTheme = current === 'dark' ? 'light' : 'dark';
			setTheme(newTheme);
			return newTheme;
		});
	}

	if (browser) {
		theme.subscribe(value => {
			document.documentElement.setAttribute('data-theme', value);
		});
	}

	return {
		subscribe: theme.subscribe,
		toggle,
		setTheme
	};
}

export const themeStore = createThemeStore();
