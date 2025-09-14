// Registration Page Script

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

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

            const flowResponse = await fetch('/api/registration-flow');
            if (!flowResponse.ok) {
                throw new Error('Failed to initialize registration flow');
            }

            const flowData = await flowResponse.json();
            const flowId = flowData.id;
            const csrfToken = flowData.csrf_token;

            // Submit registration
            showMessage('messages', 'Creating your account...', 'info');

            const registrationResponse = await fetch('/api/registration', {
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