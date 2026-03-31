import { writable } from 'svelte/store';

function createDataStore() {
	const { subscribe, set, update } = writable({
		epgConfig: null,
		descConfig: null,
		provinces: null,
		database: {
			descDatabase: null,
			apidb: null,
			manMade: null,
			progress: null
		},
		loading: false,
		error: null
	});

	return {
		subscribe,
		
		setLoading(loading) {
			update(s => ({ ...s, loading }));
		},
		
		setError(error) {
			update(s => ({ ...s, error, loading: false }));
		},
		
		setEpgConfig(config) {
			update(s => ({ ...s, epgConfig: config }));
		},
		
		setDescConfig(config) {
			update(s => ({ ...s, descConfig: config }));
		},
		
		setProvinces(data) {
			update(s => ({ ...s, provinces: data }));
		},
		
		setDatabase(key, data) {
			update(s => ({
				...s,
				database: { ...s.database, [key]: data }
			}));
		},
		
		reset() {
			set({
				epgConfig: null,
				descConfig: null,
				provinces: null,
				database: {
					descDatabase: null,
					apidb: null,
					manMade: null,
					progress: null
				},
				loading: false,
				error: null
			});
		}
	};
}

export const dataStore = createDataStore();
