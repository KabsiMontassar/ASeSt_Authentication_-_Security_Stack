const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API configuration
const KRATOS_PUBLIC_URL = 'http://kratos:4433';
const KRATOS_ADMIN_URL = 'http://kratos:4434';
const HYDRA_PUBLIC_URL = 'http://hydra:4444';
const HYDRA_ADMIN_URL = 'http://hydra:4445';
const OATHKEEPER_PROXY_URL = 'http://oathkeeper:4455';

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registration', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registration.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/recovery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'recovery.html'));
});

app.get('/verification', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verification.html'));
});

app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

// API Routes for handling authentication flows
app.get('/api/login-flow', async (req, res) => {
  try {
    const response = await axios.get(`${KRATOS_PUBLIC_URL}/self-service/login/browser`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registration-flow', async (req, res) => {
  try {
    const response = await axios.get(`${KRATOS_PUBLIC_URL}/self-service/registration/browser`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { flow, email, password, csrf_token } = req.body;

    // Send as form data instead of JSON for CSRF compatibility
    const formData = new URLSearchParams();
    formData.append('method', 'password');
    formData.append('password', password);
    formData.append('password_identifier', email);
    formData.append('csrf_token', csrf_token);

    const response = await axios.post(
      `${KRATOS_PUBLIC_URL}/self-service/login?flow=${flow}`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRF-Token': csrf_token
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/registration', async (req, res) => {
  try {
    const { flow, email, password, csrf_token } = req.body;

    // Send as form data instead of JSON for CSRF compatibility
    const formData = new URLSearchParams();
    formData.append('method', 'password');
    formData.append('password', password);
    formData.append('traits.email', email);
    formData.append('csrf_token', csrf_token);

    const response = await axios.post(
      `${KRATOS_PUBLIC_URL}/self-service/registration?flow=${flow}`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRF-Token': csrf_token
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/session', async (req, res) => {
  try {
    const sessionCookie = req.cookies.ory_kratos_session;
    console.log('Session check - cookie present:', !!sessionCookie);
    
    if (!sessionCookie) {
      return res.status(401).json({ error: 'No session cookie' });
    }

    const response = await axios.get(`${KRATOS_PUBLIC_URL}/sessions/whoami`, {
      headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
    });
    
    console.log('Session validation successful for user:', response.data.identity?.traits?.email);
    res.json(response.data);
  } catch (error) {
    console.log('Session validation failed:', error.response?.status, error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const sessionCookie = req.cookies.ory_kratos_session;
    console.log('Logout attempt, session cookie present:', !!sessionCookie);
    
    if (sessionCookie) {
      try {
        // First, try to get the logout flow
        const logoutFlowResponse = await axios.get(`${KRATOS_PUBLIC_URL}/self-service/logout/browser`, {
          headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
        });
        
        console.log('Logout flow created:', logoutFlowResponse.status);
        
        // Submit the logout
        if (logoutFlowResponse.data && logoutFlowResponse.data.logout_url) {
          await axios.get(logoutFlowResponse.data.logout_url, {
            headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
          });
        }
      } catch (kratosError) {
        console.log('Kratos logout error (continuing anyway):', kratosError.message);
        // Continue with cookie clearing even if Kratos logout fails
      }
    }
    
    // Clear all authentication cookies
    res.clearCookie('ory_kratos_session', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
    
    // Set additional cookie clearing headers
    res.set({
      'Clear-Site-Data': '"cookies"',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    console.log('Logout completed successfully');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error.message);
    
    // Even if there's an error, clear cookies and return success
    res.clearCookie('ory_kratos_session', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
    
    res.json({ success: true, message: 'Logged out (with errors, but cookies cleared)' });
  }
});

// Protected API route (requires authentication)
app.get('/api/protected', async (req, res) => {
  try {
    const sessionCookie = req.cookies.ory_kratos_session;
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // First, verify the Kratos session
    const sessionResponse = await axios.get(`${KRATOS_PUBLIC_URL}/sessions/whoami`, {
      headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
    });

    const userSession = sessionResponse.data;

    // For now, let's call the sample service directly without JWT
    // In production, you'd want to get a JWT token from Hydra
    try {
      const sampleResponse = await axios.get('http://sample-service:8080/api/user', {
        headers: {
          'Authorization': `Bearer fake-jwt-token`, // This would be a real JWT token
          'X-User-ID': userSession.identity.id,
          'X-User-Email': userSession.identity.traits.email
        }
      });

      res.json({
        user: userSession,
        data: sampleResponse.data
      });
    } catch (sampleError) {
      // If the sample service is not available or rejects, return user data only
      console.log('Sample service error:', sampleError.message);
      res.json({
        user: userSession,
        data: {
          message: 'User authenticated successfully',
          note: 'Sample service temporarily unavailable or needs proper JWT setup',
          user_id: userSession.identity.id,
          email: userSession.identity.traits.email,
          session_active: true,
          authenticated_at: userSession.authenticated_at
        }
      });
    }
  } catch (error) {
    console.error('Protected API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message || 'Authentication failed'
    });
  }
});

app.listen(port, () => {
  console.log(`UI Service listening at http://localhost:${port}`);
});