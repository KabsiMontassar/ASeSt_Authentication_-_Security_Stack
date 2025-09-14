// Login Page Script

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        clearMessages('messages');

        try {
            // Get login flow
            showMessage('messages', 'Initializing login...', 'info');

            const flowResponse = await fetch('/api/login-flow');
            if (!flowResponse.ok) {
                throw new Error('Failed to initialize login flow');
            }

            const flowData = await flowResponse.json();
            const flowId = flowData.id;

            // Extract CSRF token from the UI nodes
            const csrfNode = flowData.ui.nodes.find(node => node.attributes.name === 'csrf_token');
            const csrfToken = csrfNode ? csrfNode.attributes.value : null;

            if (!csrfToken) {
                throw new Error('CSRF token not found in flow response');
            }

            // Submit login
            showMessage('messages', 'Signing you in...', 'info');

            const loginResponse = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    flow: flowId,
                    email: email,
                    password: password,
                    csrf_token: csrfToken
                })
            });

            const loginData = await loginResponse.json();

            if (loginResponse.ok) {
                // Set session cookie
                if (loginData.session_token) {
                    setCookie('ory_kratos_session', loginData.session_token);
                }

                showMessage('messages', 'Login successful! Redirecting...', 'success');

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    redirectTo('/dashboard');
                }, 1000);
            } else {
                // Handle login errors
                const errorMessage = loginData.error?.message || loginData.message || 'Login failed';
                showMessage('messages', errorMessage, 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
            showMessage('messages', 'An error occurred during login. Please try again.', 'error');
        }
    });
});