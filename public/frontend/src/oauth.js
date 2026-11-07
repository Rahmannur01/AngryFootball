// OAuth integration for Google and Telegram

const BASE_PATH = window.BASE_PATH || '/angryfootball';
const API_URL = `${BASE_PATH}/api/auth`;
const TOKEN_KEY = 'angry-football.access-token';

// Google OAuth
export function initGoogleOAuth() {
    if (typeof google === 'undefined') {
        console.warn('Google SDK not loaded');
        return;
    }

    google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_CLIENT_ID || '',
        scope: 'email profile',
        callback: handleGoogleResponse
    });
}

async function handleGoogleResponse(response) {
    try {
        const res = await fetch(`${API_URL}/oauth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_token: response.access_token
            })
        });

        if (!res.ok) throw new Error('OAuth failed');

        const data = await res.json();
        sessionStorage.setItem(TOKEN_KEY, data.access_token);
        window.location.href = './home.html';
    } catch (error) {
        console.error('Google OAuth error:', error);
        alert('Не удалось войти через Google');
    }
}

// Telegram OAuth
window.onTelegramAuth = async function(user) {
    try {
        const response = await fetch(`${API_URL}/oauth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
        });

        if (!response.ok) throw new Error('OAuth failed');

        const data = await response.json();
        sessionStorage.setItem(TOKEN_KEY, data.access_token);
        window.location.href = './home.html';
    } catch (error) {
        console.error('Telegram OAuth error:', error);
        alert('Не удалось войти через Telegram');
    }
};

export function googleLogin() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_CLIENT_ID || '',
        scope: 'email profile',
        callback: handleGoogleResponse
    });
    client.requestAccessToken();
}
