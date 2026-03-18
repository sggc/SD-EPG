import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const { code } = await request.json();
	
	const response = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify({
			client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
			client_secret: import.meta.env.VITE_OAUTH_CLIENT_SECRET,
			code
		})
	});
	
	const data = await response.json();
	
	if (data.error) {
		return json({ error: data.error_description }, { status: 400 });
	}
	
	return json({ access_token: data.access_token });
}
