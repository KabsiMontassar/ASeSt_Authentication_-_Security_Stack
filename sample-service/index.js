const express = require('express');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { newEnforcer } = require('casbin');
const { Client } = require('pg');
const vault = require('node-vault')();

const app = express();
app.use(express.json());

const port = 8080;

// JWT verification
const client = jwksClient({
  jwksUri: 'http://hydra:4445/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Casbin enforcer
let enforcer;

async function initCasbin() {
  // Use PostgreSQL adapter for better production compatibility
  const pgAdapter = require('casbin-pg-adapter');
  const adapter = await pgAdapter.newAdapter(process.env.DATABASE_URL);
  
  enforcer = await newEnforcer('/app/config/casbin/model.conf', adapter);
  
  // Load policies from the adapter
  await enforcer.loadPolicy();
}

initCasbin();

// PostgreSQL client
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

pgClient.connect();

// Vault client
vault.token = process.env.VAULT_TOKEN;

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Middleware to check permissions
const checkPermission = async (req, res, next) => {
  const { user } = req;
  const obj = req.path;
  const act = req.method.toLowerCase();

  const allowed = await enforcer.enforce(user.sub, obj, act);
  if (!allowed) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

app.get('/api/user', verifyToken, checkPermission, async (req, res) => {
  // Get user data from database
  const result = await pgClient.query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
  res.json(result.rows[0]);
});

app.get('/api/secret', verifyToken, checkPermission, async (req, res) => {
  // Get secret from Vault
  const secret = await vault.read('secret/data/myapp');
  res.json(secret.data.data);
});

app.get('/api/admin', verifyToken, checkPermission, (req, res) => {
  res.json({ message: 'Admin access granted' });
});

app.listen(port, () => {
  console.log(`Sample service listening at http://localhost:${port}`);
});