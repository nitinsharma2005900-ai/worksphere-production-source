# WorkSphere – Environment Setup & Configuration

## 1. Environment Template Setup
Copy the template to your root directory:
```bash
cp .env.example .env
```

## 2. Configuration Parameters

```ini
# Node Environment & Network
NODE_ENV=development
PORT=4000
API_BASE_URL=http://localhost:4000/api/v1
CORS_ORIGIN=http://localhost:3000

# Next.js Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME="WorkSphere"

# Python FastAPI Microservice
ANALYTICS_SERVICE_PORT=8000
ANALYTICS_SERVICE_URL=http://localhost:8000
ANALYTICS_INTERNAL_API_KEY=ws_internal_sec_analytics_dev_key_2026

# PostgreSQL Database
DATABASE_URL=postgresql://worksphere:worksphere_password@localhost:5432/worksphere_db?schema=public

# Redis & BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_ACCESS_SECRET=dev_jwt_access_secret_super_secure_32_characters_minimum_key
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_super_secure_32_characters_minimum_key
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Storage & Email
STORAGE_MODE=local
EMAIL_PROVIDER=mock
```
