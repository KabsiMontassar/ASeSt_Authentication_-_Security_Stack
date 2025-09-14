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
                        return status >= 200 && status < 500; // Accept all responses to handle validation errors
                    }
                }
            );

            // Handle successful login or redirect
            if (loginResponse.status === 303 || loginResponse.status === 302) {
                const location = loginResponse.headers.location;
                console.log('Login redirect to:', location);
                
                // If the redirect is to the UI service, follow it
                if (location && location.includes('localhost:3000')) {
                    window.location.href = location;
                } else {
                    // Otherwise redirect to dashboard
                    showMessage('messages', 'Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        redirectTo('/dashboard');
                    }, 1000);
                }
                return;
            }

            if (loginResponse.status === 200 || loginResponse.status === 201) {
                showMessage('messages', 'Login successful! Redirecting...', 'success');

                // Check if we have a session by calling the session endpoint
                try {
                    const sessionCheck = await axios.get('/api/session', {
                        withCredentials: true
                    });
                    
                    if (sessionCheck.status === 200) {
                        // Session is valid, redirect to dashboard
                        setTimeout(() => {
                            redirectTo('/dashboard');
                        }, 1000);
                    } else {
                        throw new Error('Session validation failed');
                    }
                } catch (sessionError) {
                    console.log('Session validation error:', sessionError);
                    // Still try to redirect, the dashboard will handle auth check
                    setTimeout(() => {
                        redirectTo('/dashboard');
                    }, 1000);
                }
                return;
            }

            // Handle validation errors (400 status)
            if (loginResponse.status === 400 || loginResponse.status === 401) {
                const errorData = loginResponse.data;
                
                // Extract validation errors from UI nodes
                let errorMessages = [];
                if (errorData.ui && errorData.ui.nodes) {
                    errorData.ui.nodes.forEach(node => {
                        if (node.messages && node.messages.length > 0) {
                            node.messages.forEach(msg => {
                                if (msg.type === 'error') {
                                    errorMessages.push(msg.text);
                                }
                            });
                        }
                    });
                }

                if (errorMessages.length > 0) {
                    showMessage('messages', errorMessages.join('. '), 'error');
                } else {
                    showMessage('messages', 'Login failed. Please check your credentials and try again.', 'error');
                }
                return;
            }

        } catch (error) {
            console.error('Login error:', error);

            // Handle axios error response
            if (error.response) {
                const errorData = error.response.data;
                console.log('Error response data:', errorData);
                
                // Extract validation errors from UI nodes
                let errorMessages = [];
                if (errorData.ui && errorData.ui.nodes) {
                    errorData.ui.nodes.forEach(node => {
                        if (node.messages && node.messages.length > 0) {
                            node.messages.forEach(msg => {
                                if (msg.type === 'error') {
                                    errorMessages.push(msg.text);
                                }
                            });
                        }
                    });
                }

                if (errorMessages.length > 0) {
                    showMessage('messages', errorMessages.join('. '), 'error');
                } else if (errorData.error?.message) {
                    showMessage('messages', errorData.error.message, 'error');
                } else if (errorData.message) {
                    showMessage('messages', errorData.message, 'error');
                } else {
                    showMessage('messages', 'Login failed. Please try again.', 'error');
                }
            } else if (error.request) {
                showMessage('messages', 'Network error. Please check your connection and try again.', 'error');
            } else {
                showMessage('messages', 'An unexpected error occurred. Please try again.', 'error');
            }
        }
    });
});