# VIZORA

> An AI-powered visual intelligence workspace for collecting, understanding, organizing, and discovering creative references.

VIZORA is a visual reference management platform designed for creatives. It combines image organization with AI-powered analysis, semantic search, and visual similarity discovery to help turn a collection of references into a more intelligent creative workspace.

> **Status:** Active development / testing

---

## Overview

Creative references often end up scattered across folders, screenshots, moodboards, and bookmarks.

VIZORA brings them into one workspace where users can:

- collect and manage visual references
- analyze images with AI
- generate useful visual tags and insights
- search references using natural language
- discover visually similar images
- organize references into boards
- favorite and revisit important images

The goal is to build a workspace that does more than store images — it helps users understand and rediscover them.

---

## Features

### Visual Library

Upload and manage image references in a persistent visual library.

- JPG, PNG, and WebP support
- masonry-style image gallery
- persistent local image storage
- recent uploads
- favorites
- image rename and delete
- image detail panel

### AI Visual Analysis

Analyze references using Google Gemini.

VIZORA can generate information such as:

- subject
- visual style
- mood
- lighting
- composition
- color palette
- tags
- creative notes
- summary

Analysis generated for uploaded images is persisted and restored when the application is reopened.

### Semantic Search

Search the library using natural language instead of relying only on filenames or manually entered tags.

Examples:

```text
dark futuristic interface
warm editorial photography
minimal architecture
cinematic neon lighting
```

VIZORA combines image metadata and AI-generated analysis to improve search relevance.

### Visual Similarity Discovery

Find references that are visually similar to a selected image using multimodal image embeddings.

The similarity system includes:

- persisted embeddings for uploaded images
- cosine similarity ranking
- minimum similarity thresholds
- adaptive result filtering
- batched embedding processing
- client-side embedding caching

Weak visual matches are filtered instead of always returning a fixed number of results.

### Boards

Organize uploaded references into reusable visual boards.

Users can:

- create boards
- add images to boards
- remove images from boards
- view board collections
- persist board membership

### Discover

A dedicated discovery workspace for exploring references through AI-assisted search and visual relationships.

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS

### Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pillow

### AI

- Google Gemini
- Gemini Vision
- Text embeddings
- Multimodal image embeddings

---

## Project Structure

```text
vizora/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   ├── .env.example
│   ├── requirements.txt
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── storage/
│   ├── uploads/
│   └── vizora.db
│
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jelwingeuan/vizora.git

cd vizora
```

---

## Backend Setup

### 2. Create a Python virtual environment

```bash
cd backend

python3 -m venv .venv

source .venv/bin/activate
```

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create your local `.env` file from the provided example:

```bash
cp .env.example .env
```

Then add your own Gemini API key inside:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Do not commit your real API key.

### 5. Start the backend

```bash
fastapi dev
```

The API will normally run at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173
```

---

## Development Commands

### Frontend

```bash
npm run dev
npm run build
npm run lint
```

### Backend

```bash
source .venv/bin/activate

python -m compileall app

fastapi dev
```

---

## Current Development Progress

### Completed

- [x] React + TypeScript frontend
- [x] FastAPI backend
- [x] SQLite persistence
- [x] image uploads
- [x] persistent image library
- [x] AI image analysis
- [x] AI-generated tags
- [x] persisted image analysis
- [x] semantic search
- [x] text embeddings
- [x] multimodal image embeddings
- [x] persisted image embeddings
- [x] visual similarity discovery
- [x] Discover workspace
- [x] board system
- [x] images inside boards
- [x] favorites
- [x] recent uploads
- [x] image rename and delete
- [x] improved similarity filtering and batching

### Next

- [ ] interface and UX polish
- [ ] backend automated tests
- [ ] frontend automated tests
- [ ] database migrations with Alembic
- [ ] CI workflow
- [ ] dependency and environment cleanup
- [ ] deployment preparation

---

## Data & Storage

VIZORA currently uses SQLite for local persistence.

Uploaded image files are stored locally under:

```text
storage/uploads/
```

The local database is stored under:

```text
storage/vizora.db
```

Local uploads, databases, environment variables, and secrets are excluded from Git tracking.

---

## Security

Never commit your real Gemini API key.

Keep secrets inside:

```text
backend/.env
```

The repository only includes:

```text
backend/.env.example
```

with placeholder configuration values.

---

## Project Direction

VIZORA is currently being developed as a visual intelligence system rather than a traditional image gallery.

Future development will focus on:

- stronger search and discovery
- better visual relationship tools
- scalable persistence
- testing and reliability
- production-ready infrastructure
- improved creative workflows

---

## Repository

**VIZORA**

AI-powered visual intelligence for creative references.

Built with React, TypeScript, FastAPI, SQLite, and Google Gemini.