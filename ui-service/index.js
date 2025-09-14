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

// Kratos API configuration
const KRATOS_PUBLIC_URL = 'http://kratos:4433';
const KRATOS_ADMIN_URL = 'http://kratos:4434';

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
    if (!sessionCookie) {
      return res.status(401).json({ error: 'No session cookie' });
    }

    const response = await axios.get(`${KRATOS_PUBLIC_URL}/sessions/whoami`, {
      headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const sessionCookie = req.cookies.ory_kratos_session;
    if (sessionCookie) {
      await axios.delete(`${KRATOS_PUBLIC_URL}/self-service/logout/browser`, {
        headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
      });
    }
    res.clearCookie('ory_kratos_session');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected API route (requires authentication)
app.get('/api/protected', async (req, res) => {
  try {
    const sessionCookie = req.cookies.ory_kratos_session;
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const response = await axios.get(`${KRATOS_PUBLIC_URL}/sessions/whoami`, {
      headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
    });

    // Call the sample service through Oathkeeper
    const sampleResponse = await axios.get('http://oathkeeper:4455/api/users', {
      headers: { Cookie: `ory_kratos_session=${sessionCookie}` }
    });

    res.json({
      user: response.data,
      data: sampleResponse.data
    });
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.listen(port, () => {
  console.log(`UI Service listening at http://localhost:${port}`);
});