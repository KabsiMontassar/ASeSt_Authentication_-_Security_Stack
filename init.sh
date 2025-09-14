#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "Waiting for services to be ready..."

# Wait for PostgreSQL
until docker compose exec -T postgres pg_isready -U ${POSTGRES_USER}; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Wait for Vault
until curl -s ${VAULT_ADDR}/v1/sys/health > /dev/null; do
  echo "Waiting for Vault..."
  sleep 2
done

echo "Services are ready. Initializing..."

# Initialize Vault
curl -X POST -H "X-Vault-Token: ${VAULT_TOKEN}" -d '{"type": "kv-v2"}' ${VAULT_ADDR}/v1/sys/mounts/secret

# Add a sample secret
curl -X POST -H "X-Vault-Token: ${VAULT_TOKEN}" -d '{"data": {"api_key": "sample-api-key-123", "db_password": "secret-db-pass"}}' ${VAULT_ADDR}/v1/secret/data/myapp

echo "Vault initialized with sample secrets."

# Create sample database table
docker compose exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255)
);

INSERT INTO users (id, email, name) VALUES
  ('alice', 'alice@example.com', 'Alice Admin'),
  ('bob', 'bob@example.com', 'Bob User'),
  ('charlie', 'charlie@example.com', 'Charlie Finance')
ON CONFLICT (id) DO NOTHING;
"

echo "Database initialized with sample users."

echo "Initialization complete!"