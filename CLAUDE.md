# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack log management dashboard with real-time analytics and live updates via Server-Sent Events (SSE). FastAPI backend with PostgreSQL, React/TypeScript frontend with Material-UI. Features JWT authentication with simple RBAC (authenticated users get full CRUD, guests get read-only), full-text search using PostgreSQL pg_trgm, SSE streaming for live analytics, and interactive data visualizations with Chart.js.

## Development Commands

### Backend (FastAPI/Python)

```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Development
uvicorn app.main:app --reload --port 8000

# Database
python seed.py                    # Initialize and seed database with sample data
```

### Frontend (React/TypeScript)

```bash
cd frontend

# Setup
npm install

# Development
npm run dev                       # Dev server (http://localhost:5173)
npm run build                     # Production build
npm run preview                   # Preview production build
npm run lint                      # Run ESLint
```

### Docker

```bash
# Full stack
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose down -v            # Stop and remove volumes/data
docker compose logs -f [service]  # View logs
docker compose build [service]    # Rebuild specific service

# Individual services
docker compose up -d postgres     # Start only database
docker compose restart backend    # Restart backend
```

### HTTPS Development Setup (Optional)

The project supports HTTPS for **local Vite development** using self-signed certificates. Docker deployment uses HTTP by default (recommended for local development; use a reverse proxy for production SSL).

**Setup HTTPS for Local Vite Dev Server** (Optional):

```bash
# 1. Generate self-signed SSL certificates (valid for 365 days)
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"

# 2. Start Vite dev server (automatically detects certificates and uses HTTPS)
cd frontend
npm run dev                       # Starts at https://localhost:5173 (or http if no certs)

# 3. Optionally run backend with HTTPS
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 \
  --ssl-keyfile=../certs/key.pem \
  --ssl-certfile=../certs/cert.pem
```

**Docker Deployment**:
```bash
docker compose up -d              # Uses HTTP by default (Frontend: http://localhost, Backend: http://localhost:8000)
```

