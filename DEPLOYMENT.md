# VIZORA Deployment

VIZORA v1.0 uses a single-owner deployment architecture.

```text
Vercel
React + Vite frontend
        ↓
Render
FastAPI backend
        ↓
Persistent disk
├── SQLite
└── image uploads
```

## Requirements

Before deployment you need:

- a Render account
- a Vercel account
- a Google Gemini API key
- a fresh VIZORA owner access token

Never commit production secrets.

---

## 1. Generate the VIZORA owner token

From the backend directory:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Store the generated value privately.

Do not add it to any tracked `.env` file.

---

## 2. Deploy the backend to Render

In Render:

```text
New
→ Blueprint
→ Connect GitHub
→ jelwingeuan/vizora
```

Render should detect:

```text
render.yaml
```

and create:

```text
vizora-api
```

The service uses:

```text
Region:
Singapore

Runtime:
Python

Plan:
Starter

Persistent disk:
/var/data/vizora
```

During Blueprint creation, Render will request values for:

```text
VIZORA_ACCESS_TOKEN
GEMINI_API_KEY
CORS_ORIGINS
```

For the initial `CORS_ORIGINS` value, use:

```text
https://example.invalid
```

temporarily.

Do not use `*`.

Wait for the backend deployment to complete.

---

## 3. Verify the Render backend

Render will provide a URL similar to:

```text
https://vizora-api.onrender.com
```

Your actual hostname may differ.

Open:

```text
https://YOUR-RENDER-URL/api/health
```

Expected:

```json
{
  "status": "ok",
  "service": "vizora-api",
  "database": "connected"
}
```

The other API endpoints should require the VIZORA access token.

---

## 4. Deploy the frontend to Vercel

In Vercel:

```text
Add New
→ Project
→ Import jelwingeuan/vizora
```

Set:

```text
Root Directory:
frontend

Framework:
Vite

Build Command:
npm run build

Output Directory:
dist
```

Add these production environment variables:

```text
VITE_API_BASE_URL=https://YOUR-RENDER-URL

VITE_ENABLE_MOCK_IMAGES=false
```

Do not put the VIZORA access token in Vercel environment variables.

Deploy the project.

---

## 5. Configure backend CORS

After Vercel finishes deploying, copy the production frontend URL.

Example:

```text
https://vizora.vercel.app
```

Return to:

```text
Render
→ vizora-api
→ Environment
```

Change:

```text
CORS_ORIGINS
```

to the exact Vercel origin:

```text
https://YOUR-VIZORA-VERCEL-URL
```

If VIZORA later uses multiple trusted frontend origins, separate them with commas:

```text
https://vizora.example.com,https://vizora.vercel.app
```

Save the environment settings and allow Render to redeploy.

---

## 6. Production smoke test

Open the Vercel deployment.

Expected:

```text
Unlock VIZORA
```

Enter the private owner token.

Verify:

```text
Library loads
Upload works
Uploaded image survives refresh
AI analysis works
Favorites persist
Rename persists
Boards persist
Find Similar works
Semantic Search works
Delete works
Deleted file remains deleted after refresh
```

Close the browser session and reopen VIZORA.

The application should request the owner token again.

---

## Persistent data

Render stores VIZORA data under:

```text
/var/data/vizora
```

Database:

```text
/var/data/vizora/vizora.db
```

Uploads:

```text
/var/data/vizora/uploads/
```

Do not remove the Render persistent disk unless the VIZORA data has been backed up.

---

## Database migrations

Production startup automatically executes:

```bash
python -m alembic upgrade head
```

before FastAPI starts.

For local development:

```bash
python -m alembic upgrade head
python -m alembic check
```

---

## Secrets

Backend-only production secrets include:

```text
GEMINI_API_KEY
VIZORA_ACCESS_TOKEN
```

Never expose these through:

```text
VITE_*
```

because Vite environment values are compiled into the frontend bundle.

---

## Rollback

If a frontend deployment fails, use Vercel's previous production deployment.

If a backend deployment fails, use Render's previous successful deploy.

Database schema changes must remain backward-compatible with the version being rolled back to.

---

## v1.0 release gate

Before tagging `v1.0.0`:

```text
GitHub Actions green
Render backend healthy
Vercel frontend healthy
Persistent upload confirmed
AI analysis confirmed
Access gate confirmed
No production secret committed
Production smoke test passed
```