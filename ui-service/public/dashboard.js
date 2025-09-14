// Dashboard Page Script

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    const session = await checkAuthStatus();

    if (!session) {
        redirectTo('/login');
        return;
    }

    // Update user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Welcome, ${session.identity?.traits?.email || 'User'}`;
    }

    // Load user profile
    loadUserProfile(session);

    // Load protected API data
    loadProtectedData();

    // Setup logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
                clearAuthCookies();
                redirectTo('/');
            } catch (error) {
                console.error('Logout error:', error);
                // Clear cookies anyway in case of error
                clearAuthCookies();
                redirectTo('/');
            }
        });
    }

    // Setup refresh API button
    const refreshBtn = document.getElementById('refreshApiBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadProtectedData);
    }
});

async function loadUserProfile(session) {
    const profileElement = document.getElementById('userProfile');
    if (!profileElement) return;

    profileElement.innerHTML = `
        <p><strong>Email:</strong> ${session.identity?.traits?.email || 'N/A'}</p>
        <p><strong>User ID:</strong> ${session.identity?.id || 'N/A'}</p>
        <p><strong>Created:</strong> ${new Date(session.identity?.created_at).toLocaleDateString() || 'N/A'}</p>
        <p><strong>Last Login:</strong> ${new Date(session.authenticated_at).toLocaleString() || 'N/A'}</p>
    `;
}

async function loadProtectedData() {
    const apiElement = document.getElementById('apiData');
    if (!apiElement) return;

    try {
        apiElement.innerHTML = '<p>Loading protected data...</p>';

        const response = await fetch('/api/protected');
        const data = await response.json();

        if (response.ok) {
            apiElement.innerHTML = `
                <p><strong>Status:</strong> Access granted</p>
                <p><strong>User ID:</strong> ${data.user?.identity?.id || 'N/A'}</p>
                <p><strong>Permissions:</strong> ${JSON.stringify(data.user?.identity?.metadata_public || {}, null, 2)}</p>
                <p><strong>API Response:</strong></p>
                <pre>${JSON.stringify(data.data || {}, null, 2)}</pre>
            `;
        } else {
            apiElement.innerHTML = `
                <p style="color: red;"><strong>Access denied:</strong> ${data.error || 'Unknown error'}</p>
            `;
        }
    } catch (error) {
        console.error('API error:', error);
        apiElement.innerHTML = `
            <p style="color: red;"><strong>Error:</strong> Failed to load protected data</p>
            <p>${error.message}</p>
        `;
    }
}

// Load permissions (mock data for demo)
function loadPermissions() {
    const permissionsElement = document.getElementById('permissions');
    if (!permissionsElement) return;

    permissionsElement.innerHTML = `
        <ul>
            <li>✅ Read user profile</li>
            <li>✅ Access protected APIs</li>
            <li>✅ View dashboard</li>
            <li>❌ Admin functions (requires admin role)</li>
        </ul>
    `;
}

// Call loadPermissions when page loads
document.addEventListener('DOMContentLoaded', loadPermissions);