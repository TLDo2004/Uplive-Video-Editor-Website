# Video Editor Mini App

Prototype web app for clipping, arranging, and exporting segments from YouTube videos.

## Stack

- **Frontend:** Next.js (TypeScript, App Router, Tailwind CSS)
- **Backend:** Express.js (TypeScript)
- **Package manager:** pnpm

## Structure

```
video-editor/
├── frontend/   # Next.js UI (standalone project)
└── backend/    # Express API (standalone project)
```

## Run locally

Each app is independent. Install and run them in separate terminals.

### Backend

```bash
cd backend
cp .env.example .env
pnpm install
pnpm dev          # http://localhost:3333
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev          # http://localhost:3000
```

### Check backend health

```bash
curl http://localhost:3333/health
```

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/jobs` | Create a job and start YouTube download `{ "url": "..." }` |
| `GET` | `/jobs/:id` | Get job status and metadata |
| `PATCH` | `/jobs/:id` | Update clips and transitions |
| `GET` | `/jobs/:id/preview` | Stream the downloaded source video |
| `POST` | `/jobs/:id/export` | Merge clips with transitions and create output |
| `GET` | `/jobs/:id/download` | Download the exported video |

### Prerequisites

Install **yt-dlp** and **ffmpeg** on your machine:

```bash
# Windows (winget)
winget install yt-dlp
winget install Gyan.FFmpeg

# macOS
brew install yt-dlp ffmpeg
```

The backend auto-detects winget installs on Windows. Optional overrides in `backend/.env`:

- `YT_DLP_PATH`
- `FFMPEG_PATH`
- `FFPROBE_PATH`

Job files are stored under `backend/temp/jobs/` by default (`WORK_DIR` env).

## Docker (ECS Fargate simulation)

Run the full stack in containers with resource limits similar to **0.5 vCPU / 1GB RAM**:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3333

The backend image includes **ffmpeg** and **yt-dlp**. Job files persist in the `backend_jobs` Docker volume.

To simulate stricter limits manually:

```bash
docker compose up --build --scale backend=1 --scale frontend=1
```

Resource limits are defined in [`docker-compose.yml`](docker-compose.yml) under `deploy.resources.limits` for each service.

## Notes

Design decisions and scaling analysis will be added as video features are implemented.