Docker uses HTTP for simplicity in local development. For production deployments with SSL:
- Use a reverse proxy (nginx, Caddy, Traefik) in front of Docker services
- Configure the reverse proxy to handle SSL termination
- Use proper CA-signed certificates (e.g., Let's Encrypt)

**How it Works**:
- `vite.config.ts` automatically detects if certificates exist at `../certs/` and enables HTTPS if available
- If certificates don't exist, Vite falls back to HTTP automatically
- No configuration changes needed - just generate certs and restart

**Browser Certificate Warnings**:
- Self-signed certificates trigger browser security warnings
- Click "Advanced" → "Proceed to localhost" (safe for local development)
- For production, use proper SSL certificates from a trusted CA

**CORS Configuration**: The backend accepts requests from both HTTP and HTTPS origins:
- `http://localhost:5173` and `https://localhost:5173` (Vite dev server)
- `http://localhost` and `https://localhost` (Docker/nginx)

## Architecture

### Backend Structure

- **API Layer** (`app/api/`): FastAPI routers for auth, logs, analytics, and SSE endpoints
  - `auth.py`: User registration, login, JWT token management
  - `logs.py`: CRUD operations for log entries
  - `analytics.py`: REST endpoints for aggregated data, trends, distributions
  - `sse.py`: Server-Sent Events endpoints for real-time streaming
- **Core** (`app/core/`): Configuration (pydantic-settings), JWT security (python-jose), FastAPI dependencies
- **Models** (`app/models/`): SQLAlchemy 2.0 ORM models (User, Log with SeverityEnum)
- **Schemas** (`app/schemas/`): Pydantic v2 request/response validation models
- **CRUD** (`app/crud/`): Database operations abstraction layer
- **Database** (`app/database.py`): SQLAlchemy engine, SessionLocal factory, `init_db()` function
- **Scripts**:
  - `seed.py`: One-time database initialization and seeding
  - `continuous_logger.py`: Background service that generates new logs every 1-5 seconds and cleans up old logs hourly

The backend follows a layered architecture: API routes → dependencies/auth → CRUD operations → SQLAlchemy models → PostgreSQL. All database operations go through CRUD functions, never direct model manipulation in routes.

**Database Initialization**: The `init_db()` function in `app/database.py` creates all tables using SQLAlchemy metadata. This is called by the seed script. The Docker setup includes a `postgres-setup` service that automatically installs the pg_trgm extension via `backend/db/setup/setup.sql` before the backend starts.

**Docker Entrypoint**: The `entrypoint.sh` script orchestrates startup: waits for PostgreSQL, runs the seed script (100k logs over 5 days), starts the continuous logger in the background (new log every 1-5s, cleanup every hour for logs >30 days old), then launches the FastAPI server. Both the seeder and continuous logger can be disabled by commenting them out in `entrypoint.sh`.

### Frontend Structure

- **Pages** (`src/pages/`): Top-level route components (Login, Register, LogList, LogDetail, LogCreate, Dashboard)
- **Components** (`src/components/`): Shared components (Layout with navigation)
- **Context** (`src/context/`): React Context for global state (AuthContext for user/token)
- **Services** (`src/services/api.ts`): Axios API client with interceptors for JWT tokens
- **Hooks** (`src/hooks/`): Custom React hooks
  - `useSSE.ts`: Server-Sent Events hook for real-time data streaming with automatic reconnection
- **Types** (`src/types/`): TypeScript interfaces matching backend Pydantic schemas
- **Constants** (`src/constants/styles.ts`): Centralized Material-UI styles, severity colors, and styling utilities

Uses TanStack Query for data fetching with automatic caching and invalidation. Auth token stored in localStorage and added to requests via axios interceptor.

**Styling Patterns**: All severity-based coloring (chips, charts) uses the centralized `SEVERITY_COLORS` mapping in `constants/styles.ts`. Severity ordering for charts/displays follows `SEVERITY_ORDER` (INFO, WARNING, ERROR, CRITICAL, DEBUG). Use `getSeverityChipStyle()` and `getSeverityColors()` helper functions for consistent styling.

**Real-time Updates**: The `useSSE` hook provides SSE functionality with automatic reconnection, connection status tracking, and error handling. Use this hook to subscribe to `/sse/*` endpoints for live data updates.

### Authentication & Authorization

- **JWT-based**: Token expires in 7 days (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
- **RBAC Model**:
  - **Authenticated users**: Full CRUD on logs (require_user dependency)
  - **Guest users**: Read-only access to logs and analytics (no auth required)
- **Protected Routes**: POST/PUT/DELETE operations require authentication
- **Public Routes**: GET logs, analytics available to all users

Implementation: `get_current_user` dependency validates JWT token, `require_user` dependency enforces authentication requirement. Routes use `Depends(require_user)` for protected operations.

### Database Design

**Logs Table**:
- Indexed on: `timestamp`, `severity`, `source`
- Full-text search index on `message` using PostgreSQL GIN index with pg_trgm extension
- UUIDs for primary keys (not auto-incrementing integers)

**Users Table**:
- Passwords hashed with bcrypt via passlib
- Email unique and indexed
- UUIDs for primary keys

**Key Patterns**:
- All models have `created_at` and `updated_at` timestamps
- Use SQLAlchemy 2.0 style

### API Patterns

**Filtering & Pagination**:
- All list endpoints use `LogFilter` schema for consistent query parameters
- Pagination: `page` (1-indexed), `page_size` (max 100)
- Full-text search: `search` parameter uses PostgreSQL `ILIKE` with trigram similarity
- Date filtering: `start_date`, `end_date` (ISO 8601 format)

**Analytics Endpoints**:
- `/analytics/aggregated`: Total counts, error counts, warning counts
- `/analytics/trend`: Time-series data for line charts
- `/analytics/distribution`: Severity distribution for bar/pie charts
- All accept filter parameters (severity, source, date range) but not pagination params

**SSE Streaming Endpoints** (all public, no authentication required):
- `/sse/logs/count`: Real-time log count updates
- `/sse/analytics/aggregated`: Live aggregated statistics
- `/sse/analytics/trend`: Live time-series trend data
- `/sse/analytics/distribution`: Live severity distribution data
- All SSE endpoints accept filter parameters and an `interval` query parameter (1-60 seconds, default 5) for update frequency
- SSE responses include proper headers: `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`

## Key Implementation Details

### Backend Dependencies

The `app/core/dependencies.py` file contains critical FastAPI dependencies:
- `get_db()`: Database session management with proper cleanup
- `get_current_user(token)`: Validates JWT, returns User or raises 401
- `require_user()`: Enforces authentication (raises 401 if not authenticated)

### Frontend API Client

`src/services/api.ts` exports three API modules:
- `authAPI`: register, login, me
- `logsAPI`: getList, getById, create, update, delete
- `analyticsAPI`: getAggregated, getTrend, getDistribution

The axios instance automatically adds `Bearer {token}` header from localStorage.

### Full-Text Search

Logs support fuzzy full-text search via PostgreSQL pg_trgm extension. The `idx_log_message_gin` index must exist for performance. Search is case-insensitive and matches partial words.

### Seeding & Sample Data

`backend/seed.py` creates:
- Admin user: admin@example.com / password123
- 100,000 sample logs spanning 5 days with realistic messages
- Weighted severity distribution (40% INFO, 20% WARNING, 10% ERROR, 5% CRITICAL, 10% DEBUG)

The seed script calls `init_db()` from `app.database` to ensure tables exist before seeding. Run with: `python seed.py`. In Docker, this runs automatically via `entrypoint.sh`.

**Configuring seed data**: Edit the `generate_logs()` call in `seed.py` to change the count and date range (default: 100000 logs over 5 days).

### Continuous Log Generation

`backend/continuous_logger.py` runs as a background service in Docker:
- Generates new log entries every 1-5 seconds with random severity and realistic messages
- Automatically cleans up logs older than 7 days (hourly cleanup, configurable via `clear_old_logs()` days parameter)
- Provides realistic data for testing real-time features and SSE endpoints
- Started automatically in Docker via `entrypoint.sh` (runs in background before FastAPI starts)

**Disabling seeding/continuous logger**: Comment out the relevant lines in `backend/entrypoint.sh` to disable seeding or the continuous logger in Docker deployments.

## Environment Configuration

Backend requires `.env` file (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing key (change in production!)
- `BACKEND_CORS_ORIGINS`: JSON array of allowed origins

Frontend uses Vite environment variables:
- `VITE_API_URL`: Backend API URL (defaults to `/api` for reverse proxy setup)

Docker Compose sets these automatically for containerized deployment.

## Common Patterns

### Adding a New API Endpoint

1. Create Pydantic schema in `app/schemas/`
2. Add CRUD function in `app/crud/` (use existing session patterns)
3. Add route in appropriate `app/api/` router file
4. Use `Depends(require_user)` if authentication needed
5. Update frontend `services/api.ts` with new API function
6. Add TypeScript type in `frontend/src/types/`

### Database Schema Changes

1. Modify SQLAlchemy model in `app/models/`
2. Update seed script if needed
3. Re-initialize database by running `python seed.py` (this will recreate tables)

For Docker: restart services with `docker compose down -v && docker compose up -d` to recreate the database with the new schema.

### Adding Authentication to a Route

Change from:
```python
@router.get("/endpoint")
def endpoint(db: Session = Depends(get_db)):
```

To:
```python
@router.get("/endpoint")
def endpoint(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
```

The `current_user` parameter provides access to the authenticated user object.

### Adding SSE Real-time Streaming

**Backend** - Create SSE endpoint in `app/api/sse.py`:
```python
@router.get("/sse/your-endpoint")
async def stream_data(
    interval: int = Query(5, ge=1, le=60),
    # Add filter parameters as needed
):
    def fetch_data():
        db = SessionLocal()
        try:
            # Fetch your data
            data = your_crud_function(db)
            return data
        finally:
            db.close()

    return StreamingResponse(
        event_generator(fetch_data, interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

**Frontend** - Use the `useSSE` hook:
```typescript
import { useSSE } from '../hooks/useSSE';

const { data, isConnected, error } = useSSE<YourDataType>({
  url: `${API_URL}/sse/your-endpoint?interval=5`,
  enabled: true,
  onMessage: (newData) => console.log('Received:', newData),
  onError: (err) => console.error('SSE error:', err),
});
```

## Future Feature Ideas

The README.md documents planned features that could be added:

- **Settings page**: Admin panel to enable/disable new registrations, manage users, configure retention policies
- **API tokens**: Generate tokens for different apps/services to send logs programmatically instead of using user credentials
- **Client SDKs**: Code examples and lightweight libraries for Python/Node/etc. to simplify sending logs to the API
- **Multi-tenant support**: Separate logs per application with filtering, so you can run this for multiple projects and keep their logs isolated
- **Scale optimizations**: Table partitioning, log archiving, and query optimizations for handling 250k+ logs efficiently

Additional potential features: email alerts for critical errors, webhook integrations, retention policies with auto-cleanup, anomaly detection.

## Troubleshooting

**Database connection issues**: Ensure PostgreSQL is running and DATABASE_URL is correct. Docker users: wait for healthcheck to pass before backend starts.

**Frontend can't reach backend**: Check CORS settings in `backend/.env`. Development: frontend runs on :5173, backend on :8000. Add both to BACKEND_CORS_ORIGINS.

**Full-text search slow**: Verify pg_trgm extension is installed and GIN index exists on logs.message. Docker setup automatically installs the extension via the `postgres-setup` service. For local development, manually run: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

**JWT token expired**: Tokens last 7 days by default. Clear localStorage and re-login, or adjust ACCESS_TOKEN_EXPIRE_MINUTES.
