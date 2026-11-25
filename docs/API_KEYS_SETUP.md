# WorkSphere – API Keys & Environment Configuration Guide

## 1. Secrets Management Rules
- **Never hardcode secrets** in application source files or git commits.
- **Never commit `.env`** to source control (strictly ignored in `.gitignore`).
- All environment keys are validated at server startup using Zod schemas (`backend/src/config/env.ts`) and Pydantic (`analytics-service/app/config.py`).

---

## 2. API Keys Reference Table

| Variable | Required? | Default / Dev Value | Description & How to Obtain |
|---|:---:|---|---|
| `JWT_ACCESS_SECRET` | **YES** | `dev_jwt_access_secret_super_secure_32_characters_minimum_key` | Secret key used to sign 15-minute access tokens. Generate with `openssl rand -hex 32`. |
| `JWT_REFRESH_SECRET` | **YES** | `dev_jwt_refresh_secret_super_secure_32_characters_minimum_key` | Secret key used to sign 7-day refresh tokens. |
| `ANALYTICS_INTERNAL_API_KEY` | **YES** | `ws_internal_sec_analytics_dev_key_2026` | Service-to-service shared header token (`X-Internal-Key`) between Node.js and FastAPI. |
| `EMAIL_PROVIDER` | No | `mock` | `mock` logs test messages; set to `resend` to send real invitations and analytics reports. |
| `RESEND_API_KEY` | Required for Resend | `""` | Create a free-tier key at https://resend.com/api-keys. Keep it in `.env`, never in frontend code. |
| `EMAIL_FROM` | Required for live delivery | `notifications@worksphere.local` | Use Resend's permitted test sender for testing, or an address on a domain verified in Resend for general recipients. |
| `APP_URL` | No | `http://localhost:3000` | Public app URL used to build invitation links. |

For live email, set `EMAIL_PROVIDER=resend`, add your `RESEND_API_KEY`, and set `EMAIL_FROM` to a sender accepted by Resend. Resend's test sender is restricted to verified recipients; verify a domain to invite arbitrary work addresses. Restart the backend after editing `.env`.

For a local test, use `EMAIL_FROM=onboarding@resend.dev` and send only to an address verified in your Resend account. For normal invitations, add and verify a domain in Resend, then use a sender such as `WorkSphere <notifications@yourdomain.com>`. Never send the API key to the browser or commit it.
| `STORAGE_MODE` | No | `local` | Set to `local` (saves to `./uploads`) or `s3` for AWS S3 / MinIO. |
| `S3_ACCESS_KEY_ID` | Optional | `minioadmin` | S3 or MinIO access credentials. |
| `S3_SECRET_ACCESS_KEY` | Optional | `minioadmin` | S3 or MinIO secret credentials. |
| `GOOGLE_CLIENT_ID` | Optional | `""` | For optional calendar deadline sync via Google OAuth console. |
| `STRIPE_SECRET_KEY` | Optional | `""` | Sandbox test key (`sk_test_...`) from Stripe Dashboard. |
