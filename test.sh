#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "Testing ASeSt stack..."

# Override VAULT_ADDR for external access
VAULT_ADDR="http://localhost:8210"

# Test PostgreSQL connection
echo "Testing PostgreSQL..."
docker compose exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "SELECT 1;" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ PostgreSQL is running"
else
  echo "❌ PostgreSQL failed"
fi

# Test Vault
echo "Testing Vault..."
curl -s -H "X-Vault-Token: ${VAULT_TOKEN}" ${VAULT_ADDR}/v1/secret/data/myapp > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Vault is running and has secrets"
else
  echo "❌ Vault failed"
fi

# Test Kratos
echo "Testing Kratos..."
curl -s http://localhost:4433/health/ready > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Kratos is running"
else
  echo "❌ Kratos failed"
fi

# Test Hydra
echo "Testing Hydra..."
curl -s http://localhost:4444/health/ready > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Hydra is running"
else
  echo "❌ Hydra failed"
fi

# Test Oathkeeper
echo "Testing Oathkeeper..."
curl -s http://localhost:4456/health/ready > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Oathkeeper is running"
else
  echo "❌ Oathkeeper failed"
fi

# Test Sample Service
echo "Testing Sample Service..."
curl -s http://localhost:8080 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Sample Service is running"
else
  echo "❌ Sample Service failed"
fi

echo "Testing complete!"