// ASeSt UI - Main Application Script

// Utility functions
function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = `<div class="message ${type}">${message}</div>`;
}

function clearMessages(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

function redirectTo(path) {
    window.location.href = path;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/session');
        if (response.ok) {
            const session = await response.json();
            return session;
        }
    } catch (error) {
        console.log('Not authenticated');
    }
    return null;
}

// Update navigation based on auth status
async function updateNavigation() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const session = await checkAuthStatus();

    if (session) {
        nav.innerHTML = `
            <span>Welcome, ${session.identity?.traits?.email || 'User'}</span>
            <a href="/dashboard">Dashboard</a>
            <button id="logoutBtn">Logout</button>
        `;

        // Add logout handler
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
                deleteCookie('ory_kratos_session');
                redirectTo('/');
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    } else {
        nav.innerHTML = `
            <button id="loginBtn">Login</button>
            <button id="registerBtn">Register</button>
        `;

        // Add navigation handlers
        document.getElementById('loginBtn').addEventListener('click', () => redirectTo('/login'));
        document.getElementById('registerBtn').addEventListener('click', () => redirectTo('/registration'));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
});