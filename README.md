# VIZORA

> An AI-powered visual intelligence workspace for collecting, understanding, organizing, and discovering creative references.

[![CI](https://github.com/jelwingeuan/vizora/actions/workflows/ci.yml/badge.svg)](https://github.com/jelwingeuan/vizora/actions/workflows/ci.yml)

VIZORA is a visual reference management platform built for creatives.

It combines persistent image organization with AI-powered visual analysis, semantic search, multimodal embeddings, similarity discovery, and visual boards — turning a normal reference library into an intelligent creative workspace.

> **Status:** v1.0 pre-release  
> **Deployment:** Prepared, not currently deployed

---

## What VIZORA Does

Creative references often end up scattered across folders, screenshots, bookmarks, moodboards, and browser tabs.

VIZORA brings them into one workspace where users can:

- collect and manage visual references
- analyze images with AI
- generate visual tags and creative insights
- search references using natural language
- discover visually similar images
- organize references into boards
- save favorites
- revisit recent uploads
- rename and delete persisted references

The goal is not just to store images, but to make a visual library easier to understand, search, and rediscover.

---

# Features

## Visual Library

Upload and manage visual references in a persistent library.

- JPG, PNG, and WebP support
- visual gallery
- persistent image storage
- recent uploads
- favorites
- rename and delete
- image detail panel
- upload validation and size limits
- protected production access

---

## AI Visual Analysis

VIZORA uses Google Gemini to understand uploaded references.

AI analysis can generate:

- subject
- visual style
- mood
- lighting
- composition
- color palette
- tags
- creative notes
- summary

Analysis for uploaded images is persisted in the database and restored when the workspace is reopened.

---

## Semantic Search

Search the visual library using natural language instead of depending only on filenames or manual tags.

Examples:

```text
dark futuristic interface
warm editorial photography
minimal architecture
cinematic neon lighting
```

VIZORA combines reference metadata with AI-generated analysis to create richer searchable descriptions.

Search results use:

- text embeddings
- semantic similarity
- lexical relevance
- title relevance
- configurable minimum scores
- adaptive score filtering

---

## Visual Similarity Discovery

Select a reference and discover other images with similar visual characteristics.

The system includes:

- multimodal image embeddings
- persisted embeddings for uploaded references
- cosine similarity ranking
- minimum similarity thresholds
- adaptive result filtering
- batched embedding generation
- frontend embedding caching

Weak matches are filtered instead of always returning a fixed number of results.

---

## Boards

Organize references into visual collections.

Users can:

- create boards
- add images to boards
- remove images from boards
- view board collections
- persist board membership

Deleting an uploaded reference automatically cleans its board memberships.

---

## Discover

The Discover workspace provides an AI-assisted way to explore references through:

- semantic discovery
- image analysis
- generated tags
- visual similarity
- creative relationships between references

---

## Favorites & Recent

Uploaded references can be marked as favorites and restored after refresh.

Recent displays persisted uploads from newest to oldest.

---

## Image Management

Uploaded references support:

- rename
- delete
- persistent metadata updates
- physical file cleanup
- database cascade cleanup

Delete operations remove related:

```text
Image
├── AI analysis
├── embedding
├── board memberships
└── stored image file
```

---

# Technology

## Frontend

- React
- TypeScript
- Vite
- CSS
- Vitest
- React Testing Library

## Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- SQLite
- Pillow
- Pytest

## AI

- Google Gemini
- Gemini Vision
- text embeddings
- multimodal image embeddings

## Infrastructure

- GitHub Actions
- Vercel configuration
- Render configuration
- persistent storage support
- environment-based production configuration

---

# Project Structure

```text
vizora/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── start-production.sh
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── services/
│   │   ├── test/
│   │   ├── types/
│   │   └── utils/
│   ├── .env.example
│   ├── .env.production.example
│   ├── vercel.json
│   └── package.json
│
├── storage/
│   └── uploads/
│
├── DEPLOYMENT.md
├── render.yaml
└── README.md
```

---

# Local Development

## 1. Clone the repository

```bash
git clone https://github.com/jelwingeuan/vizora.git

cd vizora
```

---

# Backend Setup

## 2. Create a virtual environment

```bash
cd backend

python3 -m venv .venv

source .venv/bin/activate
```

## 3. Install dependencies

```bash
python -m pip install -r requirements-dev.txt
```

## 4. Configure environment variables

Create:

```bash
cp .env.example .env
```

Then configure your private Gemini API key inside `backend/.env`.

Example:

```env
APP_ENV=development

GEMINI_API_KEY=your_private_gemini_api_key
```

Never commit the real key.

---

## 5. Apply database migrations

```bash
python -m alembic upgrade head
```

Check migration state:

```bash
python -m alembic check
```

---

## 6. Start the backend

```bash
fastapi dev
```

Default API:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

---

# Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Default frontend:

```text
http://localhost:5173
```

---

# Testing

## Backend

```bash
cd backend

source .venv/bin/activate

python -m compileall app tests

python -m alembic check

python -m pytest -q
```

Backend tests cover areas including:

- health
- image uploads
- image persistence
- rename
- favorites
- boards
- cascade deletion
- physical file cleanup
- security
- rate limiting
- application route registration

---

## Frontend

```bash
cd frontend

npm test

npm run build

npm run lint
```

Frontend tests cover areas including:

- similarity ranking
- tag normalization
- image management
- favorites
- detail panel behavior
- access protection UI
- error handling

---

# Continuous Integration

GitHub Actions automatically runs checks for pushes to `main` and pull requests.

The CI pipeline validates:

```text
Backend
├── dependency installation
├── Python compilation
├── production startup script syntax
├── Alembic migrations
├── migration consistency
└── backend tests

Frontend
├── dependency installation
├── Vercel configuration
├── frontend tests
├── production build
└── ESLint
```

A change should not be considered release-ready until CI passes.

---

# Security

VIZORA v1.0 is currently designed as a **single-owner workspace**.

Production mode supports an owner access token.

Protected requests use:

```text
X-Vizora-Token
```

The production token:

- is never committed
- is never stored in a `VITE_*` environment variable
- is not compiled into the frontend
- is stored only for the current browser session

Production mode also includes configurable rate limits for:

- AI analysis
- semantic search
- embeddings
- image uploads

The health endpoint remains public for infrastructure health checks.

---

## Secrets

Backend-only secrets include:

```text
GEMINI_API_KEY
VIZORA_ACCESS_TOKEN
```

Keep them in private environment configuration.

Never place backend secrets inside:

```text
VITE_*
```

because Vite environment variables are included in frontend builds.

---

# Storage

## Development

Local data uses:

```text
storage/vizora.db
storage/uploads/
```

These are excluded from Git.

## Production

The storage directory can be changed using:

```env
VIZORA_STORAGE_DIR=
```

This allows VIZORA to use persistent mounted storage when deployed.

---

# Database

VIZORA currently uses SQLite.

Database schema changes are managed with Alembic.

After modifying SQLAlchemy models:

```bash
python -m alembic revision --autogenerate -m "describe change"

python -m alembic upgrade head

python -m alembic check
```

---

# Deployment

Deployment configuration is prepared but **VIZORA has not been deployed yet**.

The current v1.0 target architecture is:

```text
Frontend
React + Vite
     ↓
Vercel

Backend
FastAPI
     ↓
Render

Data
SQLite + uploaded images
     ↓
Persistent storage
```

Deployment can be configured manually.

The repository also contains infrastructure configuration that may be used later for automated deployment, but using a Render Blueprint is **optional**.

See:

```text
DEPLOYMENT.md
```

for deployment notes.

---

# v1.0 Progress

## Completed

- [x] React + TypeScript workspace
- [x] FastAPI backend
- [x] SQLite persistence
- [x] Alembic migrations
- [x] image uploads
- [x] persistent image library
- [x] AI image analysis
- [x] persisted AI analysis
- [x] AI-generated tags
- [x] semantic search
- [x] text embeddings
- [x] multimodal image embeddings
- [x] persisted image embeddings
- [x] visual similarity discovery
- [x] similarity filtering and batching
- [x] Discover workspace
- [x] boards
- [x] images inside boards
- [x] favorites
- [x] recent uploads
- [x] image rename
- [x] image deletion
- [x] physical file cleanup
- [x] database cascade cleanup
- [x] UX and image-management polish
- [x] backend automated tests
- [x] frontend automated tests
- [x] GitHub Actions CI
- [x] API access protection
- [x] rate limiting
- [x] upload hardening
- [x] configurable storage
- [x] production configuration
- [x] deployment configuration prepared

## Remaining Before v1.0.0

- [ ] deploy backend
- [ ] deploy frontend
- [ ] configure production CORS
- [ ] confirm persistent storage
- [ ] run production smoke test
- [ ] verify AI in production
- [ ] verify no production secrets are committed
- [ ] update application version to `1.0.0`
- [ ] create `v1.0.0` release tag

---

# Current Release Path

```text
Commit 32
v1 release hardening
        ✅

Commit 33
deployment configuration
        ✅

Manual deployment
        ↓
production smoke test
        ↓
final release preparation
        ↓
VIZORA v1.0.0
```

---

# Project Direction

VIZORA is being developed as a visual intelligence system rather than a traditional image gallery.

After v1.0, possible areas of development include:

- PostgreSQL
- object storage
- user accounts
- multi-user libraries
- stronger discovery systems
- larger semantic indexes
- improved board workflows
- end-to-end testing
- scalable cloud infrastructure

---

# Repository

**VIZORA**

AI-powered visual intelligence for creative references.

Built with React, TypeScript, FastAPI, SQLAlchemy, SQLite, Alembic, and Google Gemini.