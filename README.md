# VIZORA

> An AI-powered visual intelligence workspace for collecting, understanding, organizing, and discovering creative references.

[![CI](https://github.com/jelwingeuan/vizora/actions/workflows/ci.yml/badge.svg)](https://github.com/jelwingeuan/vizora/actions/workflows/ci.yml)

VIZORA is a visual reference management and visual intelligence workspace built for creatives.

It combines persistent image organization with AI-powered visual analysis, semantic search, multimodal embeddings, similarity discovery, visual boards, and a purpose-built creative interface — turning a normal reference library into an intelligent visual workspace.

> **Status:** v1.0 pre-release  
> **Current phase:** Interface refinement  
> **Latest interface milestone:** Commit 38 — Image Detail Experience  
> **Deployment:** Prepared, not currently deployed

---

## What VIZORA Does

Creative references often end up scattered across folders, screenshots, bookmarks, moodboards, and browser tabs.

VIZORA brings them into one workspace where users can:

- collect and manage visual references
- upload JPG, PNG, and WebP images
- analyze images using AI
- generate visual tags and creative insights
- search references using natural language
- discover visually similar images
- organize references into boards
- save favorite references
- revisit recent uploads
- rename and delete persisted references
- inspect detailed image metadata
- explore AI-generated color palettes
- build a persistent visual knowledge library

The goal is not simply to store images.

VIZORA is designed to make a visual library easier to understand, organize, search, compare, and rediscover.

---

# Core Features

## Visual Library

Upload and manage visual references inside a persistent visual workspace.

Features include:

- visual masonry gallery
- persistent image storage
- recent uploads
- favorites
- image rename
- image deletion
- responsive gallery density
- image dimensions and source metadata
- reference tags
- selected-image states
- favorite indicators
- polished empty and filtered states
- protected production API access

Uploaded references remain available after restarting the application because their metadata is stored in the database and their files are stored on disk.

---

## AI Visual Analysis

VIZORA uses Google Gemini to understand visual references.

AI analysis can generate:

- summary
- subject
- visual style
- mood
- lighting
- composition
- color palette
- AI-generated tags
- creative notes

For uploaded references, completed analysis is persisted in the database and restored when the workspace is reopened.

The Image Detail experience presents AI intelligence alongside the reference rather than treating AI as a separate tool.

---

## Semantic Search

Search the visual library using natural language rather than depending only on filenames or manually assigned tags.

Examples:

```text
dark futuristic interface
warm editorial photography
minimal architecture
cinematic neon lighting
soft product photography
brutalist monochrome layout
```

VIZORA combines reference metadata with AI-generated visual analysis to build richer searchable descriptions.

Semantic search uses:

- text embeddings
- semantic similarity
- lexical relevance
- title relevance
- configurable minimum scores
- adaptive score filtering

The Library search can be accessed from the global application bar.

When a semantic search is triggered from another workspace, results are presented in the Library.

---

## Visual Similarity Discovery

Select a visual reference and find other images with similar visual characteristics.

The similarity system includes:

- multimodal image embeddings
- persisted embeddings for uploaded references
- cosine similarity ranking
- minimum similarity thresholds
- adaptive result filtering
- batched embedding generation
- frontend embedding caching

Weak matches are filtered instead of always returning a fixed number of results.

The Image Detail panel provides a dedicated **Find Similar** action for moving directly from inspection to discovery.

---

## Boards

Organize visual references into curated collections.

Users can:

- create boards
- view board collections
- add references to boards
- remove references from boards
- persist board membership

Deleting an uploaded reference automatically cleans its related board memberships.

---

## Discover

The Discover workspace provides an AI-assisted exploration surface for:

- semantic discovery
- image analysis
- AI-generated tags
- visual similarity
- creative relationships between references

Further Discover interface refinement is planned as part of the current v1 polish phase.

---

## Favorites

Uploaded references can be marked as favorites.

Favorite state:

- persists through the backend
- survives refreshes and restarts
- can be filtered in the Library
- appears visually on image cards
- can be changed from the Image Detail panel

---

## Recent References

The **Recent** Library filter displays persisted uploaded references from newest to oldest.

---

## Image Management

Uploaded references support:

- rename
- delete
- persistent metadata updates
- favorite updates
- physical file cleanup
- related database cleanup

Delete operations remove related data:

```text
Image
├── AI analysis
├── image embedding
├── board memberships
└── stored image file
```

---

# Interface

VIZORA uses a custom dark visual workspace designed around creative reference browsing.

The interface currently includes:

## Workspace Navigation

The application shell includes three primary workspaces:

```text
Library
Boards
Discover
```

Navigation includes:

- active workspace indication
- workspace descriptions
- application branding
- backend connection status
- keyboard focus states
- responsive sidebar behavior
- global semantic Library search
- private workspace identity indicator

---

## Visual Library Experience

The Library interface includes:

- masonry reference layout
- responsive column density
- refined image cards
- hover interactions
- selected-reference feedback
- favorite badges
- image dimensions
- source metadata
- tag previews
- additional-tag counters
- All / Recent / Favorites filters
- semantic search result states
- similarity result states
- visual empty states

---

## Image Detail Experience

Selecting a reference opens a dedicated detail panel.

The current detail experience includes:

- large image preview
- title and orientation
- uploaded/demo source indicator
- favorite state
- Add to Favorites / Remove Favorite
- Find Similar
- dimensions
- orientation
- source
- saved date
- filename
- file size
- reference ID
- reference tags
- AI-generated tag distinction
- AI analysis status
- AI summary
- subject
- style
- mood
- lighting
- composition
- visual color palette
- AI tags
- creative notes
- inline error states
- responsive layout
- keyboard Escape closing

---

# Technology

## Frontend

- React
- TypeScript
- Vite
- CSS
- Vitest
- React Testing Library
- ESLint

## Backend

- Python 3.12
- FastAPI
- SQLAlchemy
- Alembic
- SQLite
- Pillow
- Pytest

## AI

- Google Gemini
- multimodal image understanding
- text embeddings
- multimodal image embeddings

## Infrastructure

- GitHub Actions
- dependency security auditing
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
│   │   │   ├── access/
│   │   │   ├── boards/
│   │   │   ├── discover/
│   │   │   ├── gallery/
│   │   │   ├── layout/
│   │   │   └── upload/
│   │   ├── data/
│   │   ├── services/
│   │   ├── test/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── navigation-polish.css
│   │   ├── library-polish.css
│   │   └── detail-panel-polish.css
│   ├── .env.example
│   ├── .env.production.example
│   ├── vercel.json
│   └── package.json
│
├── storage/
│   └── uploads/
│
├── .python-version
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

## 2. Create a Python virtual environment

VIZORA targets Python:

```text
3.12.11
```

Create the environment:

```bash
cd backend

python3 -m venv .venv

source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip

python -m pip install -r requirements-dev.txt
```

---

## 3. Configure backend environment variables

Create your local environment file:

```bash
cp .env.example .env
```

Then configure your private Gemini API key inside:

```text
backend/.env
```

Example:

```env
APP_ENV=development

GEMINI_API_KEY=your_private_gemini_api_key
```

Keep `APP_ENV=development` for local work. If `APP_ENV` is missing, the backend treats it as `production` and requires `VIZORA_ACCESS_TOKEN`.

Never commit a real API key or access token.

---

## 4. Apply database migrations

```bash
python -m alembic upgrade head
```

Check that the database schema matches the current models:

```bash
python -m alembic check
```

---

## 5. Start the backend

```bash
python -m uvicorn app.main:app --reload
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

Expected healthy response:

```json
{
  "status": "ok",
  "service": "vizora-api",
  "database": "connected"
}
```

---

# Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Default development frontend:

```text
http://localhost:5173
```

Run the frontend and backend together when testing AI, persistence, uploads, favorites, boards, search, or similarity discovery.

---

# Full-Stack Local Development

Terminal 1:

```bash
cd backend

source .venv/bin/activate

python -m uvicorn app.main:app --reload
```

Terminal 2:

```bash
cd frontend

npm run dev
```

Then open:

```text
http://localhost:5173
```

A useful end-to-end development flow is:

```text
Upload reference
        ↓
Open reference
        ↓
Favorite
        ↓
Analyze with AI
        ↓
Inspect generated intelligence
        ↓
Find similar
        ↓
Semantic discovery
        ↓
Add references to boards
        ↓
Refresh / restart
        ↓
Verify persistence
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
- upload validation
- image persistence
- rename
- favorites
- boards
- cascade deletion
- physical file cleanup
- access protection
- rate limiting
- route registration
- semantic-search request limits

Run a dependency audit with:

```bash
python -m pip_audit -r requirements.txt
```

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
- rename/delete interactions
- favorites
- image-detail behavior
- Find Similar behavior
- Escape-key panel closing
- access protection UI
- error handling

Run the production dependency audit with:

```bash
npm run audit
```

---

# Continuous Integration

GitHub Actions runs automatically for pushes to `main` and pull requests.

The CI pipeline checks:

```text
Backend
├── Python 3.12.11
├── dependency installation
├── dependency vulnerability audit
├── Python compilation
├── production startup script syntax
├── Alembic migrations
├── migration consistency
└── backend tests

Frontend
├── Node.js 22
├── dependency installation
├── production dependency audit
├── Vercel configuration validation
├── frontend tests
├── production build
└── ESLint
```

A change should not be considered release-ready until the CI pipeline passes.

---

# Security

VIZORA v1 is currently designed as a **single-owner workspace**.

Production mode supports a private owner access token.

Protected API requests use:

```text
X-Vizora-Token
```

The access token:

- is never committed
- is never stored in a `VITE_*` environment variable
- is not compiled into the frontend
- is stored only for the active browser session

Production mode also supports configurable rate limiting for:

- AI analysis
- semantic search
- embeddings
- uploads

The health endpoint remains public so hosting infrastructure can verify backend availability.

---

## Secrets

Backend-only secrets include:

```text
GEMINI_API_KEY
VIZORA_ACCESS_TOKEN
```

Store production secrets only in private hosting-provider environment configuration.

Never place secrets inside:

```text
VITE_*
```

because Vite environment variables are included in frontend builds.

---

## Uploaded Image URLs

Uploaded images are served through an access-protected API route:

```text
/api/images/<public-image-id>/file
```

When workspace access control is enabled, image requests require the same `X-Vizora-Token` header as other API requests. Stored filenames are never exposed in image URLs, and `/uploads` is not publicly served.

---

# Storage

## Development

Local persistent data uses:

```text
storage/vizora.db
storage/uploads/
```

These files are excluded from Git.

---

## Production

The persistent storage root can be changed using:

```env
VIZORA_STORAGE_DIR=
```

The planned Render deployment mounts persistent storage at:

```text
/var/data/vizora
```

The production SQLite database is configured with:

```env
DATABASE_URL=sqlite:////var/data/vizora/vizora.db
```

---

# Database

VIZORA currently uses SQLite.

Schema changes are managed through Alembic.

After modifying SQLAlchemy models:

```bash
python -m alembic revision --autogenerate -m "describe change"

python -m alembic upgrade head

python -m alembic check
```

PostgreSQL remains a possible future migration when the project requires multi-user or horizontally scalable infrastructure.

---

# Deployment

Deployment infrastructure is prepared, but **VIZORA has not been deployed yet**.

The planned v1 architecture is:

```text
                    VIZORA

                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼

        React + Vite        FastAPI
             │                 │
             ▼                 ▼
           Vercel            Render
                               │
                               ▼
                    Persistent Render Disk
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
                  SQLite                Uploads
```

For v1, the intended deployment process is:

```text
Render backend
      ↓
verify /api/health
      ↓
Vercel frontend
      ↓
configure exact CORS origin
      ↓
owner access test
      ↓
full production smoke test
      ↓
restart / persistence test
      ↓
final release
```

Render should be configured manually for the first v1 deployment.

The included:

```text
render.yaml
```

is optional infrastructure automation for later use. A Render Blueprint is not required.

See:

```text
DEPLOYMENT.md
```

for the deployment procedure.

---

# v1 Progress

## Core System

- [x] React + TypeScript frontend
- [x] FastAPI backend
- [x] SQLite persistence
- [x] Alembic migrations
- [x] configurable persistent storage

## Image Library

- [x] image uploads
- [x] JPG / PNG / WebP validation
- [x] persistent image library
- [x] recent uploads
- [x] favorites
- [x] rename
- [x] delete
- [x] physical file cleanup
- [x] database cascade cleanup

## Visual Intelligence

- [x] AI image analysis
- [x] persisted AI analysis
- [x] generated AI tags
- [x] text embeddings
- [x] multimodal image embeddings
- [x] persisted image embeddings
- [x] semantic search
- [x] visual similarity discovery
- [x] similarity filtering
- [x] embedding batching

## Organization

- [x] boards
- [x] board membership
- [x] persistent board membership
- [x] Discover workspace

## Quality & Infrastructure

- [x] backend automated tests
- [x] frontend automated tests
- [x] GitHub Actions CI
- [x] dependency vulnerability auditing
- [x] API access protection
- [x] rate limiting
- [x] upload hardening
- [x] production startup script
- [x] Vercel configuration
- [x] Render configuration
- [x] deployment documentation

## Interface Refinement

- [x] workspace navigation refinement
- [x] visual Library redesign
- [x] image-card polish
- [x] favorite and selected reference states
- [x] Library filter redesign
- [x] responsive gallery density
- [x] Image Detail redesign
- [x] improved metadata presentation
- [x] visual AI analysis hierarchy
- [x] improved color palette presentation
- [x] improved Find Similar workflow
- [x] detail-panel responsive handling

### Remaining Interface Work

- [ ] Discover workspace refinement
- [ ] Boards workspace refinement
- [ ] upload experience refinement
- [ ] global feedback / toast system
- [ ] loading and skeleton states
- [ ] broader responsive interface pass
- [ ] motion and microinteraction pass
- [ ] accessibility pass
- [ ] final visual QA

### Remaining Before v1.0.0

- [ ] complete interface refinement
- [ ] deploy backend
- [ ] deploy frontend
- [ ] configure production CORS
- [ ] confirm persistent SQLite storage
- [ ] confirm uploaded files survive restart
- [ ] run production smoke test
- [ ] verify production AI analysis
- [ ] verify production semantic search
- [ ] verify production visual similarity
- [ ] verify production boards
- [ ] confirm no production secrets are committed
- [ ] update application versions to `1.0.0`
- [ ] update final release documentation
- [ ] create `v1.0.0` release tag

---

# Current Development Roadmap

```text
FOUNDATION
────────────────────────────────
Core application              ✅
Persistence                   ✅
AI analysis                   ✅
Semantic search               ✅
Visual similarity             ✅
Boards                        ✅
Testing                       ✅
Security                      ✅
Release hardening             ✅


INTERFACE REFINEMENT
────────────────────────────────
Commit 36
Workspace navigation          ✅

Commit 37
Visual Library                ✅

Commit 38
Image Detail Experience       ✅

Commit 39
Discover workspace            ⏳

Commit 40
Boards workspace

Commit 41
Upload experience

Commit 42
Feedback states

Commit 43
Responsive interface

Commit 44
Motion & microinteractions

Commit 45
Accessibility

Commit 46
Final visual QA


PRODUCTION
────────────────────────────────
Manual Render deployment
        ↓
Vercel deployment
        ↓
CORS configuration
        ↓
persistent storage test
        ↓
production smoke test


RELEASE
────────────────────────────────
Version 1.0.0
        ↓
final documentation
        ↓
Git tag
        ↓
VIZORA v1.0.0
```

---

# Project Direction

VIZORA is being developed as a visual intelligence system rather than a traditional image gallery.

The v1 goal is a polished single-owner visual workspace that demonstrates the complete workflow:

```text
Collect
  ↓
Understand
  ↓
Organize
  ↓
Search
  ↓
Discover
  ↓
Rediscover
```

Possible development after v1 includes:

- PostgreSQL
- cloud object storage
- authenticated media delivery
- user accounts
- multi-user libraries
- shared boards
- larger semantic indexes
- richer recommendation systems
- advanced board workflows
- drag-and-drop organization
- batch AI analysis
- image import integrations
- end-to-end browser testing
- scalable cloud infrastructure
- collaborative visual research

---

# Repository

**VIZORA**

AI-powered visual intelligence for creative references.

Built with React, TypeScript, Vite, FastAPI, SQLAlchemy, SQLite, Alembic, and Google Gemini.
