// Registration Page Script

// Configure Axios defaults for cookie handling
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrf_token';
axios.defaults.xsrfHeaderName = 'X-CSRF-Token';

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Registration form submitted - using Axios with proper cookie handling');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        clearMessages('messages');

        // Validate passwords match
        if (password !== confirmPassword) {
            showMessage('messages', 'Passwords do not match', 'error');
            return;
        }

        // Validate password length
        if (password.length < 8) {
            showMessage('messages', 'Password must be at least 8 characters long', 'error');
            return;
        }

        try {
            // Get registration flow
            showMessage('messages', 'Initializing registration...', 'info');

            const flowResponse = await axios.get('http://localhost:4433/self-service/registration/browser', {
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

            // Submit registration
            showMessage('messages', 'Creating your account...', 'info');
            console.log('Submitting registration directly to Kratos:', 'http://localhost:4433/self-service/registration?flow=' + flowId);

            const formData = new URLSearchParams();
            formData.append('method', 'password');
            formData.append('traits.email', email);
            formData.append('password', password);
            formData.append('csrf_token', csrfToken);

            const registrationResponse = await axios.post(
                `http://localhost:4433/self-service/registration?flow=${flowId}`,
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

            // Handle successful registration or redirect
            if (registrationResponse.status === 303 || registrationResponse.status === 302) {
                const location = registrationResponse.headers.location;
                if (location) {
                    window.location.href = location;
                    return;
                }
            }

            if (registrationResponse.status === 200 || registrationResponse.status === 201) {
                showMessage('messages', 'Account created successfully! Please check your email for verification.', 'success');

                // Redirect to login after a delay
                setTimeout(() => {
                    redirectTo('/login');
                }, 3000);
            }

        } catch (error) {
            console.error('Registration error:', error);

            // Handle axios error response
            if (error.response) {
                const errorData = error.response.data;
                if (errorData.ui && errorData.ui.messages) {
                    const errorMessages = errorData.ui.messages.map(msg => msg.text).join(', ');
                    showMessage('messages', errorMessages, 'error');
                } else {
                    const errorMessage = errorData.error?.message || errorData.message || 'Registration failed';
                    showMessage('messages', errorMessage, 'error');
                }
            } else {
                showMessage('messages', 'An error occurred during registration. Please try again.', 'error');
            }
        }
    });
});