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

---

## Design decisions

### Architecture overview

The app is split into two standalone services:

```
Browser → Next.js (frontend :3000)
              ↓ /api/* rewrite
         Express API (backend :3333)
              ↓
    yt-dlp (download) → local disk → FFmpeg (clip/merge/export)
```

**Why separate frontend and backend?**

- Video processing is CPU/RAM-heavy and belongs on a stateless worker, not in the Next.js process.
- Express keeps the API layer small and easy to reason about under tight resource limits.
- The frontend can be deployed as a lightweight static/SSR service while workers scale independently.

**Why async jobs with polling?**

- YouTube download and FFmpeg export can take tens of seconds to minutes. Blocking HTTP requests would tie up connections and provide poor UX.
- Job states (`pending` → `downloading` → `ready` → `exporting` → `completed`) let the UI show progress without WebSockets, which keeps the prototype simple.

### Key tradeoffs

| Decision | Chosen | Alternative | Why |
|----------|--------|-------------|-----|
| Job storage | In-memory `Map` | Postgres / Redis | Fast to ship for a 2h prototype; acceptable because jobs are ephemeral |
| File storage | Local disk (`WORK_DIR`) | S3 / Blob storage | Simple, no cloud deps; works in Docker with a volume |
| Download tool | yt-dlp | YouTube Data API | No API key required; reliable for prototype |
| Export engine | FFmpeg CLI | WASM / cloud transcoder | Full control over transitions; runs in constrained containers |
| Max quality | 720p, `-threads 1` | Full resolution | Fits 0.5 vCPU / 1GB RAM target on ECS Fargate |
| Transitions | cut (concat), fade/slide (xfade) | Real-time preview | Export-time processing only; avoids client-side complexity |
| Auth | None | User accounts | Out of scope for case study; reduces surface area |

### Resource limits (0.5 vCPU / 1GB RAM)

The backend is designed for constrained containers like AWS ECS Fargate (0.5 vCPU, 1GB RAM):

- **FFmpeg** runs with `-threads 1` and `ultrafast` preset to limit CPU usage.
- **Downloads** are capped at 720p via yt-dlp format selection.
- **One export at a time** per process (single-worker model); no parallel FFmpeg jobs.
- **Temp files** (clips, concat lists) are written to disk and cleaned up per job directory.

**What breaks first under load?**

1. **Memory** — FFmpeg re-encoding multiple clips with xfade filters can spike RAM. Long videos or many clips increase peak usage.
2. **CPU** — Export is CPU-bound; with 0.5 vCPU, a multi-clip export with transitions can take minutes.
3. **Disk** — Each job stores source + clip segments + output; concurrent jobs fill disk quickly without cleanup or limits.

**Mitigations in this prototype:**

- 720p download cap
- Single-threaded FFmpeg
- Job-scoped temp directories
- Async processing so the API stays responsive

### What we chose not to build

- User authentication and multi-tenancy
- Persistent database (job history survives restart)
- Real-time transition preview in the browser
- Drag-and-drop timeline (range inputs + visual timeline instead)
- WebSocket progress streaming (polling is sufficient)
- Horizontal scaling / job queue (single-process worker)
- Cloud storage (S3) for artifacts

These were deferred to keep the prototype focused on the core flow: **paste URL → select clips → export → download**.

---

## Scaling: 1,000 concurrent users

**What breaks first?**

If 1,000 users submitted videos simultaneously, the system would fail at multiple layers — roughly in this order:

1. **Single-worker FFmpeg bottleneck** — One container can only run one export at a time. The other 999 jobs queue indefinitely or time out.
2. **Disk I/O and storage** — 1,000 concurrent downloads writing multi-hundred-MB files to local disk would exhaust volume space and saturate I/O.
3. **Memory pressure** — Even with one job per worker, provisioning 1,000 Fargate tasks at 1GB each is expensive; fewer workers means a growing backlog.
4. **YouTube rate limiting** — yt-dlp downloads from the same egress IP may get throttled or blocked.
5. **In-memory job store** — Jobs are lost on restart; no cross-instance coordination.

**How to fix it (production architecture):**

```
                    ┌─────────────┐
  Users ──────────► │  ALB / CDN  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Next.js      API servers    (static)
              │            │
              │            ▼
              │      ┌───────────┐
              │      │ SQS queue │  ← backpressure + fair scheduling
              │      └─────┬─────┘
              │            │
              │     ┌──────┼──────┐
              │     ▼      ▼      ▼
              │   Worker Worker Worker  (ECS Fargate, 0.5 vCPU / 1GB each)
              │     │      │      │
              │     └──────┼──────┘
              │            ▼
              │      ┌───────────┐
              └─────►│ S3 bucket │  (source + output artifacts)
                     └───────────┘
```

| Problem | Solution |
|---------|----------|
| Export bottleneck | **SQS job queue** + autoscaling worker fleet; one FFmpeg process per task |
| Disk exhaustion | **S3** for source/output files; delete after TTL |
| Job state | **Redis** or **DynamoDB** for job metadata; survives restarts |
| Download throttling | Rate limiting at API gateway; per-user quotas |
| Memory spikes | Worker concurrency limits; reject jobs over max duration/size |
| API overload | Rate limiting (token bucket); return `429` when queue is full |

**Sizing intuition:** With 0.5 vCPU per worker and ~60s average export time, one worker handles ~1 export/minute. For 1,000 simultaneous submissions, you'd need either a large worker pool (expensive) or queueing with honest wait-time estimates to the user. The queue is the critical piece — it turns a hard failure into managed latency.

---

## Repository

[https://github.com/TLDo2004/Uplive-Video-Editor-Website](https://github.com/TLDo2004/Uplive-Video-Editor-Website)
