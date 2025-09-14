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

            const flowResponse = await fetch('http://localhost:4433/self-service/login/browser');
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

            const formData = new URLSearchParams();
            formData.append('method', 'password');
            formData.append('password_identifier', email);
            formData.append('password', password);
            formData.append('csrf_token', csrfToken);

            const loginResponse = await fetch('http://localhost:4433/self-service/login?flow=' + flowId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                redirect: 'manual'
            });

            if (loginResponse.status === 302) {
                const location = loginResponse.headers.get('location');
                window.location = location;
                return;
            }

            const loginData = await loginResponse.json();

            if (loginResponse.ok) {
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