// Login Page Script

// Configure Axios defaults for cookie handling
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrf_token';
axios.defaults.xsrfHeaderName = 'X-CSRF-Token';

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

            const flowResponse = await axios.get('http://localhost:4433/self-service/login/browser', {
                withCredentials: true
            });

            const flowData = flowResponse.data;
            const flowId = flowData.id;

            // Extract CSRF token from the UI nodes
            const csrfToken = extractCSRFToken(flowData);

            if (!csrfToken) {
                throw new Error('CSRF token not found in flow response');
            }

            console.log('CSRF Token:', csrfToken);

            // Submit login
            showMessage('messages', 'Signing you in...', 'info');

            const formData = new URLSearchParams();
            formData.append('method', 'password');
            formData.append('password_identifier', email);
            formData.append('password', password);
            formData.append('csrf_token', csrfToken);

            const loginResponse = await axios.post(
                `http://localhost:4433/self-service/login?flow=${flowId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRF-Token': csrfToken
                    },
                    withCredentials: true,
                    maxRedirects: 0,
                    validateStatus: function (status) {
                        return status >= 200 && status < 400; // Accept redirects
                    }
                }
            );

            // Handle successful login or redirect
            if (loginResponse.status === 303 || loginResponse.status === 302) {
                const location = loginResponse.headers.location;
                if (location) {
                    window.location.href = location;
                    return;
                }
            }

            if (loginResponse.status === 200 || loginResponse.status === 201) {
                showMessage('messages', 'Login successful! Redirecting...', 'success');

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    redirectTo('/dashboard');
                }, 1000);
            }

        } catch (error) {
            console.error('Login error:', error);

            // Handle axios error response
            if (error.response) {
                const errorData = error.response.data;
                if (errorData.ui && errorData.ui.messages) {
                    const errorMessages = errorData.ui.messages.map(msg => msg.text).join(', ');
                    showMessage('messages', errorMessages, 'error');
                } else {
                    const errorMessage = errorData.error?.message || errorData.message || 'Login failed';
                    showMessage('messages', errorMessage, 'error');
                }
            } else {
                showMessage('messages', 'An error occurred during login. Please try again.', 'error');
            }
        }
    });
});