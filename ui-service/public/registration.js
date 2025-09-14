// Registration Page Script

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Registration form submitted - using direct Kratos submission');

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

            const flowResponse = await fetch('http://localhost:4433/self-service/registration/browser');
            if (!flowResponse.ok) {
                throw new Error('Failed to initialize registration flow');
            }

            const flowData = await flowResponse.json();
            const flowId = flowData.id;

            // Extract CSRF token from the UI nodes
            const csrfNode = flowData.ui.nodes.find(node => node.attributes.name === 'csrf_token');
            const csrfToken = csrfNode ? csrfNode.attributes.value : null;

            if (!csrfToken) {
                throw new Error('CSRF token not found in flow response');
            }

            // Submit registration
            showMessage('messages', 'Creating your account...', 'info');
            console.log('Submitting registration directly to Kratos:', 'http://localhost:4433/self-service/registration?flow=' + flowId);

            const formData = new URLSearchParams();
            formData.append('method', 'password');
            formData.append('traits.email', email);
            formData.append('password', password);
            formData.append('csrf_token', csrfToken);

            const registrationResponse = await fetch('http://localhost:4433/self-service/registration?flow=' + flowId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                redirect: 'manual'
            });

            if (registrationResponse.status === 302) {
                const location = registrationResponse.headers.get('location');
                window.location = location;
                return;
            }

            const registrationData = await registrationResponse.json();

            if (registrationResponse.ok) {
                showMessage('messages', 'Account created successfully! Please check your email for verification.', 'success');

                // Redirect to login after a delay
                setTimeout(() => {
                    redirectTo('/login');
                }, 3000);
            } else {
                // Handle registration errors
                const errorMessage = registrationData.error?.message || registrationData.message || 'Registration failed';
                showMessage('messages', errorMessage, 'error');
            }

        } catch (error) {
            console.error('Registration error:', error);
            showMessage('messages', 'An error occurred during registration. Please try again.', 'error');
        }
    });
});