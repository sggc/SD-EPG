import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: false
		}),
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/SD-EPG' : ''
		},
		prerender: {
			handleHttpError: 'ignore',
			handleMissingId: 'ignore',
			handleUnseenRoutes: 'ignore',
			entries: ['/', '/epg-config', '/desc-config', '/database', '/config', '/logs']
		}
	}
};

export default config;
