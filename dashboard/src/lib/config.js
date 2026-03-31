export const CONFIG = {
	GITHUB_USER: 'sggc',
	PUBLIC_REPO: 'SD-EPG',
	PRIVATE_REPO: 'SDU-IPTV-NEW',
	
	OAUTH_CLIENT_ID: '',
	OAUTH_REDIRECT_URI: '',
	
	API_BASE: 'https://api.github.com',
	RAW_BASE: 'https://raw.githubusercontent.com'
};

export function setOAuthConfig(clientId, redirectUri) {
	CONFIG.OAUTH_CLIENT_ID = clientId;
	CONFIG.OAUTH_REDIRECT_URI = redirectUri || window.location.origin + window.location.pathname;
}
