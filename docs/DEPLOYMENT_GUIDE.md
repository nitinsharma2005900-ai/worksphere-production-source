# WorkSphere – Production Cloud Deployment Guide

## 1. Cloud Architecture Overview
WorkSphere is designed for deployment to any modern cloud infrastructure (AWS EC2, DigitalOcean Droplet, GCP Compute Engine, or Azure Linux VM) behind an Nginx reverse proxy with TLS/HTTPS.

## Render Demo Deployment

The repository includes a `render.yaml` Blueprint for the frontend, backend, and analytics service. To deploy the demo, connect the public GitHub repository to Render and create a Blueprint from `render.yaml`. Anyone can view or clone the source at https://github.com/nitinsharma2005900-ai/worksphere-production-source without a repository invitation. The Blueprint generates JWT and analytics service secrets; do not replace them with committed values.

The current backend stores application data in process memory. Seeded demo accounts load on startup, but projects and other changes made after startup can be lost when a free Render service sleeps or restarts. This setup is for preview/demo use only, not durable production data. PostgreSQL is not yet wired into the runtime data store.

---

## 2. Infrastructure Deployment Steps

### Step 1: Provision Host VM & Install Runtimes
```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 certbot python3-certbot-nginx
sudo usermod -aG docker $USER
```

### Step 2: Configure Production Environment Variables
Create `/opt/worksphere/.env`:
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://worksphere:STRONG_GENERATED_PASSWORD@postgres:5432/worksphere_db?schema=public
JWT_ACCESS_SECRET=STRONG_RANDOM_ACCESS_SECRET_MIN_32_CHARACTERS
JWT_REFRESH_SECRET=STRONG_RANDOM_REFRESH_SECRET_MIN_32_CHARACTERS
ANALYTICS_INTERNAL_API_KEY=STRONG_INTERNAL_SERVICE_KEY
POSTGRES_USER=worksphere
POSTGRES_PASSWORD=STRONG_DATABASE_PASSWORD
POSTGRES_DB=worksphere_db
MINIO_ROOT_USER=STRONG_MINIO_USER
MINIO_ROOT_PASSWORD=STRONG_MINIO_PASSWORD
CORS_ORIGIN=https://app.yourdomain.com
STORAGE_MODE=s3
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=worksphere-production-attachments
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_live_api_key
```

The `docker-compose.yml` file deliberately requires the database, object-storage, JWT, and internal-service secrets above; it no longer contains production-style credential values. Keep this environment file outside version control.

### Step 3: SSL / HTTPS Configuration
Obtain free TLS certificates using Let's Encrypt:
```bash
sudo certbot certonly --standalone -d app.yourdomain.com
```

### Step 4: Launch Services with Docker Compose
```bash
docker compose -f docker-compose.yml up -d --build
```

### Step 5: Automated Daily Backups
Configure a daily cron job to run `infrastructure/scripts/backup.sh` at 02:00 AM UTC:
```bash
crontab -e
# Add line:
0 2 * * * /opt/worksphere/infrastructure/scripts/backup.sh >> /var/log/worksphere_backup.log 2>&1
```

---

## 3. Disaster Recovery & Restoration Verification
To test and verify a database restore without impacting production:
```bash
chmod +x infrastructure/scripts/restore.sh
./infrastructure/scripts/restore.sh /var/backups/worksphere/worksphere_db_YYYYMMDD_HHMMSS.sql.gz worksphere_restore_verification
```
The script validates schema structure, indexes, and row count matches.
